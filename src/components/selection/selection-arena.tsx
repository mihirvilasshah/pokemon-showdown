"use client";

import { ArrowLeftRight, Dices } from "lucide-react";
import { useState } from "react";
import { useApp } from "@/components/app-provider";
import { MatchupPanel } from "@/components/stats/matchup-panel";
import { StatComparison } from "@/components/stats/stat-comparison";
import { Modal } from "@/components/ui/modal";
import type { BattleLaunch } from "@/features/battle/launch";
import type { CatalogItem } from "@/features/pokemon/api";
import { formatName } from "@/features/pokemon/mappers";
import { FALLBACK_TYPE_CHART } from "@/features/type-effectiveness/chart";
import { usePokemon, useTypeChart } from "@/hooks/use-pokemon";
import { sound } from "@/features/sound/sound-engine";
import { BattleSetup } from "./battle-setup";
import { PokemonBrowser } from "./pokemon-browser";
import { PokemonPanel } from "./pokemon-panel";
import { VsEmblem } from "./vs-emblem";
import { Skeleton } from "@/components/ui/skeleton";

export function SelectionArena({ onStart }: { onStart: (launch: BattleLaunch) => void }) {
  const app = useApp();
  const [pickerSlot, setPickerSlot] = useState<0 | 1 | null>(null);
  const a = usePokemon(app.slots[0]);
  const b = usePokemon(app.slots[1]);
  const chart = useTypeChart();
  const chartData = chart.data?.chart ?? FALLBACK_TYPE_CHART;

  const pick = (item: CatalogItem) => {
    if (pickerSlot === null) return;
    if (app.selectPokemon(pickerSlot, item.name)) {
      sound.play("select");
      setPickerSlot(null);
    }
  };

  const bothReady = a.data && b.data;

  return (
    <div className="space-y-8">
      <div className="grid items-stretch gap-4 lg:grid-cols-[1fr_auto_1fr]">
        <PokemonPanel slot={0} name={app.slots[0]} state={a} onChoose={() => setPickerSlot(0)} onClear={() => app.clearSlot(0)} />

        <div className="flex flex-row items-center justify-center gap-4 lg:flex-col lg:py-10">
          <VsEmblem />
          <div className="flex flex-col items-stretch gap-2">
            <button
              type="button"
              className="btn-ghost"
              onClick={() => app.swapSlots()}
              disabled={!app.slots[0] && !app.slots[1]}
              data-testid="swap"
              aria-label="Swap Pokémon positions"
            >
              <ArrowLeftRight className="h-4 w-4" aria-hidden /> Swap
            </button>
            <button type="button" className="btn-ghost" onClick={() => app.randomMatchup()} data-testid="random-matchup">
              <Dices className="h-4 w-4" aria-hidden /> Random
            </button>
            <label className="flex cursor-pointer items-center gap-2 text-xs text-muted">
              <input
                type="checkbox"
                className="h-4 w-4 accent-[rgb(var(--accent))]"
                checked={app.allowMirror}
                onChange={(e) => app.setAllowMirror(e.target.checked)}
                data-testid="allow-mirror"
              />
              Allow mirror match
            </label>
          </div>
        </div>

        <PokemonPanel slot={1} name={app.slots[1]} state={b} onChoose={() => setPickerSlot(1)} onClear={() => app.clearSlot(1)} />
      </div>

      {bothReady ? (
        <>
          <section className="panel p-5 sm:p-6" aria-labelledby="compare-title">
            <p className="eyebrow">Scouting report</p>
            <h2 id="compare-title" className="mb-5 font-display text-2xl font-extrabold">
              {formatName(a.data!.name)} vs {formatName(b.data!.name)}
            </h2>
            <StatComparison a={a.data!} b={b.data!} />
            <div className="my-6 border-t border-line/10" />
            <MatchupPanel a={a.data!} b={b.data!} chart={chartData} fromApi={chart.data?.fromApi ?? false} />
          </section>

          <section className="panel p-5 sm:p-6" aria-labelledby="setup-title">
            <p className="eyebrow">Battle preparation</p>
            <h2 id="setup-title" className="mb-5 font-display text-2xl font-extrabold">
              Set the rules
            </h2>
            <BattleSetup a={a.data!} b={b.data!} chart={chartData} onStart={onStart} />
          </section>
        </>
      ) : (
        <div className="panel p-6 text-center" data-testid="select-prompt">
          {a.loading || b.loading ? (
            <Skeleton className="mx-auto h-6 w-64" />
          ) : (
            <>
              <p className="font-display text-lg font-bold">Pick two Pokémon to unlock the scouting report and start a battle.</p>
              <p className="mt-1 text-sm text-muted">Or jump straight in with a random matchup.</p>
            </>
          )}
        </div>
      )}

      <Modal open={pickerSlot !== null} onClose={() => setPickerSlot(null)} title={pickerSlot === 1 ? "Choose Fighter 2" : "Choose Fighter 1"}>
        <PokemonBrowser
          autoFocus
          onSelect={pick}
          selectedName={pickerSlot !== null ? app.slots[pickerSlot] : null}
          isDisabled={(item) => {
            if (pickerSlot === null || app.allowMirror) return null;
            const other = app.slots[pickerSlot === 0 ? 1 : 0];
            return other && (other === item.name || other === String(item.id)) ? "Already selected as the other fighter (enable mirror matches to allow)" : null;
          }}
        />
      </Modal>
    </div>
  );
}
