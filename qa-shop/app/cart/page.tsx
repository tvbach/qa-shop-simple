"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CartSummaryList } from "@/components/cart-summary";
import { FormError } from "@/components/field";
import { useRequireLogin } from "@/components/require-login";
import { useSession } from "@/components/session-provider";
import { api, vnd } from "@/lib/client/api";
import type { Cart } from "@/lib/client/types";

export default function CartPage() {
  const ready = useRequireLogin();
  const { setCartCount } = useSession();
  const [cart, setCart] = useState<Cart | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [couponError, setCouponError] = useState<string | null>(null);

  useEffect(() => {
    if (!ready) return;
    void api<Cart>("/api/cart").then((r) => r.ok && setCart(r.data));
  }, [ready]);

  function apply(r: Awaited<ReturnType<typeof api<Cart>>>, onError: (m: string) => void) {
    if (r.ok) {
      setCart(r.data);
      setCartCount(r.data.itemCount);
      return true;
    }
    onError(r.error.message);
    return false;
  }

  async function changeQty(productId: string, quantity: number) {
    setError(null);
    apply(await api<Cart>(`/api/cart/items/${productId}`, { method: "PATCH", body: { quantity } }), setError);
  }

  async function remove(productId: string) {
    setError(null);
    apply(await api<Cart>(`/api/cart/items/${productId}`, { method: "DELETE" }), setError);
  }

  async function applyCoupon(e: React.FormEvent) {
    e.preventDefault();
    setCouponError(null);
    if (apply(await api<Cart>("/api/cart/coupon", { body: { code } }), setCouponError)) setCode("");
  }

  async function removeCoupon() {
    apply(await api<Cart>("/api/cart/coupon", { method: "DELETE" }), setCouponError);
  }

  if (!ready || !cart) return <div className="skeleton" aria-busy="true" />;

  if (cart.lines.length === 0) {
    return (
      <div className="card narrow">
        <h1>Giỏ hàng</h1>
        <p>Giỏ hàng đang trống.</p>
        <Link href="/" className="btn btn-primary">
          Tiếp tục mua sắm
        </Link>
      </div>
    );
  }

  return (
    <>
      <h1>Giỏ hàng</h1>
      <div className="two-col">
        <section className="card" aria-labelledby="lines-title">
          <h2 id="lines-title">{cart.itemCount} sản phẩm</h2>
          <FormError message={error} />
          <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {cart.lines.map((l) => (
              <li key={l.productId} className="cart-line" data-testid="cart-line">
                <div>
                  <Link href={`/products/${l.productId}`}>{l.name}</Link>
                  <div className="muted">{vnd(l.unitPrice)} / sản phẩm</div>
                  {!l.inStock && <div className="stock-out">Không đủ hàng cho số lượng này</div>}
                </div>
                <div className="field qty" style={{ marginBottom: 0 }}>
                  <label htmlFor={`qty-${l.productId}`} className="sr-only">
                    Số lượng {l.name}
                  </label>
                  <select id={`qty-${l.productId}`} value={l.quantity} onChange={(e) => changeQty(l.productId, Number(e.target.value))}>
                    {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="price" data-testid="line-total">
                  {vnd(l.lineTotal)}
                </div>
                <button type="button" className="btn btn-danger" onClick={() => remove(l.productId)} aria-label={`Xoá ${l.name}`}>
                  Xoá
                </button>
              </li>
            ))}
          </ul>
        </section>

        <aside className="card summary" aria-labelledby="summary-title">
          <h2 id="summary-title">Tóm tắt đơn hàng</h2>
          {cart.couponProblem && (
            <div role="alert" className="alert alert-warn">
              {cart.couponProblem}
            </div>
          )}
          <CartSummaryList {...cart} couponCode={cart.coupon?.code} />

          {cart.coupon ? (
            <div className="alert alert-success" role="status">
              Đã áp mã <strong>{cart.coupon.code}</strong>: {cart.coupon.description}{" "}
              <button type="button" className="btn btn-ghost" onClick={removeCoupon}>
                Bỏ mã
              </button>
            </div>
          ) : (
            <form onSubmit={applyCoupon} className="inline-form" style={{ marginBottom: "1rem" }}>
              <div className="field">
                <label htmlFor="coupon">Mã giảm giá</label>
                <input
                  id="coupon"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  aria-invalid={couponError ? true : undefined}
                  aria-describedby={couponError ? "coupon-error" : undefined}
                  autoComplete="off"
                />
                {couponError && (
                  <p id="coupon-error" className="field-error" role="alert">
                    {couponError}
                  </p>
                )}
              </div>
              <button type="submit" className="btn btn-ghost" style={{ marginTop: "1.85rem" }}>
                Áp dụng
              </button>
            </form>
          )}

          <Link href="/checkout" className="btn btn-primary btn-block">
            Thanh toán
          </Link>
        </aside>
      </div>
    </>
  );
}
