"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Field, FormError } from "@/components/field";
import { useSession } from "@/components/session-provider";
import { api, fieldError, type ApiError } from "@/lib/client/api";

export default function RegisterPage() {
  const router = useRouter();
  const { refresh } = useSession();
  const [form, setForm] = useState({ name: "", email: "", password: "", confirmPassword: "" });
  const [error, setError] = useState<ApiError | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const r = await api("/api/auth/register", { body: form });
    setBusy(false);
    if (!r.ok) {
      setError(r.error);
      return;
    }
    await refresh();
    router.push("/");
  }

  return (
    <div className="narrow">
      <h1>Đăng ký</h1>
      <form onSubmit={submit} className="card" noValidate>
        <FormError message={error && error.code !== "VALIDATION_FAILED" && error.code !== "EMAIL_TAKEN" ? error.message : null} />
        <Field label="Họ tên" autoComplete="name" value={form.name} onChange={set("name")} error={fieldError(error, "name")} hint="2–50 ký tự" />
        <Field label="Email" type="email" autoComplete="email" value={form.email} onChange={set("email")} error={fieldError(error, "email")} />
        <Field
          label="Mật khẩu"
          type="password"
          autoComplete="new-password"
          value={form.password}
          onChange={set("password")}
          error={fieldError(error, "password")}
          hint="8–64 ký tự, có ít nhất 1 chữ cái và 1 chữ số"
        />
        <Field
          label="Nhập lại mật khẩu"
          type="password"
          autoComplete="new-password"
          value={form.confirmPassword}
          onChange={set("confirmPassword")}
          error={fieldError(error, "confirmPassword")}
        />
        <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
          {busy ? "Đang tạo tài khoản…" : "Tạo tài khoản"}
        </button>
        <p>
          Đã có tài khoản? <Link href="/login">Đăng nhập</Link>
        </p>
      </form>
    </div>
  );
}
