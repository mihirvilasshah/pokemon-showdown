import { STAT_KEYS, STAT_LABELS, type Pokemon } from "@/types/pokemon";
import { formatName } from "@/features/pokemon/mappers";

export const SIDE_COLORS = ["rgb(var(--accent2))", "rgb(var(--accent))"] as const;

function RadarChart({ a, b }: { a: Pokemon; b: Pokemon }) {
  const max = Math.max(100, Math.ceil(Math.max(...STAT_KEYS.map((k) => Math.max(a.stats[k], b.stats[k]))) / 20) * 20);
  const size = 260;
  const c = size / 2;
  const r = 92;
  const angle = (i: number) => (-90 + (360 / STAT_KEYS.length) * i) * (Math.PI / 180);
  const pt = (i: number, v: number): [number, number] => [c + Math.cos(angle(i)) * r * (v / max), c + Math.sin(angle(i)) * r * (v / max)];
  const poly = (p: Pokemon) => STAT_KEYS.map((k, i) => pt(i, p.stats[k]).join(",")).join(" ");
  const rings = [0.25, 0.5, 0.75, 1];

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="mx-auto w-full max-w-[320px]" aria-hidden>
      {rings.map((f) => (
        <polygon
          key={f}
          points={STAT_KEYS.map((_, i) => pt(i, max * f).join(",")).join(" ")}
          fill="none"
          stroke="rgb(var(--line) / 0.15)"
        />
      ))}
      {STAT_KEYS.map((k, i) => {
        const [x, y] = pt(i, max);
        const [lx, ly] = pt(i, max * 1.2);
        return (
          <g key={k}>
            <line x1={c} y1={c} x2={x} y2={y} stroke="rgb(var(--line) / 0.15)" />
            <text x={lx} y={ly} textAnchor="middle" dominantBaseline="middle" fontSize="10" fill="rgb(var(--muted))">
              {STAT_LABELS[k]}
            </text>
          </g>
        );
      })}
      <polygon points={poly(a)} fill={SIDE_COLORS[0]} fillOpacity={0.22} stroke={SIDE_COLORS[0]} strokeWidth={2} />
      <polygon points={poly(b)} fill={SIDE_COLORS[1]} fillOpacity={0.22} stroke={SIDE_COLORS[1]} strokeWidth={2} strokeDasharray="5 3" />
    </svg>
  );
}

/** Side-by-side stat comparison: paired bars + radar chart + accessible table. */
export function StatComparison({ a, b }: { a: Pokemon; b: Pokemon }) {
  const nameA = formatName(a.name);
  const nameB = formatName(b.name);
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_auto]" data-testid="stat-comparison">
      <div>
        <div className="mb-3 flex items-center justify-between text-xs font-semibold">
          <span className="flex items-center gap-2">
            <span className="h-2.5 w-5 rounded-full" style={{ background: SIDE_COLORS[0] }} aria-hidden />
            {nameA}
          </span>
          <span className="flex items-center gap-2">
            {nameB}
            <span className="h-2.5 w-5 rounded-full border border-dashed" style={{ background: SIDE_COLORS[1] }} aria-hidden />
          </span>
        </div>
        <ul className="space-y-3" aria-hidden>
          {STAT_KEYS.map((k) => {
            const va = a.stats[k];
            const vb = b.stats[k];
            return (
              <li key={k} className="grid grid-cols-[2.25rem_1fr_5rem_1fr_2.25rem] items-center gap-2 text-xs">
                <span className={`text-right font-bold tabular-nums ${va > vb ? "text-fg" : "text-muted"}`}>{va}</span>
                <div className="flex h-2 justify-end overflow-hidden rounded-full bg-line/10">
                  <div className="h-full rounded-full" style={{ width: `${(va / 255) * 100}%`, background: SIDE_COLORS[0] }} />
                </div>
                <span className="text-center font-medium text-muted">{STAT_LABELS[k]}</span>
                <div className="h-2 overflow-hidden rounded-full bg-line/10">
                  <div className="h-full rounded-full" style={{ width: `${(vb / 255) * 100}%`, background: SIDE_COLORS[1] }} />
                </div>
                <span className={`font-bold tabular-nums ${vb > va ? "text-fg" : "text-muted"}`}>{vb}</span>
              </li>
            );
          })}
          <li className="grid grid-cols-[2.25rem_1fr_5rem_1fr_2.25rem] items-center gap-2 border-t border-line/10 pt-3 text-xs">
            <span className="text-right font-bold tabular-nums">{a.baseStatTotal}</span>
            <span />
            <span className="text-center font-semibold">Total</span>
            <span />
            <span className="font-bold tabular-nums">{b.baseStatTotal}</span>
          </li>
        </ul>
        <div className="sr-only">
        <table>
          <caption>
            Base stat comparison between {nameA} and {nameB}
          </caption>
          <thead>
            <tr>
              <th scope="col">Stat</th>
              <th scope="col">{nameA}</th>
              <th scope="col">{nameB}</th>
            </tr>
          </thead>
          <tbody>
            {STAT_KEYS.map((k) => (
              <tr key={k}>
                <th scope="row">{STAT_LABELS[k]}</th>
                <td>{a.stats[k]}</td>
                <td>{b.stats[k]}</td>
              </tr>
            ))}
            <tr>
              <th scope="row">Total</th>
              <td>{a.baseStatTotal}</td>
              <td>{b.baseStatTotal}</td>
            </tr>
          </tbody>
        </table>
        </div>
      </div>
      <figure className="w-full lg:w-[300px]">
        <RadarChart a={a} b={b} />
        <figcaption className="sr-only">Radar chart of base stats for {nameA} and {nameB}; see the table for exact values.</figcaption>
      </figure>
    </div>
  );
}
