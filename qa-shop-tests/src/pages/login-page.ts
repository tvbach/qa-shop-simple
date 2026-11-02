import type { Locator, Page } from "@playwright/test";

/** Page Object: chỉ đóng gói locator và hành động; khẳng định kết quả nằm trong test */
export class LoginPage {
  readonly email: Locator;
  readonly password: Locator;
  readonly submit: Locator;
  readonly formError: Locator;

  constructor(readonly page: Page) {
    this.email = page.getByLabel("Email");
    this.password = page.getByLabel("Mật khẩu");
    this.submit = page.getByRole("button", { name: "Đăng nhập" });
    this.formError = page.getByRole("alert");
  }

  async goto(next?: string) {
    await this.page.goto(next ? `/login?next=${encodeURIComponent(next)}` : "/login");
  }

  async login(email: string, password: string) {
    await this.email.fill(email);
    await this.password.fill(password);
    await this.submit.click();
  }
}
