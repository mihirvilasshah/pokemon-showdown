"use client";

import { Sparkles, Swords } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useApp } from "@/components/app-provider";
import { Pokemon3D } from "@/components/pokemon/pokemon-3d";
import { modelUrlFor } from "@/features/pokemon/models3d";
import { TypeBadge, TypeBadges } from "@/components/pokemon/type-badge";
import { StatBars } from "@/components/stats/stat-bars";
import { ErrorState } from "@/components/ui/states";
import { Modal } from "@/components/ui/modal";
import { Skeleton } from "@/components/ui/skeleton";
import { TYPE_COLORS } from "@/config/type-colors";
import { getAbility } from "@/features/pokemon/api";
import { formatName } from "@/features/pokemon/mappers";
import { defensiveProfile, FALLBACK_TYPE_CHART } from "@/features/type-effectiveness/chart";
import { useAsync } from "@/hooks/use-async";
import { usePokemon, useSpecies, useTypeChart } from "@/hooks/use-pokemon";
import type { Pokemon } from "@/types/pokemon";
import { PokemonBrowser } from "@/components/selection/pokemon-browser";

function AbilityList({ pokemon }: { pokemon: Pokemon }) {
  const state = useAsync(`abilities:${pokemon.name}`, () => Promise.all(pokemon.abilities.map((a) => getAbility(a.name).catch(() => null))));
  return (
    <ul className="space-y-2">
      {pokemon.abilities.map((a, i) => {
        const info = state.data?.[i];
        return (
          <li key={a.name} className="rounded-lg bg-line/5 p-2.5 text-sm">
            <span className="font-semibold">{formatName(a.name)}</span>
            {a.hidden && <span className="ml-2 text-[10px] font-bold uppercase tracking-wider text-accent">hidden</span>}
            <p className="mt-0.5 text-xs text-muted">
              {state.loading ? "Loading description…" : (info?.shortEffect ?? "Description unavailable.")}
            </p>
          </li>
        );
      })}
    </ul>
  );
}

