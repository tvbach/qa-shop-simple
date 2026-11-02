import { describe, expect, it } from "vitest";
import { ShopError } from "@/lib/domain/errors";
import { validateCheckout, validateRegister } from "@/lib/domain/validation";

const valid = { name: "An", email: "An@Example.com", password: "abc12345", confirmPassword: "abc12345" };

function fieldsOf(fn: () => unknown): string[] {
  try {
    fn();
  } catch (e) {
    if (e instanceof ShopError) return (e.fields ?? []).map((f) => f.field);
    throw e;
  }
  return [];
}

describe("validateRegister", () => {
  it("chuẩn hoá email về chữ thường", () => {
    expect(validateRegister(valid).email).toBe("an@example.com");
  });

  it.each<[string, Record<string, unknown>, string[]]>([
    ["tên 1 ký tự", { name: "A" }, ["name"]],
    ["tên 51 ký tự", { name: "a".repeat(51) }, ["name"]],
    ["tên 50 ký tự", { name: "a".repeat(50) }, []],
    ["email sai", { email: "an@" }, ["email"]],
    ["mật khẩu 7 ký tự", { password: "abc1234", confirmPassword: "abc1234" }, ["password"]],
    ["mật khẩu không có số", { password: "abcdefgh", confirmPassword: "abcdefgh" }, ["password"]],
    ["mật khẩu không có chữ", { password: "12345678", confirmPassword: "12345678" }, ["password"]],
    ["nhập lại không khớp", { confirmPassword: "abc12346" }, ["confirmPassword"]],
  ])("%s", (_name, patch, expected) => {
    expect(fieldsOf(() => validateRegister({ ...valid, ...patch }))).toEqual(expected);
  });
});

describe("validateCheckout", () => {
  const address = { fullName: "Nguyễn An", phone: "0912 345.678", address: "12 Lê Lợi", city: "Hà Nội" };

  it("chuẩn hoá số điện thoại", () => {
    expect(validateCheckout({ shippingAddress: address, paymentMethod: "cod" }).shippingAddress.phone).toBe("0912345678");
  });

  it.each<[string, Record<string, unknown>, string]>([
    ["SĐT 9 số", { phone: "091234567" }, "shippingAddress.phone"],
    ["SĐT không bắt đầu bằng 0", { phone: "1912345678" }, "shippingAddress.phone"],
    ["địa chỉ quá ngắn", { address: "12" }, "shippingAddress.address"],
  ])("%s", (_n, patch, field) => {
    expect(fieldsOf(() => validateCheckout({ shippingAddress: { ...address, ...patch }, paymentMethod: "cod" }))).toEqual([field]);
  });

  it("phương thức thanh toán không hợp lệ", () => {
    expect(fieldsOf(() => validateCheckout({ shippingAddress: address, paymentMethod: "crypto" }))).toEqual(["paymentMethod"]);
  });
});
