"use client";

import { RotateCcw, Swords, Zap, Gamepad2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useApp } from "@/components/app-provider";
import { ARENAS } from "@/config/arenas";
import { autoSelectMoves } from "@/features/battle/prepare";
import type { BattleLaunch } from "@/features/battle/launch";
import { describeMoveSummary } from "@/features/battle/engine/moves";
import { randomSeed } from "@/features/battle/engine/rng";
import { formatName } from "@/features/pokemon/mappers";
import { MAX_LEVEL, MIN_LEVEL } from "@/features/pokemon/selection";
import type { TypeChart } from "@/features/type-effectiveness/chart";
import { useMoveOptions } from "@/hooks/use-move-options";
import type { MoveData, Pokemon } from "@/types/pokemon";
import { TypeBadge } from "@/components/pokemon/type-badge";
import { ErrorState } from "@/components/ui/states";
import { cn } from "@/lib/utils";
import { sound } from "@/features/sound/sound-engine";

interface BattleSetupProps {
  a: Pokemon;
  b: Pokemon;
  chart: TypeChart;
  onStart: (launch: BattleLaunch) => void;
}

function MoveLine({ move }: { move: MoveData }) {
  return (
    <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted">
      <TypeBadge type={move.type} size="sm" />
      <span className="capitalize">{move.damageClass}</span>
      <span>{describeMoveSummary(move)}</span>
      {move.accuracy !== null && <span>{move.accuracy}% acc</span>}
      <span>{move.pp} PP</span>
      {move.priority !== 0 && <span>priority {move.priority > 0 ? "+" : ""}{move.priority}</span>}
    </p>
  );
}

