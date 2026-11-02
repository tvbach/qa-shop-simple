/**
 * Quy tắc tính tiền — nơi tập trung nhiều quy tắc nghiệp vụ nhất, rất hợp để luyện
 * Equivalence Partitioning, Boundary Value Analysis và Decision Table.
 *
 * Phí ship: 30.000đ; miễn phí khi (tạm tính − giảm giá) ≥ 500.000đ hoặc dùng mã FREESHIP.
 *
 * Mã giảm giá (mỗi đơn tối đa 1 mã):
 * | Mã         | Ưu đãi                         | Điều kiện                                   |
 * |------------|--------------------------------|---------------------------------------------|
 * | SAVE10     | Giảm 10%, tối đa 100.000đ      | Tạm tính ≥ 200.000đ                          |
 * | WELCOME50  | Giảm 50.000đ                   | Tạm tính ≥ 100.000đ, tài khoản chưa có đơn   |
 * | FREESHIP   | Miễn phí ship                  | Tạm tính ≥ 300.000đ                          |
 * | EXPIRED20  | Giảm 20%                       | Đã hết hạn                                   |
 */
import { ShopError } from "./errors";
import type { Cart, OrderLine, Product } from "./types";

export const SHIPPING_FEE = 30_000;
export const FREE_SHIPPING_THRESHOLD = 500_000;
export const MIN_QUANTITY = 1;
export const MAX_QUANTITY_PER_LINE = 10;

export interface CouponRule {
  code: string;
  description: string;
  minSubtotal: number;
  expiresAt: string | null;
  firstOrderOnly: boolean;
  /** Số tiền giảm trên tạm tính */
  discount: (subtotal: number) => number;
  freeShipping: boolean;
}

export const COUPONS: CouponRule[] = [
  {
    code: "SAVE10",
    description: "Giảm 10% (tối đa 100.000đ) cho đơn từ 200.000đ",
    minSubtotal: 200_000,
    expiresAt: null,
    firstOrderOnly: false,
    discount: (s) => Math.min(Math.round(s * 0.1), 100_000),
    freeShipping: false,
  },
  {
    code: "WELCOME50",
    description: "Giảm 50.000đ cho đơn đầu tiên từ 100.000đ",
    minSubtotal: 100_000,
    expiresAt: null,
    firstOrderOnly: true,
    discount: () => 50_000,
    freeShipping: false,
  },
  {
    code: "FREESHIP",
    description: "Miễn phí vận chuyển cho đơn từ 300.000đ",
    minSubtotal: 300_000,
    expiresAt: null,
    firstOrderOnly: false,
    discount: () => 0,
    freeShipping: true,
  },
  {
    code: "EXPIRED20",
    description: "Giảm 20% — chương trình đã kết thúc",
    minSubtotal: 0,
    expiresAt: "2025-01-01T00:00:00.000Z",
    firstOrderOnly: false,
    discount: (s) => Math.round(s * 0.2),
    freeShipping: false,
  },
];

/** Mã không phân biệt hoa thường và khoảng trắng hai đầu */
export function findCoupon(code: string): CouponRule | undefined {
  const normalized = code.trim().toUpperCase();
  return COUPONS.find((c) => c.code === normalized);
}

export interface CouponContext {
  subtotal: number;
  hasPreviousOrders: boolean;
  now: Date;
}

/** Ném ShopError nếu mã không dùng được trong ngữ cảnh hiện tại */
export function assertCouponApplicable(rule: CouponRule, ctx: CouponContext): void {
  if (rule.expiresAt && ctx.now >= new Date(rule.expiresAt)) {
    throw new ShopError("COUPON_EXPIRED", `Mã ${rule.code} đã hết hạn.`);
  }
  if (rule.firstOrderOnly && ctx.hasPreviousOrders) {
    throw new ShopError("COUPON_NOT_ELIGIBLE", `Mã ${rule.code} chỉ áp dụng cho đơn hàng đầu tiên.`);
  }
  if (ctx.subtotal < rule.minSubtotal) {
    throw new ShopError(
      "COUPON_MIN_SUBTOTAL",
      `Mã ${rule.code} cần đơn tối thiểu ${formatVnd(rule.minSubtotal)} (hiện tại ${formatVnd(ctx.subtotal)}).`,
    );
  }
}

export interface PricedLine extends OrderLine {
  inStock: boolean;
}

export interface CartSummary {
  lines: PricedLine[];
  itemCount: number;
  subtotal: number;
  discount: number;
  shippingFee: number;
  total: number;
  coupon: { code: string; description: string } | null;
  /** Lý do mã đang gắn không còn hợp lệ (ví dụ giỏ giảm dưới mức tối thiểu) */
  couponProblem: string | null;
}

export function priceCart(cart: Cart, products: Product[], ctx: Omit<CouponContext, "subtotal">): CartSummary {
  const byId = new Map(products.map((p) => [p.id, p]));
  const lines: PricedLine[] = [];
  for (const line of cart.lines) {
    const p = byId.get(line.productId);
    if (!p) continue;
    lines.push({
      productId: p.id,
      name: p.name,
      unitPrice: p.price,
      quantity: line.quantity,
      lineTotal: p.price * line.quantity,
      inStock: p.stock >= line.quantity,
    });
  }
  const subtotal = lines.reduce((s, l) => s + l.lineTotal, 0);
  const itemCount = lines.reduce((s, l) => s + l.quantity, 0);

  let discount = 0;
  let freeShipping = false;
  let coupon: CartSummary["coupon"] = null;
  let couponProblem: string | null = null;
  const rule = cart.couponCode ? findCoupon(cart.couponCode) : undefined;
  if (rule) {
    try {
      assertCouponApplicable(rule, { ...ctx, subtotal });
      discount = Math.min(rule.discount(subtotal), subtotal);
      freeShipping = rule.freeShipping;
      coupon = { code: rule.code, description: rule.description };
    } catch (err) {
      couponProblem = err instanceof Error ? err.message : String(err);
    }
  }

  const afterDiscount = subtotal - discount;
  const shippingFee =
    subtotal === 0 || freeShipping || afterDiscount >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE;

  return { lines, itemCount, subtotal, discount, shippingFee, total: afterDiscount + shippingFee, coupon, couponProblem };
}

export function formatVnd(amount: number): string {
  return `${amount.toLocaleString("vi-VN")}đ`;
}
