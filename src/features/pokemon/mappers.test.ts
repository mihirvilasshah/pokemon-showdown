import { describe, expect, it } from "vitest";
import { ApiError } from "@/lib/api/client";
import { moveSchema, pokemonSchema, speciesSchema, typeSchema } from "@/lib/validation/pokeapi";
import { buildLearnset, formatName, generationNumber, mapMove, mapPokemon, mapSpecies } from "./mappers";
import { chartFromResponses } from "./api";
import { FALLBACK_TYPE_CHART } from "@/features/type-effectiveness/chart";

const rawPokemon = {
  id: 6,
  name: "charizard",
  height: 17,
  weight: 905,
  base_experience: 267,
  is_default: true,
  species: { name: "charizard", url: "https://pokeapi.co/api/v2/pokemon-species/6/" },
  types: [
    { slot: 2, type: { name: "flying" } },
    { slot: 1, type: { name: "fire" } },
  ],
  abilities: [
    { is_hidden: true, slot: 3, ability: { name: "solar-power" } },
    { is_hidden: false, slot: 1, ability: { name: "blaze" } },
  ],
  stats: [
    { base_stat: 78, stat: { name: "hp" } },
    { base_stat: 84, stat: { name: "attack" } },
    { base_stat: 78, stat: { name: "defense" } },
    { base_stat: 109, stat: { name: "special-attack" } },
    { base_stat: 85, stat: { name: "special-defense" } },
    { base_stat: 100, stat: { name: "speed" } },
  ],
  sprites: {
    front_default: "front.png",
    front_shiny: null,
    back_default: "back.png",
    back_shiny: null,
    other: { "official-artwork": { front_default: "art.png", front_shiny: "art-shiny.png" } },
  },
  moves: [
    {
      move: { name: "flamethrower" },
      version_group_details: [
        { level_learned_at: 0, move_learn_method: { name: "machine" }, version_group: { name: "scarlet-violet" } },
      ],
    },
    {
      move: { name: "ember" },
      version_group_details: [
        { level_learned_at: 7, move_learn_method: { name: "level-up" }, version_group: { name: "red-blue" } },
      ],
    },
  ],
};

describe("PokéAPI response parsing", () => {
  it("maps a Pokémon response into the domain model", () => {
    const p = mapPokemon(pokemonSchema.parse(rawPokemon));
    expect(p.name).toBe("charizard");
    expect(p.types).toEqual(["fire", "flying"]); // slot-ordered
    expect(p.stats).toEqual({ hp: 78, attack: 84, defense: 78, specialAttack: 109, specialDefense: 85, speed: 100 });
    expect(p.baseStatTotal).toBe(534);
    expect(p.height).toBe(1.7);
    expect(p.weight).toBe(90.5);
    expect(p.abilities).toEqual([
      { name: "blaze", hidden: false },
      { name: "solar-power", hidden: true },
    ]);
    expect(p.sprites.artwork).toBe("art.png");
    expect(p.sprites.back).toBe("back.png");
    expect(p.baseExperience).toBe(267);
  });

  it("rejects malformed data instead of producing NaN stats", () => {
    expect(() => pokemonSchema.parse({ ...rawPokemon, stats: "nope" })).toThrow();
    const missingStat = pokemonSchema.parse({ ...rawPokemon, stats: rawPokemon.stats.slice(0, 5) });
    expect(() => mapPokemon(missingStat)).toThrow(ApiError);
  });

  it("tolerates missing optional data (sprites, base experience)", () => {
    const sparse = pokemonSchema.parse({
      ...rawPokemon,
      base_experience: null,
      sprites: { front_default: null, front_shiny: null, back_default: null, back_shiny: null },
    });
    const p = mapPokemon(sparse);
    expect(p.baseExperience).toBeNull();
    expect(p.sprites.artwork).toBeNull();
    expect(p.sprites.front).toBeNull();
  });

  it("filters out unsupported types and fails when none remain", () => {
    const odd = pokemonSchema.parse({ ...rawPokemon, types: [{ slot: 1, type: { name: "stellar" } }] });
    expect(() => mapPokemon(odd)).toThrow(/no supported types/);
  });

  it("uses the newest version group with a meaningful learnset, falling back to all", () => {
    const many = (vg: string, n: number, prefix: string) =>
      Array.from({ length: n }, (_, i) => ({
        move: { name: `${prefix}-${i}` },
        version_group_details: [{ level_learned_at: i, move_learn_method: { name: "level-up" }, version_group: { name: vg } }],
      }));
    const learnset = buildLearnset([...many("scarlet-violet", 9, "new"), ...many("red-blue", 12, "old")]);
    expect(learnset.every((m) => m.name.startsWith("new"))).toBe(true);
    const sparse = buildLearnset(pokemonSchema.parse(rawPokemon).moves);
    expect(sparse.map((m) => m.name).sort()).toEqual(["ember", "flamethrower"]);
  });

  it("maps species, moves and formats names", () => {
    const species = mapSpecies(
      speciesSchema.parse({
        id: 6,
        name: "charizard",
        generation: { name: "generation-i" },
        is_legendary: false,
        genera: [{ genus: "Flame Pokémon", language: { name: "en" } }],
        flavor_text_entries: [{ flavor_text: "Spits fire\nthat is hot.", language: { name: "en" } }],
      }),
    );
    expect(species.generation).toBe(1);
    expect(species.genus).toBe("Flame Pokémon");
    expect(species.flavorText).toBe("Spits fire that is hot.");
    expect(generationNumber("generation-ix")).toBe(9);

    const move = mapMove(
      moveSchema.parse({
        id: 53,
        name: "flamethrower",
        accuracy: 100,
        power: 90,
        pp: 15,
        priority: 0,
        damage_class: { name: "special" },
        type: { name: "fire" },
        target: { name: "selected-pokemon" },
        stat_changes: [],
        meta: { ailment: { name: "burn" }, category: { name: "damage+ailment" }, min_hits: null, max_hits: null, drain: 0, healing: 0, crit_rate: 0, ailment_chance: 10, flinch_chance: 0, stat_chance: 0 },
      }),
    );
    expect(move).toMatchObject({ type: "fire", power: 90, damageClass: "special", ailment: "burn", ailmentChance: 10 });
    expect(formatName("mr-mime")).toBe("Mr. Mime");
    expect(formatName("charizard-mega-x")).toBe("Charizard Mega X");
  });

  it("handles moves with missing metadata", () => {
    const move = mapMove(
      moveSchema.parse({ id: 1, name: "pound", accuracy: 100, power: 40, pp: 35, priority: 0, damage_class: { name: "physical" }, type: { name: "normal" } }),
    );
    expect(move.category).toBe("damage");
    expect(move.ailment).toBeNull();
    expect(move.statChanges).toEqual([]);
  });

  it("builds a type chart from API relations and keeps fallback data for missing types", () => {
    const fire = typeSchema.parse({
      id: 10,
      name: "fire",
      damage_relations: {
        double_damage_to: [{ name: "grass", url: "" }],
        half_damage_to: [{ name: "water", url: "" }],
        no_damage_to: [],
      },
      pokemon: [],
    });
    const chart = chartFromResponses([fire]);
    expect(chart.fire).toEqual({ double: ["grass"], half: ["water"], none: [] });
    expect(chart.water).toEqual(FALLBACK_TYPE_CHART.water);
  });
});
