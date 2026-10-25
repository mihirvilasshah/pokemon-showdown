import { STORAGE_KEYS, readRaw, writeRaw } from "@/lib/storage/safe-storage";

export type Theme = "light" | "dark";

/** Inline script run before first paint to avoid a flash of the wrong theme. */
export const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem(${JSON.stringify(
  STORAGE_KEYS.theme,
)});if(t!=='light'&&t!=='dark'){t=window.matchMedia('(prefers-color-scheme: light)').matches?'light':'dark'}document.documentElement.classList.toggle('dark',t==='dark');document.documentElement.style.colorScheme=t}catch(e){document.documentElement.classList.add('dark')}})();`;

export function getStoredTheme(): Theme | null {
  const v = readRaw(STORAGE_KEYS.theme);
  return v === "light" || v === "dark" ? v : null;
}

export function systemTheme(): Theme {
  if (typeof window === "undefined" || !window.matchMedia) return "dark";
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

export function currentTheme(): Theme {
  if (typeof document === "undefined") return "dark";
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

export function applyTheme(theme: Theme): void {
  document.documentElement.classList.toggle("dark", theme === "dark");
  document.documentElement.style.colorScheme = theme;
}

export function setTheme(theme: Theme): void {
  applyTheme(theme);
  writeRaw(STORAGE_KEYS.theme, theme);
}

export function toggleTheme(): Theme {
  const next: Theme = currentTheme() === "dark" ? "light" : "dark";
  setTheme(next);
  return next;
}
