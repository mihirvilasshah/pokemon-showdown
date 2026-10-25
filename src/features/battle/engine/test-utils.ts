import { FALLBACK_TYPE_CHART } from "@/features/type-effectiveness/chart";
import type { MoveData, Pokemon, PokemonType } from "@/types/pokemon";
import { createBattle } from "./battle";
import { buildCombatant } from "./stats";
import type { BattleState, Combatant } from "./types";

export function makeMove(overrides: Partial<MoveData> = {}): MoveData {
  return {
    name: "tackle",
    type: "normal",
    power: 40,
    accuracy: 100,
    pp: 35,
    damageClass: "physical",
    priority: 0,
    effectChance: null,
    category: "damage",
    ailment: null,
    ailmentChance: 0,
    critRate: 0,
    drain: 0,
    healing: 0,
    flinchChance: 0,
    minHits: null,
    maxHits: null,
    statChance: 0,
    statChanges: [],
    target: "selected-pokemon",
    shortEffect: null,
    ...overrides,
  };
}

export function makePokemon(
  name: string,
  types: PokemonType[],
  stats: Partial<Pokemon["stats"]> = {},
  id = 1,
): Pokemon {
  const base = { hp: 80, attack: 80, defense: 80, specialAttack: 80, specialDefense: 80, speed: 80, ...stats };
  return {
    id,
    name,
    speciesName: name,
    types,
    height: 1,
    weight: 10,
    baseExperience: 100,
    abilities: [],
    stats: base,
    baseStatTotal: Object.values(base).reduce((a, b) => a + b, 0),
    sprites: { home: null, homeShiny: null, artwork: null, artworkShiny: null, front: null, frontShiny: null, back: null, backShiny: null },
    moves: [],
    isDefault: true,
  };
}

export function makeCombatant(
  name: string,
  types: PokemonType[],
  moves: MoveData[],
  stats: Partial<Pokemon["stats"]> = {},
  level = 50,
  id = 1,
): Combatant {
  return buildCombatant(makePokemon(name, types, stats, id), name, moves, level);
}

export function makeBattle(a: Combatant, b: Combatant, maxTurns?: number): BattleState {
  return createBattle({ a, b, chart: FALLBACK_TYPE_CHART, maxTurns });
}
