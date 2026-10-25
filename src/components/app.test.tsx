import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppProvider, useApp } from "@/components/app-provider";
import { BattleStage } from "@/components/battle/battle-stage";
import { HistoryView } from "@/components/pokedex/history-view";
import { createBattleFromSides } from "@/features/battle/prepare";
import { makeMove, makePokemon } from "@/features/battle/engine/test-utils";
import { FALLBACK_TYPE_CHART } from "@/features/type-effectiveness/chart";
import { loadHistory } from "@/features/history/history";
import type { BattleLaunch } from "@/features/battle/launch";

function Harness() {
  const app = useApp();
  return (
    <div>
      <span data-testid="s0">{app.slots[0] ?? "-"}</span>
      <span data-testid="s1">{app.slots[1] ?? "-"}</span>
      <button onClick={() => app.selectPokemon(0, "pikachu")}>p0</button>
      <button onClick={() => app.selectPokemon(1, "pikachu")}>p1-same</button>
      <button onClick={() => app.selectPokemon(1, "eevee")}>p1</button>
      <button onClick={() => app.swapSlots()}>swap</button>
      <button onClick={() => app.setAllowMirror(true)}>mirror</button>
    </div>
  );
}

describe("selection through the app provider", () => {
  it("selects, blocks mirror matches, allows them on request, and swaps", () => {
    render(
      <AppProvider>
        <Harness />
      </AppProvider>,
    );
    fireEvent.click(screen.getByText("p0"));
    fireEvent.click(screen.getByText("p1-same"));
    expect(screen.getByTestId("s1").textContent).toBe("-");
    fireEvent.click(screen.getByText("p1"));
    expect(screen.getByTestId("s0").textContent).toBe("pikachu");
    expect(screen.getByTestId("s1").textContent).toBe("eevee");
    fireEvent.click(screen.getByText("swap"));
    expect(screen.getByTestId("s0").textContent).toBe("eevee");
    expect(screen.getByTestId("s1").textContent).toBe("pikachu");
    fireEvent.click(screen.getByText("mirror"));
    fireEvent.click(screen.getByText("p1-same"));
    expect(screen.getByTestId("s1").textContent).toBe("pikachu");
    expect(window.localStorage.getItem("ps:mirror")).toBe("1");
  });
});

function makeLaunch(): BattleLaunch {
  const strong = makeMove({ name: "mega-punch", power: 120 });
  const a = makePokemon("alpha", ["fire"], { attack: 150, speed: 150 }, 1);
  const b = makePokemon("beta", ["grass"], { hp: 1, speed: 10 }, 2);
  return {
    a: { pokemon: a, displayName: "Alpha", moves: [strong] },
    b: { pokemon: b, displayName: "Beta", moves: [makeMove()] },
    level: 50,
    mode: "quick",
    arenaId: "grassland",
    chart: FALLBACK_TYPE_CHART,
    seed: 7,
  };
}

describe("battle stage", () => {
  beforeEach(() => window.localStorage.clear());

  it("plays a battle to the end, shows the winner, saves history, and supports rematch/replay", async () => {
    const launch = makeLaunch();
    const onRematch = vi.fn();
    const onExit = vi.fn();
    // Sanity check that the engine decides this matchup deterministically.
    const { state } = createBattleFromSides(launch.a, launch.b, launch.level, launch.chart);
    expect(state.phase).toBe("active");

    render(
      <AppProvider>
        <BattleStage launch={launch} onRematch={onRematch} onExit={onExit} />
      </AppProvider>,
    );
    expect(screen.getByTestId("hp-0-text").textContent).toMatch(/^\d+ \/ \d+ HP$/);
    expect(screen.queryByTestId("battle-results")).toBeNull();

    fireEvent.click(screen.getByTestId("skip"));
    const results = await screen.findByTestId("battle-results");
    expect(results.getAttribute("data-winner")).toBe("0");
    expect(screen.getByTestId("winner-name").textContent).toBe("Alpha wins!");
    expect(screen.getByTestId("hp-1-text").textContent).toMatch(/^0 \//);
    expect(screen.getByTestId("battle-log").textContent).toContain("Alpha wins the battle!");

    const history = loadHistory();
    expect(history).toHaveLength(1);
    expect(history[0].winner).toBe(0);

    fireEvent.click(screen.getByTestId("rematch"));
    expect(onRematch).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByTestId("change-pokemon"));
    expect(onExit).toHaveBeenCalledTimes(1);

    await act(async () => {
      fireEvent.click(screen.getByTestId("replay"));
    });
    expect(screen.queryByTestId("battle-results")).toBeNull();
    expect(screen.getByTestId("hp-1-text").textContent).toMatch(/^\d+ \/ \d+ HP$/);
    expect(screen.getByTestId("hp-1-text").textContent).not.toMatch(/^0 \//);
  });

  it("interactive mode waits for the player and resolves a turn when a move is chosen", async () => {
    const launch = { ...makeLaunch(), mode: "interactive" as const };
    render(
      <AppProvider>
        <BattleStage launch={launch} onRematch={() => {}} onExit={() => {}} />
      </AppProvider>,
    );
    const move = await screen.findByTestId("move-0");
    expect((move as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(move);
    fireEvent.click(await screen.findByTestId("skip"));
    expect(await screen.findByTestId("battle-results")).toBeTruthy();
    expect(screen.getByTestId("battle-log").textContent).toContain("Alpha used Mega Punch!");
  });
});

describe("history view", () => {
  it("shows an empty state", async () => {
    render(<HistoryView />);
    expect(await screen.findByText("No battles yet")).toBeTruthy();
  });
});
