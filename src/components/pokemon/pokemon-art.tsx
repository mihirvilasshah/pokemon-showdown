"use client";

import { useState } from "react";
import { officialArtworkUrl, spriteUrl } from "@/features/pokemon/api";
import { formatName } from "@/features/pokemon/mappers";
import { cn } from "@/lib/utils";

interface PokemonArtProps {
  id: number;
  name: string;
  /** Explicit artwork URL from PokéAPI data; falls back to the id-based URL. */
  artwork?: string | null;
  sprite?: string | null;
  shiny?: boolean;
  priority?: boolean;
  className?: string;
  imgClassName?: string;
  flip?: boolean;
}

/**
 * Artwork with a fallback chain: official artwork -> standard sprite -> placeholder.
 * Plain <img> is used on purpose: images are small static PNGs on a trusted host and
 * this keeps us clear of Vercel Hobby image-optimization quotas.
 */
export function PokemonArt({
  id,
  name,
  artwork,
  sprite,
  priority = false,
  className,
  imgClassName,
  flip = false,
}: PokemonArtProps) {
  const sources = [artwork ?? officialArtworkUrl(id), sprite ?? spriteUrl(id)];
  const [index, setIndex] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const src = sources[index];

  if (index >= sources.length) {
    return (
      <div
        role="img"
        aria-label={`${formatName(name)}, Pokédex number ${id} (artwork unavailable)`}
        className={cn(
          "flex aspect-square flex-col items-center justify-center rounded-2xl border border-dashed border-line/25 bg-surface-2/40 p-3 text-center",
          className,
        )}
      >
        <span className="font-display text-sm font-semibold">{formatName(name)}</span>
        <span className="text-xs text-muted">#{String(id).padStart(4, "0")}</span>
      </div>
    );
  }

  return (
    <div className={cn("relative aspect-square", className)}>
      {!loaded && <div className="skeleton absolute inset-[10%] rounded-full" aria-hidden />}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        key={src}
        src={src}
        alt={`${formatName(name)} artwork`}
        width={475}
        height={475}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        draggable={false}
        onLoad={() => setLoaded(true)}
        onError={() => {
          setLoaded(false);
          setIndex((i) => i + 1);
        }}
        className={cn(
          "h-full w-full select-none object-contain transition-opacity duration-300",
          loaded ? "opacity-100" : "opacity-0",
          flip && "-scale-x-100",
          imgClassName,
        )}
      />
    </div>
  );
}
