"use client";

import { AnimatePresence, motion, useAnimationControls } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { TYPE_COLORS } from "@/config/type-colors";
import type { BattleEvent, Side } from "@/features/battle/engine/types";
import type { SideView } from "@/features/battle/engine/view";
import { formatMultiplier } from "@/features/type-effectiveness/chart";
import type { Pokemon } from "@/types/pokemon";
import { Pokemon3D, type Pose } from "@/components/pokemon/pokemon-3d";
import { modelUrlFor, type ModelAction } from "@/features/pokemon/models3d";
import { cn } from "@/lib/utils";

/** Horizontal centre of each fighter, as a percentage of the arena width. */
export const SIDE_X = [24, 76] as const;
/** Vertical centre of each fighter, as a percentage of the arena height. */
export const SIDE_Y = [64, 54] as const;

interface CombatantProps {
  side: Side;
  pokemon: Pokemon;
  view: SideView;
  event: BattleEvent | undefined;
  cursor: number;
  animate: boolean;
  winner: Side | "draw" | null;
}

export function Combatant({ side, pokemon, view, event, cursor, animate, winner }: CombatantProps) {
  const controls = useAnimationControls();
  const dir = side === 0 ? 1 : -1;

  useEffect(() => {
    if (!animate || !event) return;
    if (event.kind === "move-used" && event.side === side && event.damageClass !== "status") {
      void controls.start({ x: [0, 70 * dir, 0], scale: [1, 1.08, 1], transition: { duration: 0.55, ease: "easeInOut" } });
    } else if (event.kind === "move-used" && event.side === side) {
      void controls.start({ y: [0, -18, 0], scale: [1, 1.06, 1], transition: { duration: 0.6 } });
    } else if (event.kind === "damage" && event.side === side && event.source === "move") {
      void controls.start({
        x: [0, -14 * dir, 10 * dir, -6 * dir, 0],
        filter: ["brightness(1)", "brightness(2.4) saturate(0.4)", "brightness(1)"],
        transition: { duration: 0.5 },
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cursor]);

  const lost = winner !== null && winner !== "draw" && winner !== side;
  const won = winner === side;

  const [entered, setEntered] = useState(!animate);
  useEffect(() => {
    if (!animate) return;
    const id = setTimeout(() => setEntered(true), 60);
    return () => clearTimeout(id);
  }, [animate]);

  const action = useMemo<ModelAction>(() => {
    if (!entered) return "idle";
    if (view.fainted) return "faint";
    if (won) return "win";
    if (!animate || !event) return "idle";
    if (event.kind === "move-used" && event.side === side) return event.damageClass === "status" ? "status" : "attack";
    if (event.kind === "damage" && event.side === side && event.source === "move") return "hit";
    return "idle";
  }, [entered, view.fainted, won, animate, event, side]);

  // Pose for the 2.5D fallback renderer (the WebGL model derives its own pose from `action`).
  const pose = useMemo<Pose>(() => {
    if (!entered) return { rx: 0, ry: 100 };
    switch (action) {
      case "faint":
        return { rx: 78, ry: -10 };
      case "status":
        return { rx: -6, ry: 28 };
      case "attack":
        return { rx: -12, ry: -58 };
      case "hit":
        return { rx: 16, ry: 14 };
      default:
        return { rx: 0, ry: -22 };
    }
  }, [entered, action]);

  return (
    <div
      className="absolute w-[clamp(8rem,32vw,20rem)] -translate-x-1/2 -translate-y-1/2"
      style={{ left: `${SIDE_X[side]}%`, top: `${SIDE_Y[side]}%`, zIndex: side === 0 ? 3 : 2 }}
      data-testid={`combatant-${side}`}
      data-fainted={view.fainted}
    >
      <motion.div
        initial={animate ? { opacity: 0, x: side === 0 ? -160 : 160, scale: 0.7 } : false}
        animate={
          view.fainted
            ? { opacity: 0.0, x: 0, y: 60, rotate: side === 0 ? -14 : 14, scale: 0.85 }
            : won
              ? { opacity: 1, x: 0, y: [0, -14, 0], scale: 1.08 }
              : { opacity: lost ? 0.3 : 1, x: 0, y: 0, scale: 1, rotate: 0 }
        }
        transition={view.fainted ? { duration: 1.1, ease: "easeIn" } : won ? { duration: 1.2, repeat: animate ? Infinity : 0 } : { type: "spring", stiffness: 110, damping: 16 }}
      >
        <motion.div animate={controls}>
          <div
            aria-hidden
            className="absolute inset-x-[12%] bottom-[2%] h-[10%] rounded-[50%] bg-black/55 blur-md"
            style={{ boxShadow: `0 0 40px 6px ${TYPE_COLORS[pokemon.types[0]].base}55` }}
          />
          <Pokemon3D
            id={pokemon.id}
            name={pokemon.name}
            modelUrl={modelUrlFor(pokemon)}
            home={pokemon.sprites.home}
            artwork={pokemon.sprites.artwork}
            sprite={pokemon.sprites.front}
            priority
            flip={side === 0}
            action={action}
            pose={pose}
            sway={!view.fainted && !won}
            className="w-full drop-shadow-[0_14px_22px_rgba(0,0,0,0.6)]"
          />
        </motion.div>
      </motion.div>
    </div>
  );
}

/* ---------------------------------- Effects --------------------------------- */

interface EffectsProps {
  event: BattleEvent | undefined;
  cursor: number;
  animate: boolean;
}

function Callout({ text, tone, side, cursor }: { text: string; tone: "super" | "crit" | "resist" | "miss"; side: Side; cursor: number }) {
  const tones = {
    super: "bg-red-600 text-white",
    crit: "bg-amber-400 text-black",
    resist: "bg-slate-600 text-white",
    miss: "bg-slate-800 text-white",
  } as const;
  return (
    <motion.div
      key={`${cursor}-${text}`}
      initial={{ opacity: 0, scale: 0.6, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: -10 }}
      exit={{ opacity: 0, y: -30 }}
      transition={{ type: "spring", stiffness: 300, damping: 18 }}
      className={cn("absolute z-20 -translate-x-1/2 whitespace-nowrap rounded-full px-3 py-1 font-display text-xs font-extrabold uppercase tracking-widest shadow-lg sm:text-sm", tones[tone])}
      style={{ left: `${SIDE_X[side]}%`, top: `${SIDE_Y[side] - 30}%` }}
      data-testid="callout"
    >
      {text}
    </motion.div>
  );
}

export function BattleEffects({ event, cursor, animate }: EffectsProps) {
  const callouts: React.ReactNode[] = [];
  let floater: React.ReactNode = null;
  let projectile: React.ReactNode = null;
  let impact: React.ReactNode = null;

  if (event) {
    if (event.kind === "damage") {
      if (event.source === "move") {
        const eff = event.effectiveness ?? 1;
        if (event.crit) callouts.push(<Callout key="crit" text="Critical hit!" tone="crit" side={event.side} cursor={cursor} />);
        if (eff > 1) callouts.push(<Callout key="eff" text={`Super effective ${formatMultiplier(eff)}`} tone="super" side={event.side} cursor={cursor} />);
        else if (eff < 1) callouts.push(<Callout key="res" text={`Resisted ${formatMultiplier(eff)}`} tone="resist" side={event.side} cursor={cursor} />);
        const color = event.moveType ? TYPE_COLORS[event.moveType].base : "#fff";
        if (animate) {
          impact = (
            <motion.div
              key={`impact-${cursor}`}
              initial={{ scale: 0.2, opacity: 0.95 }}
              animate={{ scale: 2.6, opacity: 0 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="absolute z-10 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full"
              style={{
                left: `${SIDE_X[event.side]}%`,
                top: `${SIDE_Y[event.side]}%`,
                background: `radial-gradient(circle, #fff 0%, ${color} 35%, transparent 70%)`,
                mixBlendMode: "screen",
              }}
            />
          );
        }
      }
      floater = (
        <motion.div
          key={`dmg-${cursor}`}
          initial={{ opacity: 0, y: 0, scale: 0.7 }}
          animate={{ opacity: [0, 1, 1, 0], y: -60, scale: [0.7, 1.25, 1, 1] }}
          transition={{ duration: 1.2, ease: "easeOut" }}
          className={cn(
            "absolute z-20 -translate-x-1/2 font-display text-2xl font-black drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] sm:text-4xl",
            event.crit ? "text-amber-300" : "text-white",
          )}
          style={{ left: `${SIDE_X[event.side] + (event.side === 0 ? 6 : -6)}%`, top: `${SIDE_Y[event.side] - 14}%` }}
          data-testid="floating-number"
        >
          -{event.amount}
        </motion.div>
      );
    } else if (event.kind === "heal") {
      floater = (
        <motion.div
          key={`heal-${cursor}`}
          initial={{ opacity: 0, y: 0 }}
          animate={{ opacity: [0, 1, 1, 0], y: -50 }}
          transition={{ duration: 1.2 }}
          className="absolute z-20 -translate-x-1/2 font-display text-2xl font-black text-green-300 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] sm:text-3xl"
          style={{ left: `${SIDE_X[event.side]}%`, top: `${SIDE_Y[event.side] - 14}%` }}
        >
          +{event.amount}
        </motion.div>
      );
    } else if (event.kind === "miss") {
      callouts.push(<Callout key="miss" text="Missed!" tone="miss" side={event.side === 0 ? 1 : 0} cursor={cursor} />);
    } else if (event.kind === "no-effect") {
      callouts.push(<Callout key="noeff" text="No effect" tone="miss" side={event.side} cursor={cursor} />);
    } else if (event.kind === "move-used" && animate) {
      const color = TYPE_COLORS[event.moveType].base;
      const from = SIDE_X[event.side];
      const to = event.damageClass === "status" ? from : SIDE_X[event.side === 0 ? 1 : 0];
      const y = SIDE_Y[event.side];
      const toY = event.damageClass === "status" ? y : SIDE_Y[event.side === 0 ? 1 : 0];
      projectile = (
        <motion.div
          key={`proj-${cursor}`}
          initial={{ left: `${from}%`, top: `${y}%`, opacity: 0, scale: event.damageClass === "status" ? 0.5 : 0.6 }}
          animate={
            event.damageClass === "status"
              ? { opacity: [0, 0.9, 0], scale: [0.5, 2.2, 2.6] }
              : { left: `${to}%`, top: `${toY}%`, opacity: [0, 1, 1, 0.9], scale: event.damageClass === "special" ? [0.6, 1.1, 1.3] : [0.6, 0.9, 1] }
          }
          transition={{ duration: event.damageClass === "status" ? 0.8 : 0.55, delay: event.damageClass === "status" ? 0 : 0.2, ease: "easeIn" }}
          className={cn(
            "absolute z-10 -translate-x-1/2 -translate-y-1/2",
            event.damageClass === "special" || event.damageClass === "status" ? "h-14 w-14 rounded-full" : "h-3 w-24 rounded-full",
          )}
          style={{
            background:
              event.damageClass === "physical"
                ? `linear-gradient(90deg, transparent, ${color}, #fff)`
                : `radial-gradient(circle, #fff 0%, ${color} 45%, transparent 72%)`,
            boxShadow: `0 0 28px 8px ${color}99`,
            rotate: event.damageClass === "physical" ? (event.side === 0 ? -12 : 192) : 0,
          }}
        />
      );
    }
  }

  return (
    <div className="pointer-events-none absolute inset-0 z-10" aria-hidden>
      <AnimatePresence>{callouts}</AnimatePresence>
      {projectile}
      {impact}
      {floater}
    </div>
  );
}
