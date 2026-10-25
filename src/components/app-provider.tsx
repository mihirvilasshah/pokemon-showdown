"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useState,
  type ReactNode,
} from "react";
import {
  initialSelection,
  randomMatchupIds,
  selectionReducer,
  type BattleMode,
  type Slot,
} from "@/features/pokemon/selection";
import { sound } from "@/features/sound/sound-engine";
import { applyTheme, getStoredTheme, systemTheme } from "@/components/theme/theme";
import { STORAGE_KEYS, readRaw, writeRaw } from "@/lib/storage/safe-storage";
import { ARENAS, type ArenaChoice } from "@/config/arenas";

export type MotionPref = "auto" | "off";

interface AppContextValue {
  /* settings */
  soundOn: boolean;
  setSoundOn: (v: boolean) => void;
  musicOn: boolean;
  setMusicOn: (v: boolean) => void;
  arena: ArenaChoice;
  setArena: (v: ArenaChoice) => void;
  allowMirror: boolean;
  setAllowMirror: (v: boolean) => void;
  motion: MotionPref;
  setMotion: (v: MotionPref) => void;
  /* selection */
  slots: [string | null, string | null];
  level: number;
  mode: BattleMode;
  selectPokemon: (slot: Slot, name: string) => boolean;
  clearSlot: (slot: Slot) => void;
  swapSlots: () => void;
  setMatchup: (a: string, b: string) => void;
  randomMatchup: () => void;
  setLevel: (level: number) => void;
  setMode: (mode: BattleMode) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

function bool(key: string, fallback: boolean): boolean {
  const v = readRaw(key);
  return v === null ? fallback : v === "1";
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [soundOn, setSoundState] = useState(false);
  const [musicOn, setMusicState] = useState(false);
  const [arena, setArenaState] = useState<ArenaChoice>("random");
  const [allowMirror, setMirrorState] = useState(false);
  const [motion, setMotionState] = useState<MotionPref>("auto");
  const [selection, dispatch] = useReducer(selectionReducer, initialSelection);

  // Hydrate persisted preferences after mount (keeps SSR markup identical).
  useEffect(() => {
    const storedArena = readRaw(STORAGE_KEYS.arena);
    if (storedArena && (storedArena === "random" || ARENAS.some((a) => a.id === storedArena))) setArenaState(storedArena);
    setMirrorState(bool(STORAGE_KEYS.mirror, false));
    setMotionState(readRaw(STORAGE_KEYS.motion) === "off" ? "off" : "auto");
    // Audio never starts automatically; a stored "on" only becomes audible after a user gesture.
    setSoundState(bool(STORAGE_KEYS.sound, false));
    setMusicState(false);
  }, []);

  // Follow OS theme changes until the user picks a theme explicitly.
  useEffect(() => {
    const mq = window.matchMedia?.("(prefers-color-scheme: light)");
    if (!mq) return;
    const onChange = () => {
      if (!getStoredTheme()) applyTheme(systemTheme());
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    sound.setSfx(soundOn);
  }, [soundOn]);
  useEffect(() => {
    sound.setMusic(soundOn && musicOn);
  }, [soundOn, musicOn]);

  useEffect(() => {
    document.documentElement.classList.toggle("motion-off", motion === "off");
  }, [motion]);

  const setSoundOn = useCallback((v: boolean) => {
    setSoundState(v);
    writeRaw(STORAGE_KEYS.sound, v ? "1" : "0");
    if (v) {
      sound.setSfx(true);
      sound.unlock();
      sound.play("select");
    }
  }, []);
  const setMusicOn = useCallback((v: boolean) => {
    setMusicState(v);
    writeRaw(STORAGE_KEYS.music, v ? "1" : "0");
    if (v) sound.unlock();
  }, []);
  const setArena = useCallback((v: ArenaChoice) => {
    setArenaState(v);
    writeRaw(STORAGE_KEYS.arena, v);
  }, []);
  const setAllowMirror = useCallback((v: boolean) => {
    setMirrorState(v);
    writeRaw(STORAGE_KEYS.mirror, v ? "1" : "0");
  }, []);
  const setMotion = useCallback((v: MotionPref) => {
    setMotionState(v);
    writeRaw(STORAGE_KEYS.motion, v);
  }, []);

  const selectPokemon = useCallback(
    (slot: Slot, name: string) => {
      const other = selection.slots[slot === 0 ? 1 : 0];
      if (!allowMirror && other === name) return false;
      dispatch({ type: "select", slot, name, allowMirror });
      return true;
    },
    [selection.slots, allowMirror],
  );

  const value = useMemo<AppContextValue>(
    () => ({
      soundOn,
      setSoundOn,
      musicOn,
      setMusicOn,
      arena,
      setArena,
      allowMirror,
      setAllowMirror,
      motion,
      setMotion,
      slots: selection.slots,
      level: selection.level,
      mode: selection.mode,
      selectPokemon,
      clearSlot: (slot) => dispatch({ type: "clear", slot }),
      swapSlots: () => dispatch({ type: "swap" }),
      setMatchup: (a, b) => dispatch({ type: "set-matchup", a, b }),
      randomMatchup: () => {
        const [a, b] = randomMatchupIds(Math.random, 1025, allowMirror);
        dispatch({ type: "set-matchup", a: String(a), b: String(b) });
      },
      setLevel: (level) => dispatch({ type: "set-level", level }),
      setMode: (mode) => dispatch({ type: "set-mode", mode }),
    }),
    [soundOn, setSoundOn, musicOn, setMusicOn, arena, setArena, allowMirror, setAllowMirror, motion, setMotion, selection, selectPokemon],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within <AppProvider>");
  return ctx;
}
