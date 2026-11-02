/**
 * Validate dữ liệu đầu vào. Quy tắc được viết rõ để người học thiết kế test case:
 *
 * Đăng ký:
 * - name: 2–50 ký tự (sau khi bỏ khoảng trắng hai đầu)
 * - email: đúng định dạng, tối đa 254 ký tự, chưa được dùng (không phân biệt hoa thường)
 * - password: 8–64 ký tự, có ít nhất 1 chữ cái và 1 chữ số
 * - confirmPassword: trùng password
 *
 * Địa chỉ giao hàng:
 * - fullName: 2–80 ký tự
 * - phone: số điện thoại Việt Nam 10 chữ số, bắt đầu bằng 0 (cho phép khoảng trắng/dấu chấm)
 * - address: 5–200 ký tự; city: 2–50 ký tự
 */
import { ShopError, type FieldError } from "./errors";
import type { PaymentMethod, ShippingAddress } from "./types";

export const NAME_MIN = 2;
export const NAME_MAX = 50;
export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 64;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_RE = /^0\d{9}$/;

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");

function fail(fields: FieldError[]): never {
  throw new ShopError("VALIDATION_FAILED", "Dữ liệu không hợp lệ.", fields);
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
}

export function validateRegister(body: unknown): RegisterInput {
  if (!isObj(body)) throw new ShopError("BAD_REQUEST", "Body phải là JSON object.");
  const fields: FieldError[] = [];
  const name = str(body.name);
  const email = normalizeEmail(str(body.email));
  const password = typeof body.password === "string" ? body.password : "";
  const confirm = typeof body.confirmPassword === "string" ? body.confirmPassword : "";

  if (name.length < NAME_MIN || name.length > NAME_MAX) {
    fields.push({ field: "name", message: `Họ tên cần ${NAME_MIN}–${NAME_MAX} ký tự.` });
  }
  if (!EMAIL_RE.test(email) || email.length > 254) {
    fields.push({ field: "email", message: "Email không đúng định dạng." });
  }
  if (password.length < PASSWORD_MIN || password.length > PASSWORD_MAX) {
    fields.push({ field: "password", message: `Mật khẩu cần ${PASSWORD_MIN}–${PASSWORD_MAX} ký tự.` });
  } else if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    fields.push({ field: "password", message: "Mật khẩu cần có ít nhất 1 chữ cái và 1 chữ số." });
  }
  if (confirm !== password) {
    fields.push({ field: "confirmPassword", message: "Mật khẩu nhập lại không khớp." });
  }
  if (fields.length) fail(fields);
  return { name, email, password };
}

export interface LoginInput {
  email: string;
  password: string;
}

export function validateLogin(body: unknown): LoginInput {
  if (!isObj(body)) throw new ShopError("BAD_REQUEST", "Body phải là JSON object.");
  const email = normalizeEmail(str(body.email));
  const password = typeof body.password === "string" ? body.password : "";
  const fields: FieldError[] = [];
  if (!email) fields.push({ field: "email", message: "Vui lòng nhập email." });
  if (!password) fields.push({ field: "password", message: "Vui lòng nhập mật khẩu." });
  if (fields.length) fail(fields);
  return { email, password };
}

/** Số lượng phải là số nguyên trong [min, max] */
export function parseQuantity(v: unknown, min: number, max: number): number {
  if (typeof v !== "number" || !Number.isInteger(v) || v < min || v > max) {
    throw new ShopError("QUANTITY_OUT_OF_RANGE", `Số lượng phải là số nguyên từ ${min} đến ${max}.`, [
      { field: "quantity", message: `Từ ${min} đến ${max}.` },
    ]);
  }
  return v;
}

export interface CheckoutInput {
  shippingAddress: ShippingAddress;
  paymentMethod: PaymentMethod;
}

export function validateCheckout(body: unknown): CheckoutInput {
  if (!isObj(body)) throw new ShopError("BAD_REQUEST", "Body phải là JSON object.");
  const a = isObj(body.shippingAddress) ? body.shippingAddress : {};
  const fullName = str(a.fullName);
  const phone = str(a.phone).replace(/[\s.]/g, "");
  const address = str(a.address);
  const city = str(a.city);
  const paymentMethod = body.paymentMethod;
  const fields: FieldError[] = [];

  if (fullName.length < 2 || fullName.length > 80) fields.push({ field: "shippingAddress.fullName", message: "Họ tên người nhận cần 2–80 ký tự." });
  if (!PHONE_RE.test(phone)) fields.push({ field: "shippingAddress.phone", message: "Số điện thoại cần 10 chữ số, bắt đầu bằng 0." });
  if (address.length < 5 || address.length > 200) fields.push({ field: "shippingAddress.address", message: "Địa chỉ cần 5–200 ký tự." });
  if (city.length < 2 || city.length > 50) fields.push({ field: "shippingAddress.city", message: "Tỉnh/thành phố cần 2–50 ký tự." });
  if (paymentMethod !== "cod" && paymentMethod !== "card") fields.push({ field: "paymentMethod", message: "Chọn cod hoặc card." });
  if (fields.length) fail(fields);

  return { shippingAddress: { fullName, phone, address, city }, paymentMethod: paymentMethod as PaymentMethod };
}
