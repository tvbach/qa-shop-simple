/**
 * Integration test: gọi trực tiếp route handler (cùng code chạy trên server) với
 * store bộ nhớ mới cho mỗi test. Không cần dựng server.
 */
import { randomUUID } from "node:crypto";
import { beforeEach, describe, expect, it } from "vitest";
import { POST as login } from "@/app/api/auth/login/route";
import { GET as me } from "@/app/api/auth/me/route";
import { POST as registerRoute } from "@/app/api/auth/register/route";
import { GET as getCart } from "@/app/api/cart/route";
import { POST as applyCoupon } from "@/app/api/cart/coupon/route";
import { POST as addItem } from "@/app/api/cart/items/route";
import { DELETE as removeItem, PATCH as patchItem } from "@/app/api/cart/items/[productId]/route";
import { GET as health } from "@/app/api/health/route";
import { GET as openapi } from "@/app/api/openapi.json/route";
import { GET as getOrder } from "@/app/api/orders/[id]/route";
import { GET as listOrders, POST as placeOrder } from "@/app/api/orders/route";
import { GET as getProduct } from "@/app/api/products/[id]/route";
import { GET as listProducts } from "@/app/api/products/route";
import { POST as reset } from "@/app/api/reset/route";
import { SEED_ACCOUNTS } from "@/lib/domain/seed";
import { setStoreForTesting } from "@/lib/server/store";

process.env.RATE_LIMIT = "off";

type Handler = (req: Request, ctx?: { params: Promise<Record<string, string>> }) => Promise<Response> | Response;

let session: string;

function call(handler: Handler, opts: { method?: string; path?: string; body?: unknown; token?: string; params?: Record<string, string>; sessionId?: string | null; rawBody?: string } = {}) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const sid = opts.sessionId === undefined ? session : opts.sessionId;
  if (sid !== null) headers["X-Session-Id"] = sid;
  if (opts.token) headers.Authorization = `Bearer ${opts.token}`;
  const req = new Request(`http://localhost${opts.path ?? "/api/x"}`, {
    method: opts.method ?? (opts.body !== undefined || opts.rawBody ? "POST" : "GET"),
    headers,
    body: opts.rawBody ?? (opts.body === undefined ? undefined : JSON.stringify(opts.body)),
  });
  return handler(req, { params: Promise.resolve(opts.params ?? {}) });
}

async function asCustomer() {
  const res = await call(login, { body: SEED_ACCOUNTS.customer });
  expect(res.status).toBe(200);
  return ((await res.json()) as { token: string }).token;
}

const ADDRESS = { fullName: "Nguyễn An", phone: "0912345678", address: "12 Lê Lợi, Q.1", city: "TP.HCM" };

beforeEach(() => {
  setStoreForTesting(null);
  session = `test-${randomUUID()}`;
});

describe("System", () => {
  it("health trả version và loại storage", async () => {
    const body = await (await health()).json();
    expect(body).toMatchObject({ status: "ok", storage: "memory" });
  });

  it("OpenAPI 3.1 liệt kê mọi endpoint chính", async () => {
    const spec = await (await openapi()).json();
    expect(spec.openapi).toBe("3.1.0");
    expect(Object.keys(spec.paths)).toEqual(
      expect.arrayContaining(["/api/auth/login", "/api/products", "/api/cart/items", "/api/orders", "/api/reset"]),
    );
  });

  it("X-Session-Id sai định dạng → 400", async () => {
    const res = await call(listProducts, { sessionId: "bad id!" });
    expect(res.status).toBe(400);
  });

  it("không gửi session → tạo mới và trả qua cookie + header", async () => {
    const res = await call(listProducts, { sessionId: null });
    expect(res.headers.get("x-session-id")).toMatch(/^[0-9a-f-]{36}$/);
    expect(res.headers.get("set-cookie")).toContain("qa_session=");
  });

  it("body JSON hỏng → 400 BAD_REQUEST", async () => {
    const res = await call(login, { rawBody: "{oops" });
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("BAD_REQUEST");
  });
});

