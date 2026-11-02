import type { Locator, Page } from "@playwright/test";

export class CartPage {
  readonly lines: Locator;
  readonly couponInput: Locator;
  readonly applyCoupon: Locator;
  readonly subtotal: Locator;
  readonly discount: Locator;
  readonly shipping: Locator;
  readonly total: Locator;
  readonly checkout: Locator;

  constructor(readonly page: Page) {
    this.lines = page.getByTestId("cart-line");
    this.couponInput = page.getByLabel("Mã giảm giá");
    this.applyCoupon = page.getByRole("button", { name: "Áp dụng" });
    this.subtotal = page.getByTestId("summary-subtotal");
    this.discount = page.getByTestId("summary-discount");
    this.shipping = page.getByTestId("summary-shipping");
    this.total = page.getByTestId("summary-total");
    this.checkout = page.getByRole("link", { name: "Thanh toán" });
  }

  async goto() {
    await this.page.goto("/cart");
  }

  line(productName: string): Locator {
    return this.lines.filter({ hasText: productName });
  }

  async setQuantity(productName: string, quantity: number) {
    await this.page.getByLabel(`Số lượng ${productName}`).selectOption(String(quantity));
  }

  async apply(code: string) {
    await this.couponInput.fill(code);
    await this.applyCoupon.click();
  }
}
