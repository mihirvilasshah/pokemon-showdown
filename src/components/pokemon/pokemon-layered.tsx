"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { homeArtUrl, officialArtworkUrl, spriteUrl } from "@/features/pokemon/api";
import { formatName } from "@/features/pokemon/mappers";
import { useMotionEnabled } from "@/hooks/use-motion";
import { cn } from "@/lib/utils";

export interface Pose {
  /** Degrees of pitch (tilt toward/away from the viewer). */
  rx: number;
  /** Degrees of yaw (turn left/right). */
  ry: number;
}

interface PokemonLayeredProps {
  id: number;
  name: string;
  home?: string | null;
  artwork?: string | null;
  sprite?: string | null;
  flip?: boolean;
  /** Number of stacked slices that form the model's thickness. */
  layers?: number;
  /** Thickness in px at a 260px-wide model (scaled with the element). */
  depth?: number;
  /** Drag / hover / arrow-key rotation. */
  interactive?: boolean;
  /** Mouse-hover tilt only (no drag, no focus stop); for use inside other buttons. */
  hoverTilt?: boolean;
  /** Continuous turntable spin (victory pose). */
  spin?: boolean;
  /** Gentle idle turntable sway. */
  sway?: boolean;
  /** Resting pose; animates smoothly when it changes. */
  pose?: Pose;
  priority?: boolean;
  className?: string;
  /** Visually hidden hint is always provided when interactive. */
  showHint?: boolean;
}

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

/**
 * Real CSS-3D viewer for Pokémon renders: the transparent artwork is extruded into
 * stacked slices with depth shading, then placed in a perspective scene that can be
 * rotated by dragging, hovering or the arrow keys. No WebGL or model downloads.
 * Source chain: HOME 3D render -> official artwork -> sprite -> placeholder.
 */
