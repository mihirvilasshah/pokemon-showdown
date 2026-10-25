import { getMove, getMoves } from "@/features/pokemon/api";
import { learnPriority } from "@/features/pokemon/mappers";
import type { TypeChart } from "@/features/type-effectiveness/chart";
import type { MoveData, Pokemon } from "@/types/pokemon";
import { createBattle, type BattleConfig } from "./engine/battle";
import { isMoveSupported, selectMoves } from "./engine/moves";
import { buildCombatant, calcBattleStats } from "./engine/stats";
import type { BattleState } from "./engine/types";

export const MAX_CANDIDATE_MOVES = 80;

/** Learnset entries ordered for metadata loading: level-up first, then TM, egg, tutor. */
export function candidateMoveNames(pokemon: Pokemon, limit = MAX_CANDIDATE_MOVES): string[] {
  return [...pokemon.moves]
    .sort((a, b) => learnPriority(a) - learnPriority(b) || b.level - a.level || a.name.localeCompare(b.name))
    .slice(0, limit)
    .map((m) => m.name);
}

/** Load metadata for the candidate moves and keep only moves the simulator supports. */
export async function loadMoveOptions(
  pokemon: Pokemon,
  onProgress?: (done: number, total: number) => void,
): Promise<MoveData[]> {
  const moves = await getMoves(candidateMoveNames(pokemon), onProgress);
  const supported = moves.filter(isMoveSupported);
  if (supported.length > 0) return supported;
  // Incomplete learnset fallback: a generic Normal-type attack keeps the battle meaningful.
  try {
    return [await getMove("tackle")];
  } catch {
    return [];
  }
}

export function autoSelectMoves(
  pokemon: Pokemon,
  options: MoveData[],
  opponent: Pokemon,
  chart: TypeChart,
  level: number,
): MoveData[] {
  return selectMoves(
    options,
    { types: pokemon.types, stats: { hp: 0, ...calcBattleStats(pokemon.stats, level) }, level },
    opponent.types,
    chart,
  );
}

export interface BattleSide {
  pokemon: Pokemon;
  displayName: string;
  moves: MoveData[];
}

export function createBattleFromSides(
  a: BattleSide,
  b: BattleSide,
  level: number,
  chart: TypeChart,
  maxTurns?: number,
): { config: BattleConfig; state: BattleState } {
  const config: BattleConfig = {
    a: buildCombatant(a.pokemon, a.displayName, a.moves, level),
    b: buildCombatant(b.pokemon, b.displayName, b.moves, level),
    chart,
    maxTurns,
  };
  return { config, state: createBattle(config) };
}
