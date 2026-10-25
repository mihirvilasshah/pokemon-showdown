import { typeMultiplier, type TypeChart } from "@/features/type-effectiveness/chart";
import type { BattleStatKey, MoveData, PokemonType } from "@/types/pokemon";
import { computeDamage, rollAccuracy, rollCrit, rollDamageVariance } from "./damage";
import { FIXED_DAMAGE, STRUGGLE, isDamaging, targetsSelf } from "./moves";
import { randomInt } from "./rng";
import { stageMultiplier } from "./stats";
import {
  DEFAULT_MAX_TURNS,
  STAT_STAGE_LIMIT,
  type BattleAction,
  type BattleEvent,
  type BattleState,
  type Combatant,
  type DamageSource,
  type Rng,
  type Side,
  type SideStats,
  type StatusCondition,
} from "./types";

export class BattleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BattleError";
  }
}

export interface BattleConfig {
  a: Combatant;
  b: Combatant;
  chart: TypeChart;
  maxTurns?: number;
}

const emptySideStats = (): SideStats => ({
  damageDealt: 0,
  damageTaken: 0,
  hits: 0,
  crits: 0,
  misses: 0,
  movesUsed: 0,
  superEffectiveHits: 0,
});

export function createBattle(config: BattleConfig): BattleState {
  return {
    turn: 0,
    maxTurns: config.maxTurns ?? DEFAULT_MAX_TURNS,
    combatants: [structuredClone(config.a), structuredClone(config.b)],
    chart: config.chart,
    events: [],
    phase: "active",
    winner: null,
    stats: [emptySideStats(), emptySideStats()],
  };
}

function cloneState(state: BattleState): BattleState {
  return {
    ...state,
    combatants: [structuredClone(state.combatants[0]), structuredClone(state.combatants[1])],
    events: [...state.events],
    stats: [{ ...state.stats[0] }, { ...state.stats[1] }],
  };
}

const other = (side: Side): Side => (side === 0 ? 1 : 0);

/* ------------------------------ Move resolution ----------------------------- */

interface PlannedMove {
  data: MoveData;
  index: number | null; // null => Struggle
}

export function hasUsableMove(c: Combatant): boolean {
  return c.moves.some((m) => m.pp > 0);
}

function planMove(c: Combatant, action: BattleAction): PlannedMove {
  if (!hasUsableMove(c)) return { data: STRUGGLE, index: null };
  const move = c.moves[action.moveIndex];
  if (!move) throw new BattleError(`${c.displayName} has no move in slot ${action.moveIndex}`);
  if (move.pp <= 0) throw new BattleError(`${move.data.name} has no PP left`);
  return { data: move.data, index: action.moveIndex };
}

export function effectiveSpeed(c: Combatant): number {
  const base = c.stats.speed * stageMultiplier(c.stages.speed);
  return Math.floor(c.status === "paralysis" ? base / 2 : base);
}

const STATUS_IMMUNE_TYPES: Record<StatusCondition, string[]> = {
  burn: ["fire"],
  paralysis: ["electric"],
  poison: ["poison", "steel"],
  freeze: ["ice"],
  sleep: [],
};

function emit(s: BattleState, e: BattleEvent) {
  s.events.push(e);
}

function applyDamage(
  s: BattleState,
  side: Side,
  amount: number,
  extra: { source: DamageSource; move?: string; moveType?: PokemonType; crit?: boolean; effectiveness?: number },
): number {
  const c = s.combatants[side];
  const dealt = Math.min(c.hp, Math.max(0, amount));
  c.hp -= dealt;
  s.stats[side].damageTaken += dealt;
  emit(s, {
    kind: "damage",
    turn: s.turn,
    side,
    amount: dealt,
    hpAfter: c.hp,
    maxHp: c.maxHp,
    ...extra,
  });
  if (c.hp === 0) emit(s, { kind: "faint", turn: s.turn, side });
  return dealt;
}

function applyHeal(s: BattleState, side: Side, amount: number, source: "move" | "drain"): number {
  const c = s.combatants[side];
  const healed = Math.min(c.maxHp - c.hp, Math.max(0, amount));
  if (healed <= 0) return 0;
  c.hp += healed;
  emit(s, { kind: "heal", turn: s.turn, side, amount: healed, hpAfter: c.hp, maxHp: c.maxHp, source });
  return healed;
}

