import { describe, expect, it } from "vitest";
import { filterCatalog, DEFAULT_FILTERS } from "./filter";
import { initialSelection, randomMatchupIds, selectionReducer, canSelect, clampLevel } from "./selection";
import type { CatalogItem } from "./api";

const items: CatalogItem[] = [
  { id: 1, name: "bulbasaur", dex: 1, types: ["grass", "poison"], generation: 1 },
  { id: 4, name: "charmander", dex: 4, types: ["fire"], generation: 1 },
  { id: 6, name: "charizard", dex: 6, types: ["fire", "flying"], generation: 1 },
  { id: 152, name: "chikorita", dex: 152, types: ["grass"], generation: 2 },
  { id: 122, name: "mr-mime", dex: 122, types: ["psychic", "fairy"], generation: 1 },
  { id: 10034, name: "charizard-mega-x", dex: 6, types: ["fire", "dragon"], generation: 1 },
];

describe("selection state", () => {
  it("selects into a slot and preserves the other slot", () => {
    let s = selectionReducer(initialSelection, { type: "select", slot: 0, name: "charizard", allowMirror: false });
    s = selectionReducer(s, { type: "select", slot: 1, name: "venusaur", allowMirror: false });
    expect(s.slots).toEqual(["charizard", "venusaur"]);
    s = selectionReducer(s, { type: "select", slot: 1, name: "blastoise", allowMirror: false });
    expect(s.slots).toEqual(["charizard", "blastoise"]);
  });

  it("swaps positions", () => {
    const s = selectionReducer({ ...initialSelection, slots: ["a", "b"] }, { type: "swap" });
    expect(s.slots).toEqual(["b", "a"]);
    expect(selectionReducer(s, { type: "swap" }).slots).toEqual(["a", "b"]);
  });

  it("prevents mirror matches unless allowed", () => {
    const base = { ...initialSelection, slots: ["pikachu", null] as [string | null, string | null] };
    expect(selectionReducer(base, { type: "select", slot: 1, name: "pikachu", allowMirror: false })).toBe(base);
    expect(selectionReducer(base, { type: "select", slot: 1, name: "pikachu", allowMirror: true }).slots).toEqual(["pikachu", "pikachu"]);
    expect(canSelect(base, 1, "pikachu", false)).toBe(false);
    expect(canSelect(base, 1, "pikachu", true)).toBe(true);
  });

  it("clears slots, sets matchups, level and mode", () => {
    let s = selectionReducer(initialSelection, { type: "set-matchup", a: "1", b: "2" });
    s = selectionReducer(s, { type: "clear", slot: 0 });
    expect(s.slots).toEqual([null, "2"]);
    expect(selectionReducer(s, { type: "set-level", level: 500 }).level).toBe(100);
    expect(selectionReducer(s, { type: "set-level", level: -4 }).level).toBe(1);
    expect(clampLevel(Number.NaN)).toBe(50);
    expect(selectionReducer(s, { type: "set-mode", mode: "interactive" }).mode).toBe("interactive");
  });

  it("generates distinct random matchups", () => {
    for (let i = 0; i < 50; i++) {
      const [a, b] = randomMatchupIds(Math.random, 5);
      expect(a).not.toBe(b);
    }
    const seq = [0, 0, 0.5];
    const [a, b] = randomMatchupIds(() => seq.shift() ?? 0.9, 10);
    expect(a).toBe(1);
    expect(b).toBe(6);
  });
});

describe("catalog filtering", () => {
  const run = (patch: Partial<typeof DEFAULT_FILTERS>) => filterCatalog(items, { ...DEFAULT_FILTERS, ...patch }).map((i) => i.name);

  it("hides alternate forms by default", () => {
    expect(run({})).not.toContain("charizard-mega-x");
    expect(run({ includeForms: true })).toContain("charizard-mega-x");
  });

  it("searches by name and Pokédex number", () => {
    expect(run({ query: "char" })).toEqual(["charmander", "charizard"]);
    expect(run({ query: "mr mime" })).toEqual(["mr-mime"]);
    expect(run({ query: "#6" })).toEqual(["charizard"]);
    expect(run({ query: "152" })).toEqual(["chikorita"]);
    expect(run({ query: "zzzz" })).toEqual([]);
  });

  it("filters by generation and types (all selected must match)", () => {
    expect(run({ generation: 2 })).toEqual(["chikorita"]);
    expect(run({ types: ["fire"] })).toEqual(["charmander", "charizard"]);
    expect(run({ types: ["fire", "flying"] })).toEqual(["charizard"]);
  });

  it("sorts alphabetically or by Pokédex number", () => {
    expect(run({ sort: "name" })[0]).toBe("bulbasaur");
    expect(run({ sort: "dex" }).slice(0, 3)).toEqual(["bulbasaur", "charmander", "charizard"]);
  });

  it("degrades gracefully when type/generation data is missing", () => {
    const bare = items.map((i) => ({ ...i, types: [], generation: null }));
    const out = filterCatalog(bare, { ...DEFAULT_FILTERS, types: ["fire"], generation: 1 }, { hasTypes: false, hasGenerations: false });
    expect(out.length).toBe(5);
  });
});
