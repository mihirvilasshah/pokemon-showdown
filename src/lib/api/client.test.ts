import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { ApiError, fetchValidated, idFromUrl } from "@/lib/api/client";
import { cached, clearCache } from "@/lib/cache/cache";
import { readRaw, storageAvailable, writeRaw } from "@/lib/storage/safe-storage";

const schema = z.object({ ok: z.boolean() });

function mockFetch(...responses: (Response | Error)[]) {
  const fn = vi.fn(async () => {
    const next = responses.shift();
    if (!next) throw new Error("no more mock responses");
    if (next instanceof Error) throw next;
    return next;
  });
  vi.stubGlobal("fetch", fn);
  return fn;
}
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

beforeEach(() => clearCache());
afterEach(() => vi.unstubAllGlobals());

describe("api client", () => {
  it("returns validated data", async () => {
    mockFetch(json({ ok: true }));
    await expect(fetchValidated("https://x/y", schema)).resolves.toEqual({ ok: true });
  });

  it("retries transient failures with backoff and then succeeds", async () => {
    const fn = mockFetch(json({}, 503), new TypeError("offline"), json({ ok: true }));
    await expect(fetchValidated("https://x/y", schema, { baseDelayMs: 1 })).resolves.toEqual({ ok: true });
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("does not retry 404s and reports not-found", async () => {
    const fn = mockFetch(json({}, 404));
    await expect(fetchValidated("https://x/y", schema, { baseDelayMs: 1 })).rejects.toMatchObject({ kind: "not-found" });
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("rejects invalid shapes without retrying", async () => {
    const fn = mockFetch(json({ nope: 1 }));
    await expect(fetchValidated("https://x/y", schema, { baseDelayMs: 1 })).rejects.toBeInstanceOf(ApiError);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("gives up after the retry budget", async () => {
    const fn = mockFetch(json({}, 500), json({}, 500), json({}, 500));
    await expect(fetchValidated("https://x/y", schema, { baseDelayMs: 1, retries: 2 })).rejects.toMatchObject({ kind: "server" });
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("extracts ids from resource urls", () => {
    expect(idFromUrl("https://pokeapi.co/api/v2/pokemon/25/")).toBe(25);
    expect(idFromUrl("https://pokeapi.co/api/v2/pokemon/pikachu/")).toBeNull();
  });
});

describe("cache", () => {
  it("deduplicates concurrent requests and caches results", async () => {
    const loader = vi.fn(async () => {
      await new Promise((r) => setTimeout(r, 5));
      return 42;
    });
    const [a, b] = await Promise.all([cached("k", loader, { ttl: 1000 }), cached("k", loader, { ttl: 1000 })]);
    expect([a, b]).toEqual([42, 42]);
    await cached("k", loader, { ttl: 1000 });
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it("does not cache failures", async () => {
    const loader = vi.fn().mockRejectedValueOnce(new Error("boom")).mockResolvedValueOnce("ok");
    await expect(cached("f", loader, { ttl: 1000 })).rejects.toThrow("boom");
    await expect(cached("f", loader, { ttl: 1000 })).resolves.toBe("ok");
  });

  it("persists values in localStorage across memory resets", async () => {
    await cached("p", async () => ({ a: 1 }), { ttl: 100000, persist: true });
    expect(readRaw("ps:cache:v2:p")).toContain('"a":1');
    const loader = vi.fn(async () => ({ a: 2 }));
    // Simulate a fresh page load: a new module instance has an empty in-memory cache.
    vi.resetModules();
    const fresh = await import("@/lib/cache/cache");
    const second = await fresh.cached("p", loader, { ttl: 100000, persist: true });
    expect(second).toEqual({ a: 1 });
    expect(loader).not.toHaveBeenCalled();
  });

  it("expires entries", async () => {
    vi.useFakeTimers();
    const loader = vi.fn(async () => Date.now());
    await cached("e", loader, { ttl: 10 });
    vi.advanceTimersByTime(50);
    await cached("e", loader, { ttl: 10 });
    expect(loader).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });
});

describe("safe storage", () => {
  it("falls back to memory when localStorage throws", () => {
    const spy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("denied");
    });
    expect(storageAvailable()).toBe(false);
    expect(writeRaw("mem-key", "v")).toBe(false);
    expect(readRaw("mem-key")).toBe("v");
    spy.mockRestore();
  });
});