function changeStage(s: BattleState, side: Side, stat: BattleStatKey, change: number) {
  const c = s.combatants[side];
  const next = Math.max(-STAT_STAGE_LIMIT, Math.min(STAT_STAGE_LIMIT, c.stages[stat] + change));
  const delta = next - c.stages[stat];
  c.stages[stat] = next;
  emit(s, { kind: "stat-change", turn: s.turn, side, stat, delta, stage: next });
}

function tryInflictStatus(
  s: BattleState,
  target: Side,
  status: StatusCondition,
  rng: Rng,
  announceFailure?: { move: string },
): boolean {
  const t = s.combatants[target];
  const fail = (reason: string) => {
    if (announceFailure) {
      emit(s, { kind: "effect-failed", turn: s.turn, side: target, move: announceFailure.move, reason });
    }
    return false;
  };
  if (t.hp <= 0) return false;
  if (t.status) return fail("already has a status condition");
  if (t.types.some((ty) => STATUS_IMMUNE_TYPES[status].includes(ty))) return fail("is immune");
  t.status = status;
  if (status === "sleep") t.sleepTurns = randomInt(rng, 1, 3);
  emit(s, { kind: "status-applied", turn: s.turn, side: target, status });
  return true;
}

function hitCount(move: MoveData, rng: Rng): number {
  if (!move.minHits || !move.maxHits) return 1;
  if (move.minHits === move.maxHits) return move.minHits;
  if (move.minHits === 2 && move.maxHits === 5) {
    const r = rng.next();
    return r < 0.35 ? 2 : r < 0.7 ? 3 : r < 0.85 ? 4 : 5;
  }
  return randomInt(rng, move.minHits, move.maxHits);
}

function attackStat(c: Combatant, move: MoveData, crit: boolean): number {
  const key = move.damageClass === "physical" ? "attack" : "specialAttack";
  const stage = crit ? Math.max(0, c.stages[key]) : c.stages[key];
  return Math.max(1, Math.floor(c.stats[key] * stageMultiplier(stage)));
}

function defenseStat(c: Combatant, move: MoveData, crit: boolean): number {
  const key = move.damageClass === "physical" ? "defense" : "specialDefense";
  const stage = crit ? Math.min(0, c.stages[key]) : c.stages[key];
  return Math.max(1, Math.floor(c.stats[key] * stageMultiplier(stage)));
}

/** Average-roll, non-crit damage estimate (used by the AI and matchup previews). */
export function estimateDamage(
  attacker: Combatant,
  defender: Combatant,
  move: MoveData,
  chart: TypeChart,
): number {
  if (!isDamaging(move)) return 0;
  const eff = typeMultiplier(chart, move.type, defender.types);
  if (eff === 0) return 0;
  const fixed = FIXED_DAMAGE[move.name];
  if (fixed === "level") return attacker.level;
  if (typeof fixed === "number") return fixed;
  if (fixed === "half-hp") return Math.max(1, Math.floor(defender.hp / 2));
  return computeDamage({
    level: attacker.level,
    power: move.power ?? 0,
    attack: attackStat(attacker, move, false),
    defense: defenseStat(defender, move, false),
    stab: attacker.types.includes(move.type),
    effectiveness: eff,
    crit: false,
    roll: 92,
    burnedPhysical: attacker.status === "burn" && move.damageClass === "physical",
  });
}

