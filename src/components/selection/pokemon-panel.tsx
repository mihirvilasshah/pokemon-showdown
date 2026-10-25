"use client";

import { motion } from "framer-motion";
import { Plus, Shuffle, Sparkles, X } from "lucide-react";
import { useState } from "react";
import { formatName } from "@/features/pokemon/mappers";
import type { AsyncState } from "@/hooks/use-async";
import { useSpecies } from "@/hooks/use-pokemon";
import type { Pokemon } from "@/types/pokemon";
import { TYPE_COLORS } from "@/config/type-colors";
import { Pokemon3D } from "@/components/pokemon/pokemon-3d";
import { modelUrlFor } from "@/features/pokemon/models3d";
import { TypeBadges } from "@/components/pokemon/type-badge";
import { StatBars } from "@/components/stats/stat-bars";
import { ErrorState } from "@/components/ui/states";
import { Skeleton } from "@/components/ui/skeleton";
import { useMotionEnabled } from "@/hooks/use-motion";

interface PokemonPanelProps {
  slot: 0 | 1;
  name: string | null;
  state: AsyncState<Pokemon>;
  onChoose: () => void;
  onClear: () => void;
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-line/5 px-2.5 py-1.5">
      <dt className="text-[10px] uppercase tracking-wider text-muted">{label}</dt>
      <dd className="text-sm font-semibold tabular-nums">{value}</dd>
    </div>
  );
}

export function PokemonPanel({ slot, name, state, onChoose, onClear }: PokemonPanelProps) {
  const label = slot === 0 ? "Fighter 1" : "Fighter 2";
  const p = state.data;
  const species = useSpecies(p ? p.speciesName : null);
  const [shiny, setShiny] = useState(false);
  const motionOn = useMotionEnabled();
  const glow = p ? TYPE_COLORS[p.types[0]].base : "rgb(var(--accent2))";

  return (
    <section
      aria-label={`${label} panel`}
      data-testid={`panel-${slot}`}
      className="panel relative flex min-h-[28rem] flex-col overflow-hidden p-5"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{ background: `radial-gradient(70% 55% at ${slot === 0 ? "30%" : "70%"} 28%, ${glow}33, transparent 70%)` }}
      />
      <div className="relative flex items-center justify-between">
        <span className="eyebrow">{label}</span>
        {name && (
          <button type="button" className="btn-icon !h-9 !w-9" onClick={onClear} aria-label={`Remove ${label}`}>
            <X className="h-4 w-4" aria-hidden />
          </button>
        )}
      </div>

      {!name && (
        <div className="relative flex flex-1 flex-col items-center justify-center gap-4 py-10 text-center">
          <div className="flex h-24 w-24 items-center justify-center rounded-full border border-dashed border-line/30">
            <Plus className="h-8 w-8 text-muted" aria-hidden />
          </div>
          <div>
            <p className="font-display text-xl font-bold">Choose {label}</p>
            <p className="mt-1 text-sm text-muted">Search any Pokémon from the Pokédex.</p>
          </div>
          <button type="button" className="btn-primary" onClick={onChoose} data-testid={`choose-${slot}`}>
            Select Pokémon
          </button>
        </div>
      )}

      {name && state.loading && (
        <div className="relative mt-4 flex flex-1 flex-col gap-4" aria-busy="true" aria-label={`Loading ${label}`}>
          <Skeleton className="mx-auto h-56 w-56 !rounded-full" />
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-24 w-full" />
        </div>
      )}

      {name && !state.loading && state.error != null && (
        <div className="relative mt-4 flex flex-1 flex-col justify-center gap-3">
          <ErrorState error={state.error} title={`Couldn't load “${name}”`} onRetry={state.retry} />
          <button type="button" className="btn-ghost" onClick={onChoose}>
            Choose a different Pokémon
          </button>
        </div>
      )}

      {p && (
        <div className="relative mt-2 flex flex-1 flex-col gap-4">
          <motion.div
            key={p.name + String(shiny)}
            initial={motionOn ? { opacity: 0, x: slot === 0 ? -40 : 40, scale: 0.9 } : false}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            transition={{ type: "spring", stiffness: 140, damping: 18 }}
            className="relative mx-auto w-full max-w-[300px]"
          >
            <div
              aria-hidden
              className="absolute inset-x-6 bottom-2 h-6 rounded-[50%] bg-black/40 blur-md"
              style={{ boxShadow: `0 0 50px 8px ${glow}55` }}
            />
            <Pokemon3D
              id={p.id}
              name={p.name}
              home={shiny ? (p.sprites.homeShiny ?? p.sprites.home) : p.sprites.home}
              artwork={shiny ? (p.sprites.artworkShiny ?? p.sprites.artwork) : p.sprites.artwork}
              sprite={shiny ? (p.sprites.frontShiny ?? p.sprites.front) : p.sprites.front}
              priority
              interactive
              sway
              showHint expandable pose={{ rx: 0, ry: -12 }}
              modelUrl={modelUrlFor(p, shiny)}
              className="mb-4 w-full drop-shadow-[0_12px_24px_rgba(0,0,0,0.45)]"
              flip={slot === 0}
            />
          </motion.div>

          <div className="text-center">
            <p className="text-xs font-semibold tabular-nums text-muted">
              #{String(species.data?.id ?? p.id).padStart(4, "0")}
              {species.data?.genus ? ` · ${species.data.genus}` : ""}
            </p>
            <h3 className="font-display text-3xl font-extrabold leading-tight" data-testid={`name-${slot}`}>
              {formatName(p.name)}
            </h3>
            <div className="mt-2 flex items-center justify-center gap-2">
              <TypeBadges types={p.types} />
              {(p.sprites.artworkShiny || p.sprites.frontShiny) && (
                <button
                  type="button"
                  className="chip"
                  aria-pressed={shiny}
                  onClick={() => setShiny((s) => !s)}
                  title="Toggle shiny artwork"
                >
                  <Sparkles className="h-3.5 w-3.5" aria-hidden /> Shiny
                </button>
              )}
            </div>
          </div>

          <dl className="grid grid-cols-3 gap-2 text-center">
            <Fact label="Height" value={`${p.height} m`} />
            <Fact label="Weight" value={`${p.weight} kg`} />
            <Fact label="Base EXP" value={p.baseExperience?.toString() ?? "—"} />
          </dl>
          {species.data && (
            <p className="text-center text-xs text-muted">
              Generation {species.data.generation ?? "?"}
              {species.data.isLegendary && " · Legendary"}
              {species.data.isMythical && " · Mythical"}
              {species.data.isBaby && " · Baby"}
              {!p.isDefault && " · Alternate form"}
            </p>
          )}

          <div>
            <h4 className="mb-1.5 text-[11px] font-semibold uppercase tracking-widest text-muted">Abilities</h4>
            <ul className="flex flex-wrap gap-1.5">
              {p.abilities.map((a) => (
                <li key={a.name} className="chip !min-h-[30px] cursor-default">
                  {formatName(a.name)}
                  {a.hidden && <span className="text-[10px] text-accent">hidden</span>}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="mb-1.5 text-[11px] font-semibold uppercase tracking-widest text-muted">Base stats</h4>
            <StatBars stats={p.stats} total={p.baseStatTotal} compact />
          </div>

          <button type="button" className="btn-ghost mt-auto" onClick={onChoose} data-testid={`change-${slot}`}>
            <Shuffle className="h-4 w-4" aria-hidden /> Change Pokémon
          </button>
        </div>
      )}
    </section>
  );
}
