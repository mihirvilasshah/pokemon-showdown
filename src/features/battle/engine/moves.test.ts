import { describe, expect, it } from "vitest";
import { FALLBACK_TYPE_CHART } from "@/features/type-effectiveness/chart";
import { isMoveSupported, selectMoves, STRUGGLE } from "./moves";
import { resolveTurn } from "./battle";
import { makeBattle, makeCombatant, makeMove } from "./test-utils";

const ctx = { types: ["fire" as const], stats: { hp: 80, attack: 80, defense: 80, specialAttack: 120, specialDefense: 80, speed: 80 }, level: 50 };

describe("move support and selection", () => {
  it("excludes unsupported mechanics", () => {
    expect(isMoveSupported(makeMove())).toBe(true);
    expect(isMoveSupported(makeMove({ name: "explosion", power: 250 }))).toBe(false);
    expect(isMoveSupported(makeMove({ name: "fly", power: 90 }))).toBe(false);
    expect(isMoveSupported(makeMove({ name: "counter", power: null }))).toBe(false);
    expect(isMoveSupported(makeMove({ name: "return", power: null }))).toBe(false);
    expect(isMoveSupported(makeMove({ name: "weather", power: null, damageClass: "status", category: "field-effect" }))).toBe(false);
    expect(isMoveSupported(makeMove({ name: "confuse-ray", power: null, damageClass: "status", category: "ailment", ailment: "confusion" }))).toBe(false);
    expect(isMoveSupported(makeMove({ name: "seismic-toss", power: null }))).toBe(true);
    expect(isMoveSupported(makeMove({ name: "recover", power: null, damageClass: "status", category: "heal", healing: 50, target: "user" }))).toBe(true);
  });

  it("selects strong, type-diverse moves plus a useful utility move", () => {
    const moves = [
      makeMove({ name: "flamethrower", type: "fire", damageClass: "special", power: 90 }),
      makeMove({ name: "fire-blast", type: "fire", damageClass: "special", power: 110, accuracy: 85 }),
      makeMove({ name: "ember", type: "fire", damageClass: "special", power: 40 }),
      makeMove({ name: "air-slash", type: "flying", damageClass: "special", power: 75, accuracy: 95 }),
      makeMove({ name: "dragon-pulse", type: "dragon", damageClass: "special", power: 85 }),
      makeMove({ name: "scratch", power: 40 }),
      makeMove({ name: "roost", power: null, damageClass: "status", category: "heal", healing: 50, target: "user", accuracy: null }),
      makeMove({ name: "explosion", power: 250 }),
    ];
    const picked = selectMoves(moves, ctx, ["grass"], FALLBACK_TYPE_CHART).map((m) => m.name);
    expect(picked).toHaveLength(4);
    expect(picked).toContain("flamethrower");
    expect(picked).toContain("roost");
    expect(picked).not.toContain("explosion");
    expect(picked.filter((n) => ["flamethrower", "fire-blast", "ember"].includes(n)).length).toBeLessThanOrEqual(2);
  });

  it("returns an empty list when nothing is usable (battle falls back to Struggle)", () => {
    expect(selectMoves([makeMove({ name: "explosion" })], ctx, null, FALLBACK_TYPE_CHART)).toEqual([]);
    const a = makeCombatant("a", ["normal"], []);
    const b = makeCombatant("b", ["normal"], []);
    const s = resolveTurn(makeBattle(a, b), [{ type: "move", moveIndex: 0 }, { type: "move", moveIndex: 0 }], { next: () => 0.9 });
    expect(s.events.filter((e) => e.kind === "move-used" && e.struggle)).toHaveLength(2);
    expect(STRUGGLE.power).toBe(50);
  });
});

describe("fixed damage and special effects", () => {
  it("seismic toss deals level damage and respects immunities", () => {
    const toss = makeMove({ name: "seismic-toss", type: "fighting", power: null });
    const a = makeCombatant("a", ["fighting"], [toss], { speed: 200 }, 50);
    const normal = makeCombatant("b", ["normal"], [makeMove()], { hp: 200 });
    const ghost = makeCombatant("g", ["ghost"], [makeMove()], { hp: 200 });
    const rng = { next: () => 0.5 };
    const hit = resolveTurn(makeBattle(a, normal), [{ type: "move", moveIndex: 0 }, { type: "move", moveIndex: 0 }], rng);
    const dmg = hit.events.find((e) => e.kind === "damage" && e.side === 1 && e.source === "move");
    expect(dmg && "amount" in dmg && dmg.amount).toBe(50);
    const immune = resolveTurn(makeBattle(a, ghost), [{ type: "move", moveIndex: 0 }, { type: "move", moveIndex: 0 }], rng);
    expect(immune.events.some((e) => e.kind === "no-effect")).toBe(true);
  });

  it("drain heals the user and flinch stops a slower target", () => {
    const drain = makeMove({ name: "giga-drain", power: 75, damageClass: "special", drain: 50, flinchChance: 100 });
    const a = makeCombatant("a", ["grass"], [drain], { speed: 200 });
    const b = makeCombatant("b", ["normal"], [makeMove()], { hp: 255, speed: 10 });
    let s = makeBattle(a, b);
    s = resolveTurn(s, [{ type: "move", moveIndex: 0 }, { type: "move", moveIndex: 0 }], { next: () => 0.5 });
    // user is at full HP, so nothing to heal; target flinches
    expect(s.events.some((e) => e.kind === "cant-move" && e.reason === "flinch")).toBe(true);

    const hurt = makeCombatant("a", ["grass"], [makeMove({ ...drain, flinchChance: 0 })], { speed: 10, hp: 80 });
    hurt.hp = 10;
    const foe = makeCombatant("b", ["normal"], [makeMove({ power: 1 })], { hp: 255, speed: 1 });
    const d = resolveTurn(makeBattle(hurt, foe), [{ type: "move", moveIndex: 0 }, { type: "move", moveIndex: 0 }], { next: () => 0.5 });
    expect(d.events.some((e) => e.kind === "heal" && e.source === "drain")).toBe(true);
  });
});
