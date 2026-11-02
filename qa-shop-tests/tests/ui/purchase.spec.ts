import { expect, signInBrowser, test } from "../../src/fixtures";
import { CartPage } from "../../src/pages/cart-page";
import { CheckoutPage } from "../../src/pages/checkout-page";

test.describe("Mua hàng (UI)", () => {
  test("khách thêm sản phẩm từ trang chi tiết và giỏ hàng cập nhật", async ({ api, page, baseURL }) => {
    await signInBrowser(api, page, baseURL!);
    await page.goto("/products/p-6");
    await page.getByLabel("Số lượng").fill("2");
    await page.getByRole("button", { name: "Thêm vào giỏ" }).click();

    await expect(page.getByRole("status")).toContainText("Đã thêm 2 × Chuột không dây");
    await expect(page.getByTestId("cart-count")).toHaveText("2");
  });

  test("áp mã giảm giá và đặt hàng thành công", async ({ customer, page, baseURL }) => {
    // Arrange qua API (nhanh, ổn định), kiểm tra qua UI
    await customer.addToCartOrThrow("p-1", 1); // 289.000đ
    await signInBrowser(customer, page, baseURL!);

    const cart = new CartPage(page);
    await cart.goto();
    await expect(cart.lines).toHaveCount(1);
    await cart.apply("save10");
    await expect(cart.discount).toHaveText("−28.900đ");
    await expect(cart.total).toHaveText("290.100đ");

    await cart.checkout.click();
    const checkout = new CheckoutPage(page);
    await checkout.fillAddress();
    await checkout.choosePayment("card");
    await checkout.placeOrder.click();

    await expect(page).toHaveURL(/\/orders\/ORD-0001/);
    await expect(page.getByTestId("order-id")).toHaveText("ORD-0001");
    await expect(page.getByTestId("cart-count")).toHaveText("0");
  });

  test("số điện thoại sai hiển thị lỗi ngay tại ô nhập", async ({ customer, page, baseURL }) => {
    await customer.addToCartOrThrow("p-9", 1);
    await signInBrowser(customer, page, baseURL!);

    const checkout = new CheckoutPage(page);
    await checkout.goto();
    await checkout.fillAddress({ phone: "12345" });
    await checkout.placeOrder.click();

    const phone = page.getByLabel("Số điện thoại");
    await expect(phone).toHaveAttribute("aria-invalid", "true");
    await expect(page.getByText("Số điện thoại cần 10 chữ số, bắt đầu bằng 0.")).toBeVisible();
  });
});
