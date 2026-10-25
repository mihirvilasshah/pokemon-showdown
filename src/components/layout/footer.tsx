export function Footer() {
  return (
    <footer className="mt-16 border-t border-line/10 bg-surface/40">
      <div className="container grid gap-6 py-10 text-sm text-muted md:grid-cols-[1.4fr_1fr]">
        <div className="space-y-2">
          <p className="font-display text-base font-bold text-fg">Pokémon Showdown · fan-made simulator</p>
          <p>
            This is an unofficial, non-commercial fan project. It is not affiliated with, endorsed by, or sponsored by Nintendo, Game Freak,
            Creatures Inc. or The Pokémon Company. Pokémon and all related names, characters and artwork are trademarks and copyrights of their
            respective owners.
          </p>
          <p>
            Battles are a game-inspired simulation, not an exact reproduction of any official battle engine. See the README for the ruleset and
            simplifications.
          </p>
        </div>
        <div className="space-y-2">
          <p className="font-display text-base font-bold text-fg">Data &amp; attribution</p>
          <p>
            Pokémon data from{" "}
            <a className="font-semibold text-accent underline-offset-2 hover:underline" href="https://pokeapi.co/" target="_blank" rel="noreferrer noopener">
              PokéAPI
            </a>
            . Artwork from the{" "}
            <a className="font-semibold text-accent underline-offset-2 hover:underline" href="https://github.com/PokeAPI/sprites" target="_blank" rel="noreferrer noopener">
              PokéAPI sprites repository
            </a>
            ; 3D models from the community{" "}
            <a className="font-semibold text-accent underline-offset-2 hover:underline" href="https://github.com/Pokemon-3D-api/assets" target="_blank" rel="noreferrer noopener">
              Pokémon 3D API assets
            </a>{" "}
            (property of their respective owners). Sound effects are synthesised in your browser; no copyrighted audio is used.
          </p>
        </div>
      </div>
    </footer>
  );
}
