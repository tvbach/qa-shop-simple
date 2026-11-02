import { ACCOUNTS } from "../../src/api-client";
import { expect, test } from "../../src/fixtures";
import { LoginPage } from "../../src/pages/login-page";

test.describe("Đăng nhập (UI)", () => {
  test("đăng nhập thành công rồi quay về trang được yêu cầu", async ({ page }) => {
    const login = new LoginPage(page);
    await login.goto("/orders");
    await login.login(ACCOUNTS.customer.email, ACCOUNTS.customer.password);

    await expect(page).toHaveURL(/\/orders$/);
    await expect(page.getByTestId("current-user")).toHaveText("Nguyễn Văn An");
  });

  test("sai mật khẩu hiện thông báo lỗi và vẫn ở trang đăng nhập", async ({ page }) => {
    const login = new LoginPage(page);
    await login.goto();
    await login.login(ACCOUNTS.customer.email, "Wrong1234");

    await expect(login.formError).toHaveText("Email hoặc mật khẩu không đúng.");
    await expect(page).toHaveURL(/\/login/);
  });

  test("truy cập giỏ hàng khi chưa đăng nhập bị chuyển tới trang đăng nhập", async ({ page }) => {
    await page.goto("/cart");
    await expect(page).toHaveURL(/\/login\?next=%2Fcart/);
  });
});
