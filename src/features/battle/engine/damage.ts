import type { Rng } from "./types";

export interface DamageInput {
  level: number;
  power: number;
  attack: number;
  defense: number;
  stab: boolean;
  effectiveness: number;
  crit: boolean;
  /** Random roll as an integer percent in [85, 100]. */
  roll: number;
  burnedPhysical: boolean;
}

/** Core level-based damage formula (Generation 5+ style). */
export function baseDamage(level: number, power: number, attack: number, defense: number): number {
  const levelFactor = Math.floor((2 * level) / 5) + 2;
  return Math.floor(Math.floor((levelFactor * power * attack) / Math.max(1, defense)) / 50) + 2;
}

export function computeDamage(input: DamageInput): number {
  if (input.effectiveness === 0) return 0;
  let d = baseDamage(input.level, input.power, input.attack, input.defense);
  if (input.crit) d = Math.floor(d * 1.5);
  d = Math.floor((d * input.roll) / 100);
  if (input.stab) d = Math.floor(d * 1.5);
  d = Math.floor(d * input.effectiveness);
  if (input.burnedPhysical) d = Math.floor(d * 0.5);
  return Math.max(1, d);
}

/** Critical-hit chance by crit stage (Generation 6+ table). */
export const CRIT_CHANCE = [1 / 24, 1 / 8, 1 / 2, 1];

export function critChance(stage: number): number {
  return CRIT_CHANCE[Math.min(Math.max(stage, 0), CRIT_CHANCE.length - 1)];
}

export function rollCrit(rng: Rng, stage: number): boolean {
  return rng.next() < critChance(stage);
}

export function rollDamageVariance(rng: Rng): number {
  return 85 + Math.floor(rng.next() * 16);
}

export function rollAccuracy(rng: Rng, accuracy: number | null): boolean {
  if (accuracy === null) return true;
  return rng.next() * 100 < accuracy;
}
