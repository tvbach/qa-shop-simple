import { json } from "@/lib/server/http";
import { buildOpenApi } from "@/lib/server/openapi";

export function GET() {
  return json(buildOpenApi());
}
