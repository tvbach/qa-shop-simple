/**
 * Lớp HTTP mỏng: xác định session, xác thực token, giới hạn tần suất, chuyển lỗi
 * nghiệp vụ thành JSON. Route handler chỉ còn gọi hàm nghiệp vụ.
 *
 * Session (dữ liệu tách biệt cho từng người học / từng test):
 *   1. Header `X-Session-Id` nếu có (khuyến nghị cho API test: mỗi test một id)
 *   2. Cookie `qa_session` (trình duyệt tự gửi)
 *   3. Không có → tạo mới, trả về qua cookie và header `X-Session-Id`
 *
 * Xác thực: header `Authorization: Bearer <token>` hoặc cookie `qa_token` (UI).
 */
import { randomUUID } from "node:crypto";
import { ShopError } from "@/lib/domain/errors";
import type { ShopState } from "@/lib/domain/types";
import { SESSION_TTL_SECONDS, withState } from "./store";

export const SESSION_HEADER = "x-session-id";
export const SESSION_COOKIE = "qa_session";
export const TOKEN_COOKIE = "qa_token";
const SESSION_ID_RE = /^[A-Za-z0-9_-]{8,64}$/;
const MAX_BODY_BYTES = 32 * 1024;

export function parseCookies(header: string | null): Record<string, string> {
  const out: Record<string, string> = {};
  for (const part of (header ?? "").split(";")) {
    const i = part.indexOf("=");
    if (i < 0) continue;
    const k = part.slice(0, i).trim();
    if (k) out[k] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}

export interface SessionInfo {
  id: string;
  isNew: boolean;
}

export function resolveSession(req: Request): SessionInfo {
  const header = req.headers.get(SESSION_HEADER);
  if (header !== null) {
    if (!SESSION_ID_RE.test(header)) {
      throw new ShopError("BAD_REQUEST", "X-Session-Id cần 8–64 ký tự: chữ, số, '-' hoặc '_'.");
    }
    return { id: header, isNew: false };
  }
  const cookie = parseCookies(req.headers.get("cookie"))[SESSION_COOKIE];
  if (cookie && SESSION_ID_RE.test(cookie)) return { id: cookie, isNew: false };
  return { id: randomUUID(), isNew: true };
}

export function resolveToken(req: Request): string | null {
  const auth = req.headers.get("authorization");
  if (auth?.toLowerCase().startsWith("bearer ")) return auth.slice(7).trim() || null;
  return parseCookies(req.headers.get("cookie"))[TOKEN_COOKIE] ?? null;
}

const isHttps = (req: Request) =>
  req.headers.get("x-forwarded-proto") === "https" || new URL(req.url).protocol === "https:";

export function cookie(req: Request, name: string, value: string, maxAge: number): string {
  return [
    `${name}=${encodeURIComponent(value)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${maxAge}`,
    ...(isHttps(req) ? ["Secure"] : []),
  ].join("; ");
}

/* ------------------------------------------------------------ rate limit */

const RATE_WINDOW_MS = 60_000;
const RATE_MAX = Number(process.env.RATE_LIMIT_PER_MINUTE ?? 600);
const hits = new Map<string, { count: number; reset: number }>();

function rateLimit(req: Request): void {
  if (process.env.RATE_LIMIT === "off") return;
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const now = Date.now();
  const entry = hits.get(ip);
  if (!entry || entry.reset < now) {
    hits.set(ip, { count: 1, reset: now + RATE_WINDOW_MS });
    if (hits.size > 10_000) hits.clear();
    return;
  }
  entry.count += 1;
  if (entry.count > RATE_MAX) {
    const err = new ShopError("RATE_LIMITED", "Quá nhiều request. Thử lại sau ít phút.");
    (err as ShopError & { retryAfter?: number }).retryAfter = Math.ceil((entry.reset - now) / 1000);
    throw err;
  }
}

/* ---------------------------------------------------------------- handler */

export interface HandlerContext {
  req: Request;
  state: ShopState;
  session: SessionInfo;
  token: string | null;
  params: Record<string, string>;
  /** Body JSON đã parse (null nếu không có body) */
  body: unknown;
}

export interface HandlerResult {
  status?: number;
  body?: unknown;
  setCookies?: string[];
}

type RouteContext = { params: Promise<Record<string, string>> };

export async function readJson(req: Request): Promise<unknown> {
  if (req.method === "GET" || req.method === "HEAD") return null;
  const text = await req.text();
  if (text.length > MAX_BODY_BYTES) throw new ShopError("BAD_REQUEST", "Body quá lớn.");
  if (!text.trim()) return null;
  try {
    return JSON.parse(text);
  } catch {
    throw new ShopError("BAD_REQUEST", "Body không phải JSON hợp lệ.");
  }
}

export function json(body: unknown, status = 200, headers: HeadersInit = {}): Response {
  const h = new Headers(headers);
  h.set("Content-Type", "application/json; charset=utf-8");
  h.set("Cache-Control", "no-store");
  return new Response(status === 204 ? null : JSON.stringify(body), { status, headers: h });
}

export function errorResponse(err: unknown): Response {
  if (err instanceof ShopError) {
    const retryAfter = (err as ShopError & { retryAfter?: number }).retryAfter;
    return json(err.toJSON(), err.status, retryAfter ? { "Retry-After": String(retryAfter) } : {});
  }
  console.error("[qa-shop] unexpected error", err);
  return json(new ShopError("INTERNAL_ERROR", "Lỗi máy chủ.").toJSON(), 500);
}

/**
 * Tạo route handler: `write: false` cho request chỉ đọc (không lưu lại state).
 */
export function route(handler: (ctx: HandlerContext) => HandlerResult | Promise<HandlerResult>, opts: { write: boolean }) {
  return async (req: Request, ctx?: RouteContext): Promise<Response> => {
    try {
      rateLimit(req);
      const session = resolveSession(req);
      const body = await readJson(req);
      const params = (await ctx?.params) ?? {};
      const token = resolveToken(req);
      const result = await withState(session.id, (state) => handler({ req, state, session, token, params, body }), opts);

      const headers = new Headers({ "X-Session-Id": session.id });
      if (session.isNew) headers.append("Set-Cookie", cookie(req, SESSION_COOKIE, session.id, SESSION_TTL_SECONDS));
      for (const c of result.setCookies ?? []) headers.append("Set-Cookie", c);
      return json(result.body ?? null, result.status ?? 200, headers);
    } catch (err) {
      return errorResponse(err);
    }
  };
}
