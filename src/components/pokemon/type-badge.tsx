import { TYPE_COLORS, typeTextColor } from "@/config/type-colors";
import { cn } from "@/lib/utils";
import type { PokemonType } from "@/types/pokemon";

interface TypeBadgeProps {
  type: PokemonType;
  size?: "sm" | "md";
  className?: string;
}

/** Text label always accompanies the colour so type is never conveyed by colour alone. */
export function TypeBadge({ type, size = "md", className }: TypeBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full font-display font-semibold uppercase tracking-wider shadow-sm",
        size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-3 py-1 text-xs",
        className,
      )}
      style={{ backgroundColor: TYPE_COLORS[type].base, color: typeTextColor(type) }}
      data-type={type}
    >
      {TYPE_COLORS[type].label}
    </span>
  );
}

export function TypeBadges({ types, size }: { types: PokemonType[]; size?: "sm" | "md" }) {
  return (
    <span className="inline-flex flex-wrap gap-1.5" aria-label={`Types: ${types.join(", ")}`}>
      {types.map((t) => (
        <TypeBadge key={t} type={t} size={size} />
      ))}
    </span>
  );
}
