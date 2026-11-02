"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { FormError } from "@/components/field";
import { useSession } from "@/components/session-provider";
import { api, vnd } from "@/lib/client/api";
import { loginUrl } from "@/lib/client/redirect";
import type { Cart, Product } from "@/lib/client/types";

export default function ProductPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user, setCartCount } = useSession();
  const [product, setProduct] = useState<Product | null | undefined>(undefined);
  const [quantity, setQuantity] = useState("1");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void api<Product>(`/api/products/${encodeURIComponent(id)}`).then((r) => setProduct(r.ok ? r.data : null));
  }, [id]);

  if (product === undefined) return <div className="skeleton" aria-busy="true" />;
  if (product === null) {
    return (
      <div className="card narrow">
        <h1>Không tìm thấy sản phẩm</h1>
        <Link href="/">Quay lại danh sách</Link>
      </div>
    );
  }

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!user) {
      router.push(loginUrl());
      return;
    }
    setBusy(true);
    setError(null);
    setMessage(null);
    const r = await api<Cart>("/api/cart/items", { body: { productId: product!.id, quantity: Number(quantity) } });
    setBusy(false);
    if (r.ok) {
      setCartCount(r.data.itemCount);
      setMessage(`Đã thêm ${quantity} × ${product!.name} vào giỏ.`);
    } else setError(r.error.message);
  }

  const outOfStock = product.stock === 0;

  return (
    <div className="detail">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={product.image} alt={product.name} width={480} height={360} className="card" />
      <div>
        <p className="muted">
          <Link href="/">Sản phẩm</Link> / {product.sku}
        </p>
        <h1>{product.name}</h1>
        <p className="price" data-testid="product-price">
          {vnd(product.price)}
        </p>
        <p>{product.description}</p>
        <p className={outOfStock ? "stock-out" : "muted"} data-testid="product-stock">
          {outOfStock ? "Hết hàng" : `Còn ${product.stock} sản phẩm`}
        </p>

        <form onSubmit={add} className="card">
          <FormError message={error} />
          {message && (
            <div role="status" className="alert alert-success">
              {message} <Link href="/cart">Xem giỏ hàng</Link>
            </div>
          )}
          <div className="field">
            <label htmlFor="quantity">Số lượng</label>
            <input
              id="quantity"
              type="number"
              inputMode="numeric"
              min={1}
              max={10}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              disabled={outOfStock}
            />
            <p className="hint">Tối đa 10 mỗi sản phẩm trong giỏ.</p>
          </div>
          <button type="submit" className="btn btn-primary btn-block" disabled={outOfStock || busy}>
            {outOfStock ? "Hết hàng" : busy ? "Đang thêm…" : "Thêm vào giỏ"}
          </button>
        </form>
      </div>
    </div>
  );
}
