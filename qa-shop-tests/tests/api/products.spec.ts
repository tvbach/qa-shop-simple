import { expectStatus } from "../../src/api-client";
import { expect, test } from "../../src/fixtures";

test.describe("Products API", () => {
  test("tìm kiếm không phân biệt dấu", async ({ api }) => {
    const res = await api.get("/api/products?q=tai%20nghe");
    await expectStatus(res, 200);
    const { items } = await res.json();
    expect(items.map((p: { name: string }) => p.name)).toEqual(["Tai nghe chống ồn"]);
  });

  test("sắp xếp giá tăng dần trả về đúng thứ tự", async ({ api }) => {
    const { items } = await (await api.get("/api/products?sort=price-asc&limit=50")).json();
    const prices = items.map((p: { price: number }) => p.price);
    expect(prices).toEqual([...prices].sort((a, b) => a - b));
  });

  test("limit vượt biên trên (51) bị từ chối", async ({ api }) => {
    await expectStatus(await api.get("/api/products?limit=51"), 422);
  });
});
