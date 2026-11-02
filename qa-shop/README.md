# QA Shop — System Under Test

Next.js (App Router) · TypeScript · không cần database.

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # unit + integration (Vitest, gọi trực tiếp route handler)
npm run typecheck
npm run build && npm start
```

## Kiến trúc

```
lib/domain/   nghiệp vụ thuần (không biết HTTP/storage): pricing, validation, shop, seed, errors
lib/server/   session, auth, rate limit, store (bộ nhớ hoặc Upstash Redis), OpenAPI
app/api/      route handler mỏng: đọc request → gọi nghiệp vụ → trả JSON
app/          UI (client components gọi chính API ở trên)
tests/        Vitest: pricing (biên), validation, integration API
```

## Lưu trữ

- Mặc định lưu trong bộ nhớ tiến trình: phù hợp local, Docker, CI. Session hết hạn sau 24 giờ không dùng.
- Đặt `KV_REST_API_URL` + `KV_REST_API_TOKEN` (hoặc `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`) để lưu Redis — cần khi deploy serverless như Vercel. **Dùng database riêng, không dùng chung với ứng dụng khác.**

## Biến môi trường

| Biến | Mặc định | Ý nghĩa |
|---|---|---|
| `RATE_LIMIT` | bật | `off` để tắt giới hạn tần suất |
| `RATE_LIMIT_PER_MINUTE` | `600` | Số request tối đa mỗi phút cho một IP |

QA Shop là ứng dụng luyện tập: mật khẩu băm bằng SHA-256 có salt, không gửi email, không thanh toán thật. Đừng sao chép các lựa chọn bảo mật này vào sản phẩm thật.
