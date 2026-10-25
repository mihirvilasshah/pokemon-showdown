"use client";

import { getCatalogIndex, getPokemon, getSpecies, getTypeChartSafe } from "@/features/pokemon/api";
import { useAsync } from "./use-async";

export const usePokemon = (name: string | null) =>
  useAsync(name ? `pokemon:${name}` : null, () => getPokemon(name as string));

export const useSpecies = (name: string | null) =>
  useAsync(name ? `species:${name}` : null, () => getSpecies(name as string));

export const useCatalogIndex = () => useAsync("catalog", getCatalogIndex);

export const useTypeChart = () => useAsync("type-chart", getTypeChartSafe);
