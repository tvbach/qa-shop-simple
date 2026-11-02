/**
 * Nghiệp vụ QA Shop trên một ShopState. Các hàm thay đổi trực tiếp `state`
 * (lớp server đọc → gọi hàm → lưu lại), không phụ thuộc HTTP hay storage nên unit test dễ.
 */
import { randomBytes } from "node:crypto";
import { ShopError } from "./errors";
import {
  assertCouponApplicable,
  findCoupon,
  MAX_QUANTITY_PER_LINE,
  MIN_QUANTITY,
  priceCart,
  type CartSummary,
} from "./pricing";
import { hashPassword, newSalt } from "./seed";
import type { Cart, Category, Order, Product, PublicUser, ShopState, User } from "./types";
import { parseQuantity, type CheckoutInput, type LoginInput, type RegisterInput } from "./validation";

export const toPublicUser = ({ id, name, email, role }: User): PublicUser => ({ id, name, email, role });

/* ---------------------------------------------------------------- auth */

export function login(state: ShopState, input: LoginInput): { token: string; user: PublicUser } {
  const user = state.users.find((u) => u.email === input.email);
  // Cùng một thông báo cho "sai email" và "sai mật khẩu" để không lộ email nào đã tồn tại
  if (!user || user.passwordHash !== hashPassword(input.password, user.salt)) {
    throw new ShopError("INVALID_CREDENTIALS", "Email hoặc mật khẩu không đúng.");
  }
  if (user.locked) throw new ShopError("ACCOUNT_LOCKED", "Tài khoản đã bị khoá. Vui lòng liên hệ hỗ trợ.");
  const token = randomBytes(24).toString("base64url");
  state.tokens[token] = user.id;
  return { token, user: toPublicUser(user) };
}

export function register(state: ShopState, input: RegisterInput): { token: string; user: PublicUser } {
  if (state.users.some((u) => u.email === input.email)) {
    throw new ShopError("EMAIL_TAKEN", "Email đã được sử dụng.", [{ field: "email", message: "Email đã được sử dụng." }]);
  }
  state.seq.user += 1;
  const salt = newSalt();
  const user: User = {
    id: `u-${state.seq.user}`,
    name: input.name,
    email: input.email,
    role: "customer",
    locked: false,
    salt,
    passwordHash: hashPassword(input.password, salt),
  };
  state.users.push(user);
  return login(state, { email: input.email, password: input.password });
}

export function logout(state: ShopState, token: string): void {
  delete state.tokens[token];
}

export function userForToken(state: ShopState, token: string | null): User | null {
  if (!token) return null;
  const id = state.tokens[token];
  return state.users.find((u) => u.id === id) ?? null;
}

export function requireUser(state: ShopState, token: string | null): User {
  const user = userForToken(state, token);
  if (!user) throw new ShopError("UNAUTHORIZED", "Bạn cần đăng nhập.");
  return user;
}

/* ------------------------------------------------------------ products */

export type ProductSort = "relevance" | "price-asc" | "price-desc" | "name-asc";
export const PRODUCT_SORTS: ProductSort[] = ["relevance", "price-asc", "price-desc", "name-asc"];
export const CATEGORIES: { id: Category; label: string }[] = [
  { id: "books", label: "Sách" },
  { id: "electronics", label: "Điện tử" },
  { id: "accessories", label: "Phụ kiện" },
];
export const PAGE_SIZE_MAX = 50;

export interface ProductQuery {
  q?: string;
  category?: string;
  sort?: string;
  page?: number;
  limit?: number;
  inStock?: boolean;
}

/** Bỏ dấu tiếng Việt để tìm "ban phim" vẫn ra "Bàn phím" */
const fold = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d");

