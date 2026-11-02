/**
 * POST /api/reset — đưa session hiện tại về dữ liệu seed (sản phẩm, tồn kho, tài khoản mẫu),
 * xoá giỏ hàng, đơn hàng và đăng xuất mọi token của session. Không ảnh hưởng session khác.
 */
import { errorResponse, json, resolveSession, SESSION_COOKIE, cookie, TOKEN_COOKIE } from "@/lib/server/http";
import { resetSession, SESSION_TTL_SECONDS } from "@/lib/server/store";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const session = resolveSession(req);
    await resetSession(session.id);
    const headers = new Headers({ "X-Session-Id": session.id });
    headers.append("Set-Cookie", cookie(req, SESSION_COOKIE, session.id, SESSION_TTL_SECONDS));
    headers.append("Set-Cookie", cookie(req, TOKEN_COOKIE, "", 0));
    return json({ ok: true, sessionId: session.id }, 200, headers);
  } catch (err) {
    return errorResponse(err);
  }
}
