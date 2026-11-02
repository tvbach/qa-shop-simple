/**
 * Lưu ShopState theo session.
 *
 * - Mặc định: bộ nhớ trong tiến trình (chạy local, Docker, CI). Mỗi session sống 24 giờ
 *   kể từ lần truy cập cuối, tối đa 2.000 session (bỏ session cũ nhất khi đầy).
 * - Có biến môi trường Upstash (KV_REST_API_* hoặc UPSTASH_REDIS_REST_*): lưu Redis,
 *   dùng cho bản deploy serverless (Vercel) nơi bộ nhớ không giữ được giữa các request.
 *
 * Mọi thao tác trên cùng một session được xếp hàng (mutex theo session) trong một
 * tiến trình, nên test song song trên các session khác nhau không ảnh hưởng nhau.
 */
import { createSeedState } from "@/lib/domain/seed";
import type { ShopState } from "@/lib/domain/types";

export const SESSION_TTL_SECONDS = 24 * 60 * 60;
const MAX_MEMORY_SESSIONS = 2_000;

export interface StateStore {
  readonly kind: "memory" | "redis";
  get(sessionId: string): Promise<ShopState | null>;
  set(sessionId: string, state: ShopState): Promise<void>;
  delete(sessionId: string): Promise<void>;
}

/* ------------------------------------------------------------- memory */

class MemoryStore implements StateStore {
  readonly kind = "memory" as const;
  private data = new Map<string, { json: string; expires: number }>();

  async get(id: string) {
    const hit = this.data.get(id);
    if (!hit) return null;
    if (hit.expires < Date.now()) {
      this.data.delete(id);
      return null;
    }
    // Map giữ thứ tự chèn → chèn lại để đánh dấu "mới dùng" (LRU)
    this.data.delete(id);
    this.data.set(id, { ...hit, expires: Date.now() + SESSION_TTL_SECONDS * 1000 });
    return JSON.parse(hit.json) as ShopState;
  }

  async set(id: string, state: ShopState) {
    this.data.delete(id);
    this.data.set(id, { json: JSON.stringify(state), expires: Date.now() + SESSION_TTL_SECONDS * 1000 });
    while (this.data.size > MAX_MEMORY_SESSIONS) {
      const oldest = this.data.keys().next().value;
      if (oldest === undefined) break;
      this.data.delete(oldest);
    }
  }

  async delete(id: string) {
    this.data.delete(id);
  }
}

/* -------------------------------------------------------------- redis */

class RedisStore implements StateStore {
  readonly kind = "redis" as const;
  constructor(
    private url: string,
    private token: string,
  ) {}

  private async cmd<T>(command: (string | number)[]): Promise<T> {
    const res = await fetch(this.url, {
      method: "POST",
      headers: { Authorization: `Bearer ${this.token}`, "Content-Type": "application/json" },
      body: JSON.stringify(command),
      cache: "no-store",
    });
    const json = (await res.json()) as { result?: T; error?: string };
    if (!res.ok || json.error) throw new Error(`Redis error: ${json.error ?? res.status}`);
    return json.result as T;
  }

  private key = (id: string) => `qashop:v1:session:${id}`;

  async get(id: string) {
    const raw = await this.cmd<string | null>(["GETEX", this.key(id), "EX", SESSION_TTL_SECONDS]);
    return raw ? (JSON.parse(raw) as ShopState) : null;
  }

  async set(id: string, state: ShopState) {
    await this.cmd(["SET", this.key(id), JSON.stringify(state), "EX", SESSION_TTL_SECONDS]);
  }

  async delete(id: string) {
    await this.cmd(["DEL", this.key(id)]);
  }
}

/* ------------------------------------------------------------ factory */

let store: StateStore | null = null;

export function getStore(): StateStore {
  if (store) return store;
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  store = url && token ? new RedisStore(url.replace(/\/+$/, ""), token) : new MemoryStore();
  return store;
}

/** Chỉ dùng trong test */
export function setStoreForTesting(s: StateStore | null) {
  store = s;
  locks.clear();
}

/* --------------------------------------------------- per-session mutex */

const locks = new Map<string, Promise<unknown>>();

/**
 * Đọc state (tạo từ seed nếu chưa có) → chạy `fn` → lưu lại nếu `fn` không ném lỗi.
 * Lỗi nghiệp vụ không làm thay đổi dữ liệu (giống một transaction đơn giản).
 */
export async function withState<T>(sessionId: string, fn: (state: ShopState) => T | Promise<T>, opts: { write: boolean }): Promise<T> {
  const prev = locks.get(sessionId) ?? Promise.resolve();
  const run = prev.then(async () => {
    const s = getStore();
    const existing = await s.get(sessionId);
    const state = existing ?? createSeedState();
    const result = await fn(state);
    if (opts.write || !existing) await s.set(sessionId, state);
    return result;
  });
  const settled = run.catch(() => undefined);
  locks.set(sessionId, settled);
  settled.then(() => {
    if (locks.get(sessionId) === settled) locks.delete(sessionId);
  });
  return run;
}

/** Đưa session về đúng dữ liệu seed (xếp hàng sau các thao tác đang chạy) */
export async function resetSession(sessionId: string): Promise<void> {
  await withState(sessionId, (state) => void Object.assign(state, createSeedState()), { write: true });
}
