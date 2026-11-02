import { CATEGORIES } from "@/lib/domain/shop";
import { json } from "@/lib/server/http";

export function GET() {
  return json({ items: CATEGORIES });
}
