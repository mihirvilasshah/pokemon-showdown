import { formatName } from "@/features/pokemon/mappers";
import { formatMultiplier } from "@/features/type-effectiveness/chart";
import type { BattleEvent, Combatant, Side, StatStages, StatusCondition } from "./types";

/** Minimal per-side snapshot that the UI derives by replaying battle events. */
export interface SideView {
  hp: number;
  maxHp: number;
  status: StatusCondition | null;
  stages: StatStages;
  fainted: boolean;
}

export type BattleView = [SideView, SideView];

export function initialView(combatants: [Combatant, Combatant]): BattleView {
  const make = (c: Combatant): SideView => ({
    hp: c.hp,
    maxHp: c.maxHp,
    status: c.status,
    stages: { ...c.stages },
    fainted: c.hp <= 0,
  });
  return [make(combatants[0]), make(combatants[1])];
}

export function applyEventToView(view: BattleView, event: BattleEvent): BattleView {
  const next: BattleView = [{ ...view[0] }, { ...view[1] }];
  const patch = (side: Side, p: Partial<SideView>) => {
    next[side] = { ...next[side], ...p };
  };
  switch (event.kind) {
    case "damage":
    case "heal":
      patch(event.side, { hp: event.hpAfter });
      break;
    case "status-applied":
      patch(event.side, { status: event.status });
      break;
    case "status-cured":
      patch(event.side, { status: null });
      break;
    case "stat-change":
      patch(event.side, { stages: { ...next[event.side].stages, [event.stat]: event.stage } });
      break;
    case "faint":
      patch(event.side, { fainted: true, hp: 0 });
      break;
    default:
      break;
  }
  return next;
}

export type LogTone = "info" | "move" | "damage" | "crit" | "super" | "resist" | "status" | "heal" | "faint" | "end";

export interface LogLine {
  text: string;
  tone: LogTone;
}

const STATUS_TEXT: Record<StatusCondition, string> = {
  burn: "was burned",
  paralysis: "was paralyzed",
  poison: "was poisoned",
  sleep: "fell asleep",
  freeze: "was frozen solid",
};

const CURE_TEXT: Record<StatusCondition, string> = {
  burn: "is no longer burned",
  paralysis: "is no longer paralyzed",
  poison: "is no longer poisoned",
  sleep: "woke up",
  freeze: "thawed out",
};

const STAT_TEXT: Record<string, string> = {
  attack: "Attack",
  defense: "Defense",
  specialAttack: "Sp. Atk",
  specialDefense: "Sp. Def",
  speed: "Speed",
};

/** Convert an engine event to a readable log line. Returns null for events without a line. */
export function describeEvent(event: BattleEvent, names: [string, string]): LogLine | null {
  const n = (s: Side) => names[s];
  switch (event.kind) {
    case "turn-start":
      return { text: `Turn ${event.turn}`, tone: "info" };
    case "move-used":
      return {
        text: event.struggle
          ? `${n(event.side)} has no moves left and uses Struggle!`
          : `${n(event.side)} used ${formatName(event.move)}!`,
        tone: "move",
      };
    case "miss":
      return { text: `${n(event.side)}'s attack missed!`, tone: "info" };
    case "cant-move": {
      const why = {
        sleep: "is fast asleep",
        freeze: "is frozen solid",
        paralysis: "is paralyzed! It can't move",
        flinch: "flinched and couldn't move",
      }[event.reason];
      return { text: `${n(event.side)} ${why}!`, tone: "status" };
    }
    case "status-cured":
      return { text: `${n(event.side)} ${CURE_TEXT[event.status]}!`, tone: "status" };
    case "damage": {
      if (event.source === "burn") return { text: `${n(event.side)} was hurt by its burn (-${event.amount} HP).`, tone: "status" };
      if (event.source === "poison") return { text: `${n(event.side)} was hurt by poison (-${event.amount} HP).`, tone: "status" };
      if (event.source === "recoil") return { text: `${n(event.side)} was hurt by recoil (-${event.amount} HP).`, tone: "damage" };
      const eff = event.effectiveness ?? 1;
      const parts = [`${n(event.side)} took ${event.amount} damage.`];
      if (event.crit) parts.push("A critical hit!");
      if (eff > 1) parts.push(`It's super effective! (${formatMultiplier(eff)})`);
      else if (eff < 1) parts.push(`It's not very effective… (${formatMultiplier(eff)})`);
      return {
        text: parts.join(" "),
        tone: event.crit ? "crit" : eff > 1 ? "super" : eff < 1 ? "resist" : "damage",
      };
    }
    case "no-effect":
      return { text: `It doesn't affect ${n(event.side)}…`, tone: "resist" };
    case "multi-hit":
      return { text: `Hit ${event.hits} times!`, tone: "info" };
    case "heal":
      return {
        text: `${n(event.side)} restored ${event.amount} HP.`,
        tone: "heal",
      };
    case "status-applied":
      return { text: `${n(event.side)} ${STATUS_TEXT[event.status]}!`, tone: "status" };
    case "stat-change": {
      const label = STAT_TEXT[event.stat] ?? event.stat;
      if (event.delta === 0) return { text: `${n(event.side)}'s ${label} won't go any further!`, tone: "info" };
      const mag = Math.abs(event.delta);
      const how = mag >= 3 ? "drastically" : mag === 2 ? "sharply" : "";
      return {
        text: `${n(event.side)}'s ${label} ${how ? how + " " : ""}${event.delta > 0 ? "rose" : "fell"}!`,
        tone: "status",
      };
    }
    case "effect-failed":
      return { text: `But it failed! (${formatName(event.move)} ${event.reason})`, tone: "info" };
    case "faint":
      return { text: `${n(event.side)} fainted!`, tone: "faint" };
    case "battle-end":
      if (event.winner === "draw") {
        return {
          text: event.reason === "turn-limit" ? "Turn limit reached — it's a draw!" : "Both Pokémon fainted — it's a draw!",
          tone: "end",
        };
      }
      return { text: `${n(event.winner)} wins the battle!`, tone: "end" };
  }
}
