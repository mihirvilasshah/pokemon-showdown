import { expect, test, type Page } from "@playwright/test";

async function pick(page: Page, slot: 0 | 1, query: string, name: string) {
  await page.locator(`[data-testid="choose-${slot}"], [data-testid="change-${slot}"]`).click();
  await page.getByTestId("pokemon-search").fill(query);
  const card = page.getByTestId(`pokemon-card-${name}`);
  await expect(card).toBeVisible();
  await card.click();
  await expect(page.getByTestId(`name-${slot}`)).toHaveText(new RegExp(name.replace("-", " "), "i"));
}

async function startBattle(page: Page) {
  const start = page.getByTestId("start-battle");
  await expect(start).toBeEnabled({ timeout: 90_000 });
  await start.click();
  await expect(page.getByTestId("battle-stage")).toBeVisible();
}

test.describe("Pokémon Showdown", () => {
  test("opens the home page", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/choose your champions/i);
    await expect(page.getByText("Two Pokémon. One arena. One winner.")).toBeVisible();
    await expect(page.getByRole("link", { name: "Battle Arena" }).first()).toBeVisible();
    await expect(page.getByTestId("enter-arena")).toBeVisible();
    await page.getByTestId("enter-arena").click();
    await expect(page.getByTestId("choose-0")).toBeVisible();
  });

  test("selects, swaps, battles, shows the correct winner and restarts", async ({ page }) => {
    await page.goto("/#arena");
    await pick(page, 0, "charizard", "charizard");
    await pick(page, 1, "blastoise", "blastoise");

    await page.getByTestId("swap").click();
    await expect(page.getByTestId("name-0")).toHaveText(/blastoise/i);
    await expect(page.getByTestId("name-1")).toHaveText(/charizard/i);

    await expect(page.getByTestId("stat-comparison")).toBeVisible();
    await expect(page.getByTestId("matchup-panel")).toBeVisible();

    await startBattle(page);

    // HP decreases during combat.
    const hp0 = page.getByTestId("hp-0-text");
    const hp1 = page.getByTestId("hp-1-text");
    const initial0 = (await hp0.textContent()) ?? "";
    const initial1 = (await hp1.textContent()) ?? "";
    await expect
      .poll(async () => (await hp0.textContent()) !== initial0 || (await hp1.textContent()) !== initial1, { timeout: 45_000 })
      .toBe(true);

    await page.getByTestId("skip").click();
    const results = page.getByTestId("battle-results");
    await expect(results).toBeVisible();

    const winnerSide = await results.getAttribute("data-winner");
    const log = await page.getByTestId("battle-log").innerText();
    const finalText = [(await hp0.textContent()) ?? "", (await hp1.textContent()) ?? ""];
    if (winnerSide === "draw") {
      await expect(page.getByTestId("winner-name")).toHaveText(/draw/i);
    } else {
      const names = ["Blastoise", "Charizard"];
      const winner = names[Number(winnerSide)];
      const loserIdx = 1 - Number(winnerSide);
      await expect(page.getByTestId("winner-name")).toHaveText(`${winner} wins!`);
      expect(log).toContain(`${winner} wins the battle!`);
      expect(finalText[loserIdx]).toMatch(/^0 \//);
      expect(finalText[Number(winnerSide)]).not.toMatch(/^0 \//);
    }

    // Restart
    await page.getByTestId("rematch").click();
    await expect(page.getByTestId("battle-results")).toBeHidden();
    await expect(page.getByTestId("battle-stage")).toBeVisible();
    await page.getByTestId("skip").click();
    await expect(page.getByTestId("battle-results")).toBeVisible();

    // History saved locally
    await page.goto("/history");
    await expect(page.getByTestId("history-item").first()).toBeVisible();
    await page.getByTestId("clear-history").click();
    await expect(page.getByText("No battles yet")).toBeVisible();
  });

  test("interactive battle accepts move choices", async ({ page }) => {
    await page.goto("/#arena");
    await pick(page, 0, "pikachu", "pikachu");
    await pick(page, 1, "bulbasaur", "bulbasaur");
    await page.getByTestId("mode-interactive").check({ force: true });
    await startBattle(page);
    const move = page.getByTestId("move-0");
    await expect(move).toBeEnabled({ timeout: 30_000 });
    await move.click();
    await expect(page.getByTestId("battle-log")).toContainText("Turn 1", { timeout: 20_000 });
  });

  test("switches and persists the theme", async ({ page }) => {
    await page.goto("/");
    const html = page.locator("html");
    const before = (await html.getAttribute("class"))?.includes("dark");
    await page.getByTestId("theme-toggle").click();
    const after = (await html.getAttribute("class"))?.includes("dark");
    expect(after).toBe(!before);
    await page.reload();
    expect((await html.getAttribute("class"))?.includes("dark")).toBe(after);
  });

  test("type chart and pokédex pages work", async ({ page }) => {
    await page.goto("/type-chart");
    await expect(page.getByTestId("type-matrix")).toBeVisible();
    await expect(page.getByLabel(/Fire attacking Grass: 2×/)).toBeVisible();
    await page.goto("/pokedex");
    await page.getByTestId("pokemon-search").fill("pikachu");
    await page.getByTestId("pokemon-card-pikachu").click();
    await expect(page.getByTestId("pokemon-detail")).toBeVisible();
    // 3D model: real WebGL when available, otherwise the layered 2.5D fallback — never empty.
    const model = page.getByTestId("pokemon-detail").getByTestId("pokemon-model");
    await expect(model).toBeVisible();
    await expect(model).toHaveAttribute("data-render", /webgl|layered/);
    await expect(model.locator("canvas, img").first()).toBeAttached();
  });

  test("3D model opens full screen and zooms", async ({ page }) => {
    await page.goto("/pokedex");
    await page.getByTestId("pokemon-search").fill("pikachu");
    await page.getByTestId("pokemon-card-pikachu").click();
    await page.getByTestId("model-expand").click();
    const fs = page.getByTestId("model-fullscreen");
    await expect(fs).toBeVisible();
    const level = fs.getByTestId("zoom-level");
    await expect(level).toHaveText("100%");
    await fs.getByTestId("zoom-in").click();
    await expect(level).toHaveText("125%");
    await fs.getByTestId("zoom-out").click();
    await fs.getByTestId("zoom-out").click();
    await expect(level).toHaveText("80%");
    await fs.getByTestId("zoom-reset").click();
    await expect(level).toHaveText("100%");
    await page.keyboard.press("Escape");
    await expect(fs).toBeHidden();
    await expect(page.getByTestId("pokemon-detail")).toBeVisible();
  });

  test("works on a mobile viewport @mobile", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await page.getByTestId("mobile-menu-button").click();
    await expect(page.getByTestId("mobile-nav")).toBeVisible();
    await page.getByTestId("mobile-nav").getByRole("link", { name: "Battle Arena" }).click();
    await page.getByTestId("random-matchup").click();
    await expect(page.getByTestId("name-0")).toBeVisible({ timeout: 45_000 });
    await expect(page.getByTestId("name-1")).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
  });
});
