"use client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Input } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const OPTS = [
  { k: "today", l: "Today" }, { k: "week", l: "This week" }, { k: "month", l: "This month" }, { k: "all", l: "All time" }, { k: "custom", l: "Custom" },
];

export function RangeFilter({ active, from, to }: { active: string; from: string; to: string }) {
  const router = useRouter();
  const path = usePathname();
  const sp = useSearchParams();
  const [f, setF] = useState(from);
  const [t, setT] = useState(to);
  const [custom, setCustom] = useState(active === "custom");
  const go = (range: string, extra: Record<string, string> = {}) => {
    const p = new URLSearchParams(sp);
    p.set("range", range); p.delete("from"); p.delete("to");
    for (const [k, v] of Object.entries(extra)) p.set(k, v);
    router.push(`${path}?${p}`);
  };
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="inline-flex rounded-full border border-line bg-white p-1" role="group" aria-label="Date range">
        {OPTS.map((o) => (
          <button key={o.k} type="button" aria-pressed={active === o.k}
            onClick={() => (o.k === "custom" ? setCustom(true) : (setCustom(false), go(o.k)))}
            className={cn("rounded-full px-3 py-1.5 text-xs font-semibold transition", (active === o.k || (o.k === "custom" && custom)) ? "bg-ink text-white" : "text-ink-2 hover:bg-ink/5")}>
            {o.l}
          </button>
        ))}
      </div>
      {custom && (
        <form className="flex items-center gap-2" onSubmit={(e) => { e.preventDefault(); if (f && t) go("custom", { from: f, to: t }); }}>
          <Input type="date" aria-label="From" value={f} onChange={(e) => setF(e.target.value)} className="h-9 w-38 text-sm" />
          <span className="text-muted">–</span>
          <Input type="date" aria-label="To" value={t} onChange={(e) => setT(e.target.value)} className="h-9 w-38 text-sm" />
          <Button size="sm" type="submit">Apply</Button>
        </form>
      )}
    </div>
  );
}
