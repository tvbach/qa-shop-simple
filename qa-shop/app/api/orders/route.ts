import { checkout, listOrders, requireUser } from "@/lib/domain/shop";
import { validateCheckout } from "@/lib/domain/validation";
import { route } from "@/lib/server/http";

export const dynamic = "force-dynamic";

export const GET = route(({ state, token }) => ({ body: { items: listOrders(state, requireUser(state, token)) } }), {
  write: false,
});

/** Đặt hàng từ giỏ hiện tại. body: { shippingAddress: {...}, paymentMethod: "cod" | "card" } */
export const POST = route(
  ({ state, token, body }) => {
    const user = requireUser(state, token);
    const order = checkout(state, user, validateCheckout(body));
    return { status: 201, body: order };
  },
  { write: true },
);
