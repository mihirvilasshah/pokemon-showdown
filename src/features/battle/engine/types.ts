import type { TypeChart } from "@/features/type-effectiveness/chart";
import type { BattleStatKey, MoveData, PokemonType } from "@/types/pokemon";

/** Injectable random source returning a float in [0, 1). */
export interface Rng {
  next(): number;
}

export type StatusCondition = "burn" | "paralysis" | "poison" | "sleep" | "freeze";
export type Side = 0 | 1;
export type StatStages = Record<BattleStatKey, number>;
export type BattleStats = Record<BattleStatKey, number>;

export interface BattleMove {
  data: MoveData;
  pp: number;
  maxPp: number;
}

export interface Combatant {
  id: number;
  name: string;
  displayName: string;
  types: PokemonType[];
  level: number;
  maxHp: number;
  hp: number;
  stats: BattleStats;
  stages: StatStages;
  status: StatusCondition | null;
  sleepTurns: number;
  flinched: boolean;
  moves: BattleMove[];
}

export type BattleAction = { type: "move"; moveIndex: number };

export type DamageSource = "move" | "burn" | "poison" | "recoil";

export type BattleEvent =
  | { kind: "turn-start"; turn: number }
  | { kind: "move-used"; turn: number; side: Side; move: string; moveType: PokemonType; damageClass: MoveData["damageClass"]; struggle: boolean }
  | { kind: "miss"; turn: number; side: Side; move: string }
  | { kind: "cant-move"; turn: number; side: Side; reason: "sleep" | "freeze" | "paralysis" | "flinch" }
  | { kind: "status-cured"; turn: number; side: Side; status: StatusCondition }
  | {
      kind: "damage";
      turn: number;
      side: Side;
      amount: number;
      hpAfter: number;
      maxHp: number;
      source: DamageSource;
      move?: string;
      moveType?: PokemonType;
      crit?: boolean;
      effectiveness?: number;
    }
  | { kind: "no-effect"; turn: number; side: Side; move: string }
  | { kind: "multi-hit"; turn: number; side: Side; hits: number }
  | { kind: "heal"; turn: number; side: Side; amount: number; hpAfter: number; maxHp: number; source: "move" | "drain" }
  | { kind: "status-applied"; turn: number; side: Side; status: StatusCondition }
  | { kind: "stat-change"; turn: number; side: Side; stat: BattleStatKey; delta: number; stage: number }
  | { kind: "effect-failed"; turn: number; side: Side; move: string; reason: string }
  | { kind: "faint"; turn: number; side: Side }
  | { kind: "battle-end"; turn: number; winner: Side | "draw"; reason: "faint" | "turn-limit" };

export interface SideStats {
  damageDealt: number;
  damageTaken: number;
  hits: number;
  crits: number;
  misses: number;
  movesUsed: number;
  superEffectiveHits: number;
}

export interface BattleState {
  turn: number;
  maxTurns: number;
  combatants: [Combatant, Combatant];
  chart: TypeChart;
  events: BattleEvent[];
  phase: "active" | "finished";
  winner: Side | "draw" | null;
  stats: [SideStats, SideStats];
}

export const STAT_STAGE_LIMIT = 6;
export const DEFAULT_LEVEL = 50;
export const DEFAULT_MAX_TURNS = 100;
