"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRequireLogin } from "@/components/require-login";
import { api, vnd } from "@/lib/client/api";
import type { Order } from "@/lib/client/types";

export default function OrdersPage() {
  const ready = useRequireLogin();
  const [orders, setOrders] = useState<Order[] | null>(null);

  useEffect(() => {
    if (!ready) return;
    void api<{ items: Order[] }>("/api/orders").then((r) => r.ok && setOrders(r.data.items));
  }, [ready]);

  if (!ready || !orders) return <div className="skeleton" aria-busy="true" />;

  return (
    <>
      <h1>Đơn hàng của tôi</h1>
      {orders.length === 0 ? (
        <p className="card">
          Bạn chưa có đơn hàng nào. <Link href="/">Mua sắm ngay</Link>
        </p>
      ) : (
        <ul className="order-list">
          {orders.map((o) => (
            <li key={o.id} className="card" data-testid="order-row">
              <Link href={`/orders/${o.id}`}>
                <strong>{o.id}</strong>
              </Link>{" "}
              · {new Date(o.createdAt).toLocaleString("vi-VN")} · {o.lines.reduce((s, l) => s + l.quantity, 0)} sản phẩm ·{" "}
              <strong>{vnd(o.total)}</strong>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
