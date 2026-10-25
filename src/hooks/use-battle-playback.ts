"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { chooseAction, resolveTurn, simulateBattle } from "@/features/battle/engine/battle";
import { createSeededRng } from "@/features/battle/engine/rng";
import type { BattleEvent, BattleState } from "@/features/battle/engine/types";
import { applyEventToView, describeEvent, initialView, type BattleView, type LogLine } from "@/features/battle/engine/view";
import type { BattleLaunch } from "@/features/battle/launch";
import { createBattleFromSides } from "@/features/battle/prepare";

export type PlaybackSpeed = 1 | 2;

function delayFor(event: BattleEvent | undefined): number {
  if (!event) return 0;
  switch (event.kind) {
    case "turn-start":
      return 350;
    case "move-used":
      return 900;
    case "damage":
      return event.source === "move" ? 1050 : 800;
    case "faint":
      return 1400;
    case "battle-end":
      return 600;
    default:
      return 800;
  }
}

export interface Playback {
  view: BattleView;
  initial: BattleView;
  log: { line: LogLine; index: number }[];
  events: BattleEvent[];
  cursor: number;
  currentEvent: BattleEvent | undefined;
  paused: boolean;
  speed: PlaybackSpeed;
  engine: BattleState;
  awaitingInput: boolean;
  finished: boolean;
  setPaused: (p: boolean) => void;
  setSpeed: (s: PlaybackSpeed) => void;
  submitMove: (moveIndex: number) => void;
  skip: () => void;
  replay: () => void;
  names: [string, string];
}

/**
 * Drives the UI from engine events. The engine resolves turns instantly and
 * deterministically; this hook only controls *when* each recorded event is shown.
 */
export function useBattlePlayback(launch: BattleLaunch, opts: { animate: boolean; ready: boolean }): Playback {
  const [init] = useState(() => {
    const rng = createSeededRng(launch.seed);
    const { config, state } = createBattleFromSides(launch.a, launch.b, launch.level, launch.chart);
    const full = launch.mode === "quick" ? simulateBattle(config, rng) : state;
    return { initialState: state, engine0: full, rng };
  });
  const { initialState, engine0 } = init;
  const rngRef = useRef(init.rng);
  const [engine, setEngine] = useState<BattleState>(engine0);
  const [cursor, setCursor] = useState(0);
  const [paused, setPaused] = useState(false);
  const [speed, setSpeed] = useState<PlaybackSpeed>(1);

  const names = useMemo<[string, string]>(() => [launch.a.displayName, launch.b.displayName], [launch]);
  const events = engine.events;
  const initial = useMemo(() => initialView(initialState.combatants), [initialState]);

  const view = useMemo(() => {
    let v = initial;
    for (let i = 0; i < cursor && i < events.length; i++) v = applyEventToView(v, events[i]);
    return v;
  }, [initial, events, cursor]);

  const log = useMemo(() => {
    const out: { line: LogLine; index: number }[] = [];
    for (let i = 0; i < cursor && i < events.length; i++) {
      const line = describeEvent(events[i], names);
      if (line) out.push({ line, index: i });
    }
    return out;
  }, [events, cursor, names]);

  useEffect(() => {
    if (!opts.ready || paused || cursor >= events.length) return;
    const base = opts.animate ? delayFor(events[cursor]) : Math.min(delayFor(events[cursor]), 350);
    const id = setTimeout(() => setCursor((c) => c + 1), base / speed);
    return () => clearTimeout(id);
  }, [cursor, events, paused, speed, opts.animate, opts.ready]);

  const caughtUp = cursor >= events.length;
  const awaitingInput = launch.mode === "interactive" && engine.phase === "active" && caughtUp;
  const finished = engine.phase === "finished" && caughtUp;

  const submitMove = useCallback(
    (moveIndex: number) => {
      if (!awaitingInput) return;
      const rng = rngRef.current;
      const opponent = chooseAction(engine, 1, rng);
      try {
        setEngine(resolveTurn(engine, [{ type: "move", moveIndex }, opponent], rng));
        setPaused(false);
      } catch {
        // Invalid selections (e.g. no PP) are ignored; the UI disables those buttons.
      }
    },
    [awaitingInput, engine],
  );

  const skip = useCallback(() => setCursor(engine.events.length), [engine]);
  const replay = useCallback(() => {
    setCursor(0);
    setPaused(false);
  }, []);

  return {
    view,
    initial,
    log,
    events,
    cursor,
    currentEvent: cursor > 0 ? events[cursor - 1] : undefined,
    paused,
    speed,
    engine,
    awaitingInput,
    finished,
    setPaused,
    setSpeed,
    submitMove,
    skip,
    replay,
    names,
  };
}