function executeMove(
  s: BattleState,
  actor: Side,
  planned: PlannedMove,
  rng: Rng,
  targetHasActed: boolean,
) {
  const user = s.combatants[actor];
  const targetSide = other(actor);
  const target = s.combatants[targetSide];
  const move = planned.data;
  const turn = s.turn;

  if (user.hp <= 0) return;

  if (user.flinched) {
    user.flinched = false;
    emit(s, { kind: "cant-move", turn, side: actor, reason: "flinch" });
    return;
  }
  if (user.status === "sleep") {
    user.sleepTurns -= 1;
    if (user.sleepTurns > 0) {
      emit(s, { kind: "cant-move", turn, side: actor, reason: "sleep" });
      return;
    }
    user.status = null;
    emit(s, { kind: "status-cured", turn, side: actor, status: "sleep" });
  } else if (user.status === "freeze") {
    if (rng.next() < 0.2) {
      user.status = null;
      emit(s, { kind: "status-cured", turn, side: actor, status: "freeze" });
    } else {
      emit(s, { kind: "cant-move", turn, side: actor, reason: "freeze" });
      return;
    }
  } else if (user.status === "paralysis" && rng.next() < 0.25) {
    emit(s, { kind: "cant-move", turn, side: actor, reason: "paralysis" });
    return;
  }

  if (planned.index !== null) user.moves[planned.index].pp -= 1;
  s.stats[actor].movesUsed += 1;
  emit(s, {
    kind: "move-used",
    turn,
    side: actor,
    move: move.name,
    moveType: move.type,
    damageClass: move.damageClass,
    struggle: planned.index === null,
  });

  const selfTargeted = targetsSelf(move);
  if (!selfTargeted && !rollAccuracy(rng, move.accuracy)) {
    s.stats[actor].misses += 1;
    emit(s, { kind: "miss", turn, side: actor, move: move.name });
    return;
  }

  if (isDamaging(move)) {
    executeDamagingMove(s, actor, user, targetSide, target, move, planned.index === null, rng, targetHasActed);
  } else {
    executeStatusMove(s, actor, targetSide, move, rng);
  }
}

function executeDamagingMove(
  s: BattleState,
  actor: Side,
  user: Combatant,
  targetSide: Side,
  target: Combatant,
  move: MoveData,
  isStruggle: boolean,
  rng: Rng,
  targetHasActed: boolean,
) {
  const turn = s.turn;
  const effectiveness = isStruggle ? 1 : typeMultiplier(s.chart, move.type, target.types);
  if (effectiveness === 0) {
    emit(s, { kind: "no-effect", turn, side: targetSide, move: move.name });
    return;
  }

  const fixed = FIXED_DAMAGE[move.name];
  const hits = fixed !== undefined ? 1 : hitCount(move, rng);
  let totalDealt = 0;
  let landed = 0;

  for (let i = 0; i < hits && target.hp > 0; i++) {
    let amount: number;
    let crit = false;
    if (fixed === "level") amount = user.level;
    else if (typeof fixed === "number") amount = fixed;
    else if (fixed === "half-hp") amount = Math.max(1, Math.floor(target.hp / 2));
    else {
      crit = rollCrit(rng, move.critRate);
      amount = computeDamage({
        level: user.level,
        power: move.power ?? 0,
        attack: attackStat(user, move, crit),
        defense: defenseStat(target, move, crit),
        stab: !isStruggle && user.types.includes(move.type),
        effectiveness,
        crit,
        roll: rollDamageVariance(rng),
        burnedPhysical: user.status === "burn" && move.damageClass === "physical",
      });
    }
    if (move.type === "fire" && target.status === "freeze") {
      target.status = null;
      emit(s, { kind: "status-cured", turn, side: targetSide, status: "freeze" });
    }
    const dealt = applyDamage(s, targetSide, amount, {
      source: "move",
      move: move.name,
      moveType: move.type,
      crit,
      effectiveness,
    });
    totalDealt += dealt;
    landed += 1;
    s.stats[actor].damageDealt += dealt;
    s.stats[actor].hits += 1;
    if (crit) s.stats[actor].crits += 1;
    if (effectiveness > 1) s.stats[actor].superEffectiveHits += 1;
  }
  if (landed > 1) emit(s, { kind: "multi-hit", turn, side: actor, hits: landed });

  if (isStruggle) {
    applyDamage(s, actor, Math.max(1, Math.floor(user.maxHp / 4)), { source: "recoil", move: move.name });
    return;
  }

  if (move.drain > 0 && totalDealt > 0) {
    applyHeal(s, actor, Math.max(1, Math.floor((totalDealt * move.drain) / 100)), "drain");
  } else if (move.drain < 0 && totalDealt > 0 && user.hp > 0) {
    applyDamage(s, actor, Math.max(1, Math.floor((totalDealt * -move.drain) / 100)), {
      source: "recoil",
      move: move.name,
    });
  }

  if (target.hp > 0) {
    if (
      move.ailment &&
      (move.category === "damage+ailment" || move.category === "damage") &&
      isSupportedStatus(move.ailment)
    ) {
      const chance = move.ailmentChance || (move.category === "damage+ailment" ? 100 : 0);
      if (chance > 0 && rng.next() * 100 < chance) {
        tryInflictStatus(s, targetSide, move.ailment, rng);
      }
    }
    if (move.flinchChance > 0 && !targetHasActed && rng.next() * 100 < move.flinchChance) {
      target.flinched = true;
    }
    if (move.category === "damage+lower" && move.statChanges.length) {
      if (rng.next() * 100 < (move.statChance || 100)) {
        for (const sc of move.statChanges) changeStage(s, targetSide, sc.stat, sc.change);
      }
    }
  }
  if (move.category === "damage+raise" && move.statChanges.length && user.hp > 0) {
    if (rng.next() * 100 < (move.statChance || 100)) {
      for (const sc of move.statChanges) changeStage(s, actor, sc.stat, sc.change);
    }
  }
}

