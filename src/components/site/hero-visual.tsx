"use client";
import { motion, useReducedMotion } from "motion/react";

/**
 * Original motion graphic (no third-party imagery): a stylised vertebral column with
 * gently flowing alignment, wrapped by a range-of-motion arc.
 */
export function HeroVisual() {
  const reduce = useReducedMotion();
  const vertebrae = Array.from({ length: 11 }, (_, i) => i);
  return (
    <svg viewBox="0 0 420 480" className="h-full w-full" role="img" aria-label="Illustration of a healthy, aligned spine with a range-of-motion arc">
      <defs>
        <linearGradient id="vb" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#dff5f1" />
        </linearGradient>
        <linearGradient id="arc" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#13998f" />
          <stop offset="1" stopColor="#7b86ee" />
        </linearGradient>
        <radialGradient id="halo" cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor="#35e0c4" stopOpacity=".35" />
          <stop offset="1" stopColor="#35e0c4" stopOpacity="0" />
        </radialGradient>
        <filter id="soft" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="6" stdDeviation="8" floodColor="#0b1530" floodOpacity=".12" /></filter>
      </defs>
      <circle cx="210" cy="240" r="190" fill="url(#halo)" />
      {/* range of motion arc */}
      <circle cx="210" cy="240" r="168" fill="none" stroke="#0b1530" strokeOpacity=".06" strokeWidth="14" />
      <motion.circle cx="210" cy="240" r="168" fill="none" stroke="url(#arc)" strokeWidth="6" strokeLinecap="round"
        transform="rotate(-90 210 240)" strokeDasharray="1056"
        initial={{ strokeDashoffset: 1056 }} animate={{ strokeDashoffset: 1056 * 0.32 }}
        transition={{ duration: reduce ? 0 : 2.4, ease: [0.22, 1, 0.36, 1], delay: 0.4 }} />
      {Array.from({ length: 36 }, (_, i) => (
        <line key={i} x1="210" y1="56" x2="210" y2={i % 3 ? 62 : 68} stroke="#0b1530" strokeOpacity=".18" strokeWidth="1.5" transform={`rotate(${i * 10} 210 240)`} />
      ))}
      {/* spine */}
      <g filter="url(#soft)">
        {vertebrae.map((i) => {
          const y = 92 + i * 27;
          const w = 46 + Math.sin((i / 10) * Math.PI) * 18;
          const baseX = 210 + Math.sin(i / 1.9) * 10;
          return (
            <motion.g key={i}
              animate={reduce ? undefined : { x: [0, Math.sin(i / 1.6) * 6, 0] }}
              transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut", delay: i * 0.12 }}>
              <rect x={baseX - w / 2} y={y} width={w} height="19" rx="9.5" fill="url(#vb)" stroke="#13998f" strokeOpacity=".35" />
              <rect x={baseX - w / 2 - 9} y={y + 6} width="10" height="7" rx="3.5" fill="#c3eedb" />
              <rect x={baseX + w / 2 - 1} y={y + 6} width="10" height="7" rx="3.5" fill="#d9dcfb" />
              {i < 10 && <rect x={baseX - w / 2 + 8} y={y + 20} width={w - 16} height="5" rx="2.5" fill="#6fd6ad" opacity=".55" />}
            </motion.g>
          );
        })}
      </g>
      {/* glowing pulse travelling down the spine */}
      {!reduce && (
        <motion.circle r="5" cx="210" fill="#35e0c4" initial={{ cy: 92, opacity: 0 }}
          animate={{ cy: [92, 380], opacity: [0, 1, 0] }} transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut", repeatDelay: 1.2 }} />
      )}
    </svg>
  );
}
