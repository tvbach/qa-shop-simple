import { getOrder, requireUser } from "@/lib/domain/shop";
import { route } from "@/lib/server/http";

export const dynamic = "force-dynamic";

export const GET = route(({ state, token, params }) => ({ body: getOrder(state, requireUser(state, token), params.id) }), {
  write: false,
});
