"use client";

import { motion } from "framer-motion";
import { Crown, RefreshCw, RotateCcw, Users } from "lucide-react";
import type { BattleState } from "@/features/battle/engine/types";
import { PokemonArt } from "@/components/pokemon/pokemon-art";
import { Pokemon3D } from "@/components/pokemon/pokemon-3d";
import { modelUrlFor } from "@/features/pokemon/models3d";
import type { BattleLaunch } from "@/features/battle/launch";
import { TypeBadges } from "@/components/pokemon/type-badge";

interface ResultsProps {
  launch: BattleLaunch;
  engine: BattleState;
  animate: boolean;
  onRematch: () => void;
  onChange: () => void;
  onReplay: () => void;
}

function Stat({ label, a, b }: { label: string; a: string | number; b: string | number }) {
  return (
    <tr className="border-t border-line/10">
      <td className="py-2 pr-2 text-right font-semibold tabular-nums">{a}</td>
      <th scope="row" className="px-2 py-2 text-center text-xs font-medium uppercase tracking-wider text-muted">
        {label}
      </th>
      <td className="py-2 pl-2 font-semibold tabular-nums">{b}</td>
    </tr>
  );
}

export function BattleResults({ launch, engine, animate, onRematch, onChange, onReplay }: ResultsProps) {
  const { winner } = engine;
  const sides = [launch.a, launch.b];
  const [ca, cb] = engine.combatants;
  const [sa, sb] = engine.stats;
  const winnerSide = winner === 0 || winner === 1 ? winner : null;
  const win = winnerSide !== null ? sides[winnerSide] : null;
  const title = win ? `${win.displayName} wins!` : "It's a draw!";

  return (
    <motion.section
      initial={animate ? { opacity: 0, y: 30 } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="panel relative overflow-hidden p-5 sm:p-8"
      aria-labelledby="results-title"
      data-testid="battle-results"
      data-winner={winnerSide === null ? "draw" : String(winnerSide)}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-72 opacity-70"
        style={{ background: "conic-gradient(from 180deg at 50% -10%, transparent 30%, rgb(var(--accent) / 0.35) 45%, transparent 55%, rgb(var(--accent2) / 0.25) 70%, transparent 85%)" }}
      />
      <div className="relative grid items-center gap-8 lg:grid-cols-[minmax(0,320px)_1fr]">
        <div className="text-center">
          {win ? (
            <motion.div
              initial={animate ? { scale: 0.6, opacity: 0 } : false}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 120, damping: 12 }}
              className="relative mx-auto w-56 sm:w-64"
            >
              <div aria-hidden className="absolute inset-0 rounded-full bg-accent/20 blur-3xl" />
              <Pokemon3D id={win.pokemon.id} name={win.pokemon.name} modelUrl={modelUrlFor(win.pokemon)} home={win.pokemon.sprites.home} artwork={win.pokemon.sprites.artwork} sprite={win.pokemon.sprites.front} priority interactive sway showHint expandable pose={{ rx: 0, ry: -12 }} className="relative mb-4 w-full drop-shadow-[0_18px_30px_rgba(0,0,0,0.5)]" />
              <Crown className="absolute -top-3 left-1/2 h-10 w-10 -translate-x-1/2 text-amber-400 drop-shadow" aria-hidden />
            </motion.div>
          ) : (
            <div className="flex justify-center gap-2">
              {sides.map((s, i) => (
                <PokemonArt key={i} id={s.pokemon.id} name={s.pokemon.name} artwork={s.pokemon.sprites.artwork} sprite={s.pokemon.sprites.front} className="w-32" />
              ))}
            </div>
          )}
          {win && <div className="mt-3 flex justify-center"><TypeBadges types={win.pokemon.types} /></div>}
        </div>

        <div>
          <p className="eyebrow">{win ? "Winner" : "Result"}</p>
          <h2 id="results-title" className="font-display text-4xl font-black sm:text-5xl" data-testid="winner-name">
            {title}
          </h2>
          <p className="mt-1 text-sm text-muted" data-testid="result-summary">
            {winner === "draw"
              ? engine.events.at(-1)?.kind === "battle-end" && (engine.events.at(-1) as { reason: string }).reason === "turn-limit"
                ? `Neither Pokémon fainted within ${engine.maxTurns} turns.`
                : "Both Pokémon fainted on the same turn."
              : `Victory in ${engine.turn} turn${engine.turn === 1 ? "" : "s"} at level ${launch.level}.`}
          </p>

          <table className="mt-5 w-full max-w-lg text-sm" data-testid="result-stats">
            <caption className="sr-only">Battle statistics</caption>
            <thead>
              <tr>
                <th scope="col" className="pb-2 pr-2 text-right font-display">{launch.a.displayName}</th>
                <th scope="col" className="sr-only">Stat</th>
                <th scope="col" className="pb-2 pl-2 text-left font-display">{launch.b.displayName}</th>
              </tr>
            </thead>
            <tbody>
              <Stat label="Final HP" a={`${ca.hp} / ${ca.maxHp}`} b={`${cb.hp} / ${cb.maxHp}`} />
              <Stat label="Damage dealt" a={sa.damageDealt} b={sb.damageDealt} />
              <Stat label="Damage received" a={sa.damageTaken} b={sb.damageTaken} />
              <Stat label="Moves used" a={sa.movesUsed} b={sb.movesUsed} />
              <Stat label="Critical hits" a={sa.crits} b={sb.crits} />
              <Stat label="Super effective hits" a={sa.superEffectiveHits} b={sb.superEffectiveHits} />
              <Stat label="Misses" a={sa.misses} b={sb.misses} />
              <Stat label="Turns" a={engine.turn} b={engine.turn} />
            </tbody>
          </table>

          <div className="mt-6 flex flex-wrap gap-3">
            <button type="button" className="btn-primary" onClick={onRematch} data-testid="rematch">
              <RefreshCw className="h-4 w-4" aria-hidden /> REMATCH
            </button>
            <button type="button" className="btn-ghost" onClick={onChange} data-testid="change-pokemon">
              <Users className="h-4 w-4" aria-hidden /> CHANGE POKÉMON
            </button>
            <button type="button" className="btn-ghost" onClick={onReplay} data-testid="replay">
              <RotateCcw className="h-4 w-4" aria-hidden /> Replay
            </button>
          </div>
        </div>
      </div>
    </motion.section>
  );
}