function Loadout({
  pokemon,
  options,
  state,
  selected,
  onChange,
  onReset,
  custom,
  testId,
}: {
  pokemon: Pokemon;
  options: MoveData[];
  state: ReturnType<typeof useMoveOptions>;
  selected: MoveData[];
  onChange: (names: string[]) => void;
  onReset: () => void;
  custom: boolean;
  testId: string;
}) {
  const names = selected.map((m) => m.name);
  const slots = Math.max(1, Math.min(4, Math.max(names.length, Math.min(4, options.length))));
  return (
    <div className="rounded-xl border border-line/10 bg-surface-2/30 p-4" data-testid={testId}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h4 className="font-display font-bold">{formatName(pokemon.name)}&apos;s moves</h4>
        {custom && (
          <button type="button" className="chip" onClick={onReset}>
            <RotateCcw className="h-3 w-3" aria-hidden /> Auto-select
          </button>
        )}
      </div>
      {state.loading && (
        <p className="text-sm text-muted" role="status">
          Loading move data… {state.total > 0 ? `${state.done}/${state.total}` : ""}
        </p>
      )}
      {state.error && <ErrorState compact title="Couldn't load moves" onRetry={state.retry} message="Move metadata could not be loaded. Retry to configure moves." />}
      {!state.loading && !state.error && options.length === 0 && (
        <p className="text-sm text-muted">No supported moves found; this Pokémon will use Struggle.</p>
      )}
      {!state.loading && options.length > 0 && (
        <ol className="space-y-3">
          {Array.from({ length: slots }, (_, i) => {
            const current = names[i] ?? "";
            return (
              <li key={i}>
                <label className="sr-only" htmlFor={`${testId}-slot-${i}`}>
                  Move slot {i + 1} for {formatName(pokemon.name)}
                </label>
                <select
                  id={`${testId}-slot-${i}`}
                  className="input"
                  value={current}
                  onChange={(e) => {
                    const next = [...names];
                    if (e.target.value === "") next.splice(i, 1);
                    else next[i] = e.target.value;
                    onChange(next.filter(Boolean));
                  }}
                >
                  {i > 0 && <option value="">— empty slot —</option>}
                  {options.map((m) => (
                    <option key={m.name} value={m.name} disabled={names.includes(m.name) && names[i] !== m.name}>
                      {formatName(m.name)} · {m.type}
                    </option>
                  ))}
                </select>
                {selected[i] && <MoveLine move={selected[i]} />}
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}

/** Battle preparation: level, mode, arena, and validated move selection for both fighters. */
export function BattleSetup({ a, b, chart, onStart }: BattleSetupProps) {
  const { level, setLevel, mode, setMode, arena, setArena } = useApp();
  const movesA = useMoveOptions(a);
  const movesB = useMoveOptions(b);
  const [custom, setCustom] = useState<{ a: string[] | null; b: string[] | null; key: string }>({ a: null, b: null, key: "" });
  const key = `${a.name}|${b.name}`;

  useEffect(() => {
    setCustom({ a: null, b: null, key });
  }, [key]);

  const autoA = useMemo(() => autoSelectMoves(a, movesA.options, b, chart, level), [a, b, movesA.options, chart, level]);
  const autoB = useMemo(() => autoSelectMoves(b, movesB.options, a, chart, level), [a, b, movesB.options, chart, level]);

  const resolve = (names: string[] | null, auto: MoveData[], options: MoveData[]) =>
    names && custom.key === key
      ? (names.map((n) => options.find((o) => o.name === n)).filter(Boolean) as MoveData[])
      : auto;
  const selA = resolve(custom.a, autoA, movesA.options);
  const selB = resolve(custom.b, autoB, movesB.options);

  const ready = !movesA.loading && !movesB.loading && !movesA.error && !movesB.error;

  const start = () => {
    sound.play("start");
    const arenaId = arena === "random" ? ARENAS[Math.floor(Math.random() * ARENAS.length)].id : arena;
    onStart({
      a: { pokemon: a, displayName: formatName(a.name), moves: selA },
      b: { pokemon: b, displayName: formatName(b.name), moves: selB },
      level,
      mode,
      arenaId,
      chart,
      seed: randomSeed(),
    });
  };

  return (
    <div className="space-y-6" data-testid="battle-setup">
      <div className="grid gap-4 md:grid-cols-3">
        <div>
          <label htmlFor="level-input" className="mb-1.5 block text-xs font-semibold uppercase tracking-widest text-muted">
            Battle level
          </label>
          <div className="flex items-center gap-3">
            <input
              id="level-range"
              aria-label="Battle level slider"
              type="range"
              min={MIN_LEVEL}
              max={MAX_LEVEL}
              value={level}
              onChange={(e) => setLevel(Number(e.target.value))}
              className="h-2 flex-1 accent-[rgb(var(--accent))]"
            />
            <input
              id="level-input"
              type="number"
              min={MIN_LEVEL}
              max={MAX_LEVEL}
              value={level}
              onChange={(e) => setLevel(Number(e.target.value))}
              className="input !w-20 text-center"
              data-testid="level-input"
            />
          </div>
          <p className="mt-1.5 text-[11px] text-muted">Default 50. Stats use IV 31, 85 EVs, neutral nature.</p>
        </div>

        <fieldset>
          <legend className="mb-1.5 text-xs font-semibold uppercase tracking-widest text-muted">Battle mode</legend>
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                { id: "quick", label: "Quick", icon: Zap, hint: "Auto-simulated" },
                { id: "interactive", label: "Interactive", icon: Gamepad2, hint: "You pick moves" },
              ] as const
            ).map((m) => (
              <label
                key={m.id}
                className={cn(
                  "flex min-h-[44px] cursor-pointer flex-col rounded-xl border px-3 py-2 text-sm transition focus-within:outline focus-within:outline-2 focus-within:outline-accent2",
                  mode === m.id ? "border-accent bg-accent/10" : "border-line/15 bg-surface-2/40 hover:border-line/30",
                )}
              >
                <input type="radio" name="mode" value={m.id} checked={mode === m.id} onChange={() => setMode(m.id)} className="sr-only" data-testid={`mode-${m.id}`} />
                <span className="flex items-center gap-1.5 font-semibold">
                  <m.icon className="h-4 w-4" aria-hidden /> {m.label} Battle
                </span>
                <span className="text-[11px] text-muted">{m.hint}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <div>
          <label htmlFor="arena-select" className="mb-1.5 block text-xs font-semibold uppercase tracking-widest text-muted">
            Arena
          </label>
          <select id="arena-select" className="input" value={arena} onChange={(e) => setArena(e.target.value)} data-testid="arena-select">
            <option value="random">🎲 Random arena</option>
            {ARENAS.map((ar) => (
              <option key={ar.id} value={ar.id}>
                {ar.name}
              </option>
            ))}
          </select>
          <p className="mt-1.5 text-[11px] text-muted">Arenas are cosmetic and never change damage.</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Loadout
          testId="loadout-0"
          pokemon={a}
          options={movesA.options}
          state={movesA}
          selected={selA}
          custom={!!custom.a && custom.key === key}
          onChange={(names) => setCustom((c) => ({ ...c, key, a: names }))}
          onReset={() => setCustom((c) => ({ ...c, a: null }))}
        />
        <Loadout
          testId="loadout-1"
          pokemon={b}
          options={movesB.options}
          state={movesB}
          selected={selB}
          custom={!!custom.b && custom.key === key}
          onChange={(names) => setCustom((c) => ({ ...c, key, b: names }))}
          onReset={() => setCustom((c) => ({ ...c, b: null }))}
        />
      </div>
      <p className="text-xs text-muted">
        Simulator rules: moves come from each Pokémon&apos;s most recent learnset on PokéAPI (up to 80 candidates checked). Only moves the engine
        supports are offered; charging, recharge, self-KO and other unsupported mechanics are excluded.
      </p>

      <div className="flex justify-center">
        <button type="button" className="btn-primary min-h-[56px] px-10 text-base tracking-widest" onClick={start} disabled={!ready} data-testid="start-battle">
          <Swords className="h-5 w-5" aria-hidden /> {ready ? "START BATTLE" : "PREPARING MOVES…"}
        </button>
      </div>
    </div>
  );
}