function isSupportedStatus(name: string): name is StatusCondition {
  return ["burn", "paralysis", "poison", "sleep", "freeze"].includes(name);
}

function executeStatusMove(s: BattleState, actor: Side, targetSide: Side, move: MoveData, rng: Rng) {
  const turn = s.turn;
  const user = s.combatants[actor];
  const target = s.combatants[targetSide];

  if (move.category === "heal") {
    const healed = applyHeal(s, actor, Math.max(1, Math.floor((user.maxHp * move.healing) / 100)), "move");
    if (healed === 0) {
      emit(s, { kind: "effect-failed", turn, side: actor, move: move.name, reason: "HP is already full" });
    }
    return;
  }

  if (move.category === "ailment" && move.ailment && isSupportedStatus(move.ailment)) {
    if (move.type === "electric" && typeMultiplier(s.chart, move.type, target.types) === 0) {
      emit(s, { kind: "no-effect", turn, side: targetSide, move: move.name });
      return;
    }
    tryInflictStatus(s, targetSide, move.ailment, rng, { move: move.name });
    return;
  }

  if (move.category === "net-good-stats") {
    const side = targetsSelf(move) ? actor : targetSide;
    for (const sc of move.statChanges) changeStage(s, side, sc.stat, sc.change);
    return;
  }

  emit(s, { kind: "effect-failed", turn, side: actor, move: move.name, reason: "has no effect in this simulator" });
}

/* ------------------------------- Turn handling ------------------------------ */

function checkEnd(s: BattleState): boolean {
  if (s.phase === "finished") return true;
  const [a, b] = s.combatants;
  if (a.hp > 0 && b.hp > 0) return false;
  s.phase = "finished";
  s.winner = a.hp === 0 && b.hp === 0 ? "draw" : a.hp > 0 ? 0 : 1;
  emit(s, { kind: "battle-end", turn: s.turn, winner: s.winner, reason: "faint" });
  return true;
}

/**
 * Resolve one full turn. Pure with respect to `state` (returns a new state);
 * all randomness comes from the injected `rng`.
 */
