import { typeMultiplier, type TypeChart } from "@/features/type-effectiveness/chart";
import type { MoveData, PokemonType, StatKey } from "@/types/pokemon";
import type { StatusCondition } from "./types";

export const SUPPORTED_STATUSES: readonly StatusCondition[] = [
  "burn",
  "paralysis",
  "poison",
  "sleep",
  "freeze",
];

/** Moves whose damage is fixed by a rule rather than the damage formula. */
export const FIXED_DAMAGE: Record<string, number | "level" | "half-hp"> = {
  "seismic-toss": "level",
  "night-shade": "level",
  "dragon-rage": 40,
  "sonic-boom": 20,
  "super-fang": "half-hp",
  "natures-madness": "half-hp",
};

/** Mechanics the simulator does not implement (charging, recharge, self-KO, conditional power...). */
export const UNSUPPORTED_MOVES = new Set([
  "explosion",
  "self-destruct",
  "misty-explosion",
  "mind-blown",
  "hyper-beam",
  "giga-impact",
  "blast-burn",
  "frenzy-plant",
  "hydro-cannon",
  "rock-wrecker",
  "roar-of-time",
  "prismatic-laser",
  "eternabeam",
  "meteor-assault",
  "focus-punch",
  "counter",
  "mirror-coat",
  "metal-burst",
  "bide",
  "fake-out",
  "first-impression",
  "sucker-punch",
  "dream-eater",
  "snore",
  "sleep-talk",
  "future-sight",
  "doom-desire",
  "last-resort",
  "belly-drum",
  "endeavor",
  "final-gambit",
  "memento",
  "natural-gift",
  "fling",
  "spit-up",
  "struggle",
  "shell-trap",
  "beak-blast",
  // Two-turn / semi-invulnerable charging moves are not modelled.
  "fly",
  "dig",
  "dive",
  "bounce",
  "solar-beam",
  "solar-blade",
  "sky-attack",
  "razor-wind",
  "skull-bash",
  "freeze-shock",
  "ice-burn",
  "phantom-force",
  "shadow-force",
  "sky-drop",
  "meteor-beam",
  "electro-shot",
]);

const SUPPORTED_CATEGORIES = new Set([
  "damage",
  "ailment",
  "net-good-stats",
  "heal",
  "damage+ailment",
  "damage+lower",
  "damage+raise",
  "damage+heal",
]);

const SELF_TARGETS = new Set(["user", "users-field", "user-and-allies", "user-or-ally"]);

export function targetsSelf(move: MoveData): boolean {
  return SELF_TARGETS.has(move.target);
}

export function isDamaging(move: MoveData): boolean {
  return move.damageClass !== "status" && (move.power !== null || move.name in FIXED_DAMAGE);
}

export function isMoveSupported(move: MoveData): boolean {
  if (UNSUPPORTED_MOVES.has(move.name)) return false;
  if (!SUPPORTED_CATEGORIES.has(move.category)) return false;
  if (move.pp <= 0) return false;
  if (move.damageClass === "status") {
    if (move.category === "ailment") {
      return !!move.ailment && (SUPPORTED_STATUSES as readonly string[]).includes(move.ailment);
    }
    if (move.category === "net-good-stats") return move.statChanges.length > 0;
    if (move.category === "heal") return move.healing > 0;
    return false;
  }
  return isDamaging(move);
}

/** Struggle: used automatically when every move is out of PP. */
export const STRUGGLE: MoveData = {
  name: "struggle",
  type: "normal",
  power: 50,
  accuracy: null,
  pp: 1,
  damageClass: "physical",
  priority: 0,
  effectChance: null,
  category: "damage",
  ailment: null,
  ailmentChance: 0,
  critRate: 0,
  drain: 0,
  healing: 0,
  flinchChance: 0,
  minHits: null,
  maxHits: null,
  statChance: 0,
  statChanges: [],
  target: "selected-pokemon",
  shortEffect: "Used when no PP remains. Deals recoil damage.",
};

export interface SelectionContext {
  types: PokemonType[];
  stats: Record<StatKey, number>;
  level: number;
}

function expectedHits(move: MoveData): number {
  if (!move.minHits || !move.maxHits) return 1;
  if (move.minHits === 2 && move.maxHits === 5) return 3.1;
  return (move.minHits + move.maxHits) / 2;
}

