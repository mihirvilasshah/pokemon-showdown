"use client";

import { memo } from "react";
import type { CatalogItem } from "@/features/pokemon/api";
import { formatName } from "@/features/pokemon/mappers";
import { cn } from "@/lib/utils";
import { PokemonLayered } from "@/components/pokemon/pokemon-layered";
import { TypeBadges } from "@/components/pokemon/type-badge";
import { TYPE_COLORS } from "@/config/type-colors";

interface PokemonCardProps {
  item: CatalogItem;
  onSelect: (item: CatalogItem) => void;
  selected?: boolean;
  disabled?: boolean;
  disabledReason?: string;
}

export const PokemonCard = memo(function PokemonCard({ item, onSelect, selected, disabled, disabledReason }: PokemonCardProps) {
  const accent = item.types[0] ? TYPE_COLORS[item.types[0]].base : "rgb(var(--accent2))";
  const dex = item.dex ?? item.id;
  return (
    <button
      type="button"
      onClick={() => onSelect(item)}
      disabled={disabled}
      aria-pressed={selected}
      title={disabled ? disabledReason : undefined}
      data-testid={`pokemon-card-${item.name}`}
      className={cn(
        "group relative flex flex-col items-center overflow-hidden rounded-2xl border border-line/10 bg-surface/80 p-3 text-center transition",
        "hover:-translate-y-0.5 hover:border-line/30 hover:shadow-panel disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:translate-y-0",
        selected && "border-accent ring-2 ring-accent/50",
      )}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-24 opacity-40 transition-opacity group-hover:opacity-70"
        style={{ background: `radial-gradient(60% 80% at 50% 0%, ${accent}66, transparent)` }}
      />
      <span className="relative self-start text-[11px] font-semibold tabular-nums text-muted">#{String(dex).padStart(4, "0")}</span>
      <PokemonLayered id={item.id} name={item.name} layers={5} depth={18} hoverTilt className="relative my-1 w-24 sm:w-28" />
      <span className="relative mt-1 line-clamp-1 font-display text-sm font-bold">{formatName(item.name)}</span>
      <span className="relative mt-1.5 flex min-h-[22px] justify-center">
        {item.types.length > 0 ? <TypeBadges types={item.types} size="sm" /> : <span className="text-[10px] text-muted">types unavailable</span>}
      </span>
    </button>
  );
});
