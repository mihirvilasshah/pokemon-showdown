"use client";

import { Loader2, Search, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { filterCatalog, DEFAULT_FILTERS, type CatalogFilters } from "@/features/pokemon/filter";
import type { CatalogItem } from "@/features/pokemon/api";
import { QUICK_PICKS } from "@/features/pokemon/selection";
import { formatName } from "@/features/pokemon/mappers";
import { useCatalogIndex } from "@/hooks/use-pokemon";
import { useDebounced } from "@/hooks/use-debounced";
import { POKEMON_TYPES, type PokemonType } from "@/types/pokemon";
import { TYPE_COLORS } from "@/config/type-colors";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { Skeleton } from "@/components/ui/skeleton";
import { PokemonCard } from "./pokemon-card";

const PAGE = 24;
const GENERATIONS = Array.from({ length: 9 }, (_, i) => i + 1);

interface BrowserProps {
  onSelect: (item: CatalogItem) => void;
  isDisabled?: (item: CatalogItem) => string | null;
  selectedName?: string | null;
  showQuickPicks?: boolean;
  autoFocus?: boolean;
}

export function PokemonBrowser({ onSelect, isDisabled, selectedName, showQuickPicks = true, autoFocus }: BrowserProps) {
  const catalog = useCatalogIndex();
  const [input, setInput] = useState("");
  const query = useDebounced(input, 250);
  const [filters, setFilters] = useState<CatalogFilters>(DEFAULT_FILTERS);
  const [visible, setVisible] = useState(PAGE);
  const sentinel = useRef<HTMLDivElement>(null);

  const effective = useMemo(() => ({ ...filters, query }), [filters, query]);
  const results = useMemo(
    () =>
      catalog.data
        ? filterCatalog(catalog.data.items, effective, { hasTypes: catalog.data.hasTypes, hasGenerations: catalog.data.hasGenerations })
        : [],
    [catalog.data, effective],
  );

  useEffect(() => {
    // Reset progressive rendering whenever the result set changes.
    setVisible(PAGE);
  }, [effective]);

  const shown = results.slice(0, visible);
  const hasMore = visible < results.length;

  useEffect(() => {
    const el = sentinel.current;
    if (!el || !hasMore || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) setVisible((v) => v + PAGE);
      },
      { rootMargin: "400px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [hasMore, visible]);

  const update = (patch: Partial<CatalogFilters>) => setFilters((f) => ({ ...f, ...patch }));
  const toggleType = (t: PokemonType) =>
    update({ types: filters.types.includes(t) ? filters.types.filter((x) => x !== t) : [...filters.types, t] });
  const anyFilter = input || filters.generation || filters.types.length || filters.includeForms;

  const quick = useMemo(() => {
    if (!catalog.data) return [];
    const byName = new Map(catalog.data.items.map((i) => [i.name, i]));
    return QUICK_PICKS.map((n) => byName.get(n)).filter((i): i is CatalogItem => !!i);
  }, [catalog.data]);

  return (
    <div className="p-4 sm:p-6" data-testid="pokemon-browser">
      <div className="grid gap-3 md:grid-cols-[1fr_auto_auto]">
        <div className="relative">
          <label htmlFor="pokemon-search" className="sr-only">
            Search Pokémon by name or Pokédex number
          </label>
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />
          <input
            id="pokemon-search"
            type="search"
            autoFocus={autoFocus}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Search name or Pokédex #…"
            className="input pl-10"
            autoComplete="off"
            data-testid="pokemon-search"
          />
        </div>
        <label className="sr-only" htmlFor="gen-filter">
          Filter by generation
        </label>
        <select
          id="gen-filter"
          className="input md:w-44"
          value={filters.generation}
          onChange={(e) => update({ generation: Number(e.target.value) })}
          disabled={catalog.data ? !catalog.data.hasGenerations : false}
        >
          <option value={0}>All generations</option>
          {GENERATIONS.map((g) => (
            <option key={g} value={g}>
              Generation {g}
            </option>
          ))}
        </select>
        <label className="sr-only" htmlFor="sort-filter">
          Sort Pokémon
        </label>
        <select
          id="sort-filter"
          className="input md:w-44"
          value={filters.sort}
          onChange={(e) => update({ sort: e.target.value as CatalogFilters["sort"] })}
        >
          <option value="dex">Sort: Pokédex #</option>
          <option value="name">Sort: A → Z</option>
        </select>
      </div>

      <fieldset className="mt-3">
        <legend className="sr-only">Filter by type (Pokémon must match all selected types)</legend>
        <div className="flex flex-wrap gap-1.5">
          {POKEMON_TYPES.map((t) => (
            <button
              key={t}
              type="button"
              className="chip"
              aria-pressed={filters.types.includes(t)}
              onClick={() => toggleType(t)}
              disabled={catalog.data ? !catalog.data.hasTypes : false}
            >
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: TYPE_COLORS[t].base }} aria-hidden />
              {TYPE_COLORS[t].label}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-muted">
        <label className="inline-flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            className="h-4 w-4 accent-[rgb(var(--accent))]"
            checked={filters.includeForms}
            onChange={(e) => update({ includeForms: e.target.checked })}
          />
          Include alternate forms (Mega, regional, Gigantamax…)
        </label>
        <span aria-live="polite">
          {catalog.data ? `${results.length.toLocaleString()} Pokémon` : ""}
          {anyFilter ? (
            <button
              type="button"
              className="ml-3 inline-flex items-center gap-1 font-semibold text-accent underline-offset-2 hover:underline"
              onClick={() => {
                setInput("");
                setFilters(DEFAULT_FILTERS);
              }}
            >
              <X className="h-3 w-3" aria-hidden /> Clear filters
            </button>
          ) : null}
        </span>
      </div>

      {catalog.data && !catalog.data.hasTypes && (
        <p className="mt-3 rounded-lg border border-line/15 bg-surface-2/40 px-3 py-2 text-xs text-muted">
          Type and generation data could not be loaded, so those filters are unavailable. Search and sorting still work.
        </p>
      )}

      {showQuickPicks && !input && !anyFilter && quick.length > 0 && (
        <section className="mt-5" aria-label="Popular Pokémon">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted">Quick picks</h3>
          <div className="scroll-thin -mx-1 flex gap-2 overflow-x-auto px-1 pb-2">
            {quick.map((item) => {
              const reason = isDisabled?.(item) ?? null;
              return (
                <button
                  key={item.name}
                  type="button"
                  className="chip shrink-0"
                  disabled={!!reason}
                  title={reason ?? undefined}
                  onClick={() => onSelect(item)}
                >
                  {formatName(item.name)}
                </button>
              );
            })}
          </div>
        </section>
      )}

      <div className="mt-5">
        {catalog.loading && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6" aria-busy="true" aria-label="Loading Pokémon">
            {Array.from({ length: 12 }, (_, i) => (
              <Skeleton key={i} className="h-44" />
            ))}
          </div>
        )}
        {catalog.error != null && !catalog.loading && (
          <ErrorState error={catalog.error} title="Couldn't load the Pokémon catalog" onRetry={catalog.retry} />
        )}
        {catalog.data && results.length === 0 && (
          <EmptyState
            title="No Pokémon found"
            message="Try a different name or Pokédex number, or remove some filters."
            action={
              <button
                type="button"
                className="btn-ghost mt-2"
                onClick={() => {
                  setInput("");
                  setFilters(DEFAULT_FILTERS);
                }}
              >
                Reset search
              </button>
            }
          />
        )}
        {catalog.data && results.length > 0 && (
          <>
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
              {shown.map((item) => {
                const reason = isDisabled?.(item) ?? null;
                return (
                  <li key={item.id}>
                    <PokemonCard item={item} onSelect={onSelect} selected={selectedName === item.name} disabled={!!reason} disabledReason={reason ?? undefined} />
                  </li>
                );
              })}
            </ul>
            <div ref={sentinel} className="flex h-16 items-center justify-center">
              {hasMore && (
                <button type="button" className="btn-ghost" onClick={() => setVisible((v) => v + PAGE)}>
                  <Loader2 className="h-4 w-4" aria-hidden /> Load more ({results.length - visible} left)
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
