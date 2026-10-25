"use client";

import { Menu, Music, Sparkles, Volume2, VolumeX, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useApp } from "@/components/app-provider";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", label: "Battle Arena" },
  { href: "/pokedex", label: "Pokédex" },
  { href: "/type-chart", label: "Type Chart" },
  { href: "/history", label: "Battle History" },
];

export function Header() {
  const pathname = usePathname();
  const { soundOn, setSoundOn, musicOn, setMusicOn, motion, setMotion } = useApp();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-line/10 bg-bg/75 backdrop-blur-xl">
      <div className="container flex h-16 items-center justify-between gap-3">
        <Link href="/" className="flex items-center gap-2.5" aria-label="Pokémon Showdown home" onClick={() => setOpen(false)}>
          <span aria-hidden className="relative flex h-8 w-8 items-center justify-center rounded-full border-2 border-fg/80">
            <span className="absolute inset-x-0 top-0 h-1/2 rounded-t-full bg-accent" />
            <span className="relative h-2.5 w-2.5 rounded-full border-2 border-fg/80 bg-bg" />
          </span>
          <span className="whitespace-nowrap font-display text-base font-black uppercase tracking-wider sm:text-xl">
            Pokémon <span className="text-accent">Showdown</span>
          </span>
        </Link>

        <nav aria-label="Primary" className="hidden items-center gap-1 md:flex">
          {NAV.map((n) => {
            const active = n.href === "/" ? pathname === "/" : pathname.startsWith(n.href);
            return (
              <Link
                key={n.href}
                href={n.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "rounded-lg px-3.5 py-2 text-sm font-semibold transition hover:bg-line/10",
                  active ? "bg-line/10 text-accent" : "text-muted hover:text-fg",
                )}
              >
                {n.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <button
            type="button"
            className="btn-icon hidden sm:inline-flex"
            aria-pressed={motion === "auto"}
            aria-label={motion === "auto" ? "Disable animations" : "Enable animations"}
            title={motion === "auto" ? "Animations on" : "Animations off"}
            onClick={() => setMotion(motion === "auto" ? "off" : "auto")}
            data-testid="motion-toggle"
          >
            <Sparkles className={cn("h-5 w-5", motion === "off" && "opacity-40")} aria-hidden />
          </button>
          {soundOn && (
            <button
              type="button"
              className="btn-icon hidden sm:inline-flex"
              aria-pressed={musicOn}
              aria-label={musicOn ? "Stop background music" : "Play background music"}
              onClick={() => setMusicOn(!musicOn)}
            >
              <Music className={cn("h-5 w-5", !musicOn && "opacity-40")} aria-hidden />
            </button>
          )}
          <button
            type="button"
            className="btn-icon"
            aria-pressed={soundOn}
            aria-label={soundOn ? "Mute sound" : "Unmute sound"}
            onClick={() => setSoundOn(!soundOn)}
            data-testid="sound-toggle"
          >
            {soundOn ? <Volume2 className="h-5 w-5" aria-hidden /> : <VolumeX className="h-5 w-5" aria-hidden />}
          </button>
          <ThemeToggle />
          <button
            type="button"
            className="btn-icon md:hidden"
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((o) => !o)}
            data-testid="mobile-menu-button"
          >
            {open ? <X className="h-5 w-5" aria-hidden /> : <Menu className="h-5 w-5" aria-hidden />}
          </button>
        </div>
      </div>

      {open && (
        <nav id="mobile-nav" aria-label="Mobile" className="border-t border-line/10 bg-bg/95 md:hidden" data-testid="mobile-nav">
          <ul className="container flex flex-col py-2">
            {NAV.map((n) => (
              <li key={n.href}>
                <Link
                  href={n.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex min-h-[48px] items-center rounded-lg px-2 text-base font-semibold",
                    (n.href === "/" ? pathname === "/" : pathname.startsWith(n.href)) ? "text-accent" : "text-fg",
                  )}
                >
                  {n.label}
                </Link>
              </li>
            ))}
            <li className="flex items-center gap-3 border-t border-line/10 py-3">
              <button type="button" className="btn-ghost flex-1" aria-pressed={motion === "auto"} onClick={() => setMotion(motion === "auto" ? "off" : "auto")}>
                <Sparkles className="h-4 w-4" aria-hidden /> Animations {motion === "auto" ? "on" : "off"}
              </button>
              {soundOn && (
                <button type="button" className="btn-ghost flex-1" aria-pressed={musicOn} onClick={() => setMusicOn(!musicOn)}>
                  <Music className="h-4 w-4" aria-hidden /> Music {musicOn ? "on" : "off"}
                </button>
              )}
            </li>
          </ul>
        </nav>
      )}
    </header>
  );
}
