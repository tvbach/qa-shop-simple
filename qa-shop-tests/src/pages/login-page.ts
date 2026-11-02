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
    // Giới hạn trong <main>: Next.js tự chèn một phần tử role="alert" ẩn (route announcer)
    // ở ngoài nội dung trang, nên getByRole("alert") toàn trang sẽ khớp 2 phần tử.
    this.formError = page.getByRole("main").getByRole("alert");
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
