"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { CartSummaryList } from "@/components/cart-summary";
import { useRequireLogin } from "@/components/require-login";
import { api, vnd } from "@/lib/client/api";
import type { Order } from "@/lib/client/types";

export default function OrderDetailPage() {
  const ready = useRequireLogin();
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null | undefined>(undefined);
  const [placed, setPlaced] = useState(false);

  useEffect(() => {
    setPlaced(new URLSearchParams(window.location.search).get("placed") === "1");
  }, []);

  useEffect(() => {
    if (!ready) return;
    void api<Order>(`/api/orders/${encodeURIComponent(id)}`).then((r) => setOrder(r.ok ? r.data : null));
  }, [ready, id]);

  if (!ready || order === undefined) return <div className="skeleton" aria-busy="true" />;
  if (order === null) {
    return (
      <div className="card narrow">
        <h1>Không tìm thấy đơn hàng</h1>
        <Link href="/orders">Xem đơn hàng của tôi</Link>
      </div>
    );
  }

  return (
    <>
      {placed && (
        <div role="status" className="alert alert-success">
          Đặt hàng thành công! Mã đơn của bạn là <strong data-testid="order-id">{order.id}</strong>.
        </div>
      )}
      <h1>Đơn hàng {order.id}</h1>
      <div className="two-col">
        <section className="card" aria-labelledby="order-items">
          <h2 id="order-items">Sản phẩm</h2>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th scope="col">Sản phẩm</th>
                  <th scope="col" className="num">
                    SL
                  </th>
                  <th scope="col" className="num">
                    Thành tiền
                  </th>
                </tr>
              </thead>
              <tbody>
                {order.lines.map((l) => (
                  <tr key={l.productId}>
                    <td>{l.name}</td>
                    <td className="num">{l.quantity}</td>
                    <td className="num">{vnd(l.lineTotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <h2 style={{ marginTop: "1.25rem" }}>Giao tới</h2>
          <p>
            {order.shippingAddress.fullName} · {order.shippingAddress.phone}
            <br />
            {order.shippingAddress.address}, {order.shippingAddress.city}
          </p>
          <p className="muted">
            Thanh toán: {order.paymentMethod === "cod" ? "Khi nhận hàng (COD)" : "Thẻ"} · Trạng thái: <span data-testid="order-status">Đã xác nhận</span>
          </p>
        </section>
        <aside className="card summary" aria-labelledby="order-summary">
          <h2 id="order-summary">Thanh toán</h2>
          <CartSummaryList {...order} />
        </aside>
      </div>
    </>
  );
}
