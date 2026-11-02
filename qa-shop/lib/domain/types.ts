/**
 * Kiểu dữ liệu nghiệp vụ của QA Shop. Tiền tệ: VND, số nguyên.
 */

export type Role = "customer" | "admin";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  /** sha256(salt + password) — chỉ để demo, không dùng cách này cho hệ thống thật */
  passwordHash: string;
  salt: string;
  locked: boolean;
}

export type PublicUser = Pick<User, "id" | "name" | "email" | "role">;

export type Category = "books" | "electronics" | "accessories";

export interface Product {
  id: string;
  sku: string;
  name: string;
  description: string;
  category: Category;
  price: number;
  stock: number;
  /** Đường dẫn ảnh minh hoạ (SVG nội bộ) */
  image: string;
}

export interface CartLine {
  productId: string;
  quantity: number;
}

export interface Cart {
  lines: CartLine[];
  couponCode: string | null;
}

export type PaymentMethod = "cod" | "card";

export interface ShippingAddress {
  fullName: string;
  phone: string;
  address: string;
  city: string;
}

export interface OrderLine {
  productId: string;
  name: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
}

export type OrderStatus = "confirmed";

export interface Order {
  id: string;
  userId: string;
  lines: OrderLine[];
  subtotal: number;
  discount: number;
  shippingFee: number;
  total: number;
  couponCode: string | null;
  shippingAddress: ShippingAddress;
  paymentMethod: PaymentMethod;
  status: OrderStatus;
  createdAt: string;
}

/** Toàn bộ dữ liệu của một session — mỗi người học / mỗi test có một bản riêng */
export interface ShopState {
  version: 1;
  users: User[];
  products: Product[];
  /** Giỏ hàng theo userId */
  carts: Record<string, Cart>;
  orders: Order[];
  /** token → userId */
  tokens: Record<string, string>;
  /** Bộ đếm để sinh id tuần tự, dễ đoán và lặp lại được trong test */
  seq: { user: number; order: number };
}
