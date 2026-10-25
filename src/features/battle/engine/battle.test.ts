import { describe, expect, it } from "vitest";
import { FALLBACK_TYPE_CHART } from "@/features/type-effectiveness/chart";
import { chooseAction, resolveTurn, simulateBattle, BattleError, effectiveSpeed } from "./battle";
import { baseDamage, computeDamage, critChance, rollAccuracy } from "./damage";
import { createSeededRng, createSequenceRng } from "./rng";
import { calcMaxHp, calcStat, stageMultiplier } from "./stats";
import { makeBattle, makeCombatant, makeMove } from "./test-utils";
import { applyEventToView, describeEvent, initialView } from "./view";
import type { BattleAction, Rng } from "./types";

const act = (i = 0): BattleAction => ({ type: "move", moveIndex: i });
const fixedRng = (v: number): Rng => ({ next: () => v });

describe("stat calculations", () => {
  it("computes HP and other stats with the documented formula", () => {
    // Base 100, level 50, IV 31, EV 85 -> floor(((200+31+21)*50)/100)=126
    expect(calcMaxHp(100, 50)).toBe(126 + 50 + 10);
    expect(calcStat(100, 50)).toBe(126 + 5);
    expect(calcMaxHp(1, 50)).toBe(1);
  });

  it("scales stat stages", () => {
    expect(stageMultiplier(0)).toBe(1);
    expect(stageMultiplier(2)).toBe(2);
    expect(stageMultiplier(-2)).toBe(0.5);
    expect(stageMultiplier(6)).toBe(4);
  });
});

describe("damage formula", () => {
  it("matches the reference base damage", () => {
    // level 50, power 80, A 100, D 100 -> floor(floor(22*80*100/100)/50)+2 = 37
    expect(baseDamage(50, 80, 100, 100)).toBe(37);
  });

  it("applies STAB, effectiveness, crits, burn, and roll", () => {
    const base = { level: 50, power: 80, attack: 100, defense: 100, stab: false, effectiveness: 1, crit: false, roll: 100, burnedPhysical: false };
    expect(computeDamage(base)).toBe(37);
    expect(computeDamage({ ...base, stab: true })).toBe(55);
    expect(computeDamage({ ...base, effectiveness: 2 })).toBe(74);
    expect(computeDamage({ ...base, effectiveness: 4 })).toBe(148);
    expect(computeDamage({ ...base, effectiveness: 0.5 })).toBe(18);
    expect(computeDamage({ ...base, crit: true })).toBe(55);
    expect(computeDamage({ ...base, burnedPhysical: true })).toBe(18);
    expect(computeDamage({ ...base, roll: 85 })).toBe(31);
    expect(computeDamage({ ...base, effectiveness: 0 })).toBe(0);
  });

  it("separates physical and special offence/defence", () => {
    const attacker = makeCombatant("a", ["normal"], [], { attack: 150, specialAttack: 30 });
    const phys = makeCombatant("p", ["normal"], [makeMove({ damageClass: "physical", power: 80 })], { attack: 150, specialAttack: 30 });
    const spec = makeCombatant("s", ["normal"], [makeMove({ damageClass: "special", power: 80 })], { attack: 150, specialAttack: 30 });
    const target = makeCombatant("t", ["normal"], [makeMove()], { defense: 30, specialDefense: 150 });
    expect(attacker.stats.attack).toBeGreaterThan(attacker.stats.specialAttack);
    const rng = fixedRng(0.99); // no crit, max roll
    const p = resolveTurn(makeBattle(phys, target), [act(), act()], rng);
    const s = resolveTurn(makeBattle(spec, target), [act(), act()], rng);
    const dmg = (st: typeof p) => st.events.find((e) => e.kind === "damage" && e.side === 1);
    expect((dmg(p) as { amount: number }).amount).toBeGreaterThan((dmg(s) as { amount: number }).amount * 3);
  });

  it("has a crit table and accuracy roll", () => {
    expect(critChance(0)).toBeCloseTo(1 / 24);
    expect(critChance(3)).toBe(1);
    expect(critChance(9)).toBe(1);
    expect(rollAccuracy(fixedRng(0.95), 95)).toBe(false);
    expect(rollAccuracy(fixedRng(0.94), 95)).toBe(true);
    expect(rollAccuracy(fixedRng(0.999), null)).toBe(true);
  });
});

