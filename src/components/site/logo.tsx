import { useId } from "react";

export function Logo({ compact = false }: { compact?: boolean }) {
  const gid = `lg-${useId().replace(/:/g, "")}`;
  return (
    <span className="inline-flex items-center gap-2.5">
      <svg viewBox="0 0 40 40" className="size-9" aria-hidden>
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#13998f" />
            <stop offset="1" stopColor="#4f5bd5" />
          </linearGradient>
        </defs>
        <rect width="40" height="40" rx="12" fill={`url(#${gid})`} />
        {[9, 15, 21, 27].map((y, i) => (
          <rect key={y} x={14 + (i % 2 ? 1.5 : -0.5)} y={y} width={12 - (i % 2 ? 3 : -1)} height="4" rx="2" fill="#fff" opacity={0.95 - i * 0.12} />
        ))}
      </svg>
      {!compact && (
        <span className="leading-none">
          <span className="block font-display text-[17px] font-extrabold tracking-[0.12em] text-ink">SPYNUS</span>
          <span className="block text-[10.5px] font-medium tracking-wide text-muted">Physiotherapy &amp; Wellness Centre</span>
        </span>
      )}
    </span>
  );
}
