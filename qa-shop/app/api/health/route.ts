import { json } from "@/lib/server/http";
import { getStore } from "@/lib/server/store";
import { API_VERSION, APP_VERSION } from "@/lib/server/version";

export const dynamic = "force-dynamic";

export function GET() {
  return json({ status: "ok", version: APP_VERSION, apiVersion: API_VERSION, storage: getStore().kind });
}
