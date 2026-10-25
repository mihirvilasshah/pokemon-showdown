import type { ZodType } from "zod";

export const POKEAPI_BASE = "https://pokeapi.co/api/v2";

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly kind: "not-found" | "network" | "server" | "invalid" | "timeout",
    public readonly status?: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export interface FetchOptions {
  retries?: number;
  timeoutMs?: number;
  baseDelayMs?: number;
  signal?: AbortSignal;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function attempt(url: string, timeoutMs: number, outer?: AbortSignal): Promise<unknown> {
  const controller = new AbortController();
  const onAbort = () => controller.abort();
  outer?.addEventListener("abort", onAbort);
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal, headers: { Accept: "application/json" } });
    if (res.status === 404) throw new ApiError(`Resource not found: ${url}`, "not-found", 404);
    if (!res.ok) {
      throw new ApiError(
        `PokéAPI responded with ${res.status}`,
        res.status === 429 || res.status >= 500 ? "server" : "network",
        res.status,
      );
    }
    return await res.json();
  } catch (err) {
    if (err instanceof ApiError) throw err;
    if (outer?.aborted) throw err;
    if (controller.signal.aborted) throw new ApiError("The request timed out", "timeout");
    throw new ApiError("Network error while contacting PokéAPI", "network");
  } finally {
    clearTimeout(timer);
    outer?.removeEventListener("abort", onAbort);
  }
}

/** Fetch + validate JSON with timeout and exponential-backoff retries (never retries 404). */
export async function fetchValidated<T>(
  url: string,
  schema: ZodType<T>,
  { retries = 2, timeoutMs = 15000, baseDelayMs = 600, signal }: FetchOptions = {},
): Promise<T> {
  let lastError: unknown;
  for (let i = 0; i <= retries; i++) {
    try {
      const json = await attempt(url, timeoutMs, signal);
      const parsed = schema.safeParse(json);
      if (!parsed.success) {
        throw new ApiError(`Unexpected response shape from ${url}`, "invalid");
      }
      return parsed.data;
    } catch (err) {
      lastError = err;
      if (signal?.aborted) throw err;
      if (err instanceof ApiError && (err.kind === "not-found" || err.kind === "invalid")) throw err;
      if (i < retries) await sleep(baseDelayMs * 2 ** i);
    }
  }
  throw lastError;
}

export function userMessage(err: unknown): string {
  if (err instanceof ApiError) {
    switch (err.kind) {
      case "not-found":
        return "That Pokémon or resource doesn't exist.";
      case "timeout":
        return "PokéAPI is responding slowly. Please try again.";
      case "server":
        return "PokéAPI is temporarily unavailable or rate limiting requests.";
      case "invalid":
        return "PokéAPI returned data in an unexpected format.";
      default:
        return "Couldn't reach PokéAPI. Check your connection.";
    }
  }
  return "Something went wrong while loading data.";
}

/** Extract the trailing numeric id of a PokéAPI resource URL. */
export function idFromUrl(url: string): number | null {
  const match = /\/(\d+)\/?$/.exec(url);
  return match ? Number(match[1]) : null;
}