export function listProducts(state: ShopState, query: ProductQuery) {
  const page = query.page ?? 1;
  const limit = query.limit ?? 12;
  if (!Number.isInteger(page) || page < 1) throw new ShopError("VALIDATION_FAILED", "page phải là số nguyên ≥ 1.", [{ field: "page", message: "≥ 1" }]);
  if (!Number.isInteger(limit) || limit < 1 || limit > PAGE_SIZE_MAX) {
    throw new ShopError("VALIDATION_FAILED", `limit phải từ 1 đến ${PAGE_SIZE_MAX}.`, [{ field: "limit", message: `1–${PAGE_SIZE_MAX}` }]);
  }
  const sort = (query.sort ?? "relevance") as ProductSort;
  if (!PRODUCT_SORTS.includes(sort)) {
    throw new ShopError("VALIDATION_FAILED", `sort phải là một trong: ${PRODUCT_SORTS.join(", ")}.`, [{ field: "sort", message: "Không hợp lệ" }]);
  }
  if (query.category && !CATEGORIES.some((c) => c.id === query.category)) {
    throw new ShopError("VALIDATION_FAILED", "category không hợp lệ.", [{ field: "category", message: "Không hợp lệ" }]);
  }

  const q = fold(query.q?.trim() ?? "");
  let items = state.products.filter(
    (p) =>
      (!q || fold(`${p.name} ${p.sku} ${p.description}`).includes(q)) &&
      (!query.category || p.category === query.category) &&
      (!query.inStock || p.stock > 0),
  );
  if (sort === "price-asc") items = [...items].sort((a, b) => a.price - b.price || a.id.localeCompare(b.id));
  if (sort === "price-desc") items = [...items].sort((a, b) => b.price - a.price || a.id.localeCompare(b.id));
  if (sort === "name-asc") items = [...items].sort((a, b) => a.name.localeCompare(b.name, "vi"));

  const total = items.length;
  return {
    items: items.slice((page - 1) * limit, page * limit),
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}

export function getProduct(state: ShopState, id: string): Product {
  const p = state.products.find((x) => x.id === id);
  if (!p) throw new ShopError("PRODUCT_NOT_FOUND", `Không tìm thấy sản phẩm ${id}.`);
  return p;
}

/* ---------------------------------------------------------------- cart */

function cartOf(state: ShopState, userId: string): Cart {
  return (state.carts[userId] ??= { lines: [], couponCode: null });
}

export function cartSummary(state: ShopState, user: User, now: Date = new Date()): CartSummary {
  return priceCart(cartOf(state, user.id), state.products, {
    hasPreviousOrders: state.orders.some((o) => o.userId === user.id),
    now,
  });
}

function assertStock(product: Product, quantity: number) {
  if (product.stock === 0) throw new ShopError("OUT_OF_STOCK", `${product.name} đã hết hàng.`);
  if (quantity > product.stock) {
    throw new ShopError("OUT_OF_STOCK", `Chỉ còn ${product.stock} sản phẩm ${product.name}.`, [
      { field: "quantity", message: `Tối đa ${product.stock}.` },
    ]);
  }
}

/** Thêm vào giỏ: cộng dồn nếu đã có, tổng mỗi dòng không quá 10 và không quá tồn kho */
export function addToCart(state: ShopState, user: User, productId: unknown, quantity: unknown) {
  if (typeof productId !== "string") throw new ShopError("VALIDATION_FAILED", "Thiếu productId.", [{ field: "productId", message: "Bắt buộc" }]);
  const qty = parseQuantity(quantity, MIN_QUANTITY, MAX_QUANTITY_PER_LINE);
  const product = getProduct(state, productId);
  const cart = cartOf(state, user.id);
  const line = cart.lines.find((l) => l.productId === productId);
  const next = (line?.quantity ?? 0) + qty;
  if (next > MAX_QUANTITY_PER_LINE) {
    throw new ShopError("QUANTITY_OUT_OF_RANGE", `Mỗi sản phẩm tối đa ${MAX_QUANTITY_PER_LINE} trong giỏ (đang có ${line?.quantity ?? 0}).`, [
      { field: "quantity", message: `Tối đa ${MAX_QUANTITY_PER_LINE}.` },
    ]);
  }
  assertStock(product, next);
  if (line) line.quantity = next;
  else cart.lines.push({ productId, quantity: qty });
}

export function setCartQuantity(state: ShopState, user: User, productId: string, quantity: unknown) {
  const qty = parseQuantity(quantity, MIN_QUANTITY, MAX_QUANTITY_PER_LINE);
  const line = cartOf(state, user.id).lines.find((l) => l.productId === productId);
  if (!line) throw new ShopError("NOT_FOUND", "Sản phẩm không có trong giỏ.");
  assertStock(getProduct(state, productId), qty);
  line.quantity = qty;
}

export function removeFromCart(state: ShopState, user: User, productId: string) {
  const cart = cartOf(state, user.id);
  const before = cart.lines.length;
  cart.lines = cart.lines.filter((l) => l.productId !== productId);
  if (cart.lines.length === before) throw new ShopError("NOT_FOUND", "Sản phẩm không có trong giỏ.");
}

export function applyCoupon(state: ShopState, user: User, code: unknown, now: Date = new Date()) {
  if (typeof code !== "string" || !code.trim()) {
    throw new ShopError("VALIDATION_FAILED", "Vui lòng nhập mã giảm giá.", [{ field: "code", message: "Bắt buộc" }]);
  }
  const rule = findCoupon(code);
  if (!rule) throw new ShopError("COUPON_NOT_FOUND", `Mã ${code.trim()} không tồn tại.`);
  const cart = cartOf(state, user.id);
  const { subtotal } = priceCart({ ...cart, couponCode: null }, state.products, { hasPreviousOrders: false, now });
  assertCouponApplicable(rule, { subtotal, hasPreviousOrders: state.orders.some((o) => o.userId === user.id), now });
  cart.couponCode = rule.code;
}

export function removeCoupon(state: ShopState, user: User) {
  cartOf(state, user.id).couponCode = null;
}

/* -------------------------------------------------------------- orders */

export function checkout(state: ShopState, user: User, input: CheckoutInput, now: Date = new Date()): Order {
  const cart = cartOf(state, user.id);
  if (!cart.lines.length) throw new ShopError("CART_EMPTY", "Giỏ hàng đang trống.");
  const summary = cartSummary(state, user, now);
  if (summary.couponProblem) {
    throw new ShopError("COUPON_NO_LONGER_VALID", `Mã giảm giá không còn hợp lệ: ${summary.couponProblem}`);
  }
  for (const line of cart.lines) assertStock(getProduct(state, line.productId), line.quantity);

  for (const line of cart.lines) getProduct(state, line.productId).stock -= line.quantity;
  state.seq.order += 1;
  const order: Order = {
    id: `ORD-${String(state.seq.order).padStart(4, "0")}`,
    userId: user.id,
    lines: summary.lines.map(({ inStock: _inStock, ...l }) => l),
    subtotal: summary.subtotal,
    discount: summary.discount,
    shippingFee: summary.shippingFee,
    total: summary.total,
    couponCode: summary.coupon?.code ?? null,
    shippingAddress: input.shippingAddress,
    paymentMethod: input.paymentMethod,
    status: "confirmed",
    createdAt: now.toISOString(),
  };
  state.orders.push(order);
  state.carts[user.id] = { lines: [], couponCode: null };
  return order;
}

export function listOrders(state: ShopState, user: User): Order[] {
  return state.orders.filter((o) => o.userId === user.id).sort((a, b) => b.id.localeCompare(a.id));
}

/** Đơn của người khác trả 404 (không phải 403) để không lộ sự tồn tại — chống IDOR */
export function getOrder(state: ShopState, user: User, id: string): Order {
  const order = state.orders.find((o) => o.id === id && o.userId === user.id);
  if (!order) throw new ShopError("NOT_FOUND", `Không tìm thấy đơn hàng ${id}.`);
  return order;
}
