"use client";

import { Trash2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { PokemonArt } from "@/components/pokemon/pokemon-art";
import { EmptyState } from "@/components/ui/states";
import { clearHistory, loadHistory, type BattleHistoryEntry } from "@/features/history/history";
import { formatName } from "@/features/pokemon/mappers";
import { storageAvailable } from "@/lib/storage/safe-storage";

export function HistoryView() {
  const [entries, setEntries] = useState<BattleHistoryEntry[] | null>(null);
  const [persisted, setPersisted] = useState(true);

  useEffect(() => {
    setEntries(loadHistory());
    setPersisted(storageAvailable());
  }, []);

  if (entries === null) return <div className="skeleton h-40" aria-busy="true" />;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted" data-testid="history-count">
          {entries.length} recent battle{entries.length === 1 ? "" : "s"} stored locally in this browser.
        </p>
        {entries.length > 0 && (
          <button
            type="button"
            className="btn-ghost"
            onClick={() => {
              clearHistory();
              setEntries([]);
            }}
            data-testid="clear-history"
          >
            <Trash2 className="h-4 w-4" aria-hidden /> Clear history
          </button>
        )}
      </div>
      {!persisted && (
        <p className="rounded-lg border border-line/15 bg-surface-2/40 px-3 py-2 text-xs text-muted" role="status">
          Local storage is unavailable, so history only lasts until you close this tab.
        </p>
      )}
      {entries.length === 0 ? (
        <EmptyState
          title="No battles yet"
          message="Finish a battle in the arena and it will show up here."
          action={<Link href="/#arena" className="btn-primary mt-2">Go to the arena</Link>}
        />
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {entries.map((e) => {
            const winnerName = e.winner === "draw" ? null : formatName(e.winner === 0 ? e.a.name : e.b.name);
            return (
              <li key={e.id} className="panel flex items-center gap-3 p-3" data-testid="history-item">
                <PokemonArt id={e.a.id} name={e.a.name} className="w-16 shrink-0" flip />
                <div className="min-w-0 flex-1 text-center">
                  <p className="truncate font-display text-sm font-bold">
                    {formatName(e.a.name)} <span className="text-muted">vs</span> {formatName(e.b.name)}
                  </p>
                  <p className="text-sm font-semibold text-accent">{winnerName ? `${winnerName} won` : "Draw"}</p>
                  <p className="text-[11px] text-muted">
                    {e.turns} turns · Lv {e.level} · {e.mode} · {new Date(e.at).toLocaleString()}
                  </p>
                  <p className="text-[11px] tabular-nums text-muted">
                    HP left {e.hpLeft[0]}/{e.maxHp[0]} · {e.hpLeft[1]}/{e.maxHp[1]}
                  </p>
                </div>
                <PokemonArt id={e.b.id} name={e.b.name} className="w-16 shrink-0" />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
