import { z } from "zod";

const namedResource = z.object({ name: z.string(), url: z.string() });

export const pokemonListSchema = z.object({
  count: z.number(),
  results: z.array(namedResource),
});

const statSchema = z.object({
  base_stat: z.number(),
  stat: z.object({ name: z.string() }),
});

const spriteUrl = z.string().nullable().optional();

export const pokemonSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(1),
  height: z.number().nonnegative(),
  weight: z.number().nonnegative(),
  base_experience: z.number().nullable().optional(),
  is_default: z.boolean().optional(),
  species: namedResource,
  types: z.array(z.object({ slot: z.number(), type: z.object({ name: z.string() }) })).min(1),
  abilities: z.array(
    z.object({
      is_hidden: z.boolean(),
      slot: z.number(),
      ability: z.object({ name: z.string() }),
    }),
  ),
  stats: z.array(statSchema),
  sprites: z.object({
    front_default: spriteUrl,
    front_shiny: spriteUrl,
    back_default: spriteUrl,
    back_shiny: spriteUrl,
    other: z
      .object({
        "official-artwork": z
          .object({ front_default: spriteUrl, front_shiny: spriteUrl })
          .optional(),
        home: z.object({ front_default: spriteUrl, front_shiny: spriteUrl }).optional(),
      })
      .passthrough()
      .optional(),
  }),
  moves: z.array(
    z.object({
      move: z.object({ name: z.string() }),
      version_group_details: z.array(
        z.object({
          level_learned_at: z.number(),
          move_learn_method: z.object({ name: z.string() }),
          version_group: z.object({ name: z.string() }),
        }),
      ),
    }),
  ),
});
export type PokemonResponse = z.infer<typeof pokemonSchema>;

export const speciesSchema = z.object({
  id: z.number().int().positive(),
  name: z.string(),
  is_baby: z.boolean().optional(),
  is_legendary: z.boolean().optional(),
  is_mythical: z.boolean().optional(),
  generation: z.object({ name: z.string() }).optional(),
  genera: z
    .array(z.object({ genus: z.string(), language: z.object({ name: z.string() }) }))
    .optional(),
  flavor_text_entries: z
    .array(z.object({ flavor_text: z.string(), language: z.object({ name: z.string() }) }))
    .optional(),
});
export type SpeciesResponse = z.infer<typeof speciesSchema>;

export const moveSchema = z.object({
  id: z.number(),
  name: z.string(),
  accuracy: z.number().nullable(),
  power: z.number().nullable(),
  pp: z.number().nullable(),
  priority: z.number(),
  effect_chance: z.number().nullable().optional(),
  damage_class: z.object({ name: z.string() }),
  type: z.object({ name: z.string() }),
  target: z.object({ name: z.string() }).optional(),
  stat_changes: z
    .array(z.object({ change: z.number(), stat: z.object({ name: z.string() }) }))
    .optional(),
  effect_entries: z
    .array(
      z.object({
        short_effect: z.string().optional(),
        language: z.object({ name: z.string() }),
      }),
    )
    .optional(),
  meta: z
    .object({
      ailment: z.object({ name: z.string() }),
      category: z.object({ name: z.string() }),
      min_hits: z.number().nullable(),
      max_hits: z.number().nullable(),
      drain: z.number(),
      healing: z.number(),
      crit_rate: z.number(),
      ailment_chance: z.number(),
      flinch_chance: z.number(),
      stat_chance: z.number(),
    })
    .nullable()
    .optional(),
});
export type MoveResponse = z.infer<typeof moveSchema>;

const typeRef = z.array(namedResource);

export const typeSchema = z.object({
  id: z.number(),
  name: z.string(),
  damage_relations: z.object({
    double_damage_to: typeRef,
    half_damage_to: typeRef,
    no_damage_to: typeRef,
    double_damage_from: typeRef.optional(),
    half_damage_from: typeRef.optional(),
    no_damage_from: typeRef.optional(),
  }),
  pokemon: z.array(
    z.object({ slot: z.number(), pokemon: namedResource }),
  ),
});
export type TypeResponse = z.infer<typeof typeSchema>;

export const generationSchema = z.object({
  id: z.number(),
  name: z.string(),
  pokemon_species: z.array(namedResource),
});
export type GenerationResponse = z.infer<typeof generationSchema>;

export const abilitySchema = z.object({
  id: z.number(),
  name: z.string(),
  effect_entries: z
    .array(
      z.object({
        short_effect: z.string().optional(),
        language: z.object({ name: z.string() }),
      }),
    )
    .optional(),
});
export type AbilityResponse = z.infer<typeof abilitySchema>;
