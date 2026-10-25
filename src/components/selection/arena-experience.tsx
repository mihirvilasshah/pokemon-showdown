"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { BattleStage } from "@/components/battle/battle-stage";
import { randomSeed } from "@/features/battle/engine/rng";
import type { BattleLaunch } from "@/features/battle/launch";
import { SelectionArena } from "./selection-arena";

/** Switches between the selection/preparation view and a running battle. */
export function ArenaExperience() {
  const [launch, setLaunch] = useState<BattleLaunch | null>(null);
  const top = useRef<HTMLElement>(null);
  const first = useRef(true);

  const seed = launch?.seed ?? null;

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    top.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [seed]);

  const rematch = useCallback(() => {
    setLaunch((l) => (l ? { ...l, seed: randomSeed() } : l));
  }, []);

  return (
    <section ref={top} id="arena" className="container scroll-mt-20 py-12 sm:py-16" aria-labelledby="arena-title">
      <div className="mb-8">
        <p className="eyebrow">{launch ? "Battle arena" : "Selection arena"}</p>
        <h2 id="arena-title" className="font-display text-3xl font-black sm:text-4xl">
          {launch ? "The battle is on" : "Pick your fighters"}
        </h2>
      </div>
      {launch ? (
        <BattleStage key={launch.seed} launch={launch} onRematch={rematch} onExit={() => setLaunch(null)} />
      ) : (
        <SelectionArena onStart={setLaunch} />
      )}
    </section>
  );
}
