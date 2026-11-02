# qa-shop-tests — starter Playwright + TypeScript

Bộ khung test cho QA Shop. Copy thư mục này sang repo của bạn để làm lab, rồi nộp link repo/PR làm bằng chứng trên AI Automation Senior Hub.

```bash
npm install
npx playwright install chromium
QA_SHOP_URL=http://localhost:3000 npm test   # hoặc npm run test:api / test:ui
npm run report                                # mở HTML report
```

## Cấu trúc

```
src/api-client.ts   ShopApi: gọi API theo session, helper ...OrThrow cho bước arrange
src/fixtures.ts     sessionId (mỗi test một session), api, customer (đã đăng nhập),
                    page dùng chung session với api → arrange qua API, assert qua UI
src/pages/          Page Object tối giản (chỉ locator + hành động, không assert)
tests/api/          ví dụ: auth (data-driven), products, cart (decision table), orders
tests/ui/           ví dụ: đăng nhập, mua hàng, lỗi validation
```

## Quy ước

- Locator ưu tiên `getByRole` / `getByLabel`; `getByTestId` chỉ cho giá trị khó định vị (tổng tiền, số lượng giỏ).
- Không `waitForTimeout`: dùng web-first assertion (`await expect(locator).toHaveText(...)`).
- Khẳng định lỗi API theo `error.code`, không theo câu chữ `message`.
- Chuẩn bị dữ liệu qua API (nhanh, ổn định); UI chỉ dùng cho điều thực sự cần kiểm tra trên giao diện.
