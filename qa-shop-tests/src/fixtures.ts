import { randomUUID } from "node:crypto";
import { test as base, expect } from "@playwright/test";
import { ShopApi } from "./api-client";

type Fixtures = {
  /** Session riêng cho mỗi test → chạy song song an toàn, không cần dọn dữ liệu */
  sessionId: string;
  /** API client chưa đăng nhập, cùng session với `page` */
  api: ShopApi;
  /** API client đã đăng nhập bằng tài khoản customer */
  customer: ShopApi;
};

export const test = base.extend<Fixtures>({
  sessionId: async ({}, use, testInfo) => {
    await use(`t${testInfo.workerIndex}-${randomUUID()}`);
  },

  api: async ({ playwright, baseURL, sessionId }, use) => {
    const request = await playwright.request.newContext({ baseURL });
    await use(new ShopApi(request, sessionId));
    await request.dispose();
  },

  customer: async ({ api }, use) => {
    await api.loginOrThrow();
    await use(api);
  },

  // Trình duyệt dùng chung session với API: chuẩn bị dữ liệu qua API, kiểm tra qua UI
  page: async ({ page, baseURL, sessionId }, use) => {
    await page.context().addCookies([{ name: "qa_session", value: sessionId, url: baseURL! }]);
    await use(page);
  },
});

/** Đăng nhập trình duyệt bằng token lấy từ API — bỏ qua form đăng nhập để test nhanh hơn */
export async function signInBrowser(api: ShopApi, page: import("@playwright/test").Page, baseURL: string) {
  const token = api.token ?? (await api.loginOrThrow());
  await page.context().addCookies([{ name: "qa_token", value: token, url: baseURL }]);
}

export { expect };
