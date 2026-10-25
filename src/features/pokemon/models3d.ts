import type { Pokemon } from "@/types/pokemon";

/**
 * Community-hosted glTF models (Pokémon 3D API assets repository). They are fetched at
 * runtime from the host and never bundled with this app. Only default forms of National
 * Dex Pokémon are mapped; everything else falls back to the 2.5D renderer.
 */
export const MODEL_BASE = "https://raw.githubusercontent.com/Pokemon-3D-api/assets/main/models/opt";
export const MAX_MODEL_DEX = 1025;

export function modelUrlFor(pokemon: Pick<Pokemon, "id" | "isDefault">, shiny = false): string | null {
  if (!pokemon.isDefault || pokemon.id < 1 || pokemon.id > MAX_MODEL_DEX) return null;
  return `${MODEL_BASE}/${shiny ? "shiny" : "regular"}/${pokemon.id}.glb`;
}

export type ModelAction = "idle" | "attack" | "status" | "hit" | "faint" | "win";

export const MIN_ZOOM = 0.6;
export const MAX_ZOOM = 4;
export const clampZoom = (z: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z));
