import { describe, expect, it } from "vitest";
import { POKEMON_TYPES } from "@/types/pokemon";
import {
  FALLBACK_TYPE_CHART,
  bestStabMultiplier,
  defensiveProfile,
  formatMultiplier,
  singleMultiplier,
  typeMultiplier,
} from "./chart";

describe("type effectiveness", () => {
  it("covers all 18 types in the fallback chart", () => {
    expect(POKEMON_TYPES).toHaveLength(18);
    expect(Object.keys(FALLBACK_TYPE_CHART).sort()).toEqual([...POKEMON_TYPES].sort());
  });

  it("has symmetric-consistent known relations", () => {
    expect(singleMultiplier(FALLBACK_TYPE_CHART, "fire", "grass")).toBe(2);
    expect(singleMultiplier(FALLBACK_TYPE_CHART, "fire", "water")).toBe(0.5);
    expect(singleMultiplier(FALLBACK_TYPE_CHART, "normal", "ghost")).toBe(0);
    expect(singleMultiplier(FALLBACK_TYPE_CHART, "electric", "ground")).toBe(0);
    expect(singleMultiplier(FALLBACK_TYPE_CHART, "ground", "flying")).toBe(0);
    expect(singleMultiplier(FALLBACK_TYPE_CHART, "dragon", "fairy")).toBe(0);
    expect(singleMultiplier(FALLBACK_TYPE_CHART, "fairy", "dragon")).toBe(2);
    expect(singleMultiplier(FALLBACK_TYPE_CHART, "psychic", "dark")).toBe(0);
    expect(singleMultiplier(FALLBACK_TYPE_CHART, "poison", "steel")).toBe(0);
    expect(singleMultiplier(FALLBACK_TYPE_CHART, "ghost", "normal")).toBe(0);
    expect(singleMultiplier(FALLBACK_TYPE_CHART, "fighting", "ghost")).toBe(0);
  });

  it("multiplies dual-type effectiveness", () => {
    expect(typeMultiplier(FALLBACK_TYPE_CHART, "ice", ["dragon", "flying"])).toBe(4);
    expect(typeMultiplier(FALLBACK_TYPE_CHART, "rock", ["fire", "flying"])).toBe(4);
    expect(typeMultiplier(FALLBACK_TYPE_CHART, "water", ["fire", "ground"])).toBe(4);
    expect(typeMultiplier(FALLBACK_TYPE_CHART, "grass", ["fire", "flying"])).toBe(0.25);
    expect(typeMultiplier(FALLBACK_TYPE_CHART, "fire", ["water", "ground"])).toBe(0.5);
    expect(typeMultiplier(FALLBACK_TYPE_CHART, "electric", ["water", "ground"])).toBe(0);
    expect(typeMultiplier(FALLBACK_TYPE_CHART, "ground", ["fire", "flying"])).toBe(0);
    expect(typeMultiplier(FALLBACK_TYPE_CHART, "fire", ["water", "grass"])).toBe(1);
    expect(typeMultiplier(FALLBACK_TYPE_CHART, "normal", ["water"])).toBe(1);
    expect(typeMultiplier(FALLBACK_TYPE_CHART, "water", ["fire", "rock"])).toBe(4);
    expect(typeMultiplier(FALLBACK_TYPE_CHART, "fire", ["grass", "steel"])).toBe(4);
    expect(typeMultiplier(FALLBACK_TYPE_CHART, "water", ["water", "grass"])).toBe(0.25);
    expect(typeMultiplier(FALLBACK_TYPE_CHART, "ice", ["fire", "grass"])).toBe(1);
  });

  it("summarises a defensive profile", () => {
    const p = defensiveProfile(FALLBACK_TYPE_CHART, ["fire", "flying"]);
    expect(p.weak4).toEqual(["rock"]);
    expect(p.resist4).toEqual(["grass", "bug"]);
    expect(p.immune).toEqual(["ground"]);
    expect(p.weak2).toEqual(expect.arrayContaining(["water", "electric"]));
    const total = p.weak4.length + p.weak2.length + p.neutral.length + p.resist.length + p.resist4.length + p.immune.length;
    expect(total).toBe(18);
  });

  it("computes best STAB multiplier and formats values", () => {
    expect(bestStabMultiplier(FALLBACK_TYPE_CHART, ["fire", "flying"], ["grass", "bug"])).toBe(4);
    expect(formatMultiplier(4)).toBe("4×");
    expect(formatMultiplier(0.25)).toBe("¼×");
    expect(formatMultiplier(0.5)).toBe("½×");
    expect(formatMultiplier(0)).toBe("0×");
  });
});
