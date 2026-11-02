import { defineConfig, devices } from "@playwright/test";

/**
 * QA_SHOP_URL: địa chỉ QA Shop cần test (mặc định chạy local ở cổng 3000).
 * Chạy QA Shop trước: `cd ../qa-shop && npm run dev` hoặc `docker compose up` ở thư mục gốc.
 */
const baseURL = process.env.QA_SHOP_URL ?? "http://localhost:3000";
const CI = Boolean(process.env.CI);

export default defineConfig({
  fullyParallel: true,
  forbidOnly: CI,
  retries: CI ? 1 : 0,
  workers: CI ? 4 : undefined,
  reporter: CI ? [["github"], ["html", { open: "never" }]] : [["list"], ["html", { open: "never" }]],
  use: {
    baseURL,
    locale: "vi-VN",
    timezoneId: "Asia/Ho_Chi_Minh",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "api", testDir: "tests/api" },
    { name: "ui", testDir: "tests/ui", use: { ...devices["Desktop Chrome"] } },
  ],
});
