"use client";

import { useSyncExternalStore } from "react";
import { useApp } from "@/components/app-provider";

function subscribe(cb: () => void) {
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}

const snapshot = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, snapshot, () => false);
}

/** True when decorative animation is allowed (user setting and OS preference). */
export function useMotionEnabled(): boolean {
  const { motion } = useApp();
  const reduced = usePrefersReducedMotion();
  return motion === "auto" && !reduced;
}