describe("Auth", () => {
  it("đăng nhập đúng → token + cookie HttpOnly; /me trả user", async () => {
    const res = await call(login, { body: { email: "  USER@qashop.dev ", password: SEED_ACCOUNTS.customer.password } });
    expect(res.status).toBe(200);
    expect(res.headers.get("set-cookie")).toMatch(/qa_token=.+HttpOnly/);
    const { token } = await res.json();
    const meBody = await (await call(me, { token })).json();
    expect(meBody.user).toEqual({ id: "u-1", name: "Nguyễn Văn An", email: SEED_ACCOUNTS.customer.email, role: "customer" });
  });

  it.each<[string, Record<string, string>, number, string]>([
    ["sai mật khẩu", { email: SEED_ACCOUNTS.customer.email, password: "wrong123" }, 401, "INVALID_CREDENTIALS"],
    ["email không tồn tại (cùng thông báo)", { email: "nobody@qashop.dev", password: "Password123" }, 401, "INVALID_CREDENTIALS"],
    ["tài khoản bị khoá", { ...SEED_ACCOUNTS.locked }, 403, "ACCOUNT_LOCKED"],
    ["thiếu mật khẩu", { email: SEED_ACCOUNTS.customer.email }, 422, "VALIDATION_FAILED"],
  ])("%s → %i %s", async (_n, body, status, code) => {
    const res = await call(login, { body });
    expect(res.status).toBe(status);
    expect((await res.json()).error.code).toBe(code);
  });

  it("đăng ký → 201, email trùng → 409", async () => {
    const body = { name: "Bình", email: "binh@example.com", password: "abc12345", confirmPassword: "abc12345" };
    const first = await call(registerRoute, { body });
    expect(first.status).toBe(201);
    expect((await first.json()).user).toMatchObject({ id: "u-4", role: "customer" });
    const dup = await call(registerRoute, { body: { ...body, email: "BINH@example.com" } });
    expect(dup.status).toBe(409);
  });

  it("chưa đăng nhập gọi API cần auth → 401", async () => {
    expect((await call(getCart)).status).toBe(401);
  });
});

describe("Products", () => {
  it("tìm kiếm không dấu, lọc, sắp xếp, phân trang", async () => {
    const search = await (await call(listProducts, { path: "/api/products?q=ban%20phim" })).json();
    expect(search.items.map((p: { id: string }) => p.id)).toEqual(["p-5"]);

    const books = await (await call(listProducts, { path: "/api/products?category=books&sort=price-asc&limit=2&page=2" })).json();
    expect(books).toMatchObject({ page: 2, limit: 2, total: 4, totalPages: 2 });
    expect(books.items.map((p: { price: number }) => p.price)).toEqual([325_000, 450_000]);

    const inStock = await (await call(listProducts, { path: "/api/products?inStock=true&limit=50" })).json();
    expect(inStock.total).toBe(11);
  });

  it.each(["limit=0", "limit=51", "page=0", "sort=cheap", "category=food"])("tham số không hợp lệ %s → 422", async (qs) => {
    expect((await call(listProducts, { path: `/api/products?${qs}` })).status).toBe(422);
  });

  it("sản phẩm không tồn tại → 404", async () => {
    expect((await call(getProduct, { params: { id: "p-999" } })).status).toBe(404);
  });
});

describe("Cart", () => {
  it("thêm cộng dồn, đổi số lượng, xoá", async () => {
    const token = await asCustomer();
    await call(addItem, { token, body: { productId: "p-1", quantity: 2 } });
    const added = await (await call(addItem, { token, body: { productId: "p-1", quantity: 3 } })).json();
    expect(added.lines).toEqual([expect.objectContaining({ productId: "p-1", quantity: 5, lineTotal: 5 * 289_000 })]);

    const patched = await (await call(patchItem, { method: "PATCH", token, params: { productId: "p-1" }, body: { quantity: 1 } })).json();
    expect(patched).toMatchObject({ itemCount: 1, subtotal: 289_000, shippingFee: 30_000, total: 319_000 });

    const removed = await (await call(removeItem, { method: "DELETE", token, params: { productId: "p-1" } })).json();
    expect(removed).toMatchObject({ lines: [], total: 0 });
  });

  it.each<[string, Record<string, unknown>, number, string]>([
    ["số lượng 0", { productId: "p-1", quantity: 0 }, 422, "QUANTITY_OUT_OF_RANGE"],
    ["số lượng 11", { productId: "p-1", quantity: 11 }, 422, "QUANTITY_OUT_OF_RANGE"],
    ["số lượng thập phân", { productId: "p-1", quantity: 1.5 }, 422, "QUANTITY_OUT_OF_RANGE"],
    ["vượt tồn kho (còn 2)", { productId: "p-3", quantity: 3 }, 409, "OUT_OF_STOCK"],
    ["hết hàng", { productId: "p-4", quantity: 1 }, 409, "OUT_OF_STOCK"],
    ["sản phẩm không tồn tại", { productId: "p-999" }, 404, "PRODUCT_NOT_FOUND"],
  ])("%s → %i %s", async (_n, body, status, code) => {
    const token = await asCustomer();
    const res = await call(addItem, { token, body });
    expect(res.status).toBe(status);
    expect((await res.json()).error.code).toBe(code);
  });

  it("cộng dồn vượt 10 → 422, giỏ không đổi", async () => {
    const token = await asCustomer();
    await call(addItem, { token, body: { productId: "p-1", quantity: 8 } });
    expect((await call(addItem, { token, body: { productId: "p-1", quantity: 3 } })).status).toBe(422);
    expect((await (await call(getCart, { token })).json()).itemCount).toBe(8);
  });

  it("áp mã: không tồn tại 404, chưa đủ điều kiện 422, hợp lệ cập nhật tổng", async () => {
    const token = await asCustomer();
    await call(addItem, { token, body: { productId: "p-9", quantity: 1 } });
    expect((await call(applyCoupon, { token, body: { code: "NOPE" } })).status).toBe(404);
    const tooSmall = await call(applyCoupon, { token, body: { code: "SAVE10" } });
    expect(tooSmall.status).toBe(422);
    expect((await tooSmall.json()).error.code).toBe("COUPON_MIN_SUBTOTAL");

    await call(addItem, { token, body: { productId: "p-1", quantity: 1 } });
    const cart = await (await call(applyCoupon, { token, body: { code: "save10" } })).json();
    expect(cart).toMatchObject({ subtotal: 388_000, discount: 38_800, shippingFee: 30_000, total: 379_200, coupon: { code: "SAVE10" } });
  });
});

