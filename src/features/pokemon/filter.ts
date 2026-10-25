import type { CatalogItem } from "@/features/pokemon/api";
import type { PokemonType } from "@/types/pokemon";

export type SortKey = "dex" | "name";

export interface CatalogFilters {
  query: string;
  generation: number; // 0 = all
  types: PokemonType[];
  sort: SortKey;
  includeForms: boolean;
}

export const DEFAULT_FILTERS: CatalogFilters = {
  query: "",
  generation: 0,
  types: [],
  sort: "dex",
  includeForms: false,
};

const normalize = (s: string) => s.toLowerCase().replace(/[-_.'’:]/g, " ").replace(/\s+/g, " ").trim();

/** Pure filter/sort over the lightweight catalogue index. */
export function filterCatalog(
  items: CatalogItem[],
  f: CatalogFilters,
  caps: { hasTypes: boolean; hasGenerations: boolean } = { hasTypes: true, hasGenerations: true },
): CatalogItem[] {
  const q = normalize(f.query);
  const numeric = /^#?\d+$/.test(f.query.trim()) ? f.query.trim().replace("#", "") : null;
  const result = items.filter((item) => {
    if (!f.includeForms && item.id >= 10000) return false;
    if (caps.hasGenerations && f.generation !== 0 && item.generation !== f.generation) return false;
    if (caps.hasTypes && f.types.length > 0 && !f.types.every((t) => item.types.includes(t))) return false;
    if (numeric !== null) {
      return String(item.id) === numeric || String(item.dex ?? item.id).startsWith(numeric);
    }
    if (q && !normalize(item.name).includes(q)) return false;
    return true;
  });
  const cmp =
    f.sort === "name"
      ? (a: CatalogItem, b: CatalogItem) => a.name.localeCompare(b.name)
      : (a: CatalogItem, b: CatalogItem) => (a.dex ?? a.id) - (b.dex ?? b.id) || a.id - b.id;
  return result.sort(cmp);
}
