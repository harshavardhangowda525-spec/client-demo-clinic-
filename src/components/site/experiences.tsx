"use client";
import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ChevronLeft, ChevronRight, ExternalLink, Quote } from "lucide-react";
import { Stars } from "./rating";
import type { Testimonial } from "@/lib/types";

export function Experiences({ items, reviewsUrl }: { items: Testimonial[]; reviewsUrl: string | null }) {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const reduce = useReducedMotion();
  const n = items.length;
  useEffect(() => {
    if (n < 2 || paused || reduce) return;
    const t = setInterval(() => setI((v) => (v + 1) % n), 6000);
    return () => clearInterval(t);
  }, [n, paused, reduce]);
  if (!n) return null;
  const t = items[i];
  return (
    <div className="mx-auto max-w-3xl" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocus={() => setPaused(true)} onBlur={() => setPaused(false)}>
      <div className="relative min-h-[15rem] overflow-hidden rounded-[1.75rem] border border-white bg-white/80 p-8 shadow-lift backdrop-blur sm:p-12" aria-roledescription="carousel" aria-label="Patient experiences">
        <Quote className="absolute right-8 top-8 size-16 text-teal-100" aria-hidden />
        <AnimatePresence mode="wait">
          <motion.figure key={t.id} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.4 }}
            aria-roledescription="slide" aria-label={`${i + 1} of ${n}`}>
            {t.rating ? <Stars value={t.rating} className="mb-4" /> : null}
            <blockquote className="relative font-display text-xl font-semibold leading-snug text-ink sm:text-2xl">
              {t.is_verbatim ? <>&ldquo;{t.content}&rdquo;</> : t.content}
            </blockquote>
            <figcaption className="mt-5 flex flex-wrap items-center gap-3 text-sm text-muted">
              <span className="font-semibold text-ink-2">{t.author_label}</span>
              {!t.is_verbatim && <span className="rounded-full bg-cream px-2 py-0.5 text-xs">Summary, not a direct quote</span>}
              {t.source_url && (
                <a className="inline-flex items-center gap-1 text-teal-700 hover:underline" href={t.source_url} target="_blank" rel="noopener noreferrer">
                  View source <ExternalLink className="size-3" />
                </a>
              )}
            </figcaption>
          </motion.figure>
        </AnimatePresence>
      </div>
      <div className="mt-6 flex items-center justify-between">
        <div className="flex gap-1.5" role="tablist" aria-label="Choose slide">
          {items.map((x, k) => (
            <button key={x.id} role="tab" aria-selected={k === i} aria-label={`Show item ${k + 1}`} onClick={() => setI(k)}
              className={`h-2 rounded-full transition-all ${k === i ? "w-8 bg-teal-500" : "w-2 bg-ink/15 hover:bg-ink/30"}`} />
          ))}
        </div>
        <div className="flex items-center gap-2">
          {reviewsUrl && <a href={reviewsUrl} target="_blank" rel="noopener noreferrer" className="mr-2 hidden text-sm font-semibold text-teal-700 hover:underline sm:inline">Read reviews on Google</a>}
          <button aria-label="Previous" onClick={() => setI((i - 1 + n) % n)} className="inline-flex size-10 items-center justify-center rounded-full border border-line bg-white hover:border-teal-400"><ChevronLeft className="size-4" /></button>
          <button aria-label="Next" onClick={() => setI((i + 1) % n)} className="inline-flex size-10 items-center justify-center rounded-full border border-line bg-white hover:border-teal-400"><ChevronRight className="size-4" /></button>
        </div>
      </div>
    </div>
  );
}
