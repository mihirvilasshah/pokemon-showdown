import { POKEAPI_BASE, fetchValidated, idFromUrl } from "@/lib/api/client";
import { DAY_MS, cached, forget } from "@/lib/cache/cache";
import {
  abilitySchema,
  generationSchema,
  moveSchema,
  pokemonListSchema,
  pokemonSchema,
  speciesSchema,
  typeSchema,
  type TypeResponse,
} from "@/lib/validation/pokeapi";
import {
  FALLBACK_TYPE_CHART,
  type TypeChart,
} from "@/features/type-effectiveness/chart";
import {
  POKEMON_TYPES,
  isPokemonType,
  type AbilityInfo,
  type MoveData,
  type Pokemon,
  type PokemonSpecies,
  type PokemonType,
} from "@/types/pokemon";
import { mapAbility, mapMove, mapPokemon, mapSpecies } from "./mappers";

const WEEK = 7 * DAY_MS;
const norm = (v: string | number) => String(v).toLowerCase().trim();

export function getPokemon(nameOrId: string | number): Promise<Pokemon> {
  const key = norm(nameOrId);
  return cached(
    `pokemon:${key}`,
    async () => mapPokemon(await fetchValidated(`${POKEAPI_BASE}/pokemon/${key}/`, pokemonSchema)),
    { ttl: WEEK, persist: true },
  );
}

export function getSpecies(nameOrId: string | number): Promise<PokemonSpecies> {
  const key = norm(nameOrId);
  return cached(
    `species:${key}`,
    async () => mapSpecies(await fetchValidated(`${POKEAPI_BASE}/pokemon-species/${key}/`, speciesSchema)),
    { ttl: WEEK, persist: true },
  );
}

export function getMove(name: string): Promise<MoveData> {
  const key = norm(name);
  return cached(
    `move:${key}`,
    async () => mapMove(await fetchValidated(`${POKEAPI_BASE}/move/${key}/`, moveSchema)),
    { ttl: WEEK, persist: true },
  );
}

export function getAbility(name: string): Promise<AbilityInfo> {
  const key = norm(name);
  return cached(
    `ability:${key}`,
    async () => mapAbility(await fetchValidated(`${POKEAPI_BASE}/ability/${key}/`, abilitySchema)),
    { ttl: WEEK, persist: true },
  );
}

/** Fetch moves with limited concurrency; individual failures are skipped (nonessential). */
export async function getMoves(
  names: string[],
  onProgress?: (done: number, total: number) => void,
  concurrency = 8,
): Promise<MoveData[]> {
  const results: (MoveData | null)[] = new Array(names.length).fill(null);
  let next = 0;
  let done = 0;
  async function worker() {
    while (next < names.length) {
      const i = next++;
      try {
        results[i] = await getMove(names[i]);
      } catch {
        results[i] = null;
      }
      onProgress?.(++done, names.length);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, names.length) }, worker));
  return results.filter((m): m is MoveData => m !== null);
}

/* ---------------------------------- Types --------------------------------- */

function fetchAllTypeResponses(): Promise<TypeResponse[]> {
  return cached(
    "types-raw",
    async () =>
      Promise.all(
        POKEMON_TYPES.map((t) => fetchValidated(`${POKEAPI_BASE}/type/${t}/`, typeSchema)),
      ),
    { ttl: 10 * 60 * 1000 },
  );
}

export function chartFromResponses(responses: TypeResponse[]): TypeChart {
  const chart: TypeChart = JSON.parse(JSON.stringify(FALLBACK_TYPE_CHART));
  const pick = (refs: { name: string }[]) => refs.map((r) => r.name).filter(isPokemonType);
  for (const r of responses) {
    if (!isPokemonType(r.name)) continue;
    chart[r.name] = {
      double: pick(r.damage_relations.double_damage_to),
      half: pick(r.damage_relations.half_damage_to),
      none: pick(r.damage_relations.no_damage_to),
    };
  }
  return chart;
}

/** Type chart built from PokéAPI damage relations. Throws if the API is unavailable. */
export function getTypeChart(): Promise<TypeChart> {
  return cached("type-chart", async () => chartFromResponses(await fetchAllTypeResponses()), {
    ttl: 30 * DAY_MS,
    persist: true,
  });
}

