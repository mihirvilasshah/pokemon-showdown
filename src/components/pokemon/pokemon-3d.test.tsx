import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AppProvider } from "@/components/app-provider";
import { MODEL_BASE, modelUrlFor } from "@/features/pokemon/models3d";
import { Pokemon3D } from "./pokemon-3d";

describe("modelUrlFor", () => {
  it("maps default National Dex Pokémon to regular or shiny models", () => {
    expect(modelUrlFor({ id: 25, isDefault: true })).toBe(`${MODEL_BASE}/regular/25.glb`);
    expect(modelUrlFor({ id: 6, isDefault: true }, true)).toBe(`${MODEL_BASE}/shiny/6.glb`);
  });

  it("returns null for alternate forms and out-of-range ids so the fallback renderer is used", () => {
    expect(modelUrlFor({ id: 10034, isDefault: false })).toBeNull();
    expect(modelUrlFor({ id: 10001, isDefault: true })).toBeNull();
    expect(modelUrlFor({ id: 0, isDefault: true })).toBeNull();
  });
});

describe("Pokemon3D", () => {
  const wrap = (ui: React.ReactNode) => render(<AppProvider>{ui}</AppProvider>);

  it("uses the layered renderer when no model exists", () => {
    wrap(<Pokemon3D id={25} name="pikachu" modelUrl={null} />);
    expect(screen.getByTestId("pokemon-model").getAttribute("data-render")).toBe("layered");
    expect(screen.getAllByAltText("Pikachu 3D render")).toHaveLength(1);
  });

  it("falls back to the layered renderer when WebGL is unavailable (jsdom)", async () => {
    wrap(<Pokemon3D id={25} name="pikachu" modelUrl={`${MODEL_BASE}/regular/25.glb`} interactive showHint />);
    await waitFor(() => expect(screen.getByTestId("pokemon-model").getAttribute("data-render")).toBe("layered"));
    expect(screen.queryByTestId("pokemon-webgl")).toBeNull();
    expect(screen.getByText("Drag to rotate")).toBeTruthy();
  });

  it("opens a full-screen viewer with working zoom controls", () => {
    wrap(<Pokemon3D id={25} name="pikachu" modelUrl={null} interactive expandable />);
    expect(screen.queryByTestId("zoom-level")).toBeNull();
    fireEvent.click(screen.getByTestId("model-expand"));
    const dialog = screen.getByTestId("model-fullscreen");
    expect(dialog.hasAttribute("open")).toBe(true);
    const level = () => within(dialog).getByTestId("zoom-level").textContent;
    expect(level()).toBe("100%");
    fireEvent.click(within(dialog).getByTestId("zoom-in"));
    expect(level()).toBe("125%");
    fireEvent.click(within(dialog).getByTestId("zoom-in"));
    expect(level()).toBe("156%");
    fireEvent.click(within(dialog).getByTestId("zoom-out"));
    expect(level()).toBe("125%");
    fireEvent.keyDown(within(dialog).getAllByTestId("pokemon-model")[0], { key: "-" });
    expect(level()).toBe("100%");
    fireEvent.click(within(dialog).getByTestId("zoom-in"));
    fireEvent.click(within(dialog).getByTestId("zoom-reset"));
    expect(level()).toBe("100%");
    // Zoom is clamped.
    for (let i = 0; i < 12; i++) fireEvent.click(within(dialog).getByTestId("zoom-in"));
    expect(level()).toBe("400%");
    expect((within(dialog).getByTestId("zoom-in") as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(within(dialog).getByTestId("model-close"));
    expect(screen.queryByTestId("zoom-level")).toBeNull();
  });
});
