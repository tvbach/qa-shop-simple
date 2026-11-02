import { json } from "@/lib/server/http";
import { getStore } from "@/lib/server/store";
import { API_VERSION, APP_VERSION } from "@/lib/server/version";

export const dynamic = "force-dynamic";

/**
 * Trên nền tảng serverless (Vercel), mỗi request có thể chạy ở một instance khác nhau:
 * lưu trong bộ nhớ sẽ làm mất giỏ hàng/đăng nhập giữa các request. Health báo rõ để
 * phát hiện ngay khi quên gắn Redis.
 */
export function GET() {
  const storage = getStore().kind;
  const serverless = Boolean(process.env.VERCEL);
  return json({
    status: "ok",
    version: APP_VERSION,
    apiVersion: API_VERSION,
    storage,
    ...(serverless && storage === "memory"
      ? { warning: "Đang chạy serverless nhưng chưa cấu hình Redis (KV_REST_API_URL/KV_REST_API_TOKEN): dữ liệu sẽ mất giữa các request." }
      : {}),
  });
}
