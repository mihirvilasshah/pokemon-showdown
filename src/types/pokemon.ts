export const POKEMON_TYPES = [
  "normal",
  "fire",
  "water",
  "electric",
  "grass",
  "ice",
  "fighting",
  "poison",
  "ground",
  "flying",
  "psychic",
  "bug",
  "rock",
  "ghost",
  "dragon",
  "dark",
  "steel",
  "fairy",
] as const;

export type PokemonType = (typeof POKEMON_TYPES)[number];

export function isPokemonType(value: string): value is PokemonType {
  return (POKEMON_TYPES as readonly string[]).includes(value);
}

export const STAT_KEYS = [
  "hp",
  "attack",
  "defense",
  "specialAttack",
  "specialDefense",
  "speed",
] as const;

export type StatKey = (typeof STAT_KEYS)[number];
export type BaseStats = Record<StatKey, number>;

export const STAT_LABELS: Record<StatKey, string> = {
  hp: "HP",
  attack: "Attack",
  defense: "Defense",
  specialAttack: "Sp. Atk",
  specialDefense: "Sp. Def",
  speed: "Speed",
};

export interface PokemonAbility {
  name: string;
  hidden: boolean;
}

export interface PokemonSprites {
  /** 3D-rendered Pokémon HOME artwork (transparent), preferred for the 3D viewer. */
  home: string | null;
  homeShiny: string | null;
  artwork: string | null;
  artworkShiny: string | null;
  front: string | null;
  frontShiny: string | null;
  back: string | null;
  backShiny: string | null;
}

export interface LearnableMove {
  name: string;
  /** Learn methods seen in the selected version group (level-up, machine, ...). */
  methods: string[];
  /** Lowest level-up level, 0 when not learned by level-up. */
  level: number;
}

export interface Pokemon {
  id: number;
  name: string;
  speciesName: string;
  types: PokemonType[];
  /** Metres. */
  height: number;
  /** Kilograms. */
  weight: number;
  baseExperience: number | null;
  abilities: PokemonAbility[];
  stats: BaseStats;
  baseStatTotal: number;
  sprites: PokemonSprites;
  moves: LearnableMove[];
  isDefault: boolean;
}

export interface PokemonSpecies {
  id: number;
  name: string;
  generation: number | null;
  genus: string | null;
  flavorText: string | null;
  isLegendary: boolean;
  isMythical: boolean;
  isBaby: boolean;
}

export type BattleStatKey = Exclude<StatKey, "hp">;

export interface StatChange {
  stat: BattleStatKey;
  change: number;
}

export type MoveDamageClass = "physical" | "special" | "status";

export interface MoveData {
  name: string;
  type: PokemonType;
  power: number | null;
  accuracy: number | null;
  pp: number;
  damageClass: MoveDamageClass;
  priority: number;
  effectChance: number | null;
  /** PokéAPI move meta category, e.g. "damage", "ailment", "net-good-stats". */
  category: string;
  ailment: string | null;
  ailmentChance: number;
  critRate: number;
  drain: number;
  healing: number;
  flinchChance: number;
  minHits: number | null;
  maxHits: number | null;
  statChance: number;
  statChanges: StatChange[];
  target: string;
  shortEffect: string | null;
}

export interface AbilityInfo {
  name: string;
  shortEffect: string | null;
}

export interface CatalogEntry {
  id: number;
  name: string;
}
