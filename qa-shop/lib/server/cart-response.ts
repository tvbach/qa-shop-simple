import { cartSummary } from "@/lib/domain/shop";
import type { ShopState, User } from "@/lib/domain/types";

/** Hình dạng response chung cho mọi endpoint giỏ hàng */
export function cartBody(state: ShopState, user: User) {
  return cartSummary(state, user);
}
