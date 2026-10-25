# Pokémon Showdown — Cinematic Battle Simulator

A fan-made, **unofficial** Pokémon battle simulator. Pick any two Pokémon from the PokéAPI catalogue, compare
their stats and type matchups, and watch (or play) an animated 1v1 battle driven by a real, deterministic,
testable battle engine.

> Not affiliated with, endorsed by, or sponsored by Nintendo, Game Freak, Creatures Inc. or The Pokémon Company.
> Pokémon and all related names and artwork are trademarks and copyrights of their respective owners.
> This is a non-commercial personal project. Data comes from [PokéAPI](https://pokeapi.co/).

## Features

- **Hero + selection arena** — searchable picker (name or Pokédex #), generation filter, 18 type filters, A–Z / Pokédex
  sorting, alternate-form toggle, quick picks, random matchup, swap, mirror-match setting, progressive loading.
- **Real data** — `/pokemon`, `/pokemon-species`, `/type`, `/generation`, `/ability` and `/move` from PokéAPI v2, validated
  with Zod before use. Artwork falls back: official artwork → sprite → named placeholder.
- **Scouting report** — side-by-side stat bars, radar chart, accessible table, descriptive matchup summary and
  dual-type effectiveness (4× / 2× / 1× / ½× / ¼× / 0×). No winner is "predicted".
- **Battle engine** (`src/features/battle/engine`) — framework-free, seedable, fully unit-tested. Quick (auto) and
  Interactive (you choose moves) modes, level 1–100 (default 50), move configuration from real learnsets.
- **Cinematic presentation** — 7 arenas with particles, VS intro, animated HP bars, floating damage numbers,
  critical / super-effective callouts, type-coloured projectiles, screen shake, faint and victory sequences,
  winner spotlight, results with statistics. Pause / resume / speed / skip / replay controls.
- **3D Pokémon** — Pokémon in the Pokédex detail view, fighter panels, battle arena and winner spotlight are real
  glTF 3D models rendered with WebGL (three.js, lazy-loaded). Drag or use the arrow keys to rotate; the expand button on any
  model opens a **full-screen viewer** with zoom (mouse wheel, pinch, +/− buttons or keys, 60–400 %, `0` resets) and an
  optional browser-fullscreen toggle. In battle the models
  turn, lunge, flash on hit, fall when they faint and spin on victory, and play any embedded animation. While a model
  downloads — or when none exists (alternate forms, no WebGL, offline) — a layered 2.5D renderer built from the PokéAPI
  HOME 3D render is shown instead, so the app always works. Grid thumbnails use the lightweight 2.5D tilt.
- **Pokédex, Type Chart, Battle History** pages. Send any Pokédex entry straight to the arena.
- **Dark & light themes** (system preference on first visit, persisted, no flash), optional synthesised sound
  effects and ambient music (muted by default), reduced-motion support plus an in-app animation toggle.
- **Local-only persistence** — theme, sound, arena, mirror setting and recent battle history in `localStorage`
  (with a clear-history button). Works when storage is unavailable.

## Getting started

Requirements: Node.js 18.18+ (Node 20+ recommended) and npm.

```bash
npm install
npm run dev          # http://localhost:3000
```

| Script              | Purpose                                                         |
| ------------------- | --------------------------------------------------------------- |
| `npm run dev`       | Start the development server                                    |
| `npm run build`     | Production build                                                |
| `npm start`         | Serve the production build                                      |
| `npm run lint`      | ESLint (Next.js core-web-vitals + TypeScript)                   |
| `npm run typecheck` | `tsc --noEmit`                                                  |
| `npm test`          | Vitest unit + component tests                                   |
| `npm run test:e2e`  | Playwright end-to-end tests (builds and serves the app itself)  |
| `npm run check`     | typecheck + lint + unit tests + build                           |

End-to-end tests need browsers once: `npx playwright install chromium`. They use the live PokéAPI, so they need
network access. Set `E2E_PORT` to reuse an already-running server on another port.

## Deploying to Vercel (Hobby plan)

1. Push this repository to GitHub.
2. In Vercel choose **Add New → Project** and import the repository.
3. Framework preset: **Next.js** (auto-detected). Build command `next build`, output directory default,
   install command `npm install`. Node.js 18.18+ (20.x recommended).
4. **No environment variables, database or paid services are required.** Click **Deploy**.
5. Every push to the production branch redeploys automatically; pull requests get preview deployments.

Free-tier notes: the app is almost entirely static + client-side, so it uses negligible serverless time. All
PokéAPI calls are made from the browser (with request de-duplication, retry/back-off and 7-day localStorage caching),
which follows PokéAPI's fair-use guidance to cache and avoid re-requesting resources. No server-side in-memory cache is
assumed. Artwork is loaded straight from the PokéAPI sprites repository with plain `<img>` tags so Vercel's
image-optimisation quota is never consumed. If PokéAPI is down, the picker shows an error with a retry button, the type
chart falls back to a bundled chart, and previously cached Pokémon keep working.

## Architecture

```
src/
  app/                    Next.js App Router pages (/, /pokedex, /type-chart, /history), layout, error pages
  components/
    layout/ theme/ ui/    Header, footer, theme toggle, modal, skeletons, states
    pokemon/ selection/   Artwork w/ fallback chain, badges, picker, panels, battle setup, hero
    stats/                Stat bars, radar + comparison, matchup panel
    battle/               Arena backgrounds, HP bars, scene effects, log, stage, results
    pokedex/              Pokédex detail, type chart, history views
  features/
    pokemon/              PokéAPI access (api.ts), mapping (mappers.ts), filtering, selection reducer
    battle/engine/        Pure battle engine: stats, damage, moves, turn resolution, AI, RNG, view/log reducers
    battle/               Move preparation, matchup analysis, launch types
    type-effectiveness/   Type chart maths + bundled fallback chart
    history/ sound/       Local history, procedural Web Audio engine
  lib/                    api client (retry/timeout/validation), cache (dedupe + TTL + persistence), storage, zod schemas
  hooks/                  Async loading, playback driver, debounced input, motion preferences
  config/                 Type colours, arena definitions
```

Key decisions:

- **Engine ≠ UI.** The engine resolves whole turns instantly and returns structured events (`damage`, `faint`, …) with
  the resulting HP. The UI derives HP bars, the log, animations and screen-reader text by *replaying* those events at a
  controllable pace, so pause/skip/replay/animations-off can never alter battle state.
- **Injectable RNG.** Every random decision uses a `Rng` interface (`createSeededRng`, `createSequenceRng`), so
  battles are reproducible and tests are deterministic.
- **Validated external data.** Every PokéAPI response is parsed with Zod and mapped into domain types; bad or partial
  data produces a typed error (never `NaN` stats).
- **Progressive loading.** A slim catalogue index (names, ids, types, generations) powers search and filters; full Pokémon
  data, moves and artwork are fetched lazily per card/selection.

## Battle ruleset (game-inspired, not an official engine)

- **Stats:** `HP = ⌊(2B + IV + ⌊EV/4⌋) × L / 100⌋ + L + 10`, other stats `⌊(2B + IV + ⌊EV/4⌋) × L / 100⌋ + 5`, with
  IV 31, 85 EVs and a neutral nature. Base-1 HP (Shedinja) stays at 1. Base stats are shown separately from simulated
  in-battle stats.
- **Damage:** `⌊⌊⌊(2L/5 + 2) × Power × A / D⌋ / 50⌋ + 2⌋`, then critical hit ×1.5, random 85–100 %, STAB ×1.5, type
  effectiveness (product over both defending types), burn ×0.5 for physical moves; minimum 1 unless immune. Stat
  stages use the standard `(2+n)/2` / `2/(2−n)` multipliers; crits ignore the attacker's negative and the defender's
  positive stages.
- **Critical hits:** stage 0 = 1/24, 1 = 1/8, 2 = 1/2, 3+ = always (Generation 6+ table, using move crit rate).
- **Turn order:** move priority, then effective Speed (paralysis halves it, stages apply), ties broken by the RNG.
- **Accuracy** is rolled before damage (moves with no accuracy never miss); stat changes to accuracy/evasion are not modelled.
- **Status conditions:** burn (1/16 per turn, halves physical damage), poison (1/8), paralysis (Speed ×0.5, 25 % full
  paralysis), sleep (1–3 turns), freeze (20 % thaw each turn, thaws when hit by Fire). Type immunities to statuses
  apply (Fire/burn, Electric/paralysis, Poison & Steel/poison, Ice/freeze).
- **Supported move effects:** damaging moves (incl. multi-hit, drain, recoil, flinch, secondary status and stat
  changes), fixed damage (Seismic Toss, Night Shade, Dragon Rage, Sonic Boom, Super Fang), healing moves, status
  moves for the supported conditions and stat-stage moves. Struggle is used automatically when out of PP.
- **Not supported (and excluded from move lists):** charging/semi-invulnerable moves (Fly, Dig, Solar Beam…), recharge
  moves (Hyper Beam…), self-KO moves, counters, variable-power moves (power not given by the API), weather/terrain/
  hazards, confusion, abilities, held items, switching, accuracy/evasion stages.
- **Learnsets:** moves are limited to the newest mainline version group on PokéAPI with a meaningful learnset (≥ 8
  moves), falling back to all groups; up to 80 candidates (level-up first) have their metadata fetched. Automatic
  selection favours strong, type-diverse attacks (matchup-aware) plus a valuable utility move. If nothing usable
  remains, Tackle or Struggle is used.
- **End of battle:** a Pokémon fainting ends the battle immediately; both fainting on the same turn, or reaching the
  100-turn limit, is a draw.
- **Arenas are cosmetic** and never change damage.

## Data sources & attribution

- Pokémon data: [PokéAPI v2](https://pokeapi.co/docs/v2) (please respect its fair-use policy).
- Artwork: [PokéAPI sprites repository](https://github.com/PokeAPI/sprites) (official artwork, HOME renders and sprites).
- 3D models: glTF files from the community-run [Pokémon 3D API assets repository](https://github.com/Pokemon-3D-api/assets),
  loaded at runtime from `raw.githubusercontent.com` (not bundled or redistributed by this project). They are fan-ported
  assets that remain the property of Nintendo / Creatures Inc. / GAME FREAK inc.; this is a non-commercial fan project and
  you should review that repository's terms before any public or commercial use. The URL base is one constant in
  `src/features/pokemon/models3d.ts` if you want to point at your own hosted models.
- Draco decoder (`public/draco`) is copied from three.js (MIT).
- Fonts: Chakra Petch and Inter via `next/font` (Google Fonts, OFL).
- Sound: synthesised in the browser with the Web Audio API — no audio files.

## Known limitations

- Sorting by base stat total is not offered: it would require fetching every Pokémon's full data. Sorting is by Pokédex
  number or name.
- Alternate forms depend on PokéAPI's data; some forms have incomplete learnsets (a fallback move is used).
- Candidate moves are capped at 80 per Pokémon, so a few rarely-used TM moves may not be offered.
- First load of a Pokémon's move metadata can take a few seconds on slow connections (then it is cached locally).
- Interactive mode is single-player versus the built-in AI; there is no online multiplayer.
- Models are served from third-party hosts at runtime, so first load of a model can take a few seconds (larger Generation 9 models are several MB); the 2.5D fallback is shown meanwhile. Not every form has a 3D model.
- The PokéAPI free service has no uptime guarantee; heavy use from one IP can be rate limited.
