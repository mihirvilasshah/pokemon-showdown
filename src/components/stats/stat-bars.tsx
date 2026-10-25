import { STAT_KEYS, STAT_LABELS, type BaseStats } from "@/types/pokemon";
import { cn } from "@/lib/utils";

function statColor(v: number): string {
  if (v >= 130) return "rgb(var(--accent2))";
  if (v >= 100) return "rgb(var(--good))";
  if (v >= 70) return "rgb(var(--accent))";
  return "rgb(var(--bad))";
}

interface StatBarsProps {
  stats: BaseStats;
  total?: number;
  compact?: boolean;
  className?: string;
}

/** Single-Pokémon base stat bars. Scale: 0-255 (the in-game maximum for a base stat). */
export function StatBars({ stats, total, compact, className }: StatBarsProps) {
  const bst = total ?? STAT_KEYS.reduce((a, k) => a + stats[k], 0);
  return (
    <dl className={cn("space-y-1.5", className)} aria-label="Base stats">
      {STAT_KEYS.map((k) => (
        <div key={k} className="grid grid-cols-[4.5rem_2rem_1fr] items-center gap-2 text-xs">
          <dt className="text-muted">{STAT_LABELS[k]}</dt>
          <dd className="text-right font-semibold tabular-nums">{stats[k]}</dd>
          <dd className={cn("h-1.5 overflow-hidden rounded-full bg-line/10", compact && "h-1")} aria-hidden>
            <div
              className="h-full rounded-full transition-[width] duration-700"
              style={{ width: `${Math.min(100, (stats[k] / 255) * 100)}%`, backgroundColor: statColor(stats[k]) }}
            />
          </dd>
        </div>
      ))}
      <div className="grid grid-cols-[4.5rem_2rem_1fr] items-center gap-2 border-t border-line/10 pt-1.5 text-xs">
        <dt className="font-semibold">Total</dt>
        <dd className="text-right font-bold tabular-nums">{bst}</dd>
        <dd className="text-muted">base stat total</dd>
      </div>
    </dl>
  );
}