/** Heuristic value of a move for selection and AI. Higher is better. */
export function scoreMove(
  move: MoveData,
  user: SelectionContext,
  opponentTypes: PokemonType[] | null,
  chart: TypeChart,
): number {
  const accuracy = (move.accuracy ?? 100) / 100;
  if (isDamaging(move)) {
    const stab = user.types.includes(move.type) ? 1.5 : 1;
    const eff = opponentTypes ? typeMultiplier(chart, move.type, opponentTypes) : 1;
    const fixed = FIXED_DAMAGE[move.name];
    let power = move.power ?? 0;
    if (fixed === "level") power = user.level * 1.2;
    else if (typeof fixed === "number") power = fixed;
    else if (fixed === "half-hp") power = 60;
    const statFactor =
      move.damageClass === "physical"
        ? user.stats.attack / Math.max(user.stats.attack, user.stats.specialAttack)
        : user.stats.specialAttack / Math.max(user.stats.attack, user.stats.specialAttack);
    let score = power * expectedHits(move) * accuracy * stab * eff * (0.55 + 0.45 * statFactor);
    if (move.priority > 0) score *= 1.1;
    if (move.drain > 0) score *= 1 + move.drain / 200;
    if (move.drain < 0) score *= 1 + move.drain / 150;
    return score;
  }
  // Utility moves get a modest fixed value so one good utility move can fill the last slot.
  if (move.category === "heal") return 40 + move.healing / 2;
  if (move.category === "ailment") {
    const bonus: Record<string, number> = { sleep: 46, paralysis: 42, burn: 42, poison: 36, freeze: 30 };
    return (bonus[move.ailment ?? ""] ?? 20) * accuracy;
  }
  if (move.category === "net-good-stats") {
    const self = targetsSelf(move);
    const gain = move.statChanges.reduce((sum, sc) => {
      const useful =
        sc.stat === "speed" ||
        sc.stat === (user.stats.attack >= user.stats.specialAttack ? "attack" : "specialAttack");
      const sign = self ? sc.change : -sc.change;
      return sum + (sign > 0 ? (useful ? 14 : 7) * sign : 0);
    }, 0);
    return Math.min(gain, 50) * accuracy;
  }
  return 0;
}

export interface MoveChoice {
  move: MoveData;
  score: number;
}

/**
 * Curated automatic move selection: up to three strong, type-diverse damaging moves,
 * plus one utility move (heal, status, setup) when it is valuable, otherwise another attack.
 */
export function selectMoves(
  candidates: MoveData[],
  user: SelectionContext,
  opponentTypes: PokemonType[] | null,
  chart: TypeChart,
  count = 4,
): MoveData[] {
  const supported = [
    ...new Map(candidates.filter(isMoveSupported).map((m) => [m.name, m])).values(),
  ];
  const scored: MoveChoice[] = supported
    .map((move) => ({ move, score: scoreMove(move, user, opponentTypes, chart) }))
    .filter((c) => c.score > 0)
    .sort((a, b) => b.score - a.score || a.move.name.localeCompare(b.move.name));

  const damaging = scored.filter((c) => isDamaging(c.move));
  const utility = scored.filter((c) => !isDamaging(c.move));

  const picked: MoveData[] = [];
  const typeCounts = new Map<PokemonType, number>();
  const take = (c: MoveChoice, maxPerType: number) => {
    if (picked.length >= count || picked.includes(c.move)) return;
    if ((typeCounts.get(c.move.type) ?? 0) >= maxPerType) return;
    picked.push(c.move);
    typeCounts.set(c.move.type, (typeCounts.get(c.move.type) ?? 0) + 1);
  };

  const damageSlots = utility.length > 0 && damaging.length > 3 ? count - 1 : count;
  for (const c of damaging) if (picked.length < damageSlots) take(c, 2);
  // Relax the per-type cap if diversity left slots empty.
  for (const c of damaging) if (picked.length < damageSlots) take(c, 4);
  for (const c of utility) if (picked.length < count && c.score >= 30) take(c, 4);
  for (const c of damaging) if (picked.length < count) take(c, 4);
  return picked;
}

export function describeMoveSummary(move: MoveData): string {
  if (isDamaging(move)) {
    const fixed = FIXED_DAMAGE[move.name];
    if (fixed === "level") return "Damage equals user level";
    if (typeof fixed === "number") return `Fixed ${fixed} damage`;
    if (fixed === "half-hp") return "Halves target's current HP";
    return `${move.power} power`;
  }
  if (move.category === "heal") return `Restores ${move.healing}% HP`;
  if (move.category === "ailment") return `Inflicts ${move.ailment}`;
  if (move.statChanges.length) {
    return move.statChanges
      .map((s) => `${s.change > 0 ? "+" : ""}${s.change} ${s.stat}`)
      .join(", ");
  }
  return "Status move";
}