function Detail({ name, onClose }: { name: string; onClose: () => void }) {
  const p = usePokemon(name);
  const species = useSpecies(p.data?.speciesName ?? null);
  const chart = useTypeChart();
  const app = useApp();
  const router = useRouter();
  const [shiny, setShiny] = useState(false);
  const [moveQuery, setMoveQuery] = useState("");
  const data = p.data;

  const profile = useMemo(() => (data ? defensiveProfile(chart.data?.chart ?? FALLBACK_TYPE_CHART, data.types) : null), [data, chart.data]);
  const moves = useMemo(
    () => (data ? data.moves.filter((m) => m.name.includes(moveQuery.trim().toLowerCase().replace(/\s+/g, "-"))).sort((a, b) => (a.level || 999) - (b.level || 999) || a.name.localeCompare(b.name)) : []),
    [data, moveQuery],
  );

  const send = (slot: 0 | 1) => {
    if (!data) return;
    if (!app.selectPokemon(slot, data.name)) return;
    onClose();
    router.push("/#arena");
  };

  if (p.loading) {
    return (
      <div className="grid gap-6 p-6 md:grid-cols-2" aria-busy="true">
        <Skeleton className="aspect-square" />
        <div className="space-y-3">
          <Skeleton className="h-10" />
          <Skeleton className="h-32" />
          <Skeleton className="h-40" />
        </div>
      </div>
    );
  }
  if (p.error || !data) return <div className="p-6"><ErrorState error={p.error} onRetry={p.retry} title="Couldn't load this Pokémon" /></div>;

  const glow = TYPE_COLORS[data.types[0]].base;
  const mirrorBlocked = (slot: 0 | 1) => !app.allowMirror && app.slots[slot === 0 ? 1 : 0] === data.name;

  return (
    <div className="grid gap-6 p-4 sm:p-6 md:grid-cols-[minmax(0,340px)_1fr]" data-testid="pokemon-detail">
      <div className="space-y-4">
        <div className="relative overflow-hidden rounded-2xl border border-line/10 p-4" style={{ background: `radial-gradient(70% 60% at 50% 30%, ${glow}33, transparent 75%)` }}>
          <Pokemon3D
            id={data.id}
            name={data.name}
            home={shiny ? (data.sprites.homeShiny ?? data.sprites.home) : data.sprites.home}
            artwork={shiny ? (data.sprites.artworkShiny ?? data.sprites.artwork) : data.sprites.artwork}
            sprite={shiny ? (data.sprites.frontShiny ?? data.sprites.front) : data.sprites.front}
            priority
            interactive
            sway
            showHint expandable pose={{ rx: 0, ry: -10 }}
            modelUrl={modelUrlFor(data, shiny)}
            className="mx-auto mb-4 w-full max-w-[300px] drop-shadow-[0_14px_24px_rgba(0,0,0,0.45)]"
          />
          {(data.sprites.artworkShiny || data.sprites.frontShiny) && (
            <button type="button" className="chip absolute right-3 top-3" aria-pressed={shiny} onClick={() => setShiny((s) => !s)}>
              <Sparkles className="h-3.5 w-3.5" aria-hidden /> Shiny
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button type="button" className="btn-primary" disabled={mirrorBlocked(0)} onClick={() => send(0)} data-testid="send-0">
            <Swords className="h-4 w-4" aria-hidden /> Fighter 1
          </button>
          <button type="button" className="btn-primary" disabled={mirrorBlocked(1)} onClick={() => send(1)} data-testid="send-1">
            <Swords className="h-4 w-4" aria-hidden /> Fighter 2
          </button>
        </div>
      </div>

      <div className="space-y-5">
        <div>
          <p className="text-xs font-semibold tabular-nums text-muted">
            #{String(species.data?.id ?? data.id).padStart(4, "0")} {species.data?.genus ? `· ${species.data.genus}` : ""}
          </p>
          <h3 className="font-display text-4xl font-black">{formatName(data.name)}</h3>
          <div className="mt-2"><TypeBadges types={data.types} /></div>
          {species.data?.flavorText && <p className="mt-3 text-sm text-muted">{species.data.flavorText}</p>}
          <dl className="mt-3 grid grid-cols-2 gap-2 text-center sm:grid-cols-4">
            {[
              ["Height", `${data.height} m`],
              ["Weight", `${data.weight} kg`],
              ["Base EXP", data.baseExperience?.toString() ?? "—"],
              ["Generation", species.data?.generation ? String(species.data.generation) : "—"],
            ].map(([l, v]) => (
              <div key={l} className="rounded-lg bg-line/5 px-2 py-1.5">
                <dt className="text-[10px] uppercase tracking-wider text-muted">{l}</dt>
                <dd className="text-sm font-semibold">{v}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <section>
            <h4 className="mb-2 font-display text-sm font-bold uppercase tracking-widest">Base stats</h4>
            <StatBars stats={data.stats} total={data.baseStatTotal} />
          </section>
          <section>
            <h4 className="mb-2 font-display text-sm font-bold uppercase tracking-widest">Abilities</h4>
            <AbilityList pokemon={data} />
          </section>
        </div>

        {profile && (
          <section>
            <h4 className="mb-2 font-display text-sm font-bold uppercase tracking-widest">Type matchups (defending)</h4>
            <div className="space-y-1.5 text-xs">
              {(
                [
                  ["4× weak", profile.weak4],
                  ["2× weak", profile.weak2],
                  ["½× resists", profile.resist],
                  ["¼× resists", profile.resist4],
                  ["0× immune", profile.immune],
                ] as const
              ).map(([label, types]) =>
                types.length ? (
                  <div key={label} className="flex flex-wrap items-center gap-1.5">
                    <span className="w-24 shrink-0 font-semibold">{label}</span>
                    {types.map((t) => <TypeBadge key={t} type={t} size="sm" />)}
                  </div>
                ) : null,
              )}
            </div>
          </section>
        )}

        <section>
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <h4 className="font-display text-sm font-bold uppercase tracking-widest">Learnable moves ({data.moves.length})</h4>
            <label className="sr-only" htmlFor="move-filter">Filter moves</label>
            <input id="move-filter" className="input !min-h-[36px] !w-44 !py-1" placeholder="Filter moves…" value={moveQuery} onChange={(e) => setMoveQuery(e.target.value)} />
          </div>
          <ul className="scroll-thin grid max-h-52 grid-cols-2 gap-1.5 overflow-y-auto pr-1 text-xs sm:grid-cols-3">
            {moves.map((m) => (
              <li key={m.name} className="rounded-md bg-line/5 px-2 py-1.5">
                <span className="font-semibold">{formatName(m.name)}</span>
                <span className="block text-[10px] text-muted">{m.level ? `Lv ${m.level}` : m.methods.join(", ")}</span>
              </li>
            ))}
            {moves.length === 0 && <li className="col-span-full text-muted">No moves match.</li>}
          </ul>
          <p className="mt-1.5 text-[11px] text-muted">Learnset from the most recent game version group on PokéAPI.</p>
        </section>
      </div>
    </div>
  );
}

export function PokedexView() {
  const [selected, setSelected] = useState<string | null>(null);
  return (
    <>
      <PokemonBrowser showQuickPicks onSelect={(item) => setSelected(item.name)} />
      <Modal open={selected !== null} onClose={() => setSelected(null)} title={selected ? formatName(selected) : "Pokémon"}>
        {selected && <Detail name={selected} onClose={() => setSelected(null)} />}
      </Modal>
    </>
  );
}
