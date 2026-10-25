import type { Metadata, Viewport } from "next";
import { Chakra_Petch, Inter } from "next/font/google";
import "./globals.css";
import { AppProvider } from "@/components/app-provider";
import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import { THEME_SCRIPT } from "@/components/theme/theme";

const display = Chakra_Petch({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-display",
  display: "swap",
});
const body = Inter({ subsets: ["latin"], variable: "--font-body", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Pokémon Showdown — Cinematic Battle Simulator", template: "%s · Pokémon Showdown" },
  description:
    "A fan-made, unofficial cinematic Pokémon battle simulator. Pick two Pokémon, compare stats and type matchups, and watch a real simulated 1v1 battle. Powered by PokéAPI.",
  applicationName: "Pokémon Showdown Simulator",
  keywords: ["pokemon", "battle simulator", "pokedex", "type chart", "pokeapi"],
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#060914" },
    { media: "(prefers-color-scheme: light)", color: "#f6f4ee" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} dark`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body>
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-accent focus:px-4 focus:py-2 focus:text-accent-fg"
        >
          Skip to content
        </a>
        <AppProvider>
          <Header />
          <main id="main">{children}</main>
          <Footer />
        </AppProvider>
      </body>
    </html>
  );
}
