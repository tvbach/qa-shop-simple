import { login } from "@/lib/domain/shop";
import { validateLogin } from "@/lib/domain/validation";
import { cookie, route, TOKEN_COOKIE } from "@/lib/server/http";
import { SESSION_TTL_SECONDS } from "@/lib/server/store";

export const dynamic = "force-dynamic";

export const POST = route(
  ({ req, state, body }) => {
    const result = login(state, validateLogin(body));
    return { body: result, setCookies: [cookie(req, TOKEN_COOKIE, result.token, SESSION_TTL_SECONDS)] };
  },
  { write: true },
);
