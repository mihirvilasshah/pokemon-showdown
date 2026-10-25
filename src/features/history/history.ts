import { STORAGE_KEYS, readJson, removeRaw, writeJson } from "@/lib/storage/safe-storage";

export interface BattleHistoryEntry {
  id: string;
  at: number;
  a: { id: number; name: string };
  b: { id: number; name: string };
  /** 0 = first fighter won, 1 = second fighter won. */
  winner: 0 | 1 | "draw";
  turns: number;
  hpLeft: [number, number];
  maxHp: [number, number];
  level: number;
  arena: string;
  mode: "quick" | "interactive";
}

export const MAX_HISTORY = 30;

export function loadHistory(): BattleHistoryEntry[] {
  const raw = readJson<unknown>(STORAGE_KEYS.history, []);
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (e): e is BattleHistoryEntry =>
      !!e && typeof e === "object" && typeof (e as BattleHistoryEntry).id === "string" && !!(e as BattleHistoryEntry).a && !!(e as BattleHistoryEntry).b,
  );
}

export function addHistoryEntry(entry: BattleHistoryEntry): BattleHistoryEntry[] {
  const next = [entry, ...loadHistory().filter((e) => e.id !== entry.id)].slice(0, MAX_HISTORY);
  writeJson(STORAGE_KEYS.history, next);
  return next;
}

export function clearHistory(): void {
  removeRaw(STORAGE_KEYS.history);
}

export function summarizeHistory(entries: BattleHistoryEntry[]) {
  return {
    total: entries.length,
    draws: entries.filter((e) => e.winner === "draw").length,
    quick: entries.filter((e) => e.mode === "quick").length,
  };
}
