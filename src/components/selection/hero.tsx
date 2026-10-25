"use client";

import { motion } from "framer-motion";
import { ChevronDown, Swords } from "lucide-react";
import Link from "next/link";
import { officialArtworkUrl } from "@/features/pokemon/api";
import { useMotionEnabled } from "@/hooks/use-motion";

const FEATURED = [
  { id: 6, className: "left-[2%] top-[18%] w-40 sm:w-60 lg:w-72 -scale-x-100", delay: 0 },
  { id: 150, className: "right-[3%] top-[8%] w-36 sm:w-56 lg:w-72", delay: 1.2 },
  { id: 448, className: "right-[18%] bottom-[2%] hidden w-32 sm:block lg:w-48", delay: 2.4 },
  { id: 94, className: "left-[16%] bottom-[0%] hidden w-28 sm:block lg:w-44 -scale-x-100", delay: 3.2 },
];

export function Hero() {
  const animate = useMotionEnabled();
  return (
    <section className="hero-bg relative isolate overflow-hidden border-b border-line/10" aria-labelledby="hero-title">
      <div className="grid-lines absolute inset-0 -z-10" aria-hidden />
      <div className="absolute inset-0 -z-10 overflow-hidden" aria-hidden>
        {FEATURED.map((f) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={f.id}
            src={officialArtworkUrl(f.id)}
            alt=""
            width={475}
            height={475}
            loading="lazy"
            decoding="async"
            className={`absolute select-none opacity-[0.16] blur-[1px] saturate-150 dark:opacity-[0.22] ${animate ? "animate-float" : ""} ${f.className}`}
            style={{ animationDelay: `${f.delay}s` }}
          />
        ))}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-bg" />
      </div>

      <div className="container relative flex min-h-[78vh] flex-col items-center justify-center py-20 text-center">
        <motion.p
          initial={animate ? { opacity: 0, y: 10 } : false}
          animate={{ opacity: 1, y: 0 }}
          className="eyebrow mb-4"
        >
          Fan-made Pokémon battle simulator
        </motion.p>
        <motion.h1
          initial={animate ? { opacity: 0, y: 24, filter: "blur(8px)" } : false}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          id="hero-title"
          className="text-gradient max-w-5xl text-balance font-display text-5xl font-black uppercase leading-[0.95] sm:text-7xl lg:text-8xl"
        >
          Choose your champions.
        </motion.h1>
        <motion.p
          initial={animate ? { opacity: 0, y: 16 } : false}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.7 }}
          className="mt-6 max-w-xl text-lg text-muted sm:text-xl"
        >
          Two Pokémon. One arena. One winner.
        </motion.p>
        <motion.div
          initial={animate ? { opacity: 0, y: 16 } : false}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45, duration: 0.7 }}
          className="mt-10 flex flex-col items-center gap-4 sm:flex-row"
        >
          <a href="#arena" className="btn-primary min-h-[56px] px-10 text-base tracking-widest" data-testid="enter-arena">
            <Swords className="h-5 w-5" aria-hidden /> ENTER THE ARENA
          </a>
          <Link href="/pokedex" className="btn-ghost min-h-[56px] px-8">
            Browse the Pokédex
          </Link>
        </motion.div>
        <a href="#arena" aria-label="Scroll to the arena" className="absolute bottom-6 text-muted transition hover:text-fg">
          <ChevronDown className={`h-7 w-7 ${animate ? "animate-bounce" : ""}`} aria-hidden />
        </a>
      </div>
    </section>
  );
}