describe("Orders", () => {
  it("đặt hàng: trừ tồn kho, xoá giỏ, id tuần tự, WELCOME50 chỉ dùng một lần", async () => {
    const token = await asCustomer();
    await call(addItem, { token, body: { productId: "p-3", quantity: 2 } });
    await call(applyCoupon, { token, body: { code: "WELCOME50" } });
    const res = await call(placeOrder, { token, body: { shippingAddress: ADDRESS, paymentMethod: "cod" } });
    expect(res.status).toBe(201);
    const order = await res.json();
    expect(order).toMatchObject({ id: "ORD-0001", subtotal: 398_000, discount: 50_000, shippingFee: 30_000, total: 378_000, couponCode: "WELCOME50" });

    expect((await (await call(getProduct, { params: { id: "p-3" } })).json()).stock).toBe(0);
    expect((await (await call(getCart, { token })).json()).lines).toEqual([]);

    await call(addItem, { token, body: { productId: "p-1", quantity: 1 } });
    const again = await call(applyCoupon, { token, body: { code: "WELCOME50" } });
    expect((await again.json()).error.code).toBe("COUPON_NOT_ELIGIBLE");
  });

  it("giỏ trống → 409 CART_EMPTY; địa chỉ sai → 422 kèm field", async () => {
    const token = await asCustomer();
    expect((await call(placeOrder, { token, body: { shippingAddress: ADDRESS, paymentMethod: "cod" } })).status).toBe(409);
    const bad = await call(placeOrder, { token, body: { shippingAddress: { ...ADDRESS, phone: "123" }, paymentMethod: "cod" } });
    expect(bad.status).toBe(422);
    expect((await bad.json()).error.fields).toEqual([expect.objectContaining({ field: "shippingAddress.phone" })]);
  });

  it("mã không còn hợp lệ khi giỏ giảm dưới mức tối thiểu → 409", async () => {
    const token = await asCustomer();
    await call(addItem, { token, body: { productId: "p-1", quantity: 1 } });
    await call(applyCoupon, { token, body: { code: "SAVE10" } });
    await call(patchItem, { method: "PATCH", token, params: { productId: "p-1" }, body: { quantity: 1 } });
    await call(removeItem, { method: "DELETE", token, params: { productId: "p-1" } });
    await call(addItem, { token, body: { productId: "p-11", quantity: 1 } });
    const res = await call(placeOrder, { token, body: { shippingAddress: ADDRESS, paymentMethod: "card" } });
    expect(res.status).toBe(409);
    expect((await res.json()).error.code).toBe("COUPON_NO_LONGER_VALID");
  });

  it("không xem được đơn của người khác (404, không phải 403)", async () => {
    const token = await asCustomer();
    await call(addItem, { token, body: { productId: "p-1", quantity: 1 } });
    await call(placeOrder, { token, body: { shippingAddress: ADDRESS, paymentMethod: "cod" } });

    const other = await (await call(registerRoute, { body: { name: "Khác", email: "k@example.com", password: "abc12345", confirmPassword: "abc12345" } })).json();
    expect((await call(getOrder, { token: other.token, params: { id: "ORD-0001" } })).status).toBe(404);
    expect((await (await call(listOrders, { token: other.token })).json()).items).toEqual([]);
    expect((await call(getOrder, { token, params: { id: "ORD-0001" } })).status).toBe(200);
  });
});

describe("Session isolation & reset", () => {
  it("hai session không thấy dữ liệu của nhau; reset trả về seed", async () => {
    const token = await asCustomer();
    await call(addItem, { token, body: { productId: "p-3", quantity: 2 } });
    await call(placeOrder, { token, body: { shippingAddress: ADDRESS, paymentMethod: "cod" } });

    const otherSession = `test-${randomUUID()}`;
    expect((await (await call(getProduct, { params: { id: "p-3" }, sessionId: otherSession })).json()).stock).toBe(2);

    expect((await call(reset, { method: "POST" })).status).toBe(200);
    expect((await (await call(getProduct, { params: { id: "p-3" } })).json()).stock).toBe(2);
    expect((await call(me, { token })).status).toBe(401);
  });

  it("request song song trên cùng session được xếp hàng, không mất cập nhật", async () => {
    const token = await asCustomer();
    await Promise.all(Array.from({ length: 5 }, () => call(addItem, { token, body: { productId: "p-6", quantity: 1 } })));
    expect((await (await call(getCart, { token })).json()).itemCount).toBe(5);
  });
});
