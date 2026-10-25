import type { TypeChart } from "@/features/type-effectiveness/chart";
import type { BattleMode } from "@/features/pokemon/selection";
import type { BattleSide } from "./prepare";

export interface BattleLaunch {
  a: BattleSide;
  b: BattleSide;
  level: number;
  mode: BattleMode;
  arenaId: string;
  chart: TypeChart;
  seed: number;
}
