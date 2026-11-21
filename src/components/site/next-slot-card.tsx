"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { CalendarCheck, Clock } from "lucide-react";
import { Skeleton } from "@/components/ui/misc";

type Day = { date: string; slots: { start: string; time: string }[] };

const fmt = (iso: string) =>
  new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", weekday: "short", day: "numeric", month: "short" }).format(new Date(iso));
const fmtT = (iso: string) =>
  new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", hour: "numeric", minute: "2-digit", hour12: true }).format(new Date(iso));

/** Live preview of the real booking system: shows genuinely available upcoming slots. */
export function NextSlotCard({ serviceId, serviceName, serviceSlug }: { serviceId?: string; serviceName?: string; serviceSlug?: string }) {
  const [state, setState] = useState<{ loading: boolean; slots: { start: string }[]; date?: string }>({ loading: true, slots: [] });
  useEffect(() => {
    if (!serviceId) { setState({ loading: false, slots: [] }); return; }
    const ctl = new AbortController();
    fetch(`/api/availability?service=${serviceId}&days=14`, { signal: ctl.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d: { days: Day[] }) => {
        const day = d.days.find((x) => x.slots.length);
        setState({ loading: false, slots: day?.slots.slice(0, 3) ?? [], date: day?.date });
      })
      .catch(() => setState({ loading: false, slots: [] }));
    return () => ctl.abort();
  }, [serviceId]);

  return (
    <div className="glass w-[min(19rem,80vw)] rounded-2xl p-4">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-teal-700">
        <span className="relative flex size-2"><span className="absolute inline-flex size-full animate-ping rounded-full bg-teal-400 opacity-60" /><span className="relative inline-flex size-2 rounded-full bg-teal-500" /></span>
        Next available
      </div>
      {state.loading ? (
        <div className="mt-3 space-y-2"><Skeleton className="h-4 w-32" /><div className="flex gap-2"><Skeleton className="h-8 w-16" /><Skeleton className="h-8 w-16" /><Skeleton className="h-8 w-16" /></div></div>
      ) : state.slots.length ? (
        <>
          <p className="mt-2 text-sm font-semibold text-ink">{fmt(state.slots[0].start)} · <span className="font-normal text-muted">{serviceName}</span></p>
          <div className="mt-3 flex flex-wrap gap-2">
            {state.slots.map((s) => (
              <Link key={s.start} href={`/book?service=${serviceSlug}&date=${state.date}`}
                className="inline-flex items-center gap-1 rounded-lg border border-teal-100 bg-teal-50 px-2.5 py-1.5 text-xs font-semibold text-teal-700 transition hover:border-teal-400 hover:bg-white">
                <Clock className="size-3" />{fmtT(s.start)}
              </Link>
            ))}
          </div>
        </>
      ) : (
        <p className="mt-2 text-sm text-muted">Choose a service to see open times.</p>
      )}
      <Link href="/book" className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-ink hover:text-teal-700">
        <CalendarCheck className="size-4" /> Open booking
      </Link>
    </div>
  );
}
