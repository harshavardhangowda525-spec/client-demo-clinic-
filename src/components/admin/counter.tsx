"use client";
import { animate, useInView, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";

export function Counter({ value }: { value: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const reduce = useReducedMotion();
  const [v, setV] = useState(reduce ? value : 0);
  useEffect(() => {
    if (!inView) return;
    if (reduce) { setV(value); return; }
    const c = animate(0, value, { duration: 0.9, ease: [0.22, 1, 0.36, 1], onUpdate: (x) => setV(Math.round(x)) });
    return () => c.stop();
  }, [inView, value, reduce]);
  return <span ref={ref} className="tabular-nums">{v}</span>;
}
