/**
 * Dữ liệu khởi tạo cố định. `POST /api/reset` luôn trả session về đúng trạng thái này,
 * nên test có thể dựa vào các giá trị dưới đây (id, giá, tồn kho, tài khoản).
 */
import { createHash, randomBytes } from "node:crypto";
import type { Product, ShopState, User } from "./types";

export function hashPassword(password: string, salt: string): string {
  return createHash("sha256").update(`${salt}:${password}`).digest("hex");
}

export function newSalt(): string {
  return randomBytes(8).toString("hex");
}

function seedUser(id: string, name: string, email: string, password: string, extra: Partial<User> = {}): User {
  const salt = `seed-${id}`;
  return { id, name, email, role: "customer", locked: false, salt, passwordHash: hashPassword(password, salt), ...extra };
}

/** Tài khoản mẫu — công khai trong README và trang đăng nhập */
export const SEED_ACCOUNTS = {
  customer: { email: "user@qashop.dev", password: "Password123" },
  admin: { email: "admin@qashop.dev", password: "Admin12345" },
  locked: { email: "locked@qashop.dev", password: "Password123" },
} as const;

export const SEED_USERS: User[] = [
  seedUser("u-1", "Nguyễn Văn An", SEED_ACCOUNTS.customer.email, SEED_ACCOUNTS.customer.password),
  seedUser("u-2", "Quản trị viên", SEED_ACCOUNTS.admin.email, SEED_ACCOUNTS.admin.password, { role: "admin" }),
  seedUser("u-3", "Tài khoản bị khoá", SEED_ACCOUNTS.locked.email, SEED_ACCOUNTS.locked.password, { locked: true }),
];

const img = (name: string) => `/products/${name}.svg`;

export const SEED_PRODUCTS: Product[] = [
  { id: "p-1", sku: "BK-001", name: "Clean Code", category: "books", price: 289_000, stock: 25, image: img("book"), description: "Sách kinh điển về viết code dễ đọc, dễ bảo trì." },
  { id: "p-2", sku: "BK-002", name: "The Pragmatic Programmer", category: "books", price: 325_000, stock: 18, image: img("book"), description: "Những thói quen thực tế của lập trình viên giỏi." },
  { id: "p-3", sku: "BK-003", name: "Lessons Learned in Software Testing", category: "books", price: 199_000, stock: 2, image: img("book"), description: "293 bài học kiểm thử. Chỉ còn 2 cuốn — hữu ích để test giới hạn tồn kho." },
  { id: "p-4", sku: "BK-004", name: "Agile Testing", category: "books", price: 450_000, stock: 0, image: img("book"), description: "Tạm hết hàng — dùng để test trạng thái hết hàng." },
  { id: "p-5", sku: "EL-001", name: "Bàn phím cơ 87 phím", category: "electronics", price: 1_290_000, stock: 10, image: img("keyboard"), description: "Switch tactile, kết nối USB-C." },
  { id: "p-6", sku: "EL-002", name: "Chuột không dây", category: "electronics", price: 349_000, stock: 40, image: img("mouse"), description: "Pin 6 tháng, 3 mức DPI." },
  { id: "p-7", sku: "EL-003", name: "Tai nghe chống ồn", category: "electronics", price: 2_490_000, stock: 5, image: img("headphones"), description: "Chống ồn chủ động, 30 giờ pin." },
  { id: "p-8", sku: "EL-004", name: "Màn hình 27 inch 4K", category: "electronics", price: 6_990_000, stock: 3, image: img("monitor"), description: "Tấm nền IPS, 60Hz." },
  { id: "p-9", sku: "AC-001", name: "Lót chuột cỡ lớn", category: "accessories", price: 99_000, stock: 100, image: img("pad"), description: "90 × 40 cm, mặt vải mịn." },
  { id: "p-10", sku: "AC-002", name: "Giá đỡ laptop", category: "accessories", price: 259_000, stock: 30, image: img("stand"), description: "Nhôm, gấp gọn, 6 mức độ cao." },
  { id: "p-11", sku: "AC-003", name: "Cáp USB-C 2m", category: "accessories", price: 79_000, stock: 200, image: img("cable"), description: "Sạc nhanh 100W, truyền dữ liệu 10Gbps." },
  { id: "p-12", sku: "AC-004", name: "Hub USB-C 7 trong 1", category: "accessories", price: 549_000, stock: 12, image: img("hub"), description: "HDMI 4K, 3 cổng USB-A, đầu đọc thẻ SD." },
];

export function createSeedState(): ShopState {
  // structuredClone: mỗi session có bản sao riêng, sửa không ảnh hưởng dữ liệu gốc
  return structuredClone({
    version: 1,
    users: SEED_USERS,
    products: SEED_PRODUCTS,
    carts: {},
    orders: [],
    tokens: {},
    seq: { user: SEED_USERS.length, order: 0 },
  } satisfies ShopState);
}
