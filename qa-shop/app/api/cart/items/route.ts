import { addToCart, requireUser } from "@/lib/domain/shop";
import { cartBody } from "@/lib/server/cart-response";
import { route } from "@/lib/server/http";

export const dynamic = "force-dynamic";

/** body: { productId: string, quantity?: number = 1 } — cộng dồn nếu sản phẩm đã có trong giỏ */
export const POST = route(
  ({ state, token, body }) => {
    const user = requireUser(state, token);
    const b = (body ?? {}) as { productId?: unknown; quantity?: unknown };
    addToCart(state, user, b.productId, b.quantity ?? 1);
    return { status: 201, body: cartBody(state, user) };
  },
  { write: true },
);