/** Same as getTypeChart but falls back to the bundled chart so the engine never fails. */
export async function getTypeChartSafe(): Promise<{ chart: TypeChart; fromApi: boolean }> {
  try {
    return { chart: await getTypeChart(), fromApi: true };
  } catch {
    return { chart: FALLBACK_TYPE_CHART, fromApi: false };
  }
}

/* --------------------------------- Catalog -------------------------------- */

export interface CatalogItem {
  id: number;
  name: string;
  /** National Pokédex number of the species (equal to id for default forms). */
  dex: number | null;
  types: PokemonType[];
  generation: number | null;
}

export interface CatalogIndex {
  items: CatalogItem[];
  hasTypes: boolean;
  hasGenerations: boolean;
}

interface SlimCatalog {
  list: [number, string][];
  types: Partial<Record<PokemonType, [string, number][]>> | null;
  species: Record<string, [number, number]> | null; // species name -> [dex, generation]
}

function buildIndex(slim: SlimCatalog): CatalogIndex {
  const typeMap = new Map<string, { type: PokemonType; slot: number }[]>();
  if (slim.types) {
    for (const [type, entries] of Object.entries(slim.types) as [PokemonType, [string, number][]][]) {
      for (const [name, slot] of entries) {
        const arr = typeMap.get(name) ?? [];
        arr.push({ type, slot });
        typeMap.set(name, arr);
      }
    }
  }
  const species = slim.species;
  const resolveSpecies = (name: string): [number, number] | null => {
    if (!species) return null;
    if (species[name]) return species[name];
    const parts = name.split("-");
    for (let n = parts.length - 1; n >= 1; n--) {
      const candidate = parts.slice(0, n).join("-");
      if (species[candidate]) return species[candidate];
    }
    return null;
  };

  const items: CatalogItem[] = slim.list.map(([id, name]) => {
    const sp = resolveSpecies(name);
    return {
      id,
      name,
      dex: id < 10000 ? id : (sp?.[0] ?? null),
      types: (typeMap.get(name) ?? []).sort((a, b) => a.slot - b.slot).map((t) => t.type),
      generation: sp?.[1] ?? null,
    };
  });
  return { items, hasTypes: slim.types !== null, hasGenerations: slim.species !== null };
}

async function loadSlimCatalog(): Promise<SlimCatalog> {
  const [listRes, typesRes, gensRes] = await Promise.allSettled([
    fetchValidated(`${POKEAPI_BASE}/pokemon?limit=2000&offset=0`, pokemonListSchema),
    fetchAllTypeResponses(),
    Promise.all(
      Array.from({ length: 9 }, (_, i) =>
        fetchValidated(`${POKEAPI_BASE}/generation/${i + 1}/`, generationSchema),
      ),
    ),
  ]);
  if (listRes.status === "rejected") throw listRes.reason;

  const list: [number, string][] = [];
  for (const r of listRes.value.results) {
    const id = idFromUrl(r.url);
    if (id !== null) list.push([id, r.name]);
  }

  let types: SlimCatalog["types"] = null;
  if (typesRes.status === "fulfilled") {
    types = {};
    for (const t of typesRes.value) {
      if (isPokemonType(t.name)) types[t.name] = t.pokemon.map((p) => [p.pokemon.name, p.slot]);
    }
  }

  let species: SlimCatalog["species"] = null;
  if (gensRes.status === "fulfilled") {
    species = {};
    for (const g of gensRes.value) {
      for (const s of g.pokemon_species) {
        const dex = idFromUrl(s.url);
        if (dex !== null) species[s.name] = [dex, g.id];
      }
    }
  }
  return { list, types, species };
}

/**
 * Lightweight searchable catalogue: every Pokémon name/id plus type and generation
 * lookups. Detailed data and artwork are loaded lazily per card.
 */
export async function getCatalogIndex(): Promise<CatalogIndex> {
  const slim = await cached("catalog-slim", loadSlimCatalog, { ttl: WEEK, persist: true });
  // Don't keep a partial catalogue (type/generation lookups failed) around for a week.
  if (!slim.types || !slim.species) forget("catalog-slim");
  return buildIndex(slim);
}

export function homeArtUrl(id: number): string {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/home/${id}.png`;
}

export function officialArtworkUrl(id: number): string {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`;
}

export function spriteUrl(id: number): string {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`;
}
