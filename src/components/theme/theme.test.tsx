import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { ThemeToggle } from "./theme-toggle";
import { THEME_SCRIPT, applyTheme, currentTheme, getStoredTheme, setTheme, toggleTheme } from "./theme";

beforeEach(() => {
  document.documentElement.className = "";
  window.localStorage.clear();
});

describe("theme system", () => {
  it("toggles the dark class and persists the choice", () => {
    applyTheme("light");
    expect(currentTheme()).toBe("light");
    expect(toggleTheme()).toBe("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(getStoredTheme()).toBe("dark");
    expect(toggleTheme()).toBe("light");
    expect(getStoredTheme()).toBe("light");
  });

  it("ignores invalid stored values", () => {
    window.localStorage.setItem("ps:theme", "purple");
    expect(getStoredTheme()).toBeNull();
  });

  it("the header toggle updates the document and storage", () => {
    applyTheme("dark");
    render(<ThemeToggle />);
    fireEvent.click(screen.getByTestId("theme-toggle"));
    expect(currentTheme()).toBe("light");
    expect(window.localStorage.getItem("ps:theme")).toBe("light");
  });

  it("the pre-paint script restores the saved theme and falls back to the system preference", () => {
    setTheme("light");
    document.documentElement.classList.add("dark");
    new Function(THEME_SCRIPT)();
    expect(document.documentElement.classList.contains("dark")).toBe(false);

    window.localStorage.setItem("ps:theme", "dark");
    new Function(THEME_SCRIPT)();
    expect(document.documentElement.classList.contains("dark")).toBe(true);

    window.localStorage.clear();
    // matchMedia stub reports no light preference -> dark
    new Function(THEME_SCRIPT)();
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });
});
