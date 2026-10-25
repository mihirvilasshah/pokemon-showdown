import { bestStabMultiplier, type TypeChart } from "@/features/type-effectiveness/chart";
import type { Pokemon } from "@/types/pokemon";

export type Edge = "a" | "b" | "tie";

export interface MatchupAnalysis {
  speed: Edge;
  physical: Edge;
  special: Edge;
  bulk: Edge;
  /** Best own-type (STAB) multiplier each side has against the other's typing. */
  typeAtoB: number;
  typeBtoA: number;
  typeEdge: Edge;
}

const edge = (a: number, b: number, tolerance = 0): Edge =>
  Math.abs(a - b) <= tolerance ? "tie" : a > b ? "a" : "b";

/**
 * Descriptive comparison of two Pokémon. It deliberately makes no winner prediction:
 * moves, accuracy, critical hits and status effects all influence the real outcome.
 */
export function analyzeMatchup(a: Pokemon, b: Pokemon, chart: TypeChart): MatchupAnalysis {
  const bulk = (p: Pokemon) => p.stats.hp * (p.stats.defense + p.stats.specialDefense);
  const typeAtoB = bestStabMultiplier(chart, a.types, b.types);
  const typeBtoA = bestStabMultiplier(chart, b.types, a.types);
  const result: MatchupAnalysis = {
    speed: edge(a.stats.speed, b.stats.speed),
    physical: edge(a.stats.attack, b.stats.attack, 4),
    special: edge(a.stats.specialAttack, b.stats.specialAttack, 4),
    bulk: edge(bulk(a), bulk(b), Math.max(bulk(a), bulk(b)) * 0.04),
    typeAtoB,
    typeBtoA,
    typeEdge: edge(typeAtoB, typeBtoA),
  };
  return result;
}

export function edgeLabel(e: Edge, a: string, b: string, tieText = "Even"): string {
  return e === "a" ? a : e === "b" ? b : tieText;
}
