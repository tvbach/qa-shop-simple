import { errorCode, expectStatus } from "../../src/api-client";
import { expect, test } from "../../src/fixtures";

test.describe("Orders API", () => {
  test("đặt hàng trừ tồn kho và làm trống giỏ", async ({ customer }) => {
    await customer.addToCartOrThrow("p-3", 2);
    const order = await customer.placeOrderOrThrow();
    expect(order).toMatchObject({ id: "ORD-0001", status: "confirmed", subtotal: 398_000, shippingFee: 30_000, total: 428_000 });

    const product = await (await customer.get("/api/products/p-3")).json();
    expect(product.stock).toBe(0);
    const cart = await (await customer.get("/api/cart")).json();
    expect(cart.lines).toEqual([]);
  });

  test("không đặt được khi giỏ trống", async ({ customer }) => {
    const res = await customer.post("/api/orders", { shippingAddress: { fullName: "A B", phone: "0912345678", address: "12 Lê Lợi", city: "Huế" }, paymentMethod: "cod" });
    await expectStatus(res, 409);
    expect(await errorCode(res)).toBe("CART_EMPTY");
  });

  test("reset đưa session về dữ liệu seed", async ({ customer }) => {
    await customer.addToCartOrThrow("p-3", 2);
    await customer.placeOrderOrThrow();
    await expectStatus(await customer.reset(), 200);
    expect((await (await customer.get("/api/products/p-3")).json()).stock).toBe(2);
  });
});
