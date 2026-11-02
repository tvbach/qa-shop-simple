import { ACCOUNTS, errorCode, expectStatus } from "../../src/api-client";
import { expect, test } from "../../src/fixtures";

test.describe("Auth API", () => {
  test("đăng nhập đúng trả token và thông tin user", async ({ api }) => {
    const res = await api.post("/api/auth/login", ACCOUNTS.customer);
    await expectStatus(res, 200);
    const body = await res.json();
    expect(body.token).toEqual(expect.any(String));
    expect(body.user).toEqual({ id: "u-1", name: "Nguyễn Văn An", email: ACCOUNTS.customer.email, role: "customer" });
  });

  // Data-driven: mỗi dòng là một test case từ bảng phân vùng tương đương
  const cases = [
    { name: "sai mật khẩu", body: { email: ACCOUNTS.customer.email, password: "Wrong1234" }, status: 401, code: "INVALID_CREDENTIALS" },
    { name: "email chưa đăng ký", body: { email: "nobody@qashop.dev", password: "Password123" }, status: 401, code: "INVALID_CREDENTIALS" },
    { name: "tài khoản bị khoá", body: ACCOUNTS.locked, status: 403, code: "ACCOUNT_LOCKED" },
    { name: "thiếu email", body: { password: "Password123" }, status: 422, code: "VALIDATION_FAILED" },
  ];
  for (const c of cases) {
    test(`đăng nhập thất bại: ${c.name}`, async ({ api }) => {
      const res = await api.post("/api/auth/login", c.body);
      await expectStatus(res, c.status);
      expect(await errorCode(res)).toBe(c.code);
    });
  }

  test("endpoint cần đăng nhập trả 401 khi thiếu token", async ({ api }) => {
    const res = await api.get("/api/auth/me");
    await expectStatus(res, 401);
    expect(await errorCode(res)).toBe("UNAUTHORIZED");
  });
});
