import type { PokemonType } from "@/types/pokemon";

export const TYPE_COLORS: Record<PokemonType, { base: string; dark: string; label: string }> = {
  normal: { base: "#a8a77a", dark: "#6d6d4e", label: "Normal" },
  fire: { base: "#ee8130", dark: "#9c531f", label: "Fire" },
  water: { base: "#6390f0", dark: "#445e9c", label: "Water" },
  electric: { base: "#f7d02c", dark: "#a1871f", label: "Electric" },
  grass: { base: "#7ac74c", dark: "#4e8234", label: "Grass" },
  ice: { base: "#96d9d6", dark: "#638d8d", label: "Ice" },
  fighting: { base: "#c22e28", dark: "#7d1f1a", label: "Fighting" },
  poison: { base: "#a33ea1", dark: "#682a68", label: "Poison" },
  ground: { base: "#e2bf65", dark: "#927d44", label: "Ground" },
  flying: { base: "#a98ff3", dark: "#6d5e9c", label: "Flying" },
  psychic: { base: "#f95587", dark: "#a13959", label: "Psychic" },
  bug: { base: "#a6b91a", dark: "#6d7815", label: "Bug" },
  rock: { base: "#b6a136", dark: "#786824", label: "Rock" },
  ghost: { base: "#735797", dark: "#493963", label: "Ghost" },
  dragon: { base: "#6f35fc", dark: "#4924a1", label: "Dragon" },
  dark: { base: "#705746", dark: "#49392f", label: "Dark" },
  steel: { base: "#b7b7ce", dark: "#787887", label: "Steel" },
  fairy: { base: "#d685ad", dark: "#9b6470", label: "Fairy" },
};

/** Text colour (near-black or white) with enough contrast on the type's base colour. */
export function typeTextColor(type: PokemonType): string {
  const hex = TYPE_COLORS[type].base.slice(1);
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? "#101418" : "#ffffff";
}