export function PokemonLayered({
  id,
  name,
  home,
  artwork,
  sprite,
  flip = false,
  layers = 22,
  depth = 30,
  interactive = false,
  hoverTilt = false,
  sway = false,
  spin = false,
  pose = { rx: 0, ry: 0 },
  priority = false,
  className,
  showHint = false,
}: PokemonLayeredProps) {
  const motionOn = useMotionEnabled();
  const sources = useMemo(
    () => [...new Set([home, homeArtUrl(id), artwork, officialArtworkUrl(id), sprite, spriteUrl(id)].filter((s): s is string => !!s))],
    [home, artwork, sprite, id],
  );
  const [index, setIndex] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const src = sources[index];

  const stage = useRef<HTMLDivElement>(null);
  const model = useRef<HTMLDivElement>(null);
  const current = useRef<Pose>({ rx: pose.rx, ry: pose.ry });
  const dragging = useRef<{ x: number; y: number } | null>(null);
  const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const poseRef = useRef(pose);

  const apply = useCallback((p: Pose, animated: boolean) => {
    current.current = p;
    const el = model.current;
    if (!el) return;
    el.style.transition = animated ? "transform 0.7s cubic-bezier(0.22, 1, 0.36, 1)" : "none";
    el.style.transform = `rotateX(${p.rx}deg) rotateY(${p.ry}deg)`;
  }, []);

  useEffect(() => {
    poseRef.current = pose;
    if (!dragging.current) apply(pose, motionOn);
  }, [pose, apply, motionOn]);

  const settleSoon = useCallback(() => {
    if (settleTimer.current) clearTimeout(settleTimer.current);
    settleTimer.current = setTimeout(() => apply(poseRef.current, true), 1800);
  }, [apply]);

  useEffect(() => () => {
    if (settleTimer.current) clearTimeout(settleTimer.current);
  }, []);

  const count = Math.max(2, layers);
  const slices = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        const t = i / (count - 1); // 0 = back, 1 = front
        return { z: (t - 0.5) * depth, brightness: 0.28 + 0.72 * t ** 1.4, front: i === count - 1 };
      }),
    [count, depth],
  );

  if (!src) {
    return (
      <div
        role="img"
        aria-label={`${formatName(name)}, Pokédex number ${id} (artwork unavailable)`}
        className={cn("flex aspect-square flex-col items-center justify-center rounded-2xl border border-dashed border-line/25 bg-surface-2/40 p-3 text-center", className)}
      >
        <span className="font-display text-sm font-semibold">{formatName(name)}</span>
        <span className="text-xs text-muted">#{String(id).padStart(4, "0")}</span>
      </div>
    );
  }

  const onPointerDown = (e: React.PointerEvent) => {
    if (!interactive) return;
    dragging.current = { x: e.clientX, y: e.clientY };
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    if (settleTimer.current) clearTimeout(settleTimer.current);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!interactive && !hoverTilt) return;
    if (dragging.current) {
      const dx = e.clientX - dragging.current.x;
      const dy = e.clientY - dragging.current.y;
      dragging.current = { x: e.clientX, y: e.clientY };
      apply({ ry: current.current.ry + dx * 0.7 * (flip ? -1 : 1), rx: clamp(current.current.rx - dy * 0.45, -40, 40) }, false);
    } else if (e.pointerType === "mouse" && stage.current) {
      const r = stage.current.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      apply({ ry: pose.ry + px * 55 * (flip ? -1 : 1), rx: pose.rx - py * 30 }, false);
    }
  };
  const onPointerUp = () => {
    if (!interactive) return;
    dragging.current = null;
    settleSoon();
  };
  const onPointerLeave = () => {
    if ((!interactive && !hoverTilt) || dragging.current) return;
    apply(pose, true);
  };
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!interactive) return;
    const step = 18;
    const next = { ...current.current };
    if (e.key === "ArrowLeft") next.ry -= step;
    else if (e.key === "ArrowRight") next.ry += step;
    else if (e.key === "ArrowUp") next.rx = clamp(next.rx + 10, -40, 40);
    else if (e.key === "ArrowDown") next.rx = clamp(next.rx - 10, -40, 40);
    else if (e.key === "Home" || e.key === "Escape") Object.assign(next, poseRef.current);
    else return;
    e.preventDefault();
    apply(next, true);
    settleSoon();
  };

  return (
    <div
      ref={stage}
      className={cn("relative aspect-square select-none", interactive && "cursor-grab touch-pan-y active:cursor-grabbing focus-visible:outline-accent2", className)}
      style={{ perspective: "900px" }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onPointerLeave={onPointerLeave}
      onKeyDown={onKeyDown}
      tabIndex={interactive ? 0 : undefined}
      role={interactive ? "group" : undefined}
      aria-label={interactive ? `${formatName(name)} 3D model. Drag or use arrow keys to rotate.` : undefined}
      data-testid="pokemon-layered"
    >
      {!loaded && <div className="skeleton absolute inset-[10%] rounded-full" aria-hidden />}
      <div className={cn("absolute inset-0", flip && "-scale-x-100")} style={{ transformStyle: "preserve-3d" }}>
        <div className={cn("absolute inset-0", spin && motionOn ? "animate-spin3d" : sway && motionOn && "animate-sway")} style={{ transformStyle: "preserve-3d" }}>
          <div
            ref={model}
            className="absolute inset-0 will-change-transform"
            style={{ transformStyle: "preserve-3d", transform: `rotateX(${pose.rx}deg) rotateY(${pose.ry}deg)` }}
          >
            {slices.map((s, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={`${src}-${i}`}
                src={src}
                alt={s.front ? `${formatName(name)} 3D render` : ""}
                aria-hidden={s.front ? undefined : true}
                width={512}
                height={512}
                loading={priority ? "eager" : "lazy"}
                decoding="async"
                draggable={false}
                onLoad={s.front ? () => setLoaded(true) : undefined}
                onError={s.front ? () => { setLoaded(false); setIndex((n) => n + 1); } : undefined}
                className={cn("pointer-events-none absolute inset-0 h-full w-full object-contain transition-opacity duration-300", loaded ? "opacity-100" : "opacity-0")}
                style={{
                  transform: `translateZ(${s.z}px)`,
                  filter: s.front ? undefined : `brightness(${s.brightness})`,
                  backfaceVisibility: "visible",
                }}
              />
            ))}
          </div>
        </div>
      </div>
      {interactive && showHint && (
        <span className="pointer-events-none absolute inset-x-0 -bottom-5 text-center text-[10px] font-semibold uppercase tracking-widest text-muted">
          Drag to rotate
        </span>
      )}
    </div>
  );
}
