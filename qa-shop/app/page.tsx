"use client";

import Link from "next/link";
import { useEffect, useId, useState } from "react";
import { api, vnd } from "@/lib/client/api";
import type { ProductPage } from "@/lib/client/types";

const CATEGORIES = [
  { id: "", label: "Tất cả" },
  { id: "books", label: "Sách" },
  { id: "electronics", label: "Điện tử" },
  { id: "accessories", label: "Phụ kiện" },
];
const SORTS = [
  { id: "relevance", label: "Mặc định" },
  { id: "price-asc", label: "Giá tăng dần" },
  { id: "price-desc", label: "Giá giảm dần" },
  { id: "name-asc", label: "Tên A → Z" },
];
const LIMIT = 8;

export default function CatalogPage() {
  const ids = useId();
  const [q, setQ] = useState("");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [sort, setSort] = useState("relevance");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<ProductPage | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams({ sort, page: String(page), limit: String(LIMIT) });
    if (query) params.set("q", query);
    if (category) params.set("category", category);
    void api<ProductPage>(`/api/products?${params}`).then((r) => {
      if (cancelled) return;
      if (r.ok) {
        setData(r.data);
        setError(null);
      } else setError(r.error.message);
    });
    return () => {
      cancelled = true;
    };
  }, [query, category, sort, page]);

  return (
    <>
      <h1>Sản phẩm</h1>
      <form
        role="search"
        className="toolbar"
        onSubmit={(e) => {
          e.preventDefault();
          setPage(1);
          setQuery(q.trim());
        }}
      >
        <div className="field">
          <label htmlFor={`${ids}-q`}>Tìm kiếm</label>
          <div className="inline-form">
            <input
              id={`${ids}-q`}
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Tên, SKU hoặc mô tả…"
            />
            <button type="submit" className="btn btn-primary">
              Tìm
            </button>
          </div>
        </div>
        <div className="field">
          <label htmlFor={`${ids}-cat`}>Danh mục</label>
          <select
            id={`${ids}-cat`}
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              setPage(1);
            }}
          >
            {CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor={`${ids}-sort`}>Sắp xếp</label>
          <select
            id={`${ids}-sort`}
            value={sort}
            onChange={(e) => {
              setSort(e.target.value);
              setPage(1);
            }}
          >
            {SORTS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      </form>

      {error && (
        <div role="alert" className="alert alert-error">
          {error}
        </div>
      )}

      <p className="muted" aria-live="polite" data-testid="result-count">
        {data ? `${data.total} sản phẩm` : "Đang tải…"}
      </p>

      {data && data.items.length === 0 && <p className="card">Không tìm thấy sản phẩm phù hợp.</p>}

      {data && data.items.length > 0 && (
        <ul className="product-grid" aria-label="Danh sách sản phẩm">
          {data.items.map((p) => (
            <li key={p.id}>
              <article className="card product-card" data-testid="product-card">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.image} alt="" width={240} height={180} />
                <h3>
                  <Link href={`/products/${p.id}`}>{p.name}</Link>
                </h3>
                <p className="price">{vnd(p.price)}</p>
                <p className={p.stock === 0 ? "stock-out" : p.stock <= 3 ? "stock-low" : "muted"}>
                  {p.stock === 0 ? "Hết hàng" : p.stock <= 3 ? `Chỉ còn ${p.stock}` : "Còn hàng"}
                </p>
              </article>
            </li>
          ))}
        </ul>
      )}

      {data && data.totalPages > 1 && (
        <nav className="pagination" aria-label="Phân trang">
          <button type="button" className="btn btn-ghost" disabled={page <= 1} onClick={() => setPage(page - 1)}>
            Trang trước
          </button>
          <span>
            Trang {data.page}/{data.totalPages}
          </span>
          <button type="button" className="btn btn-ghost" disabled={page >= data.totalPages} onClick={() => setPage(page + 1)}>
            Trang sau
          </button>
        </nav>
      )}
    </>
  );
}
