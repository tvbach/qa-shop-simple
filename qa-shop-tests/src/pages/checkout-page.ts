import type { Locator, Page } from "@playwright/test";
import { ADDRESS } from "../api-client";

export class CheckoutPage {
  readonly placeOrder: Locator;

  constructor(readonly page: Page) {
    this.placeOrder = page.getByRole("button", { name: "Đặt hàng" });
  }

  async goto() {
    await this.page.goto("/checkout");
  }

  async fillAddress(address: Partial<typeof ADDRESS> = {}) {
    const a = { ...ADDRESS, ...address };
    await this.page.getByLabel("Họ tên người nhận").fill(a.fullName);
    await this.page.getByLabel("Số điện thoại").fill(a.phone);
    await this.page.getByLabel("Địa chỉ", { exact: true }).fill(a.address);
    await this.page.getByLabel("Tỉnh/Thành phố").fill(a.city);
  }

  async choosePayment(method: "cod" | "card") {
    await this.page.getByRole("radio", { name: method === "cod" ? /COD/ : /Thẻ/ }).check();
  }
}
