"use client";

import { motion, useAnimationControls } from "framer-motion";
import { ArrowLeft, FastForward, Gauge, Pause, Play, RotateCcw } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useApp } from "@/components/app-provider";
import { getArena } from "@/config/arenas";
import { TYPE_COLORS, typeTextColor } from "@/config/type-colors";
import { describeMoveSummary } from "@/features/battle/engine/moves";
import type { BattleEvent } from "@/features/battle/engine/types";
import type { BattleLaunch } from "@/features/battle/launch";
import { addHistoryEntry } from "@/features/history/history";
import { formatName } from "@/features/pokemon/mappers";
import { sound } from "@/features/sound/sound-engine";
import { useBattlePlayback } from "@/hooks/use-battle-playback";
import { useMotionEnabled } from "@/hooks/use-motion";
import { ArenaBackground } from "./arena-background";
import { BattleLog } from "./battle-log";
import { BattleResults } from "./battle-results";
import { HpBar } from "./hp-bar";
import { BattleEffects, Combatant } from "./scene-parts";

interface BattleStageProps {
  launch: BattleLaunch;
  onRematch: () => void;
  onExit: () => void;
}

const INTRO_MS = 1900;

function liveText(event: BattleEvent | undefined, names: [string, string]): string {
  if (!event) return "";
  switch (event.kind) {
    case "move-used":
      return `${names[event.side]} used ${formatName(event.move)}.`;
    case "damage":
      if (event.source !== "move") return "";
      return `${names[event.side]} took ${event.amount} damage. ${event.crit ? "Critical hit. " : ""}${(event.effectiveness ?? 1) > 1 ? "Super effective. " : (event.effectiveness ?? 1) < 1 ? "Not very effective. " : ""}${event.hpAfter} of ${event.maxHp} HP remaining.`;
    case "faint":
      return `${names[event.side]} fainted.`;
    case "battle-end":
      return event.winner === "draw" ? "The battle ended in a draw." : `${names[event.winner]} wins the battle.`;
    case "miss":
      return `${names[event.side]}'s attack missed.`;
    default:
      return "";
  }
}

