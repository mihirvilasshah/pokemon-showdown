"use client";

import { useEffect, useState } from "react";
import { loadMoveOptions } from "@/features/battle/prepare";
import type { MoveData, Pokemon } from "@/types/pokemon";

export interface MoveOptionsState {
  options: MoveData[];
  loading: boolean;
  done: number;
  total: number;
  error: boolean;
  retry: () => void;
}

/** Loads (and caches) metadata for a Pokémon's candidate moves, with progress. */
export function useMoveOptions(pokemon: Pokemon | null): MoveOptionsState {
  const [state, setState] = useState<{ key: string; options: MoveData[]; done: number; total: number; error: boolean; loading: boolean }>({
    key: "",
    options: [],
    done: 0,
    total: 0,
    error: false,
    loading: false,
  });
  const [attempt, setAttempt] = useState(0);
  const key = pokemon ? `${pokemon.name}` : "";

  useEffect(() => {
    if (!pokemon) return;
    let cancelled = false;
    setState({ key, options: [], done: 0, total: 0, error: false, loading: true });
    loadMoveOptions(pokemon, (done, total) => {
      if (!cancelled) setState((s) => (s.key === key ? { ...s, done, total } : s));
    })
      .then((options) => {
        if (!cancelled) setState((s) => ({ ...s, key, options, loading: false, error: false }));
      })
      .catch(() => {
        if (!cancelled) setState((s) => ({ ...s, key, loading: false, error: true }));
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, attempt]);

  const retry = () => setAttempt((a) => a + 1);
  if (!pokemon || state.key !== key) return { options: [], loading: !!pokemon, done: 0, total: 0, error: false, retry };
  return { options: state.options, loading: state.loading, done: state.done, total: state.total, error: state.error, retry };
}
