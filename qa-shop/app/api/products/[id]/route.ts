import { getProduct } from "@/lib/domain/shop";
import { route } from "@/lib/server/http";

export const dynamic = "force-dynamic";

export const GET = route(({ state, params }) => ({ body: getProduct(state, params.id) }), { write: false });
