import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AppProvider } from "@/components/app-provider";
import { PokemonLayered } from "./pokemon-layered";

const renderModel = (props: Partial<React.ComponentProps<typeof PokemonLayered>> = {}) =>
  render(
    <AppProvider>
      <PokemonLayered id={25} name="pikachu" layers={6} {...props} />
    </AppProvider>,
  );

describe("PokemonLayered", () => {
  it("stacks the artwork into depth-shaded slices with a single labelled front layer", () => {
    const { container } = renderModel();
    const imgs = container.querySelectorAll("img");
    expect(imgs).toHaveLength(6);
    expect(screen.getAllByAltText("Pikachu 3D render")).toHaveLength(1);
    const z = [...imgs].map((i) => parseFloat(/translateZ\((-?[\d.]+)px\)/.exec(i.style.transform)![1]));
    expect([...z].sort((a, b) => a - b)).toEqual(z);
    expect(z[0]).toBeLessThan(0);
    expect(z.at(-1)).toBeGreaterThan(0);
    expect(imgs[0].style.filter).toContain("brightness");
    expect(imgs[5].style.filter).toBe("");
  });

  it("prefers the HOME render and falls back through artwork and sprite to a placeholder", () => {
    const { container } = renderModel({ home: "https://x/home.png" });
    const front = () => container.querySelectorAll("img")[5];
    expect(front().getAttribute("src")).toBe("https://x/home.png");
    const advance = () => fireEvent.error(front());
    advance();
    expect(front().getAttribute("src")).toContain("other/home/25.png");
    advance();
    expect(front().getAttribute("src")).toContain("official-artwork/25.png");
    advance();
    expect(front().getAttribute("src")).toContain("sprites/pokemon/25.png");
    advance();
    expect(screen.getByRole("img", { name: /artwork unavailable/i })).toBeTruthy();
  });

  it("rotates with the arrow keys when interactive", () => {
    renderModel({ interactive: true });
    const group = screen.getByRole("group", { name: /drag or use arrow keys/i });
    const model = group.querySelector<HTMLElement>(".will-change-transform")!;
    fireEvent.keyDown(group, { key: "ArrowRight" });
    expect(model.style.transform).toContain("rotateY(18deg)");
    fireEvent.keyDown(group, { key: "ArrowLeft" });
    fireEvent.keyDown(group, { key: "ArrowLeft" });
    expect(model.style.transform).toContain("rotateY(-18deg)");
  });

  it("is not focusable or draggable when non-interactive", () => {
    const { container } = renderModel();
    expect(container.querySelector("[tabindex]")).toBeNull();
  });
});