describe("turn resolution", () => {
  const strong = makeMove({ name: "slam", power: 80 });

  it("orders by speed when priority is equal", () => {
    const fast = makeCombatant("fast", ["normal"], [strong], { speed: 150 });
    const slow = makeCombatant("slow", ["normal"], [strong], { speed: 40 });
    const s = resolveTurn(makeBattle(slow, fast), [act(), act()], fixedRng(0.9));
    const firstMover = s.events.find((e) => e.kind === "move-used");
    expect(firstMover && "side" in firstMover && firstMover.side).toBe(1);
  });

  it("lets priority override speed", () => {
    const fast = makeCombatant("fast", ["normal"], [strong], { speed: 150 });
    const slow = makeCombatant("slow", ["normal"], [makeMove({ name: "quick-attack", priority: 1, power: 40 })], { speed: 40 });
    const s = resolveTurn(makeBattle(slow, fast), [act(), act()], fixedRng(0.9));
    const firstMover = s.events.find((e) => e.kind === "move-used");
    expect(firstMover && "side" in firstMover && firstMover.side).toBe(0);
  });

  it("breaks speed ties with the rng", () => {
    const a = makeCombatant("a", ["normal"], [strong], { speed: 100 });
    const b = makeCombatant("b", ["normal"], [strong], { speed: 100 });
    const first = (v: number) => {
      const s = resolveTurn(makeBattle(a, b), [act(), act()], createSequenceRng([v, 0.9]));
      const e = s.events.find((ev) => ev.kind === "move-used");
      return e && "side" in e ? e.side : null;
    };
    expect(first(0.1)).toBe(0);
    expect(first(0.9)).toBe(1);
  });

  it("emits a miss and deals no damage when accuracy fails", () => {
    const miss = makeCombatant("a", ["normal"], [makeMove({ accuracy: 50, power: 100 })], { speed: 200 });
    const tgt = makeCombatant("b", ["normal"], [makeMove({ name: "growl", power: null, damageClass: "status", category: "heal", healing: 1, target: "user" })], { speed: 10 });
    const s = resolveTurn(makeBattle(miss, tgt), [act(), act()], fixedRng(0.9));
    expect(s.events.some((e) => e.kind === "miss")).toBe(true);
    expect(s.combatants[1].hp).toBe(s.combatants[1].maxHp);
    expect(s.stats[0].misses).toBe(1);
  });

  it("applies STAB and type effectiveness through the whole pipeline", () => {
    const water = makeMove({ name: "water-gun", type: "water", damageClass: "special", power: 40 });
    const fireMon = makeCombatant("fire", ["fire"], [water]);
    const waterMon = makeCombatant("water", ["water"], [water]);
    const grassMon = makeCombatant("grass", ["grass"], [water]);
    const dmg = (att: typeof waterMon, def: typeof waterMon) => {
      const s = resolveTurn(makeBattle(att, def), [act(), act()], fixedRng(0.99));
      return (s.events.find((e) => e.kind === "damage" && e.side === 1) as { amount: number; effectiveness: number }) ;
    };
    const neutralNonStab = dmg(grassMon, makeCombatant("n", ["normal"], [water]));
    const stab = dmg(waterMon, makeCombatant("n", ["normal"], [water]));
    const superEff = dmg(waterMon, fireMon);
    const resisted = dmg(waterMon, grassMon);
    expect(stab.amount).toBeGreaterThan(neutralNonStab.amount);
    expect(superEff.effectiveness).toBe(2);
    expect(resisted.effectiveness).toBe(0.5);
    expect(superEff.amount).toBeGreaterThan(stab.amount);
  });

  it("handles immunities", () => {
    const ground = makeMove({ name: "earthquake", type: "ground", power: 100 });
    const s = resolveTurn(
      makeBattle(makeCombatant("a", ["ground"], [ground]), makeCombatant("b", ["flying"], [makeMove()])),
      [act(), act()],
      fixedRng(0.9),
    );
    expect(s.events.some((e) => e.kind === "no-effect")).toBe(true);
  });

  it("rejects invalid state transitions", () => {
    const a = makeCombatant("a", ["normal"], [makeMove({ power: 500 })], { attack: 255, speed: 255 });
    const b = makeCombatant("b", ["normal"], [makeMove()], { hp: 5, speed: 1 });
    const done = resolveTurn(makeBattle(a, b), [act(), act()], fixedRng(0.9));
    expect(done.phase).toBe("finished");
    expect(() => resolveTurn(done, [act(), act()], fixedRng(0.9))).toThrow(BattleError);
    expect(() => resolveTurn(makeBattle(a, b), [act(9), act()], fixedRng(0.9))).toThrow(BattleError);
  });

  it("does not mutate the input state", () => {
    const a = makeCombatant("a", ["normal"], [makeMove()]);
    const b = makeCombatant("b", ["normal"], [makeMove()]);
    const before = makeBattle(a, b);
    const snapshot = JSON.stringify(before);
    resolveTurn(before, [act(), act()], fixedRng(0.9));
    expect(JSON.stringify(before)).toBe(snapshot);
  });
});

