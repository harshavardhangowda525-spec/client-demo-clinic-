"use client";
import { useId, useState } from "react";

type Datum = { key: string; label: string; value: number; tip?: string };

/**
 * Single-series bar chart. Thin bars with 4px rounded data-ends anchored to the baseline,
 * 2px gaps, recessive gridlines, hover/focus tooltip, and an accessible data table.
 */
export function BarChart({ data, title, height = 180, color = "#13998f", horizontal = false, unit = "" }: {
  data: Datum[]; title: string; height?: number; color?: string; horizontal?: boolean; unit?: string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const id = useId();
  const max = Math.max(1, ...data.map((d) => d.value));
  const nice = niceMax(max);
  const ticks = [0, nice / 2, nice];
  const total = data.reduce((a, d) => a + d.value, 0);

  if (horizontal) {
    return (
      <figure aria-labelledby={id}>
        <figcaption id={id} className="sr-only">{title}</figcaption>
        {total === 0 ? <Empty /> : (
          <ul className="space-y-2.5">
            {data.map((d) => (
              <li key={d.key} className="grid grid-cols-[minmax(0,10rem)_1fr_2.5rem] items-center gap-3 text-sm">
                <span className="truncate text-ink-2" title={d.label}>{d.label}</span>
                <span className="h-2.5 overflow-hidden rounded-r-[4px] bg-ink/5">
                  <span className="block h-full rounded-r-[4px] transition-[width] duration-700" style={{ width: `${(d.value / nice) * 100}%`, background: color }} />
                </span>
                <span className="text-right font-semibold tabular-nums text-ink">{d.value}</span>
              </li>
            ))}
          </ul>
        )}
      </figure>
    );
  }

  const W = 600, H = height, pad = { l: 28, r: 6, t: 10, b: 22 };
  const iw = W - pad.l - pad.r, ih = H - pad.t - pad.b;
  const slot = iw / Math.max(1, data.length);
  const bw = Math.max(2, Math.min(28, slot - 2));
  const labelEvery = Math.ceil(data.length / 8);

  return (
    <figure aria-labelledby={id} className="relative">
      <figcaption id={id} className="sr-only">{title}</figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full overflow-visible" role="img" aria-label={`${title}. Total ${total}${unit}.`}>
        {ticks.map((t) => {
          const y = pad.t + ih - (t / nice) * ih;
          return (
            <g key={t}>
              <line x1={pad.l} x2={W - pad.r} y1={y} y2={y} stroke="#0b1530" strokeOpacity={t === 0 ? 0.18 : 0.06} />
              <text x={pad.l - 6} y={y + 3} textAnchor="end" fontSize="10" fill="#55627f">{t}</text>
            </g>
          );
        })}
        {data.map((d, i) => {
          const h = (d.value / nice) * ih;
          const x = pad.l + i * slot + (slot - bw) / 2;
          const y = pad.t + ih - h;
          const r = Math.min(4, bw / 2, h);
          return (
            <g key={d.key} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} onFocus={() => setHover(i)} onBlur={() => setHover(null)} tabIndex={0} aria-label={`${d.label}: ${d.value}${unit}`}>
              <rect x={pad.l + i * slot} y={pad.t} width={slot} height={ih} fill="transparent" />
              {h > 0 && (
                <path fill={color} opacity={hover === null || hover === i ? 1 : 0.45}
                  d={`M${x},${pad.t + ih} V${y + r} Q${x},${y} ${x + r},${y} H${x + bw - r} Q${x + bw},${y} ${x + bw},${y + r} V${pad.t + ih} Z`} />
              )}
              {i % labelEvery === 0 && <text x={x + bw / 2} y={H - 6} textAnchor="middle" fontSize="10" fill="#55627f">{d.label}</text>}
            </g>
          );
        })}
      </svg>
      {hover !== null && data[hover] && (
        <div className="pointer-events-none absolute -top-2 z-10 -translate-x-1/2 -translate-y-full rounded-lg bg-ink px-2.5 py-1.5 text-xs text-white shadow-lift"
          style={{ left: `${((pad.l + hover * slot + slot / 2) / W) * 100}%` }}>
          <span className="block text-white/70">{data[hover].tip ?? data[hover].label}</span>
          <span className="font-semibold">{data[hover].value}{unit}</span>
        </div>
      )}
      {total === 0 && <p className="absolute inset-0 flex items-center justify-center text-sm text-muted">No data yet for this period</p>}
      <details className="mt-2 text-xs text-muted">
        <summary className="cursor-pointer select-none hover:text-ink">View as table</summary>
        <table className="mt-2 w-full text-left">
          <thead><tr><th className="py-1 font-medium">Period</th><th className="py-1 text-right font-medium">Count</th></tr></thead>
          <tbody>{data.map((d) => <tr key={d.key} className="border-t border-line"><td className="py-1">{d.tip ?? d.label}</td><td className="py-1 text-right tabular-nums">{d.value}</td></tr>)}</tbody>
        </table>
      </details>
    </figure>
  );
}

function Empty() {
  return <p className="py-8 text-center text-sm text-muted">No data yet for this period</p>;
}

function niceMax(v: number) {
  if (v <= 4) return 4;
  const p = 10 ** Math.floor(Math.log10(v));
  const n = v / p;
  return (n <= 2 ? 2 : n <= 5 ? 5 : 10) * p;
}
