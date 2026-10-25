import { ApiError } from "@/lib/api/client";
import type {
  AbilityResponse,
  MoveResponse,
  PokemonResponse,
  SpeciesResponse,
} from "@/lib/validation/pokeapi";
import {
  isPokemonType,
  type AbilityInfo,
  type BaseStats,
  type BattleStatKey,
  type LearnableMove,
  type MoveData,
  type MoveDamageClass,
  type Pokemon,
  type PokemonSpecies,
  type PokemonType,
  type StatChange,
} from "@/types/pokemon";

const SPECIAL_NAMES: Record<string, string> = {
  "mr-mime": "Mr. Mime",
  "mr-rime": "Mr. Rime",
  "mime-jr": "Mime Jr.",
  "ho-oh": "Ho-Oh",
  "porygon-z": "Porygon-Z",
  "jangmo-o": "Jangmo-o",
  "hakamo-o": "Hakamo-o",
  "kommo-o": "Kommo-o",
  "type-null": "Type: Null",
  "nidoran-f": "Nidoran ♀",
  "nidoran-m": "Nidoran ♂",
  farfetchd: "Farfetch'd",
  sirfetchd: "Sirfetch'd",
  flabebe: "Flabébé",
  "tapu-koko": "Tapu Koko",
};

export function formatName(slug: string): string {
  if (SPECIAL_NAMES[slug]) return SPECIAL_NAMES[slug];
  return slug
    .split("-")
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}

const STAT_NAME_MAP: Record<string, keyof BaseStats> = {
  hp: "hp",
  attack: "attack",
  defense: "defense",
  "special-attack": "specialAttack",
  "special-defense": "specialDefense",
  speed: "speed",
};

/** Oldest to newest. Used to pick the most recent learnset a Pokémon has data for. */
const VERSION_GROUP_ORDER = [
  "red-blue",
  "yellow",
  "gold-silver",
  "crystal",
  "ruby-sapphire",
  "emerald",
  "firered-leafgreen",
  "diamond-pearl",
  "platinum",
  "heartgold-soulsilver",
  "black-white",
  "black-2-white-2",
  "x-y",
  "omega-ruby-alpha-sapphire",
  "sun-moon",
  "ultra-sun-ultra-moon",
  "lets-go-pikachu-lets-go-eevee",
  "sword-shield",
  "brilliant-diamond-and-shining-pearl",
  "scarlet-violet",
];

const METHOD_PRIORITY = ["level-up", "machine", "egg", "tutor"];

/**
 * Simulator rule: moves are limited to the newest mainline version group that lists a
 * meaningful learnset (>= 8 moves). Falls back to the union of all groups, because
 * PokéAPI learnsets are incomplete for some forms.
 */
export function buildLearnset(moves: PokemonResponse["moves"]): LearnableMove[] {
  const counts = new Map<string, number>();
  for (const m of moves) {
    for (const d of m.version_group_details) {
      counts.set(d.version_group.name, (counts.get(d.version_group.name) ?? 0) + 1);
    }
  }
  let chosen: string | null = null;
  for (let i = VERSION_GROUP_ORDER.length - 1; i >= 0; i--) {
    if ((counts.get(VERSION_GROUP_ORDER[i]) ?? 0) >= 8) {
      chosen = VERSION_GROUP_ORDER[i];
      break;
    }
  }

  const result: LearnableMove[] = [];
  for (const m of moves) {
    const details = chosen
      ? m.version_group_details.filter((d) => d.version_group.name === chosen)
      : m.version_group_details;
    if (details.length === 0) continue;
    const methods = [...new Set(details.map((d) => d.move_learn_method.name))];
    const levels = details
      .filter((d) => d.move_learn_method.name === "level-up")
      .map((d) => d.level_learned_at);
    result.push({
      name: m.move.name,
      methods,
      level: levels.length ? Math.min(...levels) : 0,
    });
  }
  return result;
}

export function learnPriority(move: LearnableMove): number {
  const idx = Math.min(...move.methods.map((m) => METHOD_PRIORITY.indexOf(m)).map((i) => (i < 0 ? 9 : i)));
  return idx;
}