describe("fainting and termination", () => {
  it("ends immediately on a faint and prevents later actions", () => {
    const killer = makeCombatant("killer", ["normal"], [makeMove({ power: 250 })], { attack: 255, speed: 200 });
    const victim = makeCombatant("victim", ["normal"], [makeMove()], { hp: 10, speed: 10 });
    const s = resolveTurn(makeBattle(killer, victim), [act(), act()], fixedRng(0.9));
    expect(s.phase).toBe("finished");
    expect(s.winner).toBe(0);
    expect(s.combatants[1].hp).toBe(0);
    const used = s.events.filter((e) => e.kind === "move-used");
    expect(used).toHaveLength(1);
    expect(s.events.at(-1)?.kind).toBe("battle-end");
    expect(s.events.some((e) => e.kind === "faint")).toBe(true);
  });

  it("declares a draw at the turn limit", () => {
    const weak = makeMove({ power: 1, name: "poke" });
    const wall = (n: string) => makeCombatant(n, ["steel"], [weak], { hp: 255, defense: 255, specialDefense: 255, speed: 50 });
    const s = simulateBattle(
      { a: wall("a"), b: wall("b"), chart: FALLBACK_TYPE_CHART, maxTurns: 3 },
      createSeededRng(1),
    );
    expect(s.phase).toBe("finished");
    expect(s.winner).toBe("draw");
    expect(s.turn).toBe(3);
    expect(describeEvent(s.events.at(-1)!, ["a", "b"])?.text).toMatch(/draw/i);
  });

  it("draws when both Pokémon faint from recoil", () => {
    const recoil = makeMove({ name: "double-edge", power: 250, drain: -100 });
    const a = makeCombatant("a", ["normal"], [recoil], { hp: 20, attack: 255, speed: 100 });
    const b = makeCombatant("b", ["normal"], [makeMove()], { hp: 20, speed: 1 });
    const s = resolveTurn(makeBattle(a, b), [act(), act()], fixedRng(0.9));
    expect(s.winner).toBe("draw");
  });

  it("uses Struggle (with recoil) when out of PP", () => {
    const one = makeMove({ pp: 1, power: 1 });
    const a = makeCombatant("a", ["normal"], [one], { hp: 255 });
    const b = makeCombatant("b", ["normal"], [one], { hp: 255 });
    let s = makeBattle(a, b, 10);
    s = resolveTurn(s, [act(), act()], fixedRng(0.9));
    s = resolveTurn(s, [act(), act()], fixedRng(0.9));
    expect(s.events.some((e) => e.kind === "move-used" && e.struggle)).toBe(true);
    expect(s.events.some((e) => e.kind === "damage" && e.source === "recoil")).toBe(true);
  });
});