export function resolveTurn(
  state: BattleState,
  actions: [BattleAction, BattleAction],
  rng: Rng,
): BattleState {
  if (state.phase === "finished") throw new BattleError("The battle has already finished");
  const planned = [planMove(state.combatants[0], actions[0]), planMove(state.combatants[1], actions[1])] as const;

  const s = cloneState(state);
  s.turn += 1;
  s.combatants.forEach((c) => (c.flinched = false));
  emit(s, { kind: "turn-start", turn: s.turn });

  const speeds = [effectiveSpeed(s.combatants[0]), effectiveSpeed(s.combatants[1])];
  let order: Side[];
  if (planned[0].data.priority !== planned[1].data.priority) {
    order = planned[0].data.priority > planned[1].data.priority ? [0, 1] : [1, 0];
  } else if (speeds[0] !== speeds[1]) {
    order = speeds[0] > speeds[1] ? [0, 1] : [1, 0];
  } else {
    order = rng.next() < 0.5 ? [0, 1] : [1, 0];
  }

  const acted: [boolean, boolean] = [false, false];
  for (const side of order) {
    if (checkEnd(s)) break;
    executeMove(s, side, planned[side], rng, acted[other(side)]);
    acted[side] = true;
    checkEnd(s);
  }

  if (!checkEnd(s)) {
    for (const side of order) {
      const c = s.combatants[side];
      if (c.hp <= 0) continue;
      if (c.status === "burn") {
        applyDamage(s, side, Math.max(1, Math.floor(c.maxHp / 16)), { source: "burn" });
      } else if (c.status === "poison") {
        applyDamage(s, side, Math.max(1, Math.floor(c.maxHp / 8)), { source: "poison" });
      }
    }
    checkEnd(s);
  }

  if (s.phase === "active" && s.turn >= s.maxTurns) {
    s.phase = "finished";
    s.winner = "draw";
    emit(s, { kind: "battle-end", turn: s.turn, winner: "draw", reason: "turn-limit" });
  }
  return s;
}

/* ----------------------------------- AI ------------------------------------ */

/** Greedy, expected-value move chooser used for quick battles and the interactive opponent. */
export function chooseAction(state: BattleState, side: Side, rng: Rng): BattleAction {
  const me = state.combatants[side];
  const foe = state.combatants[other(side)];
  let best = { index: 0, score: -Infinity };

  me.moves.forEach((m, index) => {
    if (m.pp <= 0) return;
    const move = m.data;
    let score: number;
    if (isDamaging(move)) {
      const dmg = estimateDamage(me, foe, move, state.chart) * (move.minHits && move.maxHits ? (move.minHits + move.maxHits) / 2 : 1);
      const accuracy = (move.accuracy ?? 100) / 100;
      const frac = Math.min(1, dmg / Math.max(1, foe.hp));
      score = frac * accuracy;
      if (dmg >= foe.hp) score += 1 + (move.priority > 0 ? 0.5 : 0);
      if (move.priority > 0 && frac > 0.2) score += 0.05;
    } else if (move.category === "heal") {
      const missing = (me.maxHp - me.hp) / me.maxHp;
      score = missing > 0.45 ? 0.4 + missing * 0.5 : 0;
    } else if (move.category === "ailment" && move.ailment) {
      const blocked =
        foe.status !== null ||
        (isSupportedStatus(move.ailment) &&
          foe.types.some((t) => STATUS_IMMUNE_TYPES[move.ailment as StatusCondition].includes(t))) ||
        (move.type === "electric" && typeMultiplier(state.chart, move.type, foe.types) === 0);
      score = blocked ? 0 : 0.28 * ((move.accuracy ?? 100) / 100) * (foe.hp / foe.maxHp > 0.5 ? 1 : 0.3);
    } else {
      const self = targetsSelf(move);
      const useful = move.statChanges.every((sc) => {
        const stage = (self ? me : foe).stages[sc.stat];
        return self ? stage < 2 && sc.change > 0 : stage > -2 && sc.change < 0;
      });
      score = useful && state.turn < 8 ? 0.24 : 0;
    }
    score += rng.next() * 0.04;
    if (score > best.score) best = { index, score };
  });

  return { type: "move", moveIndex: best.index };
}

export interface SimulationOptions {
  /** Called after each resolved turn (e.g. for debugging). */
  onTurn?: (state: BattleState) => void;
}

/** Run an entire battle with AI-chosen moves on both sides. */
export function simulateBattle(config: BattleConfig, rng: Rng, options: SimulationOptions = {}): BattleState {
  let state = createBattle(config);
  let guard = 0;
  while (state.phase === "active" && guard++ < (config.maxTurns ?? DEFAULT_MAX_TURNS) + 5) {
    state = resolveTurn(state, [chooseAction(state, 0, rng), chooseAction(state, 1, rng)], rng);
    options.onTurn?.(state);
  }
  return state;
}
