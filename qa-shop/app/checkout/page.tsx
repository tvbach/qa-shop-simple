"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CartSummaryList } from "@/components/cart-summary";
import { Field, FormError } from "@/components/field";
import { useRequireLogin } from "@/components/require-login";
import { useSession } from "@/components/session-provider";
import { api, fieldError, type ApiError } from "@/lib/client/api";
import type { Cart, Order } from "@/lib/client/types";

export default function CheckoutPage() {
  const ready = useRequireLogin();
  const router = useRouter();
  const { user, setCartCount } = useSession();
  const [cart, setCart] = useState<Cart | null>(null);
  const [form, setForm] = useState({ fullName: "", phone: "", address: "", city: "" });
  const [paymentMethod, setPaymentMethod] = useState<"cod" | "card">("cod");
  const [error, setError] = useState<ApiError | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });

  useEffect(() => {
    if (!ready) return;
    void api<Cart>("/api/cart").then((r) => r.ok && setCart(r.data));
  }, [ready]);

  useEffect(() => {
    if (user && !form.fullName) setForm((f) => ({ ...f, fullName: user.name }));
  }, [user, form.fullName]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const r = await api<Order>("/api/orders", { body: { shippingAddress: form, paymentMethod } });
    setBusy(false);
    if (!r.ok) {
      setError(r.error);
      return;
    }
    setCartCount(0);
    router.push(`/orders/${r.data.id}?placed=1`);
  }

  if (!ready || !cart) return <div className="skeleton" aria-busy="true" />;

  if (cart.lines.length === 0) {
    return (
      <div className="card narrow">
        <h1>Thanh toán</h1>
        <p>Giỏ hàng đang trống, chưa thể thanh toán.</p>
        <Link href="/">Tiếp tục mua sắm</Link>
      </div>
    );
  }

  const f = (name: string) => fieldError(error, `shippingAddress.${name}`);

  return (
    <>
      <h1>Thanh toán</h1>
      <div className="two-col">
        <form onSubmit={submit} className="card" noValidate>
          <FormError message={error && error.code !== "VALIDATION_FAILED" ? error.message : null} />
          <fieldset>
            <legend className="label">Địa chỉ giao hàng</legend>
            <Field label="Họ tên người nhận" autoComplete="name" value={form.fullName} onChange={set("fullName")} error={f("fullName")} />
            <Field label="Số điện thoại" type="tel" autoComplete="tel" value={form.phone} onChange={set("phone")} error={f("phone")} hint="10 chữ số, bắt đầu bằng 0" />
            <Field label="Địa chỉ" autoComplete="street-address" value={form.address} onChange={set("address")} error={f("address")} />
            <Field label="Tỉnh/Thành phố" autoComplete="address-level1" value={form.city} onChange={set("city")} error={f("city")} />
          </fieldset>
          <fieldset>
            <legend className="label">Phương thức thanh toán</legend>
            <label className="radio">
              <input type="radio" name="payment" value="cod" checked={paymentMethod === "cod"} onChange={() => setPaymentMethod("cod")} />
              Thanh toán khi nhận hàng (COD)
            </label>
            <label className="radio">
              <input type="radio" name="payment" value="card" checked={paymentMethod === "card"} onChange={() => setPaymentMethod("card")} />
              Thẻ (giả lập — không trừ tiền thật)
            </label>
          </fieldset>
          <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
            {busy ? "Đang đặt hàng…" : "Đặt hàng"}
          </button>
        </form>
        <aside className="card summary" aria-labelledby="checkout-summary">
          <h2 id="checkout-summary">Đơn hàng ({cart.itemCount} sản phẩm)</h2>
          <CartSummaryList {...cart} couponCode={cart.coupon?.code} />
          <Link href="/cart">Sửa giỏ hàng</Link>
        </aside>
      </div>
    </>
  );
}
