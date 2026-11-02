"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "./session-provider";

const LINKS = [
  { href: "/", label: "Sản phẩm" },
  { href: "/orders", label: "Đơn hàng" },
];

export function Header() {
  const pathname = usePathname() ?? "/";
  const router = useRouter();
  const { user, cartCount, logout } = useSession();

  return (
    <header className="site-header">
      <div className="container header-row">
        <Link href="/" className="brand" aria-label="QA Shop — trang chủ">
          QA<span>Shop</span>
        </Link>
        <nav aria-label="Điều hướng chính">
          <ul className="nav">
            {LINKS.map((l) => (
              <li key={l.href}>
                <Link href={l.href} aria-current={pathname === l.href ? "page" : undefined}>
                  {l.label}
                </Link>
              </li>
            ))}
            <li>
              <Link href="/cart" aria-current={pathname === "/cart" ? "page" : undefined}>
                Giỏ hàng{" "}
                <span className="badge" data-testid="cart-count">
                  {cartCount}
                </span>
                <span className="sr-only"> sản phẩm</span>
              </Link>
            </li>
          </ul>
        </nav>
        <div className="account">
          {user === undefined ? null : user ? (
            <>
              <span className="muted" data-testid="current-user">
                {user.name}
              </span>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={async () => {
                  await logout();
                  router.push("/login");
                }}
              >
                Đăng xuất
              </button>
            </>
          ) : (
            <Link href="/login" className="btn btn-ghost">
              Đăng nhập
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
