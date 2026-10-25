/**
 * localStorage wrapper that never throws. When storage is unavailable
 * (private mode, quota, disabled cookies) values live in memory for the session.
 */
const memory = new Map<string, string>();

function getStorage(): Storage | null {
  try {
    if (typeof window === "undefined") return null;
    const s = window.localStorage;
    const probe = "__ps_probe__";
    s.setItem(probe, "1");
    s.removeItem(probe);
    return s;
  } catch {
    return null;
  }
}

export function storageAvailable(): boolean {
  return getStorage() !== null;
}

export function readRaw(key: string): string | null {
  const s = getStorage();
  if (!s) return memory.get(key) ?? null;
  try {
    return s.getItem(key);
  } catch {
    return memory.get(key) ?? null;
  }
}

export function writeRaw(key: string, value: string): boolean {
  const s = getStorage();
  if (!s) {
    memory.set(key, value);
    return false;
  }
  try {
    s.setItem(key, value);
    return true;
  } catch {
    memory.set(key, value);
    return false;
  }
}

export function removeRaw(key: string): void {
  memory.delete(key);
  try {
    getStorage()?.removeItem(key);
  } catch {
    /* ignore */
  }
}

export function readJson<T>(key: string, fallback: T): T {
  const raw = readRaw(key);
  if (raw === null) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function writeJson(key: string, value: unknown): boolean {
  try {
    return writeRaw(key, JSON.stringify(value));
  } catch {
    return false;
  }
}

export function removeByPrefix(prefix: string): void {
  for (const k of [...memory.keys()]) if (k.startsWith(prefix)) memory.delete(k);
  const s = getStorage();
  if (!s) return;
  try {
    const keys: string[] = [];
    for (let i = 0; i < s.length; i++) {
      const k = s.key(i);
      if (k && k.startsWith(prefix)) keys.push(k);
    }
    keys.forEach((k) => s.removeItem(k));
  } catch {
    /* ignore */
  }
}

export const STORAGE_KEYS = {
  theme: "ps:theme",
  sound: "ps:sound",
  music: "ps:music",
  arena: "ps:arena",
  mirror: "ps:mirror",
  motion: "ps:motion",
  history: "ps:history",
} as const;
