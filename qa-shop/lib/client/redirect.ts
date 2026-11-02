"use client";

/** Chỉ cho phép quay lại đường dẫn nội bộ (chống open redirect qua ?next=) */
export function safeNext(fallback = "/"): string {
  if (typeof window === "undefined") return fallback;
  const next = new URLSearchParams(window.location.search).get("next");
  return next && next.startsWith("/") && !next.startsWith("//") ? next : fallback;
}

export function loginUrl(): string {
  return `/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`;
}