export function BattleStage({ launch, onRematch, onExit }: BattleStageProps) {
  const animate = useMotionEnabled();
  const { soundOn } = useApp();
  const arena = useMemo(() => getArena(launch.arenaId), [launch.arenaId]);
  const [introDone, setIntroDone] = useState(false);
  const shake = useAnimationControls();
  const pb = useBattlePlayback(launch, { animate, ready: introDone });
  const savedRef = useRef(false);

  useEffect(() => {
    if (!animate) {
      setIntroDone(true);
      return;
    }
    const id = setTimeout(() => setIntroDone(true), INTRO_MS);
    return () => clearTimeout(id);
  }, [animate]);

  const { currentEvent: ev, cursor, view, finished, engine } = pb;

  useEffect(() => {
    if (!ev || !soundOn) return;
    if (ev.kind === "damage" && ev.source === "move") {
      sound.play(ev.crit ? "crit" : (ev.effectiveness ?? 1) > 1 ? "super" : (ev.effectiveness ?? 1) < 1 ? "resist" : "hit");
    } else if (ev.kind === "miss" || ev.kind === "no-effect") sound.play("miss");
    else if (ev.kind === "faint") sound.play("faint");
    else if (ev.kind === "heal") sound.play("heal");
    else if (ev.kind === "status-applied") sound.play("status");
    else if (ev.kind === "battle-end") sound.play("victory");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cursor]);

  useEffect(() => {
    if (!animate || !ev || ev.kind !== "damage" || ev.source !== "move") return;
    const strong = ev.crit || (ev.effectiveness ?? 1) > 1;
    void shake.start({
      x: strong ? [0, -12, 10, -8, 5, 0] : [0, -4, 3, 0],
      y: strong ? [0, 4, -3, 2, 0] : 0,
      transition: { duration: strong ? 0.45 : 0.25 },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cursor]);

  useEffect(() => {
    if (!finished || savedRef.current) return;
    savedRef.current = true;
    const [a, b] = engine.combatants;
    addHistoryEntry({
      id: `${launch.seed}-${engine.turn}-${launch.a.pokemon.id}-${launch.b.pokemon.id}`,
      at: Date.now(),
      a: { id: launch.a.pokemon.id, name: launch.a.pokemon.name },
      b: { id: launch.b.pokemon.id, name: launch.b.pokemon.name },
      winner: engine.winner as 0 | 1 | "draw",
      turns: engine.turn,
      hpLeft: [a.hp, b.hp],
      maxHp: [a.maxHp, b.maxHp],
      level: launch.level,
      arena: arena.id,
      mode: launch.mode,
    });
  }, [finished, engine, launch, arena.id]);

  const turn = ev?.turn ?? 0;
  const live = liveText(ev, pb.names);
  const [ca, cb] = engine.combatants;
  const winnerForVisual = finished ? engine.winner : null;

  const handleReplay = () => {
    savedRef.current = true;
    pb.replay();
  };

  return (
    <div className="space-y-5" data-testid="battle-stage" data-arena={arena.id} data-mode={launch.mode} data-finished={finished}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button type="button" className="btn-ghost !min-h-[40px]" onClick={onExit} data-testid="exit-battle">
          <ArrowLeft className="h-4 w-4" aria-hidden /> Change Pokémon
        </button>
        <p className="text-sm text-muted">
          <span className="font-display font-semibold text-fg">{arena.name}</span> · {arena.tagline}
        </p>
        <p className="font-display text-sm font-bold uppercase tracking-widest" data-testid="turn-counter" aria-live="off">
          Turn {turn} / {engine.maxTurns}
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-4">
          <motion.div
            animate={shake}
            className="relative isolate h-[24rem] overflow-hidden rounded-3xl border border-line/15 shadow-panel sm:h-[30rem] lg:h-[34rem]"
            data-testid="arena-scene"
          >
            <ArenaBackground arena={arena} animate={animate} />

            <div className="absolute left-3 top-3 z-20 sm:left-5 sm:top-5">
              <HpBar name={launch.a.displayName} level={ca.level} hp={view[0].hp} maxHp={view[0].maxHp} status={view[0].status} align="left" testId="hp-0" />
            </div>
            <div className="absolute right-3 top-3 z-20 sm:right-5 sm:top-5">
              <HpBar name={launch.b.displayName} level={cb.level} hp={view[1].hp} maxHp={view[1].maxHp} status={view[1].status} align="right" testId="hp-1" />
            </div>

            <Combatant side={0} pokemon={launch.a.pokemon} view={view[0]} event={ev} cursor={cursor} animate={animate} winner={winnerForVisual} />
            <Combatant side={1} pokemon={launch.b.pokemon} view={view[1]} event={ev} cursor={cursor} animate={animate} winner={winnerForVisual} />
            <BattleEffects event={ev} cursor={cursor} animate={animate} />

            {!introDone && (
              <motion.div
                initial={{ opacity: 1 }}
                animate={{ opacity: [1, 1, 0] }}
                transition={{ duration: INTRO_MS / 1000, times: [0, 0.8, 1] }}
                className="absolute inset-0 z-30 flex items-center justify-center bg-black/70 backdrop-blur-sm"
                data-testid="vs-intro"
                aria-hidden
              >
                <motion.p initial={{ x: -200, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ duration: 0.5 }} className="absolute left-[6%] top-[30%] font-display text-2xl font-black text-white sm:text-5xl">
                  {launch.a.displayName}
                </motion.p>
                <motion.p initial={{ x: 200, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ duration: 0.5 }} className="absolute bottom-[30%] right-[6%] font-display text-2xl font-black text-white sm:text-5xl">
                  {launch.b.displayName}
                </motion.p>
                <motion.span
                  initial={{ scale: 3, opacity: 0, rotate: -12 }}
                  animate={{ scale: 1, opacity: 1, rotate: 0 }}
                  transition={{ delay: 0.35, type: "spring", stiffness: 200, damping: 14 }}
                  className="bg-gradient-to-b from-amber-200 to-amber-500 bg-clip-text font-display text-7xl font-black text-transparent drop-shadow-[0_0_24px_rgba(245,184,61,0.7)] sm:text-9xl"
                >
                  VS
                </motion.span>
              </motion.div>
            )}

            {finished && (
              <div className="pointer-events-none absolute inset-x-0 bottom-3 z-20 text-center" data-testid="arena-banner">
                <span className="rounded-full bg-black/65 px-5 py-2 font-display text-sm font-extrabold uppercase tracking-[0.25em] text-amber-300 backdrop-blur sm:text-lg">
                  {engine.winner === "draw" ? "Draw" : `${pb.names[engine.winner as 0 | 1]} wins`}
                </span>
              </div>
            )}
          </motion.div>

          <div className="panel flex flex-wrap items-center gap-2 p-3" role="group" aria-label="Playback controls">
            <button
              type="button"
              className="btn-ghost !min-h-[44px]"
              onClick={() => pb.setPaused(!pb.paused)}
              aria-pressed={pb.paused}
              disabled={finished}
              data-testid="pause-toggle"
            >
              {pb.paused ? <Play className="h-4 w-4" aria-hidden /> : <Pause className="h-4 w-4" aria-hidden />}
              {pb.paused ? "Resume" : "Pause"}
            </button>
            <button
              type="button"
              className="btn-ghost !min-h-[44px]"
              onClick={() => {
                setIntroDone(true);
                pb.skip();
              }}
              disabled={finished || pb.awaitingInput}
              data-testid="skip"
            >
              <FastForward className="h-4 w-4" aria-hidden /> Skip animation
            </button>
            <button type="button" className="btn-ghost !min-h-[44px]" onClick={() => pb.setSpeed(pb.speed === 1 ? 2 : 1)} aria-label={`Playback speed ${pb.speed}×, switch`}>
              <Gauge className="h-4 w-4" aria-hidden /> {pb.speed}×
            </button>
            <button type="button" className="btn-ghost !min-h-[44px]" onClick={handleReplay} disabled={!finished} data-testid="replay-controls">
              <RotateCcw className="h-4 w-4" aria-hidden /> Replay
            </button>
            <span className="ml-auto text-xs text-muted" role="status">
              {pb.paused ? "Paused" : pb.awaitingInput ? "Your move" : finished ? "Battle complete" : "Battle in progress"}
            </span>
          </div>

          {launch.mode === "interactive" && !finished && (
            <section className="panel p-4" aria-label="Choose your move" data-testid="move-menu">
              <h3 className="mb-3 font-display text-sm font-bold uppercase tracking-widest">
                {pb.awaitingInput ? `What will ${launch.a.displayName} do?` : "Resolving turn…"}
              </h3>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {engine.combatants[0].moves.map((m, i) => {
                  const type = m.data.type;
                  const noPp = m.pp <= 0;
                  const allOut = engine.combatants[0].moves.every((x) => x.pp <= 0);
                  const disabled = !pb.awaitingInput || (noPp && !allOut);
                  return (
                    <button
                      key={m.data.name}
                      type="button"
                      disabled={disabled}
                      onClick={() => pb.submitMove(i)}
                      data-testid={`move-${i}`}
                      className="flex min-h-[56px] flex-col items-start justify-center rounded-xl border-2 px-3 py-2 text-left transition enabled:hover:brightness-110 enabled:active:scale-[0.98] disabled:opacity-50"
                      style={{ backgroundColor: TYPE_COLORS[type].base, color: typeTextColor(type), borderColor: TYPE_COLORS[type].dark }}
                    >
                      <span className="flex w-full items-center justify-between gap-2 font-display font-bold">
                        {formatName(m.data.name)}
                        <span className="text-xs font-semibold tabular-nums">
                          PP {m.pp}/{m.maxPp}
                        </span>
                      </span>
                      <span className="text-[11px] font-medium opacity-90">
                        {TYPE_COLORS[type].label} · <span className="capitalize">{m.data.damageClass}</span> · {describeMoveSummary(m.data)}
                      </span>
                    </button>
                  );
                })}
                {engine.combatants[0].moves.every((x) => x.pp <= 0) && (
                  <button type="button" className="btn-ghost sm:col-span-2" disabled={!pb.awaitingInput} onClick={() => pb.submitMove(0)} data-testid="struggle">
                    Struggle (no PP left)
                  </button>
                )}
              </div>
            </section>
          )}
        </div>

        <div className="lg:h-[calc(34rem+7.5rem)]">
          <BattleLog lines={pb.log} />
        </div>
      </div>

      <div className="sr-only-live" aria-live="polite" aria-atomic="true" data-testid="live-region">
        {live}
      </div>

      {finished && (
        <BattleResults
          launch={launch}
          engine={engine}
          animate={animate}
          onRematch={onRematch}
          onChange={onExit}
          onReplay={handleReplay}
        />
      )}
    </div>
  );
}
