"use client";

/** Gọi API của chính QA Shop từ trình duyệt (cookie qa_session / qa_token được gửi tự động). */
export interface ApiError {
  code: string;
  message: string;
  fields?: { field: string; message: string }[];
}

export type ApiResult<T> = { ok: true; status: number; data: T } | { ok: false; status: number; error: ApiError };

export async function api<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<ApiResult<T>> {
  try {
    const res = await fetch(path, {
      method: init.method ?? (init.body === undefined ? "GET" : "POST"),
      headers: init.body === undefined ? undefined : { "Content-Type": "application/json" },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
      cache: "no-store",
    });
    const text = await res.text();
    const json = text ? JSON.parse(text) : null;
    if (!res.ok) return { ok: false, status: res.status, error: json?.error ?? { code: "UNKNOWN", message: `Lỗi ${res.status}` } };
    return { ok: true, status: res.status, data: json as T };
  } catch {
    return { ok: false, status: 0, error: { code: "NETWORK", message: "Không kết nối được máy chủ. Vui lòng thử lại." } };
  }
}

export const vnd = (n: number) => `${n.toLocaleString("vi-VN")}đ`;

export function fieldError(error: ApiError | null | undefined, field: string): string | undefined {
  return error?.fields?.find((f) => f.field === field)?.message;
}
