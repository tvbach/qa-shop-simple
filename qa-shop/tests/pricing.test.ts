import { describe, expect, it } from "vitest";
import { ShopError } from "@/lib/domain/errors";
import { FREE_SHIPPING_THRESHOLD, priceCart, SHIPPING_FEE } from "@/lib/domain/pricing";
import type { Product } from "@/lib/domain/types";

const NOW = new Date("2026-06-01T00:00:00Z");
const product = (id: string, price: number, stock = 100): Product => ({
  id, sku: id, name: id, description: "", category: "books", price, stock, image: "",
});

/** Giỏ 1 dòng có tạm tính đúng bằng `subtotal` */
function price(subtotal: number, couponCode: string | null = null, hasPreviousOrders = false) {
  return priceCart({ lines: [{ productId: "x", quantity: 1 }], couponCode }, [product("x", subtotal)], { hasPreviousOrders, now: NOW });
}

describe("Phí vận chuyển (biên 500.000đ)", () => {
  it.each<[number, number]>([
    [FREE_SHIPPING_THRESHOLD - 1, SHIPPING_FEE],
    [FREE_SHIPPING_THRESHOLD, 0],
    [FREE_SHIPPING_THRESHOLD + 1, 0],
  ])("tạm tính %i → phí ship %i", (subtotal, fee) => {
    const s = price(subtotal);
    expect(s.shippingFee).toBe(fee);
    expect(s.total).toBe(subtotal + fee);
  });

  it("giỏ trống không tính phí ship", () => {
    expect(priceCart({ lines: [], couponCode: null }, [], { hasPreviousOrders: false, now: NOW })).toMatchObject({ subtotal: 0, shippingFee: 0, total: 0 });
  });

  it("ngưỡng miễn ship tính trên số tiền SAU giảm giá", () => {
    // 520.000 - 10% = 468.000 < 500.000 → vẫn tính ship
    const s = price(520_000, "SAVE10");
    expect(s).toMatchObject({ discount: 52_000, shippingFee: SHIPPING_FEE, total: 468_000 + SHIPPING_FEE });
  });
});

describe("Mã SAVE10", () => {
  it.each<[number, number, boolean]>([
    [199_999, 0, false],
    [200_000, 20_000, true],
    [999_999, 100_000, true],
    [1_000_000, 100_000, true],
    [3_000_000, 100_000, true],
  ])("tạm tính %i → giảm %i", (subtotal, discount, applied) => {
    const s = price(subtotal, "SAVE10");
    expect(s.discount).toBe(discount);
    expect(s.coupon !== null).toBe(applied);
    if (!applied) expect(s.couponProblem).toContain("tối thiểu");
  });
});

describe("Mã WELCOME50 / FREESHIP / EXPIRED20", () => {
  it("WELCOME50 chỉ cho đơn đầu tiên", () => {
    expect(price(150_000, "WELCOME50").discount).toBe(50_000);
    expect(price(150_000, "WELCOME50", true)).toMatchObject({ discount: 0, coupon: null });
  });

  it("FREESHIP miễn ship từ 300.000đ", () => {
    expect(price(299_999, "FREESHIP")).toMatchObject({ shippingFee: SHIPPING_FEE, coupon: null });
    expect(price(300_000, "FREESHIP")).toMatchObject({ shippingFee: 0, discount: 0 });
  });

  it("EXPIRED20 luôn báo hết hạn", () => {
    expect(price(1_000_000, "EXPIRED20")).toMatchObject({ discount: 0, coupon: null, couponProblem: expect.stringContaining("hết hạn") });
  });

  it("mã không phân biệt hoa thường và khoảng trắng", () => {
    expect(price(300_000, "  save10 ").coupon?.code).toBe("SAVE10");
  });
});

describe("ShopError", () => {
  it("map mã lỗi sang HTTP status và JSON ổn định", () => {
    const e = new ShopError("COUPON_EXPIRED", "x");
    expect(e.status).toBe(422);
    expect(e.toJSON()).toEqual({ error: { code: "COUPON_EXPIRED", message: "x" } });
  });
});
