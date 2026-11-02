"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { loginUrl } from "@/lib/client/redirect";
import { useSession } from "./session-provider";

/** Chuyển tới trang đăng nhập (kèm ?next=) nếu chưa đăng nhập; trả true khi đã sẵn sàng */
export function useRequireLogin(): boolean {
  const { user } = useSession();
  const router = useRouter();
  useEffect(() => {
    if (user === null) router.replace(loginUrl());
  }, [user, router]);
  return Boolean(user);
}
