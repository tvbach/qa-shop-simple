import { listProducts } from "@/lib/domain/shop";
import { route } from "@/lib/server/http";

export const dynamic = "force-dynamic";

const int = (v: string | null) => (v === null || v === "" ? undefined : Number(v));

export const GET = route(
  ({ req, state }) => {
    const sp = new URL(req.url).searchParams;
    return {
      body: listProducts(state, {
        q: sp.get("q") ?? undefined,
        category: sp.get("category") || undefined,
        sort: sp.get("sort") || undefined,
        page: int(sp.get("page")),
        limit: int(sp.get("limit")),
        inStock: sp.get("inStock") === "true",
      }),
    };
  },
  { write: false },
);
