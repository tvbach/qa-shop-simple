import { logout } from "@/lib/domain/shop";
import { cookie, route, TOKEN_COOKIE } from "@/lib/server/http";

export const dynamic = "force-dynamic";

/** Luôn trả 204 kể cả khi chưa đăng nhập (idempotent) */
export const POST = route(
  ({ req, state, token }) => {
    if (token) logout(state, token);
    return { status: 204, setCookies: [cookie(req, TOKEN_COOKIE, "", 0)] };
  },
  { write: true },
);
