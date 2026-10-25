import type { PokemonType } from "@/types/pokemon";

export type ParticleKind = "leaf" | "ember" | "bubble" | "spark" | "snow" | "mist" | "star";

export interface Arena {
  id: string;
  name: string;
  tagline: string;
  /** Multi-layer CSS background for the scene (sky -> horizon -> floor). */
  background: string;
  accent: string;
  particle: ParticleKind;
  particleColor: string;
  affinity: PokemonType;
}

/** Arenas are purely cosmetic: they never affect damage calculations. */
export const ARENAS: Arena[] = [
  {
    id: "grassland",
    name: "Grassland Arena",
    tagline: "Sunlit meadows and drifting leaves",
    background:
      "radial-gradient(120% 70% at 50% 0%, #2f6b4f 0%, #173d33 45%, #0a1f1b 100%), linear-gradient(#0a1f1b,#0a1f1b)",
    accent: "#7ac74c",
    particle: "leaf",
    particleColor: "#9be26b",
    affinity: "grass",
  },
  {
    id: "volcanic",
    name: "Volcanic Arena",
    tagline: "Molten rock beneath a smoldering sky",
    background:
      "radial-gradient(110% 70% at 50% 100%, #b23a12 0%, #5b1a10 40%, #16080a 100%), linear-gradient(#16080a,#16080a)",
    accent: "#ee8130",
    particle: "ember",
    particleColor: "#ffb15e",
    affinity: "fire",
  },
  {
    id: "ocean",
    name: "Ocean Arena",
    tagline: "Tidal reefs lit from below",
    background:
      "radial-gradient(120% 80% at 50% 0%, #1c6a9a 0%, #0e3a63 45%, #061a33 100%), linear-gradient(#061a33,#061a33)",
    accent: "#6390f0",
    particle: "bubble",
    particleColor: "#a8d8ff",
    affinity: "water",
  },
  {
    id: "storm",
    name: "Electric Storm Arena",
    tagline: "Thunderheads crackling overhead",
    background:
      "radial-gradient(100% 70% at 70% 0%, #4b3f9a 0%, #1f1b4f 45%, #0a0a22 100%), linear-gradient(#0a0a22,#0a0a22)",
    accent: "#f7d02c",
    particle: "spark",
    particleColor: "#ffe466",
    affinity: "electric",
  },
  {
    id: "ice",
    name: "Ice Crystal Arena",
    tagline: "Frozen spires and falling snow",
    background:
      "radial-gradient(120% 80% at 50% 0%, #5ea7c4 0%, #1f4a6b 45%, #0a1c33 100%), linear-gradient(#0a1c33,#0a1c33)",
    accent: "#96d9d6",
    particle: "snow",
    particleColor: "#e8f8ff",
    affinity: "ice",
  },
  {
    id: "shadow",
    name: "Shadow Arena",
    tagline: "Twilight mist and silent gloom",
    background:
      "radial-gradient(100% 70% at 50% 20%, #3a2a5c 0%, #1a1230 50%, #07050f 100%), linear-gradient(#07050f,#07050f)",
    accent: "#735797",
    particle: "mist",
    particleColor: "#a98bd6",
    affinity: "ghost",
  },
  {
    id: "cosmic",
    name: "Cosmic Arena",
    tagline: "A platform adrift among the stars",
    background:
      "radial-gradient(80% 60% at 20% 20%, #5b2d8f 0%, transparent 60%), radial-gradient(70% 60% at 85% 70%, #1d4f9a 0%, transparent 60%), linear-gradient(#050818,#0b0620)",
    accent: "#a98ff3",
    particle: "star",
    particleColor: "#ffffff",
    affinity: "psychic",
  },
];

export const ARENA_IDS = ARENAS.map((a) => a.id);

export function getArena(id: string): Arena {
  return ARENAS.find((a) => a.id === id) ?? ARENAS[0];
}

export type ArenaChoice = string | "random";

export function resolveArena(choice: ArenaChoice, random: () => number = Math.random): Arena {
  if (choice === "random") return ARENAS[Math.floor(random() * ARENAS.length)];
  return getArena(choice);
}
