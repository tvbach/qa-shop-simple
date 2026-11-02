import { errorCode, expectStatus } from "../../src/api-client";
import { expect, test } from "../../src/fixtures";

test.describe("Cart API", () => {
  test("thêm cùng sản phẩm hai lần thì cộng dồn số lượng", async ({ customer }) => {
    await customer.addToCartOrThrow("p-1", 2);
    const cart = await customer.addToCartOrThrow("p-1", 3);
    expect(cart.lines).toEqual([expect.objectContaining({ productId: "p-1", quantity: 5 })]);
  });

  test("không thể thêm vượt tồn kho", async ({ customer }) => {
    const res = await customer.post("/api/cart/items", { productId: "p-3", quantity: 3 }); // p-3 còn 2
    await expectStatus(res, 409);
    expect(await errorCode(res)).toBe("OUT_OF_STOCK");
  });

  // Decision table cho mã SAVE10: điều kiện tạm tính ≥ 200.000đ, giảm tối đa 100.000đ
  const save10 = [
    { productId: "p-6", quantity: 1, subtotal: 349_000, discount: 34_900 },
    { productId: "p-5", quantity: 1, subtotal: 1_290_000, discount: 100_000 },
  ];
  for (const row of save10) {
    test(`SAVE10 với tạm tính ${row.subtotal}`, async ({ customer }) => {
      await customer.addToCartOrThrow(row.productId, row.quantity);
      const res = await customer.post("/api/cart/coupon", { code: "SAVE10" });
      await expectStatus(res, 200);
      expect(await res.json()).toMatchObject({ subtotal: row.subtotal, discount: row.discount, coupon: { code: "SAVE10" } });
    });
  }

  test("SAVE10 bị từ chối khi tạm tính dưới 200.000đ", async ({ customer }) => {
    await customer.addToCartOrThrow("p-9", 1); // 99.000đ
    const res = await customer.post("/api/cart/coupon", { code: "SAVE10" });
    await expectStatus(res, 422);
    expect(await errorCode(res)).toBe("COUPON_MIN_SUBTOTAL");
  });
});
