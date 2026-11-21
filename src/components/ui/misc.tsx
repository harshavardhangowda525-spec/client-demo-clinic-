import * as React from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-2xl border border-line/80 bg-white shadow-soft", className)} {...p} />;
}

const tones = {
  gray: "bg-ink/5 text-ink-2 ring-ink/10",
  teal: "bg-teal-50 text-teal-700 ring-teal-100",
  green: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  amber: "bg-amber-50 text-amber-800 ring-amber-200",
  red: "bg-red-50 text-red-700 ring-red-200",
  blue: "bg-lavender-100 text-indigo-700 ring-lavender-200",
} as const;

export function Badge({ tone = "gray", className, ...p }: React.HTMLAttributes<HTMLSpanElement> & { tone?: keyof typeof tones }) {
  return <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset", tones[tone], className)} {...p} />;
}

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("skeleton", className)} />;
}
