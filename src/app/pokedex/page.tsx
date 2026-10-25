import type { Metadata } from "next";
import { PokedexView } from "@/components/pokedex/pokedex-view";

export const metadata: Metadata = {
  title: "Pokédex",
  description: "Explore Pokémon: stats, types, abilities and moves, powered by PokéAPI.",
};

export default function PokedexPage() {
  return (
    <div className="container py-10">
      <p className="eyebrow">Pokédex</p>
      <h1 className="font-display text-4xl font-black sm:text-5xl">Explore every Pokémon</h1>
      <p className="mt-2 max-w-2xl text-muted">
        Search by name or number, filter by generation and type, then open a Pokémon to see its real PokéAPI data — and send it straight to the arena.
      </p>
      <div className="panel mt-6 overflow-hidden">
        <PokedexView />
      </div>
    </div>
  );
}
