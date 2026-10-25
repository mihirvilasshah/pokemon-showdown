import type { Config } from "tailwindcss";

const withAlpha = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    container: { center: true, padding: { DEFAULT: "1rem", sm: "1.5rem", lg: "2rem" } },
    extend: {
      colors: {
        bg: withAlpha("bg"),
        surface: withAlpha("surface"),
        "surface-2": withAlpha("surface-2"),
        line: withAlpha("line"),
        fg: withAlpha("fg"),
        muted: withAlpha("muted"),
        accent: withAlpha("accent"),
        "accent-fg": withAlpha("accent-fg"),
        accent2: withAlpha("accent2"),
        good: withAlpha("good"),
        bad: withAlpha("bad"),
      },
      fontFamily: {
        sans: ["var(--font-body)", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      boxShadow: {
        glow: "0 0 0 1px rgb(var(--accent) / 0.35), 0 0 32px -4px rgb(var(--accent) / 0.45)",
        panel: "0 1px 0 0 rgb(255 255 255 / 0.04) inset, 0 20px 50px -24px rgb(0 0 0 / 0.55)",
      },
      keyframes: {
        float: { "0%,100%": { transform: "translateY(0)" }, "50%": { transform: "translateY(-10px)" } },
        shimmer: { "100%": { transform: "translateX(100%)" } },
        drift: {
          "0%": { transform: "translate3d(0,0,0)", opacity: "0" },
          "10%": { opacity: "1" },
          "90%": { opacity: "1" },
          "100%": { transform: "translate3d(var(--dx,20px),var(--dy,-120px),0)", opacity: "0" },
        },
        pulseGlow: { "0%,100%": { opacity: "0.55" }, "50%": { opacity: "1" } },
        spinSlow: { to: { transform: "rotate(360deg)" } },
        shake: {
          "0%,100%": { transform: "translate3d(0,0,0)" },
          "20%": { transform: "translate3d(-8px,3px,0)" },
          "40%": { transform: "translate3d(7px,-3px,0)" },
          "60%": { transform: "translate3d(-5px,2px,0)" },
          "80%": { transform: "translate3d(4px,-1px,0)" },
        },
        scan: { "0%": { transform: "translateY(-100%)" }, "100%": { transform: "translateY(100%)" } },
        sway: { "0%": { transform: "rotateY(-16deg)" }, "100%": { transform: "rotateY(16deg)" } },
        spin3d: { to: { transform: "rotateY(360deg)" } },
      },
      animation: {
        float: "float 6s ease-in-out infinite",
        shimmer: "shimmer 1.6s infinite",
        drift: "drift var(--dur,8s) linear infinite",
        "pulse-glow": "pulseGlow 2.4s ease-in-out infinite",
        "spin-slow": "spinSlow 18s linear infinite",
        shake: "shake 0.4s ease-in-out",
        scan: "scan 6s linear infinite",
        sway: "sway 8s ease-in-out infinite alternate",
        spin3d: "spin3d 9s linear infinite",
      },
    },
  },
  plugins: [],
};

export default config;
