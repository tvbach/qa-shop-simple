/**
 * Chế độ lưu Redis (dùng khi deploy Vercel): kiểm tra lệnh gửi tới Upstash REST
 * bằng một fake server trong bộ nhớ (stub fetch).
 */
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createSeedState } from "@/lib/domain/seed";
import { getStore, resetSession, SESSION_TTL_SECONDS, setStoreForTesting, withState } from "@/lib/server/store";

const realFetch = globalThis.fetch;
let data: Map<string, string>;
let commands: (string | number)[][];

beforeEach(() => {
  data = new Map();
  commands = [];
  process.env.KV_REST_API_URL = "https://fake-upstash.test/";
  process.env.KV_REST_API_TOKEN = "token";
  setStoreForTesting(null);
  globalThis.fetch = (async (_url: unknown, init?: { body?: unknown; headers?: Record<string, string> }) => {
    expect(init?.headers?.Authorization).toBe("Bearer token");
    const cmd = JSON.parse(String(init?.body)) as (string | number)[];
    commands.push(cmd);
    const [name, key, value] = cmd as [string, string, string];
    let result: unknown = null;
    if (name === "GETEX") result = data.get(key) ?? null;
    else if (name === "SET") {
      data.set(key, value);
      result = "OK";
    } else if (name === "DEL") result = data.delete(key) ? 1 : 0;
    else return new Response(JSON.stringify({ error: `unsupported ${name}` }), { status: 400 });
    return new Response(JSON.stringify({ result }), { status: 200 });
  }) as typeof fetch;
});

afterEach(() => {
  globalThis.fetch = realFetch;
  delete process.env.KV_REST_API_URL;
  delete process.env.KV_REST_API_TOKEN;
  setStoreForTesting(null);
});

describe("RedisStore", () => {
  it("được chọn khi có biến môi trường Upstash", () => {
    expect(getStore().kind).toBe("redis");
  });

  it("session mới được tạo từ seed, lưu với TTL và gia hạn khi đọc", async () => {
    const stock = await withState("sess-redis-1", (s) => s.products.find((p) => p.id === "p-3")!.stock, { write: false });
    expect(stock).toBe(2);
    expect(commands[0]).toEqual(["GETEX", "qashop:v1:session:sess-redis-1", "EX", SESSION_TTL_SECONDS]);
    expect(commands[1]).toEqual(["SET", "qashop:v1:session:sess-redis-1", expect.any(String), "EX", SESSION_TTL_SECONDS]);
  });

  it("ghi rồi đọc lại đúng dữ liệu; lỗi nghiệp vụ không ghi", async () => {
    await withState("sess-redis-2", (s) => void (s.products[0].stock = 7), { write: true });
    await expect(
      withState("sess-redis-2", (s) => {
        s.products[0].stock = 0;
        throw new Error("boom");
      }, { write: true }),
    ).rejects.toThrow("boom");
    expect(await withState("sess-redis-2", (s) => s.products[0].stock, { write: false })).toBe(7);
  });

  it("reset ghi đè bằng dữ liệu seed", async () => {
    await withState("sess-redis-3", (s) => void (s.products[0].stock = 0), { write: true });
    await resetSession("sess-redis-3");
    expect(JSON.parse(data.get("qashop:v1:session:sess-redis-3")!).products).toEqual(createSeedState().products);
  });

  it("lỗi từ Upstash được ném ra (route trả 500), không nuốt im lặng", async () => {
    globalThis.fetch = (async () => new Response(JSON.stringify({ error: "ERR quota exceeded" }), { status: 200 })) as typeof fetch;
    await expect(withState("sess-redis-4", () => 1, { write: false })).rejects.toThrow("quota exceeded");
  });
});
