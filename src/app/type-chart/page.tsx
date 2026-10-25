import type { Metadata } from "next";
import { TypeChartView } from "@/components/pokedex/type-chart-view";

export const metadata: Metadata = {
  title: "Type Chart",
  description: "All 18 Pokémon types: attacking effectiveness, weaknesses, resistances and immunities.",
};

export default function TypeChartPage() {
  return (
    <div className="container py-10">
      <p className="eyebrow">Reference</p>
      <h1 className="font-display text-4xl font-black sm:text-5xl">Type chart</h1>
      <p className="mb-8 mt-2 max-w-2xl text-muted">
        Built from PokéAPI damage relations, with a bundled fallback so it always works.
      </p>
      <TypeChartView />
    </div>
  );
}
