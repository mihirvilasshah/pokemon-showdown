"use client";

import { useMemo } from "react";
import { formatName } from "@/features/pokemon/mappers";
import { analyzeMatchup, edgeLabel, type Edge } from "@/features/battle/matchup";
import {
  defensiveProfile,
  effectivenessLabel,
  formatMultiplier,
  typeMultiplier,
  type TypeChart,
} from "@/features/type-effectiveness/chart";
import type { Pokemon, PokemonType } from "@/types/pokemon";
import { TypeBadge, TypeBadges } from "@/components/pokemon/type-badge";
import { cn } from "@/lib/utils";

function multiplierTone(m: number): string {
  if (m === 0) return "border-line/30 bg-line/10 text-muted";
  if (m > 1) return "border-bad/40 bg-bad/10 text-fg";
  if (m < 1) return "border-good/40 bg-good/10 text-fg";
  return "border-line/15 bg-surface-2/40 text-fg";
}

function EdgeRow({ label, edge, a, b }: { label: string; edge: Edge; a: string; b: string }) {
  return (
    <li className="flex items-center justify-between gap-3 border-b border-line/10 py-2 text-sm last:border-0">
      <span className="text-muted">{label}</span>
      <span className="font-semibold">{edgeLabel(edge, a, b, "Even")}</span>
    </li>
  );
}

function DefenseRow({ label, types, tone }: { label: string; types: PokemonType[]; tone: string }) {
  if (types.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className={cn("rounded-md border px-2 py-0.5 text-[11px] font-semibold", tone)}>{label}</span>
      {types.map((t) => (
        <TypeBadge key={t} type={t} size="sm" />
      ))}
    </div>
  );
}

function DefenseCard({ p, chart }: { p: Pokemon; chart: TypeChart }) {
  const prof = useMemo(() => defensiveProfile(chart, p.types), [chart, p.types]);
  return (
    <div className="space-y-2 rounded-xl border border-line/10 bg-surface-2/30 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="font-display font-semibold">{formatName(p.name)} defends</h4>
        <TypeBadges types={p.types} size="sm" />
      </div>
      <DefenseRow label="4× weak" types={prof.weak4} tone={multiplierTone(4)} />
      <DefenseRow label="2× weak" types={prof.weak2} tone={multiplierTone(2)} />
      <DefenseRow label="½× resists" types={prof.resist} tone={multiplierTone(0.5)} />
      <DefenseRow label="¼× resists" types={prof.resist4} tone={multiplierTone(0.25)} />
      <DefenseRow label="0× immune" types={prof.immune} tone={multiplierTone(0)} />
    </div>
  );
}

/** Pre-battle analysis: descriptive edges, STAB multipliers, and defensive profiles. */
export function MatchupPanel({ a, b, chart, fromApi }: { a: Pokemon; b: Pokemon; chart: TypeChart; fromApi: boolean }) {
  const analysis = useMemo(() => analyzeMatchup(a, b, chart), [a, b, chart]);
  const nameA = formatName(a.name);
  const nameB = formatName(b.name);

  return (
    <div className="grid gap-5 lg:grid-cols-2" data-testid="matchup-panel">
      <div>
        <h3 className="mb-2 font-display text-base font-bold">Matchup summary</h3>
        <ul className="rounded-xl border border-line/10 bg-surface-2/30 px-4">
          <EdgeRow label="Higher Speed" edge={analysis.speed} a={nameA} b={nameB} />
          <EdgeRow label="Higher Attack" edge={analysis.physical} a={nameA} b={nameB} />
          <EdgeRow label="Higher Sp. Attack" edge={analysis.special} a={nameA} b={nameB} />
          <EdgeRow label="Better bulk (HP × Def × Sp. Def)" edge={analysis.bulk} a={nameA} b={nameB} />
          <EdgeRow label="Better type interactions" edge={analysis.typeEdge} a={nameA} b={nameB} />
        </ul>
        <p className="mt-2 text-xs text-muted">
          This compares base stats and typing only. Moves, accuracy, critical hits and status effects decide real battles, so no winner is predicted.
          {!fromApi && " Type data is using the built-in fallback chart."}
        </p>
      </div>

      <div>
        <h3 className="mb-2 font-display text-base font-bold">Type effectiveness</h3>
        <div className="grid grid-cols-2 gap-3">
          {[
            { from: a, to: b, m: analysis.typeAtoB },
            { from: b, to: a, m: analysis.typeBtoA },
          ].map(({ from, to, m }) => (
            <div key={from.name} className={cn("rounded-xl border p-3", multiplierTone(m))}>
              <p className="text-xs text-muted">
                {formatName(from.name)} → {formatName(to.name)}
              </p>
              <p className="font-display text-3xl font-extrabold tabular-nums" aria-label={`${m} times damage`}>
                {formatMultiplier(m)}
              </p>
              <p className="text-xs font-semibold">{effectivenessLabel(m)}</p>
              <ul className="mt-2 space-y-1 text-[11px] text-muted">
                {from.types.map((t) => (
                  <li key={t} className="flex items-center gap-1.5">
                    <TypeBadge type={t} size="sm" /> {formatMultiplier(typeMultiplier(chart, t, to.types))}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted">Best multiplier from the attacker&apos;s own type(s); dual types multiply (e.g. 2× × 2× = 4×).</p>
      </div>

      <DefenseCard p={a} chart={chart} />
      <DefenseCard p={b} chart={chart} />
    </div>
  );
}
