"use client";

import { Moon, Sun } from "lucide-react";
import { toggleTheme } from "./theme";

/** Both icons are rendered and swapped with CSS, so there is no hydration mismatch. */
export function ThemeToggle() {
  return (
    <button
      type="button"
      className="btn-icon"
      onClick={() => toggleTheme()}
      aria-label="Toggle light and dark theme"
      data-testid="theme-toggle"
    >
      <Sun className="hidden h-5 w-5 dark:block" aria-hidden />
      <Moon className="h-5 w-5 dark:hidden" aria-hidden />
    </button>
  );
}
