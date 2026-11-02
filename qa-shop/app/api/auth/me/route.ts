import { requireUser, toPublicUser } from "@/lib/domain/shop";
import { route } from "@/lib/server/http";

export const dynamic = "force-dynamic";

export const GET = route(({ state, token }) => ({ body: { user: toPublicUser(requireUser(state, token)) } }), { write: false });
