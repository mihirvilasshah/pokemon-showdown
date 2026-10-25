"use client";

import { useMemo } from "react";
import type { Arena } from "@/config/arenas";
import { cn } from "@/lib/utils";

interface Particle {
  left: number;
  top: number;
  size: number;
  delay: number;
  dur: number;
  dx: number;
  dy: number;
}

// Deterministic pseudo-random so server and client markup match.
function makeParticles(count: number, upward: boolean): Particle[] {
  return Array.from({ length: count }, (_, i) => {
    const r = (n: number) => {
      const x = Math.sin((i + 1) * 9301 + n * 49297) * 233280;
      return x - Math.floor(x);
    };
    return {
      left: r(1) * 100,
      top: upward ? 55 + r(2) * 45 : r(2) * 80,
      size: 3 + r(3) * 7,
      delay: -r(4) * 10,
      dur: 6 + r(5) * 8,
      dx: (r(6) - 0.5) * 80,
      dy: upward ? -(80 + r(7) * 160) : 60 + r(7) * 140,
    };
  });
}

const SHAPES: Record<Arena["particle"], { upward: boolean; className: string; count: number }> = {
  leaf: { upward: false, className: "rounded-[60%_0_60%_0]", count: 16 },
  ember: { upward: true, className: "rounded-full blur-[1px]", count: 26 },
  bubble: { upward: true, className: "rounded-full border border-white/60 bg-white/10", count: 18 },
  spark: { upward: false, className: "rounded-full shadow-[0_0_10px_currentColor]", count: 22 },
  snow: { upward: false, className: "rounded-full", count: 30 },
  mist: { upward: true, className: "rounded-full blur-2xl", count: 8 },
  star: { upward: false, className: "rounded-full", count: 40 },
};

export function ArenaBackground({ arena, animate, className }: { arena: Arena; animate: boolean; className?: string }) {
  const shape = SHAPES[arena.particle];
  const particles = useMemo(() => makeParticles(shape.count, shape.upward), [shape]);
  const isMist = arena.particle === "mist";

  return (
    <div className={cn("absolute inset-0 overflow-hidden", className)} aria-hidden data-arena={arena.id}>
      <div className="absolute inset-0" style={{ background: arena.background }} />
      <div
        className="absolute inset-x-0 top-0 h-2/3 opacity-50"
        style={{ background: `radial-gradient(60% 70% at 50% 0%, ${arena.accent}55, transparent)` }}
      />
      {arena.id === "storm" && animate && (
        <div className="absolute inset-0 animate-pulse-glow bg-[radial-gradient(40%_30%_at_70%_10%,rgba(255,240,150,0.25),transparent)]" />
      )}
      <div className="absolute inset-x-0 bottom-0 h-[42%] overflow-hidden">
        <div className="arena-floor absolute inset-x-[-20%] bottom-0 h-full" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
      </div>
      <div
        className="absolute inset-x-[10%] bottom-[8%] h-[30%] rounded-[50%] opacity-35 blur-2xl"
        style={{ background: `radial-gradient(closest-side, ${arena.accent}, transparent)` }}
      />
      {particles.map((p, i) => (
        <span
          key={i}
          className={cn("absolute", shape.className, animate && "animate-drift", isMist && "!h-24 !w-24 opacity-20")}
          style={
            {
              left: `${p.left}%`,
              top: `${p.top}%`,
              width: isMist ? undefined : p.size * (arena.particle === "snow" || arena.particle === "star" ? 0.5 : 1),
              height: isMist ? undefined : p.size * (arena.particle === "snow" || arena.particle === "star" ? 0.5 : 1),
              background: arena.particleColor,
              color: arena.particleColor,
              opacity: animate ? undefined : 0.5,
              animationDelay: `${p.delay}s`,
              "--dur": `${p.dur}s`,
              "--dx": `${p.dx}px`,
              "--dy": `${p.dy}px`,
            } as React.CSSProperties
          }
        />
      ))}
      <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/40" />
      <div className="absolute inset-0 shadow-[inset_0_0_120px_rgba(0,0,0,0.55)]" />
    </div>
  );
}
