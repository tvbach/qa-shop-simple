import { applyCoupon, removeCoupon, requireUser } from "@/lib/domain/shop";
import { cartBody } from "@/lib/server/cart-response";
import { route } from "@/lib/server/http";

export const dynamic = "force-dynamic";

/** body: { code: string } — mã không phân biệt hoa thường; áp mã mới sẽ thay mã cũ */
export const POST = route(
  ({ state, token, body }) => {
    const user = requireUser(state, token);
    applyCoupon(state, user, (body as { code?: unknown } | null)?.code);
    return { body: cartBody(state, user) };
  },
  { write: true },
);

export const DELETE = route(
  ({ state, token }) => {
    const user = requireUser(state, token);
    removeCoupon(state, user);
    return { body: cartBody(state, user) };
  },
  { write: true },
);
