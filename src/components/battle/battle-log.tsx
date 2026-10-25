"use client";

import { useEffect, useRef } from "react";
import type { LogLine, LogTone } from "@/features/battle/engine/view";
import { cn } from "@/lib/utils";

const TONE: Record<LogTone, string> = {
  info: "text-muted",
  move: "text-fg font-semibold",
  damage: "text-fg",
  crit: "text-amber-600 dark:text-amber-300 font-semibold",
  super: "text-red-600 dark:text-red-300 font-semibold",
  resist: "text-slate-500 dark:text-slate-400",
  status: "text-violet-600 dark:text-violet-300",
  heal: "text-green-700 dark:text-green-300",
  faint: "text-red-700 dark:text-red-400 font-bold",
  end: "text-accent font-bold",
};

export function BattleLog({ lines }: { lines: { line: LogLine; index: number }[] }) {
  const ref = useRef<HTMLOListElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines.length]);

  return (
    <section className="panel flex h-full min-h-[16rem] flex-col overflow-hidden" aria-label="Battle log">
      <h3 className="border-b border-line/10 px-4 py-2.5 font-display text-sm font-bold uppercase tracking-widest">Battle log</h3>
      <ol ref={ref} className="scroll-thin flex-1 space-y-1 overflow-y-auto px-4 py-3 text-sm" data-testid="battle-log" tabIndex={0} aria-label="Battle events, newest at the bottom">
        {lines.length === 0 && <li className="text-muted">The battle is about to begin…</li>}
        {lines.map(({ line, index }) => (
          <li
            key={index}
            className={cn(
              TONE[line.tone],
              line.text.startsWith("Turn ") && line.tone === "info" && "mt-3 border-t border-line/10 pt-2 font-display text-xs font-bold uppercase tracking-widest text-accent first:mt-0 first:border-0 first:pt-0",
            )}
          >
            {line.text}
          </li>
        ))}
      </ol>
    </section>
  );
}