describe("status effects", () => {
  const status = (ailment: string, extra = {}) =>
    makeMove({ name: `${ailment}-move`, power: null, damageClass: "status", category: "ailment", ailment, accuracy: 100, target: "selected-pokemon", ...extra });
  const idle = makeMove({ name: "pound", power: 1 });

  it("applies burn and deals residual damage + halves physical attack", () => {
    const a = makeCombatant("a", ["normal"], [status("burn")], { speed: 200 });
    const b = makeCombatant("b", ["normal"], [idle], { hp: 100, speed: 10 });
    const s = resolveTurn(makeBattle(a, b), [act(), act()], fixedRng(0.9));
    expect(s.combatants[1].status).toBe("burn");
    const residual = s.events.find((e) => e.kind === "damage" && e.source === "burn");
    expect(residual).toBeTruthy();
    expect(s.combatants[1].hp).toBeLessThan(s.combatants[1].maxHp);
  });

  it("applies poison residual damage and respects type immunity", () => {
    const a = makeCombatant("a", ["normal"], [status("poison")], { speed: 200 });
    const steel = makeCombatant("steel", ["steel"], [idle], { speed: 10 });
    const s = resolveTurn(makeBattle(a, steel), [act(), act()], fixedRng(0.9));
    expect(s.combatants[1].status).toBeNull();
    expect(s.events.some((e) => e.kind === "effect-failed")).toBe(true);
  });

  it("paralysis halves speed and can fully paralyze", () => {
    const a = makeCombatant("a", ["normal"], [status("paralysis")], { speed: 200 });
    const b = makeCombatant("b", ["normal"], [idle], { speed: 100 });
    let s = resolveTurn(makeBattle(a, b), [act(), act()], fixedRng(0.9));
    expect(s.combatants[1].status).toBe("paralysis");
    expect(effectiveSpeed(s.combatants[1])).toBe(Math.floor(s.combatants[1].stats.speed / 2));
    // Next turn, rng 0.1 < 0.25 => paralysed target cannot move
    s = resolveTurn(s, [act(), act()], fixedRng(0.1));
    expect(s.events.some((e) => e.kind === "cant-move" && e.reason === "paralysis")).toBe(true);
  });

  it("sleep prevents moving until it wears off", () => {
    const a = makeCombatant("a", ["normal"], [status("sleep")], { speed: 200 });
    const b = makeCombatant("b", ["normal"], [idle], { speed: 10 });
    let s = resolveTurn(makeBattle(a, b), [act(), act()], fixedRng(0.99)); // sleep duration 3
    expect(s.combatants[1].status).toBe("sleep");
    // The sleeper already lost its action this turn (3 -> 2).
    expect(s.combatants[1].sleepTurns).toBe(2);
    expect(s.events.some((e) => e.kind === "cant-move" && e.reason === "sleep")).toBe(true);
    s = resolveTurn(s, [act(), act()], fixedRng(0.99));
    s = resolveTurn(s, [act(), act()], fixedRng(0.99));
    expect(s.events.some((e) => e.kind === "status-cured" && e.status === "sleep")).toBe(true);
  });

  it("freeze thaws on a lucky roll", () => {
    const a = makeCombatant("a", ["normal"], [status("freeze")], { speed: 200 });
    const b = makeCombatant("b", ["normal"], [idle], { speed: 10 });
    let s = resolveTurn(makeBattle(a, b), [act(), act()], fixedRng(0.9));
    expect(s.combatants[1].status).toBe("freeze");
    s = resolveTurn(s, [act(), act()], fixedRng(0.1));
    expect(s.events.some((e) => e.kind === "status-cured" && e.status === "freeze")).toBe(true);
  });

  it("supports stat stage moves, healing and multi-hit moves", () => {
    const swords = makeMove({ name: "swords-dance", power: null, damageClass: "status", category: "net-good-stats", target: "user", accuracy: null, statChanges: [{ stat: "attack", change: 2 }] });
    const a = makeCombatant("a", ["normal"], [swords], { speed: 200 });
    const b = makeCombatant("b", ["normal"], [idle], { speed: 10 });
    const s = resolveTurn(makeBattle(a, b), [act(), act()], fixedRng(0.9));
    expect(s.combatants[0].stages.attack).toBe(2);

    const multi = makeMove({ name: "fury", power: 15, minHits: 2, maxHits: 5 });
    const m = resolveTurn(makeBattle(makeCombatant("m", ["normal"], [multi], { speed: 200 }), makeCombatant("t", ["normal"], [idle], { hp: 255 })), [act(), act()], fixedRng(0.99));
    expect(m.events.filter((e) => e.kind === "damage" && e.side === 1 && e.source === "move")).toHaveLength(5);
  });
});

