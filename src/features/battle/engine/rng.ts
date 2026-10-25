import type { Rng } from "./types";

/** Small, fast, seedable PRNG (mulberry32) for reproducible battles. */
export function createSeededRng(seed: number): Rng {
  let a = seed >>> 0;
  return {
    next() {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    },
  };
}

export const systemRng: Rng = { next: () => Math.random() };

/** Rng that replays a fixed sequence of values (cycling); for tests. */
export function createSequenceRng(values: number[]): Rng {
  let i = 0;
  return {
    next() {
      const v = values[i % values.length];
      i++;
      return v;
    },
  };
}

export function randomInt(rng: Rng, min: number, max: number): number {
  return min + Math.floor(rng.next() * (max - min + 1));
}

export function randomSeed(): number {
  return Math.floor(Math.random() * 2 ** 31);
}
