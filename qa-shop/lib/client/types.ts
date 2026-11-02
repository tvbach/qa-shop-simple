// Hình dạng response mà UI dùng (khớp OpenAPI)
export interface User { id: string; name: string; email: string; role: "customer" | "admin" }
export interface Product { id: string; sku: string; name: string; description: string; category: string; price: number; stock: number; image: string }
export interface ProductPage { items: Product[]; page: number; limit: number; total: number; totalPages: number }
export interface CartLine { productId: string; name: string; unitPrice: number; quantity: number; lineTotal: number; inStock: boolean }
export interface Cart {
  lines: CartLine[];
  itemCount: number;
  subtotal: number;
  discount: number;
  shippingFee: number;
  total: number;
  coupon: { code: string; description: string } | null;
  couponProblem: string | null;
}
export interface Order {
  id: string;
  lines: Omit<CartLine, "inStock">[];
  subtotal: number;
  discount: number;
  shippingFee: number;
  total: number;
  couponCode: string | null;
  shippingAddress: { fullName: string; phone: string; address: string; city: string };
  paymentMethod: "cod" | "card";
  status: string;
  createdAt: string;
}
