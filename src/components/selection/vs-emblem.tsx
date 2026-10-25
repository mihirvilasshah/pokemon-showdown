"use client";

import { motion } from "framer-motion";
import { useMotionEnabled } from "@/hooks/use-motion";

/** Animated "VS" emblem with orbiting energy rings. */
export function VsEmblem() {
  const animate = useMotionEnabled();
  return (
    <div className="relative mx-auto flex h-28 w-28 items-center justify-center sm:h-36 sm:w-36" aria-hidden>
      <span className={`absolute inset-0 rounded-full border border-accent/40 ${animate ? "animate-spin-slow" : ""}`} style={{ borderStyle: "dashed" }} />
      <span className={`absolute inset-3 rounded-full border border-accent2/40 ${animate ? "animate-pulse-glow" : ""}`} />
      <span className="absolute inset-6 rounded-full bg-accent/10 blur-xl" />
      {animate && (
        <motion.span
          className="absolute inset-0 rounded-full"
          style={{ background: "conic-gradient(from 0deg, transparent 0 70%, rgb(var(--accent) / 0.7) 100%)", mask: "radial-gradient(circle, transparent 58%, black 60%)", WebkitMask: "radial-gradient(circle, transparent 58%, black 60%)" }}
          animate={{ rotate: 360 }}
          transition={{ duration: 3.2, repeat: Infinity, ease: "linear" }}
        />
      )}
      <span className="relative bg-gradient-to-b from-accent to-accent2 bg-clip-text font-display text-5xl font-black text-transparent drop-shadow-[0_0_14px_rgb(var(--accent)/0.55)] sm:text-6xl">
        VS
      </span>
    </div>
  );
}
