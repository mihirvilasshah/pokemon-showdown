import type { BaseStats, Pokemon, BattleStatKey } from "@/types/pokemon";
import type { BattleMove, BattleStats, Combatant, StatStages } from "./types";
import type { MoveData } from "@/types/pokemon";

/** Simulator defaults: perfect IVs, 85 EVs per stat, neutral nature (like random-battle sets). */
export const DEFAULT_IV = 31;
export const DEFAULT_EV = 85;

export function calcMaxHp(base: number, level: number, iv = DEFAULT_IV, ev = DEFAULT_EV): number {
  if (base === 1) return 1; // Shedinja-style single-HP Pokémon
  return Math.floor(((2 * base + iv + Math.floor(ev / 4)) * level) / 100) + level + 10;
}

export function calcStat(base: number, level: number, iv = DEFAULT_IV, ev = DEFAULT_EV): number {
  return Math.floor(((2 * base + iv + Math.floor(ev / 4)) * level) / 100) + 5;
}

export function calcBattleStats(base: BaseStats, level: number): BattleStats {
  return {
    attack: calcStat(base.attack, level),
    defense: calcStat(base.defense, level),
    specialAttack: calcStat(base.specialAttack, level),
    specialDefense: calcStat(base.specialDefense, level),
    speed: calcStat(base.speed, level),
  };
}

/** Multiplier for a stat stage in [-6, 6]. */
export function stageMultiplier(stage: number): number {
  return stage >= 0 ? (2 + stage) / 2 : 2 / (2 - stage);
}

export function freshStages(): StatStages {
  return { attack: 0, defense: 0, specialAttack: 0, specialDefense: 0, speed: 0 };
}

export function buildCombatant(
  pokemon: Pokemon,
  displayName: string,
  moves: MoveData[],
  level: number,
): Combatant {
  const maxHp = calcMaxHp(pokemon.stats.hp, level);
  const battleMoves: BattleMove[] = moves.slice(0, 4).map((data) => ({
    data,
    pp: data.pp,
    maxPp: data.pp,
  }));
  return {
    id: pokemon.id,
    name: pokemon.name,
    displayName,
    types: pokemon.types,
    level,
    maxHp,
    hp: maxHp,
    stats: calcBattleStats(pokemon.stats, level),
    stages: freshStages(),
    status: null,
    sleepTurns: 0,
    flinched: false,
    moves: battleMoves,
  };
}

export type { BattleStatKey };
