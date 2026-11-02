import { removeFromCart, requireUser, setCartQuantity } from "@/lib/domain/shop";
import { cartBody } from "@/lib/server/cart-response";
import { route } from "@/lib/server/http";

export const dynamic = "force-dynamic";

/** body: { quantity: number } — đặt lại số lượng (1–10, không vượt tồn kho) */
export const PATCH = route(
  ({ state, token, body, params }) => {
    const user = requireUser(state, token);
    setCartQuantity(state, user, params.productId, (body as { quantity?: unknown } | null)?.quantity);
    return { body: cartBody(state, user) };
  },
  { write: true },
);

export const DELETE = route(
  ({ state, token, params }) => {
    const user = requireUser(state, token);
    removeFromCart(state, user, params.productId);
    return { body: cartBody(state, user) };
  },
  { write: true },
);
