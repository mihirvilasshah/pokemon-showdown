import { readRaw, removeByPrefix, removeRaw, writeRaw } from "@/lib/storage/safe-storage";

const PREFIX = "ps:cache:v2:";
const memory = new Map<string, { value: unknown; expires: number }>();
const inflight = new Map<string, Promise<unknown>>();

export const DAY_MS = 24 * 60 * 60 * 1000;

interface CacheOptions {
  /** Time to live in ms. */
  ttl: number;
  /** Persist the (already reduced) value in localStorage. */
  persist?: boolean;
}

function readPersisted<T>(key: string): T | undefined {
  const raw = readRaw(PREFIX + key);
  if (!raw) return undefined;
  try {
    const parsed = JSON.parse(raw) as { v: T; e: number };
    if (parsed.e > Date.now()) return parsed.v;
  } catch {
    /* corrupted entry */
  }
  return undefined;
}

function persist(key: string, value: unknown, expires: number) {
  const payload = JSON.stringify({ v: value, e: expires });
  const ok = writeRaw(PREFIX + key, payload);
  if (!ok) {
    // Quota pressure: drop the cache namespace and try once more.
    removeByPrefix(PREFIX);
    writeRaw(PREFIX + key, payload);
  }
}

/**
 * Memoises `loader` by key with an in-memory + optional localStorage cache.
 * Concurrent calls with the same key share one promise (request deduplication).
 * Failed loads are never cached.
 */
export function cached<T>(
  key: string,
  loader: () => Promise<T>,
  { ttl, persist: shouldPersist = false }: CacheOptions,
): Promise<T> {
  const hit = memory.get(key);
  if (hit && hit.expires > Date.now()) return Promise.resolve(hit.value as T);

  if (shouldPersist) {
    const stored = readPersisted<T>(key);
    if (stored !== undefined) {
      memory.set(key, { value: stored, expires: Date.now() + Math.min(ttl, DAY_MS) });
      return Promise.resolve(stored);
    }
  }

  const pending = inflight.get(key);
  if (pending) return pending as Promise<T>;

  const promise = loader()
    .then((value) => {
      const expires = Date.now() + ttl;
      memory.set(key, { value, expires });
      if (shouldPersist) persist(key, value, expires);
      return value;
    })
    .finally(() => {
      inflight.delete(key);
    });
  inflight.set(key, promise);
  return promise;
}

export function forget(key: string): void {
  memory.delete(key);
  removeRaw(PREFIX + key);
}

export function clearCache(): void {
  memory.clear();
  inflight.clear();
  removeByPrefix(PREFIX);
}
