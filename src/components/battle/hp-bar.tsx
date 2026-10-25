import type { StatusCondition } from "@/features/battle/engine/types";
import { cn } from "@/lib/utils";

const STATUS_STYLE: Record<StatusCondition, { label: string; className: string }> = {
  burn: { label: "BRN", className: "bg-orange-500 text-black" },
  paralysis: { label: "PAR", className: "bg-yellow-400 text-black" },
  poison: { label: "PSN", className: "bg-fuchsia-600 text-white" },
  sleep: { label: "SLP", className: "bg-slate-400 text-black" },
  freeze: { label: "FRZ", className: "bg-cyan-300 text-black" },
};

const STATUS_NAME: Record<StatusCondition, string> = {
  burn: "Burned",
  paralysis: "Paralyzed",
  poison: "Poisoned",
  sleep: "Asleep",
  freeze: "Frozen",
};

export function StatusBadge({ status }: { status: StatusCondition }) {
  const s = STATUS_STYLE[status];
  return (
    <span className={cn("rounded px-1.5 py-0.5 font-display text-[10px] font-bold tracking-wider", s.className)} title={STATUS_NAME[status]}>
      <span aria-hidden>{s.label}</span>
      <span className="sr-only">{STATUS_NAME[status]}</span>
    </span>
  );
}

interface HpBarProps {
  name: string;
  level: number;
  hp: number;
  maxHp: number;
  status: StatusCondition | null;
  align: "left" | "right";
  testId: string;
}

export function HpBar({ name, level, hp, maxHp, status, align, testId }: HpBarProps) {
  const pct = Math.max(0, Math.min(100, (hp / maxHp) * 100));
  const color = pct > 50 ? "#4ade80" : pct > 20 ? "#fbbf24" : "#f87171";
  return (
    <div
      className={cn(
        "w-[min(15rem,42vw)] rounded-xl border border-white/15 bg-black/55 p-2.5 text-white shadow-lg backdrop-blur-md sm:p-3",
        align === "right" && "text-right",
      )}
      data-testid={testId}
    >
      <div className={cn("flex items-center gap-2", align === "right" && "flex-row-reverse")}>
        <span className="truncate font-display text-sm font-bold sm:text-base">{name}</span>
        <span className="text-[11px] font-semibold text-white/70">Lv {level}</span>
        {status && <StatusBadge status={status} />}
      </div>
      <div
        role="progressbar"
        aria-label={`${name} HP`}
        aria-valuemin={0}
        aria-valuemax={maxHp}
        aria-valuenow={hp}
        aria-valuetext={`${hp} of ${maxHp} HP`}
        className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-white/15"
      >
        <div
          className={cn("h-full rounded-full transition-[width,background-color] duration-700 ease-out", align === "right" && "ml-auto")}
          style={{ width: `${pct}%`, backgroundColor: color, boxShadow: `0 0 12px ${color}99` }}
        />
      </div>
      <p className="mt-1 text-xs font-semibold tabular-nums text-white/85" data-testid={`${testId}-text`}>
        {hp} / {maxHp} HP
      </p>
    </div>
  );
}
