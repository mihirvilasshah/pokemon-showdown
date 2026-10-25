export type Slot = 0 | 1;
export type BattleMode = "quick" | "interactive";

export interface SelectionState {
  slots: [string | null, string | null];
  level: number;
  mode: BattleMode;
}

export type SelectionAction =
  | { type: "select"; slot: Slot; name: string; allowMirror: boolean }
  | { type: "clear"; slot: Slot }
  | { type: "swap" }
  | { type: "set-matchup"; a: string; b: string }
  | { type: "set-level"; level: number }
  | { type: "set-mode"; mode: BattleMode };

export const MIN_LEVEL = 1;
export const MAX_LEVEL = 100;

export const initialSelection: SelectionState = {
  slots: [null, null],
  level: 50,
  mode: "quick",
};

export function clampLevel(level: number): number {
  if (!Number.isFinite(level)) return 50;
  return Math.min(MAX_LEVEL, Math.max(MIN_LEVEL, Math.round(level)));
}

/** Pure reducer: only the targeted slot changes, so the first pick is preserved. */
export function selectionReducer(state: SelectionState, action: SelectionAction): SelectionState {
  switch (action.type) {
    case "select": {
      const otherSlot: Slot = action.slot === 0 ? 1 : 0;
      if (!action.allowMirror && state.slots[otherSlot] === action.name) return state;
      const slots: SelectionState["slots"] = [...state.slots];
      slots[action.slot] = action.name;
      return { ...state, slots };
    }
    case "clear": {
      const slots: SelectionState["slots"] = [...state.slots];
      slots[action.slot] = null;
      return { ...state, slots };
    }
    case "swap":
      return { ...state, slots: [state.slots[1], state.slots[0]] };
    case "set-matchup":
      return { ...state, slots: [action.a, action.b] };
    case "set-level":
      return { ...state, level: clampLevel(action.level) };
    case "set-mode":
      return { ...state, mode: action.mode };
  }
}

export function canSelect(state: SelectionState, slot: Slot, name: string, allowMirror: boolean): boolean {
  const otherSlot: Slot = slot === 0 ? 1 : 0;
  return allowMirror || state.slots[otherSlot] !== name;
}

/** Two distinct random Pokémon ids from the national dex (default forms only). */
export function randomMatchupIds(rng: () => number = Math.random, max = 1025, allowMirror = false): [number, number] {
  const a = 1 + Math.floor(rng() * max);
  let b = 1 + Math.floor(rng() * max);
  if (!allowMirror) while (b === a) b = 1 + Math.floor(rng() * max);
  return [a, b];
}

export const QUICK_PICKS = [
  "pikachu",
  "charizard",
  "blastoise",
  "venusaur",
  "gengar",
  "mewtwo",
  "lucario",
  "garchomp",
  "dragonite",
  "gyarados",
  "snorlax",
  "greninja",
  "eevee",
  "tyranitar",
  "gardevoir",
  "metagross",
];
