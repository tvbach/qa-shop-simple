import { requireUser } from "@/lib/domain/shop";
import { cartBody } from "@/lib/server/cart-response";
import { route } from "@/lib/server/http";

export const dynamic = "force-dynamic";

export const GET = route(({ state, token }) => ({ body: cartBody(state, requireUser(state, token)) }), { write: false });
