"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/client/api";
import type { Cart, User } from "@/lib/client/types";

interface SessionValue {
  /** undefined: đang tải; null: chưa đăng nhập */
  user: User | null | undefined;
  cartCount: number;
  refresh: () => Promise<void>;
  setCartCount: (n: number) => void;
  logout: () => Promise<void>;
}

const Ctx = createContext<SessionValue | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [cartCount, setCartCount] = useState(0);

  const refresh = useCallback(async () => {
    const me = await api<{ user: User }>("/api/auth/me");
    if (!me.ok) {
      setUser(null);
      setCartCount(0);
      return;
    }
    setUser(me.data.user);
    const cart = await api<Cart>("/api/cart");
    setCartCount(cart.ok ? cart.data.itemCount : 0);
  }, []);

  const logout = useCallback(async () => {
    await api("/api/auth/logout", { method: "POST" });
    setUser(null);
    setCartCount(0);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = useMemo(() => ({ user, cartCount, refresh, setCartCount, logout }), [user, cartCount, refresh, logout]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSession() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useSession phải nằm trong <SessionProvider>");
  return v;
}
