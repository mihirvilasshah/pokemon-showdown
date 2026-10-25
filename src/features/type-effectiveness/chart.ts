import { POKEMON_TYPES, type PokemonType } from "@/types/pokemon";

export interface TypeRelations {
  /** Defending types this attacking type hits for 2x. */
  double: PokemonType[];
  /** Defending types this attacking type hits for 0.5x. */
  half: PokemonType[];
  /** Defending types that are immune (0x). */
  none: PokemonType[];
}

/** Offensive chart: attacking type -> relations against defending types. */
export type TypeChart = Record<PokemonType, TypeRelations>;

const t = (s: string): PokemonType[] => (s ? (s.split(" ") as PokemonType[]) : []);

/**
 * Local fallback (Generation 6+ chart, including Fairy). Used when PokéAPI
 * type resources are unavailable so the battle engine never fails.
 */
export const FALLBACK_TYPE_CHART: TypeChart = {
  normal: { double: t(""), half: t("rock steel"), none: t("ghost") },
  fire: { double: t("grass ice bug steel"), half: t("fire water rock dragon"), none: t("") },
  water: { double: t("fire ground rock"), half: t("water grass dragon"), none: t("") },
  electric: { double: t("water flying"), half: t("electric grass dragon"), none: t("ground") },
  grass: {
    double: t("water ground rock"),
    half: t("fire grass poison flying bug dragon steel"),
    none: t(""),
  },
  ice: { double: t("grass ground flying dragon"), half: t("fire water ice steel"), none: t("") },
  fighting: {
    double: t("normal ice rock dark steel"),
    half: t("poison flying psychic bug fairy"),
    none: t("ghost"),
  },
  poison: { double: t("grass fairy"), half: t("poison ground rock ghost"), none: t("steel") },
  ground: {
    double: t("fire electric poison rock steel"),
    half: t("grass bug"),
    none: t("flying"),
  },
  flying: { double: t("grass fighting bug"), half: t("electric rock steel"), none: t("") },
  psychic: { double: t("fighting poison"), half: t("psychic steel"), none: t("dark") },
  bug: {
    double: t("grass psychic dark"),
    half: t("fire fighting poison flying ghost steel fairy"),
    none: t(""),
  },
  rock: { double: t("fire ice flying bug"), half: t("fighting ground steel"), none: t("") },
  ghost: { double: t("psychic ghost"), half: t("dark"), none: t("normal") },
  dragon: { double: t("dragon"), half: t("steel"), none: t("fairy") },
  dark: { double: t("psychic ghost"), half: t("fighting dark fairy"), none: t("") },
  steel: { double: t("ice rock fairy"), half: t("fire water electric steel"), none: t("") },
  fairy: { double: t("fighting dragon dark"), half: t("fire poison steel"), none: t("") },
};

/** Multiplier for a single attacking type against a single defending type. */
export function singleMultiplier(
  chart: TypeChart,
  attack: PokemonType,
  defend: PokemonType,
): number {
  const rel = chart[attack];
  if (rel.none.includes(defend)) return 0;
  if (rel.double.includes(defend)) return 2;
  if (rel.half.includes(defend)) return 0.5;
  return 1;
}

/** Combined multiplier: product across every defending type (dual types supported). */
export function typeMultiplier(
  chart: TypeChart,
  attack: PokemonType,
  defenders: readonly PokemonType[],
): number {
  return defenders.reduce((acc, def) => acc * singleMultiplier(chart, attack, def), 1);
}

export interface DefensiveProfile {
  weak4: PokemonType[];
  weak2: PokemonType[];
  neutral: PokemonType[];
  resist: PokemonType[];
  resist4: PokemonType[];
  immune: PokemonType[];
}

/** How every attacking type fares against a defender with the given types. */
export function defensiveProfile(
  chart: TypeChart,
  defenders: readonly PokemonType[],
): DefensiveProfile {
  const profile: DefensiveProfile = {
    weak4: [],
    weak2: [],
    neutral: [],
    resist: [],
    resist4: [],
    immune: [],
  };
  for (const attack of POKEMON_TYPES) {
    const m = typeMultiplier(chart, attack, defenders);
    if (m === 0) profile.immune.push(attack);
    else if (m >= 4) profile.weak4.push(attack);
    else if (m >= 2) profile.weak2.push(attack);
    else if (m <= 0.25) profile.resist4.push(attack);
    else if (m < 1) profile.resist.push(attack);
    else profile.neutral.push(attack);
  }
  return profile;
}

export function formatMultiplier(m: number): string {
  if (m === 0) return "0×";
  if (m === 0.25) return "¼×";
  if (m === 0.5) return "½×";
  return `${m}×`;
}

export function effectivenessLabel(m: number): string {
  if (m === 0) return "No effect";
  if (m >= 4) return "Extremely effective";
  if (m > 1) return "Super effective";
  if (m < 1) return m <= 0.25 ? "Strongly resisted" : "Not very effective";
  return "Neutral";
}

/** Best offensive multiplier from any of the attacker's own (STAB) types. */
export function bestStabMultiplier(
  chart: TypeChart,
  attackerTypes: readonly PokemonType[],
  defenderTypes: readonly PokemonType[],
): number {
  return Math.max(0, ...attackerTypes.map((a) => typeMultiplier(chart, a, defenderTypes)));
}
