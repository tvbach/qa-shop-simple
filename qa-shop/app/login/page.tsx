"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Field, FormError } from "@/components/field";
import { useSession } from "@/components/session-provider";
import { api, fieldError, type ApiError } from "@/lib/client/api";
import { safeNext } from "@/lib/client/redirect";

export default function LoginPage() {
  const router = useRouter();
  const { refresh } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<ApiError | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const r = await api("/api/auth/login", { body: { email, password } });
    setBusy(false);
    if (!r.ok) {
      setError(r.error);
      return;
    }
    await refresh();
    router.push(safeNext("/"));
  }

  return (
    <div className="narrow">
      <h1>Đăng nhập</h1>
      <form onSubmit={submit} className="card" noValidate>
        <FormError message={error && !error.fields ? error.message : null} />
        <Field label="Email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} error={fieldError(error, "email")} />
        <Field
          label="Mật khẩu"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={fieldError(error, "password")}
        />
        <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
          {busy ? "Đang đăng nhập…" : "Đăng nhập"}
        </button>
        <p>
          Chưa có tài khoản? <Link href="/register">Đăng ký</Link>
        </p>
      </form>
      <details className="card" style={{ marginTop: "1rem" }}>
        <summary>Tài khoản mẫu để luyện tập</summary>
        <ul>
          <li>
            <code>user@qashop.dev</code> / <code>Password123</code>
          </li>
          <li>
            <code>admin@qashop.dev</code> / <code>Admin12345</code>
          </li>
          <li>
            <code>locked@qashop.dev</code> — tài khoản bị khoá
          </li>
        </ul>
      </details>
    </div>
  );
}
