import { expect, type APIRequestContext, type APIResponse } from "@playwright/test";

/** Tài khoản seed — xem `POST /api/reset` và README của QA Shop */
export const ACCOUNTS = {
  customer: { email: "user@qashop.dev", password: "Password123" },
  admin: { email: "admin@qashop.dev", password: "Admin12345" },
  locked: { email: "locked@qashop.dev", password: "Password123" },
} as const;

export const ADDRESS = { fullName: "Nguyễn Văn An", phone: "0912345678", address: "12 Lê Lợi, Quận 1", city: "TP. Hồ Chí Minh" };

export interface Cart {
  lines: { productId: string; name: string; unitPrice: number; quantity: number; lineTotal: number; inStock: boolean }[];
  itemCount: number;
  subtotal: number;
  discount: number;
  shippingFee: number;
  total: number;
  coupon: { code: string; description: string } | null;
  couponProblem: string | null;
}

export interface Order {
  id: string;
  subtotal: number;
  discount: number;
  shippingFee: number;
  total: number;
  couponCode: string | null;
  status: string;
}

/**
 * Client mỏng cho QA Shop API. Mỗi instance gắn với một session (header X-Session-Id)
 * và tuỳ chọn một token đăng nhập.
 *
 * Quy ước: method trả về APIResponse để test tự khẳng định status/body;
 * các helper `...OrThrow` dùng cho bước chuẩn bị dữ liệu (arrange), lỗi là fail ngay.
 */
export class ShopApi {
  token: string | null = null;

  constructor(
    readonly request: APIRequestContext,
    readonly sessionId: string,
  ) {}

  private headers(): Record<string, string> {
    return { "X-Session-Id": this.sessionId, ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}) };
  }

  get(path: string) {
    return this.request.get(path, { headers: this.headers() });
  }
  post(path: string, data?: unknown) {
    return this.request.post(path, { headers: this.headers(), data });
  }
  patch(path: string, data?: unknown) {
    return this.request.patch(path, { headers: this.headers(), data });
  }
  delete(path: string) {
    return this.request.delete(path, { headers: this.headers() });
  }

  reset() {
    return this.post("/api/reset");
  }

  async loginOrThrow(account: { email: string; password: string } = ACCOUNTS.customer): Promise<string> {
    const res = await this.post("/api/auth/login", account);
    await expectStatus(res, 200);
    this.token = ((await res.json()) as { token: string }).token;
    return this.token;
  }

  async addToCartOrThrow(productId: string, quantity = 1): Promise<Cart> {
    const res = await this.post("/api/cart/items", { productId, quantity });
    await expectStatus(res, 201);
    return res.json();
  }

  async placeOrderOrThrow(paymentMethod: "cod" | "card" = "cod"): Promise<Order> {
    const res = await this.post("/api/orders", { shippingAddress: ADDRESS, paymentMethod });
    await expectStatus(res, 201);
    return res.json();
  }
}

/** Khẳng định status, khi sai thì in kèm body để debug nhanh */
export async function expectStatus(res: APIResponse, status: number) {
  if (res.status() !== status) {
    expect(res.status(), `${res.url()} → ${await res.text()}`).toBe(status);
  }
}

export async function errorCode(res: APIResponse): Promise<string> {
  return ((await res.json()) as { error: { code: string } }).error.code;
}