export function mapPokemon(raw: PokemonResponse): Pokemon {
  const stats = {} as BaseStats;
  for (const s of raw.stats) {
    const key = STAT_NAME_MAP[s.stat.name];
    if (key) stats[key] = s.base_stat;
  }
  const missing = Object.values(STAT_NAME_MAP).filter((k) => typeof stats[k] !== "number");
  if (missing.length) {
    throw new ApiError(`Pokémon "${raw.name}" is missing base stats: ${missing.join(", ")}`, "invalid");
  }

  const types = [...raw.types]
    .sort((a, b) => a.slot - b.slot)
    .map((t) => t.type.name)
    .filter(isPokemonType) as PokemonType[];
  if (types.length === 0) {
    throw new ApiError(`Pokémon "${raw.name}" has no supported types`, "invalid");
  }

  const art = raw.sprites.other?.["official-artwork"];
  const baseStatTotal = Object.values(stats).reduce((a, b) => a + b, 0);

  return {
    id: raw.id,
    name: raw.name,
    speciesName: raw.species.name,
    types,
    height: raw.height / 10,
    weight: raw.weight / 10,
    baseExperience: raw.base_experience ?? null,
    abilities: [...raw.abilities]
      .sort((a, b) => a.slot - b.slot)
      .map((a) => ({ name: a.ability.name, hidden: a.is_hidden })),
    stats,
    baseStatTotal,
    sprites: {
      home: raw.sprites.other?.home?.front_default ?? null,
      homeShiny: raw.sprites.other?.home?.front_shiny ?? null,
      artwork: art?.front_default ?? null,
      artworkShiny: art?.front_shiny ?? null,
      front: raw.sprites.front_default ?? null,
      frontShiny: raw.sprites.front_shiny ?? null,
      back: raw.sprites.back_default ?? null,
      backShiny: raw.sprites.back_shiny ?? null,
    },
    moves: buildLearnset(raw.moves),
    isDefault: raw.is_default ?? raw.id < 10000,
  };
}

const ROMAN: Record<string, number> = { i: 1, ii: 2, iii: 3, iv: 4, v: 5, vi: 6, vii: 7, viii: 8, ix: 9, x: 10 };

export function generationNumber(name: string | undefined): number | null {
  if (!name) return null;
  const m = /^generation-([ivx]+)$/.exec(name);
  return m ? (ROMAN[m[1]] ?? null) : null;
}

function english<T extends { language: { name: string } }>(entries: T[] | undefined): T | undefined {
  return entries?.find((e) => e.language.name === "en");
}

export function mapSpecies(raw: SpeciesResponse): PokemonSpecies {
  const flavor = english(raw.flavor_text_entries)?.flavor_text ?? null;
  return {
    id: raw.id,
    name: raw.name,
    generation: generationNumber(raw.generation?.name),
    genus: english(raw.genera)?.genus ?? null,
    flavorText: flavor ? flavor.replace(/[\n\f\r]+/g, " ").replace(/\s+/g, " ").trim() : null,
    isLegendary: raw.is_legendary ?? false,
    isMythical: raw.is_mythical ?? false,
    isBaby: raw.is_baby ?? false,
  };
}

const BATTLE_STAT_MAP: Record<string, BattleStatKey> = {
  attack: "attack",
  defense: "defense",
  "special-attack": "specialAttack",
  "special-defense": "specialDefense",
  speed: "speed",
};

export function mapMove(raw: MoveResponse): MoveData {
  const type = isPokemonType(raw.type.name) ? raw.type.name : "normal";
  const damageClass: MoveDamageClass =
    raw.damage_class.name === "physical" || raw.damage_class.name === "special"
      ? raw.damage_class.name
      : "status";
  const meta = raw.meta;
  const statChanges: StatChange[] = [];
  for (const sc of raw.stat_changes ?? []) {
    const stat = BATTLE_STAT_MAP[sc.stat.name];
    if (stat) statChanges.push({ stat, change: sc.change });
  }
  const ailment = meta?.ailment.name && meta.ailment.name !== "none" ? meta.ailment.name : null;
  return {
    name: raw.name,
    type,
    power: raw.power,
    accuracy: raw.accuracy,
    pp: raw.pp ?? 5,
    damageClass,
    priority: raw.priority,
    effectChance: raw.effect_chance ?? null,
    category: meta?.category.name ?? (raw.power ? "damage" : "unique"),
    ailment,
    ailmentChance: meta?.ailment_chance ?? 0,
    critRate: meta?.crit_rate ?? 0,
    drain: meta?.drain ?? 0,
    healing: meta?.healing ?? 0,
    flinchChance: meta?.flinch_chance ?? 0,
    minHits: meta?.min_hits ?? null,
    maxHits: meta?.max_hits ?? null,
    statChance: meta?.stat_chance ?? 0,
    statChanges,
    target: raw.target?.name ?? "selected-pokemon",
    shortEffect: english(raw.effect_entries)?.short_effect ?? null,
  };
}

export function mapAbility(raw: AbilityResponse): AbilityInfo {
  return { name: raw.name, shortEffect: english(raw.effect_entries)?.short_effect ?? null };
}