describe("deterministic simulation", () => {
  const moves = [makeMove({ name: "slash", power: 70, critRate: 1 }), makeMove({ name: "flame", type: "fire", damageClass: "special", power: 90, accuracy: 85 })];
  const mk = () => ({
    a: makeCombatant("a", ["fire"], moves, { speed: 100 }),
    b: makeCombatant("b", ["grass"], moves, { speed: 90 }),
    chart: FALLBACK_TYPE_CHART,
  });

  it("produces identical logs for the same seed", () => {
    const one = simulateBattle(mk(), createSeededRng(42));
    const two = simulateBattle(mk(), createSeededRng(42));
    expect(JSON.stringify(one.events)).toBe(JSON.stringify(two.events));
    expect(one.phase).toBe("finished");
    expect(one.winner === 0 || one.winner === 1 || one.winner === "draw").toBe(true);
  });

  it("varies across seeds and replays to the same final view", () => {
    const results = new Set(Array.from({ length: 12 }, (_, i) => JSON.stringify(simulateBattle(mk(), createSeededRng(i)).events.length)));
    expect(results.size).toBeGreaterThan(1);

    const final = simulateBattle(mk(), createSeededRng(7));
    let view = initialView(makeBattle(mk().a, mk().b).combatants);
    for (const e of final.events) view = applyEventToView(view, e);
    expect(view[0].hp).toBe(final.combatants[0].hp);
    expect(view[1].hp).toBe(final.combatants[1].hp);
  });

  it("does not decide the winner by base stat total alone", () => {
    const winners = new Map<string, number>();
    for (let seed = 0; seed < 40; seed++) {
      const lowBst = makeCombatant("low", ["fire"], moves, { hp: 70, attack: 70, defense: 70, specialAttack: 70, specialDefense: 70, speed: 70 });
      const highBst = makeCombatant("high", ["grass"], moves, { hp: 80, attack: 80, defense: 80, specialAttack: 80, specialDefense: 80, speed: 80 });
      const s = simulateBattle({ a: lowBst, b: highBst, chart: FALLBACK_TYPE_CHART }, createSeededRng(seed));
      winners.set(String(s.winner), (winners.get(String(s.winner)) ?? 0) + 1);
    }
    expect(winners.get("0") ?? 0).toBeGreaterThan(0); // typing advantage lets the lower-BST Pokémon win
  });

  it("AI chooses a super-effective move over a resisted one", () => {
    const fire = makeMove({ name: "ember", type: "fire", damageClass: "special", power: 60 });
    const water = makeMove({ name: "water-gun", type: "water", damageClass: "special", power: 60 });
    const a = makeCombatant("a", ["normal"], [water, fire]);
    const b = makeCombatant("b", ["grass"], [water]);
    const choice = chooseAction(makeBattle(a, b), 0, fixedRng(0));
    expect(choice.moveIndex).toBe(1);
  });
});
