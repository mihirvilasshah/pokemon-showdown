"use client";

import { RefreshCw } from "lucide-react";
import { useMemo, useState } from "react";
import { TYPE_COLORS, typeTextColor } from "@/config/type-colors";
import {
  defensiveProfile,
  effectivenessLabel,
  FALLBACK_TYPE_CHART,
  formatMultiplier,
  singleMultiplier,
  typeMultiplier,
} from "@/features/type-effectiveness/chart";
import { useTypeChart } from "@/hooks/use-pokemon";
import { POKEMON_TYPES, type PokemonType } from "@/types/pokemon";
import { TypeBadge } from "@/components/pokemon/type-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

function cellTone(m: number): string {
  if (m === 0) return "bg-line/20 text-fg";
  if (m >= 2) return "bg-bad/25 text-fg font-bold";
  if (m < 1) return "bg-good/25 text-fg font-bold";
  return "text-muted/60";
}

function Group({ title, types, empty }: { title: string; types: { type: PokemonType; m: number }[]; empty?: string }) {
  return (
    <div>
      <h4 className="mb-1.5 text-xs font-semibold uppercase tracking-widest text-muted">{title}</h4>
      {types.length === 0 ? (
        <p className="text-xs text-muted">{empty ?? "None"}</p>
      ) : (
        <ul className="flex flex-wrap gap-1.5">
          {types.map(({ type, m }) => (
            <li key={type} className="flex items-center gap-1">
              <TypeBadge type={type} size="sm" />
              <span className="text-[11px] font-bold tabular-nums">{formatMultiplier(m)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function TypeChartView() {
  const state = useTypeChart();
  const chart = state.data?.chart ?? FALLBACK_TYPE_CHART;
  const [focus, setFocus] = useState<PokemonType>("fire");
  const [def1, setDef1] = useState<PokemonType>("water");
  const [def2, setDef2] = useState<PokemonType | "">("flying");

  const offense = useMemo(() => {
    const entries = POKEMON_TYPES.map((t) => ({ type: t, m: singleMultiplier(chart, focus, t) }));
    return {
      strong: entries.filter((e) => e.m > 1),
      weak: entries.filter((e) => e.m < 1 && e.m > 0),
      none: entries.filter((e) => e.m === 0),
    };
  }, [chart, focus]);

  const defense = useMemo(() => {
    const entries = POKEMON_TYPES.map((t) => ({ type: t, m: singleMultiplier(chart, t, focus) }));
    return {
      weak: entries.filter((e) => e.m > 1),
      resist: entries.filter((e) => e.m < 1 && e.m > 0),
      immune: entries.filter((e) => e.m === 0),
    };
  }, [chart, focus]);

  const defenders = def2 && def2 !== def1 ? [def1, def2] : [def1];
  const calc = useMemo(() => defensiveProfile(chart, defenders), [chart, def1, def2]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center gap-3 text-sm">
        {state.loading && <Skeleton className="h-6 w-56" />}
        {state.data && (
          <p className="text-muted" data-testid="chart-source">
            {state.data.fromApi ? "Live data from PokéAPI type resources." : "PokéAPI is unavailable — showing the bundled fallback chart."}
          </p>
        )}
        {state.data && !state.data.fromApi && (
          <button type="button" className="btn-ghost !min-h-[36px]" onClick={state.retry}>
            <RefreshCw className="h-4 w-4" aria-hidden /> Retry
          </button>
        )}
      </div>

      <section className="panel p-4 sm:p-6" aria-labelledby="matrix-title">
        <h2 id="matrix-title" className="font-display text-2xl font-extrabold">
          Effectiveness matrix
        </h2>
        <p className="mb-4 mt-1 text-sm text-muted">Rows are the attacking type; columns are the defending type. Blank cells are neutral (1×).</p>
        <div className="scroll-thin overflow-x-auto">
          <table className="w-max border-separate border-spacing-0 text-center text-[11px]" data-testid="type-matrix">
            <caption className="sr-only">Type effectiveness: attacking type by defending type</caption>
            <thead>
              <tr>
                <th scope="col" className="sticky left-0 z-10 bg-surface p-1 text-left text-[10px] uppercase text-muted">ATK ↓ / DEF →</th>
                {POKEMON_TYPES.map((t) => (
                  <th key={t} scope="col" className="p-0.5">
                    <span
                      className="mx-auto flex h-7 w-9 items-center justify-center rounded text-[10px] font-bold uppercase"
                      style={{ background: TYPE_COLORS[t].base, color: typeTextColor(t) }}
                      title={TYPE_COLORS[t].label}
                    >
                      {t.slice(0, 3)}
                      <span className="sr-only">{TYPE_COLORS[t].label}</span>
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {POKEMON_TYPES.map((atk) => (
                <tr key={atk}>
                  <th scope="row" className="sticky left-0 z-10 bg-surface p-0.5 text-left">
                    <span
                      className="flex h-7 w-20 items-center justify-center rounded text-[10px] font-bold uppercase"
                      style={{ background: TYPE_COLORS[atk].base, color: typeTextColor(atk) }}
                    >
                      {TYPE_COLORS[atk].label}
                    </span>
                  </th>
                  {POKEMON_TYPES.map((def) => {
                    const m = singleMultiplier(chart, atk, def);
                    return (
                      <td
                        key={def}
                        className={cn("h-7 w-9 border border-line/5 tabular-nums", cellTone(m))}
                        aria-label={`${TYPE_COLORS[atk].label} attacking ${TYPE_COLORS[def].label}: ${formatMultiplier(m)}, ${effectivenessLabel(m)}`}
                      >
                        {m === 1 ? "" : formatMultiplier(m)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <ul className="mt-4 flex flex-wrap gap-4 text-xs text-muted">
          <li><span className="mr-1.5 inline-block rounded bg-bad/25 px-1.5 font-bold text-fg">2×</span>Super effective</li>
          <li><span className="mr-1.5 inline-block rounded bg-good/25 px-1.5 font-bold text-fg">½×</span>Not very effective</li>
          <li><span className="mr-1.5 inline-block rounded bg-line/20 px-1.5 font-bold text-fg">0×</span>No effect</li>
        </ul>
      </section>

      <section className="panel p-4 sm:p-6" aria-labelledby="inspect-title">
        <h2 id="inspect-title" className="font-display text-2xl font-extrabold">Type inspector</h2>
        <div className="mt-3 flex flex-wrap gap-1.5" role="group" aria-label="Choose a type to inspect">
          {POKEMON_TYPES.map((t) => (
            <button key={t} type="button" className="chip" aria-pressed={focus === t} onClick={() => setFocus(t)}>
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: TYPE_COLORS[t].base }} aria-hidden />
              {TYPE_COLORS[t].label}
            </button>
          ))}
        </div>
        <div className="mt-5 grid gap-6 md:grid-cols-2" data-testid="type-inspector">
          <div className="space-y-4 rounded-xl border border-line/10 bg-surface-2/30 p-4">
            <h3 className="font-display font-bold">As an attacker: {TYPE_COLORS[focus].label}</h3>
            <Group title="Super effective against" types={offense.strong} />
            <Group title="Not very effective against" types={offense.weak} />
            <Group title="No effect on" types={offense.none} empty="Hits everything" />
          </div>
          <div className="space-y-4 rounded-xl border border-line/10 bg-surface-2/30 p-4">
            <h3 className="font-display font-bold">As a defender: {TYPE_COLORS[focus].label}</h3>
            <Group title="Weak to" types={defense.weak} />
            <Group title="Resists" types={defense.resist} />
            <Group title="Immune to" types={defense.immune} />
          </div>
        </div>
      </section>

      <section className="panel p-4 sm:p-6" aria-labelledby="calc-title">
        <h2 id="calc-title" className="font-display text-2xl font-extrabold">Dual-type calculator</h2>
        <p className="mb-4 mt-1 text-sm text-muted">Multipliers are multiplied across both defending types, so 2× × 2× = 4× and 2× × ½× = 1×.</p>
        <div className="flex flex-wrap items-center gap-3">
          <label className="text-sm font-semibold" htmlFor="def1">Primary type</label>
          <select id="def1" className="input !w-40" value={def1} onChange={(e) => setDef1(e.target.value as PokemonType)}>
            {POKEMON_TYPES.map((t) => <option key={t} value={t}>{TYPE_COLORS[t].label}</option>)}
          </select>
          <label className="text-sm font-semibold" htmlFor="def2">Secondary type</label>
          <select id="def2" className="input !w-40" value={def2} onChange={(e) => setDef2(e.target.value as PokemonType | "")}>
            <option value="">None</option>
            {POKEMON_TYPES.filter((t) => t !== def1).map((t) => <option key={t} value={t}>{TYPE_COLORS[t].label}</option>)}
          </select>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2" data-testid="dual-calc">
          <Group title="4× weak" types={calc.weak4.map((t) => ({ type: t, m: 4 }))} />
          <Group title="2× weak" types={calc.weak2.map((t) => ({ type: t, m: 2 }))} />
          <Group title="½× resists" types={calc.resist.map((t) => ({ type: t, m: 0.5 }))} />
          <Group title="¼× resists" types={calc.resist4.map((t) => ({ type: t, m: 0.25 }))} />
          <Group title="0× immune" types={calc.immune.map((t) => ({ type: t, m: 0 }))} />
          <Group title="Neutral (1×)" types={calc.neutral.map((t) => ({ type: t, m: typeMultiplier(chart, t, defenders) }))} />
        </div>
      </section>
    </div>
  );
}
