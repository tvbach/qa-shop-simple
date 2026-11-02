# QA Shop Simple

Ứng dụng e-commerce mẫu để **luyện kiểm thử**: test thủ công, test design, API testing và UI automation với Playwright. Đi kèm lộ trình học tại [AI Automation Senior Hub](https://ai-automation-senior-hub.vercel.app).

| Thư mục | Nội dung |
|---|---|
| [`qa-shop/`](qa-shop) | Ứng dụng cần test (System Under Test): Next.js, REST API, OpenAPI, dữ liệu tách riêng theo session |
| [`qa-shop-tests/`](qa-shop-tests) | Starter Playwright + TypeScript: API client, fixtures, Page Object, test mẫu — **fork/copy thư mục này để làm lab** |

## Chạy nhanh

```bash
# Cách 1: Docker
docker compose up --build          # http://localhost:3000

# Cách 2: Node.js ≥ 20.19
cd qa-shop && npm install && npm run dev

# Chạy test mẫu (cửa sổ terminal khác)
cd qa-shop-tests && npm install && npx playwright install chromium
npm test                            # QA_SHOP_URL mặc định http://localhost:3000
```

## Những điều cần biết khi viết test

- **Mỗi test một session riêng.** Gửi header `X-Session-Id` (API) hoặc cookie `qa_session` (trình duyệt) — mỗi session có dữ liệu riêng (sản phẩm, tồn kho, giỏ, đơn hàng), nên test chạy song song không ảnh hưởng nhau và không cần dọn dữ liệu. Fixture trong `qa-shop-tests` đã làm sẵn việc này.
- **Reset:** `POST /api/reset` đưa session về dữ liệu seed cố định.
- **Tài khoản mẫu:** `user@qashop.dev` / `Password123` · `admin@qashop.dev` / `Admin12345` · `locked@qashop.dev` (bị khoá).
- **API docs:** `GET /api/openapi.json` (OpenAPI 3.1). Lỗi luôn có dạng `{ "error": { "code", "message", "fields?" } }` — hãy khẳng định theo `code`.

## Quy tắc nghiệp vụ (để thiết kế test case)

| Quy tắc | Giá trị |
|---|---|
| Số lượng mỗi sản phẩm trong giỏ | 1–10, không vượt tồn kho (thêm lần nữa thì cộng dồn) |
| Phí vận chuyển | 30.000đ; miễn phí khi (tạm tính − giảm giá) ≥ 500.000đ |
| `SAVE10` | Giảm 10%, tối đa 100.000đ, đơn từ 200.000đ |
| `WELCOME50` | Giảm 50.000đ, đơn từ 100.000đ, chỉ đơn đầu tiên của tài khoản |
| `FREESHIP` | Miễn phí ship, đơn từ 300.000đ |
| `EXPIRED20` | Đã hết hạn |
| Đăng ký | Họ tên 2–50 ký tự · email hợp lệ, chưa dùng · mật khẩu 8–64 ký tự, có chữ và số |
| Giao hàng | SĐT 10 chữ số bắt đầu bằng 0 · địa chỉ 5–200 ký tự |
| Sản phẩm đặc biệt | `p-3` chỉ còn 2 cuốn · `p-4` hết hàng |

## Lộ trình phát triển

- **v1 (hiện tại):** chức năng cơ bản + trung cấp — đủ cho LAB-001 → LAB-004.
- **Tiếp theo:** các "case khó" bật bằng cờ: độ trễ ngẫu nhiên (flaky có chủ đích), locator xấu, iframe thanh toán, Shadow DOM, xử lý đơn bất đồng bộ, WebSocket, rate limit 429, API v2 lệch hợp đồng và bug cài sẵn để săn.
