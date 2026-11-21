"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/misc";
import { AppointmentDrawer, fmtT } from "./appointment-drawer";
import { STATUS_META } from "./status";
import type { Appointment, BlockedPeriod, WeeklyHours } from "@/lib/types";
import { cn } from "@/lib/utils";

const MIN = 60000;
const istDate = (iso: string) => new Date(Date.parse(iso) + 330 * MIN).toISOString().slice(0, 10);
const istMinutes = (iso: string) => { const d = new Date(Date.parse(iso) + 330 * MIN); return d.getUTCHours() * 60 + d.getUTCMinutes(); };
const addDays = (d: string, n: number) => { const [y, m, dd] = d.split("-").map(Number); return new Date(Date.UTC(y, m - 1, dd + n)).toISOString().slice(0, 10); };
const fmt = (d: string, o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("en-IN", { timeZone: "UTC", ...o }).format(new Date(d + "T00:00:00Z"));

const CHIP: Record<string, string> = {
  pending: "border-l-amber-500 bg-amber-50 text-amber-950",
  confirmed: "border-l-teal-500 bg-teal-50 text-teal-950",
  completed: "border-l-emerald-600 bg-emerald-50 text-emerald-950",
  cancelled: "border-l-red-400 bg-red-50/70 text-red-900 line-through decoration-red-300",
  no_show: "border-l-ink/40 bg-ink/5 text-ink-2",
};

export function CalendarView({ view, date, from, days, appointments, blocks, hours, today }: {
  view: "day" | "week" | "month"; date: string; from: string; days: number; appointments: Appointment[]; blocks: BlockedPeriod[]; hours: WeeklyHours; today: string;
}) {
  const [sel, setSel] = useState<Appointment | null>(null);
  const byDay = useMemo(() => {
    const m = new Map<string, Appointment[]>();
    for (const a of appointments) { const k = istDate(a.starts_at); m.set(k, [...(m.get(k) ?? []), a]); }
    return m;
  }, [appointments]);
  const blockedOn = (d: string) => blocks.filter((b) => istDate(b.starts_at) <= d && istDate(new Date(Date.parse(b.ends_at) - 1).toISOString()) >= d);

  const step = view === "day" ? 1 : view === "week" ? 7 : 0;
  const prev = view === "month" ? shiftMonth(date, -1) : addDays(date, -step);
  const next = view === "month" ? shiftMonth(date, 1) : addDays(date, step);
  const title = view === "month" ? fmt(date, { month: "long", year: "numeric" })
    : view === "week" ? `${fmt(from, { day: "numeric", month: "short" })} – ${fmt(addDays(from, 6), { day: "numeric", month: "short", year: "numeric" })}`
    : fmt(date, { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const href = (v: string, d: string) => `/admin/calendar?view=${v}&date=${d}`;

  // time grid bounds from working hours
  const opens = Object.values(hours).filter(Boolean).map((h) => toMin(h!.open));
  const closes = Object.values(hours).filter(Boolean).map((h) => toMin(h!.close));
  const apptMins = appointments.flatMap((a) => [istMinutes(a.starts_at), istMinutes(a.ends_at)]);
  const startMin = Math.floor(Math.min(8 * 60, ...opens, ...apptMins) / 60) * 60;
  const endMin = Math.ceil(Math.max(20 * 60, ...closes, ...apptMins) / 60) * 60;
  const PX = 1.1; // px per minute

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-line p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Link href={href(view, prev)} aria-label="Previous" className="inline-flex size-9 items-center justify-center rounded-full border border-line hover:border-teal-400"><ChevronLeft className="size-4" /></Link>
          <Link href={href(view, next)} aria-label="Next" className="inline-flex size-9 items-center justify-center rounded-full border border-line hover:border-teal-400"><ChevronRight className="size-4" /></Link>
          <Link href={href(view, today)} className="rounded-full border border-line px-3 py-1.5 text-xs font-semibold hover:border-teal-400">Today</Link>
          <h2 className="ml-2 font-display text-lg font-bold">{title}</h2>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden gap-3 text-xs text-muted xl:flex">
            {(["confirmed", "pending", "completed", "cancelled"] as const).map((s) => <span key={s} className="inline-flex items-center gap-1.5"><span className={`size-2 rounded-full ${STATUS_META[s].dot}`} />{STATUS_META[s].label}</span>)}
          </div>
          <div className="inline-flex rounded-full border border-line bg-white p-1">
            {(["day", "week", "month"] as const).map((v) => (
              <Link key={v} href={href(v, date)} aria-current={v === view ? "page" : undefined} className={cn("rounded-full px-3 py-1.5 text-xs font-semibold capitalize", v === view ? "bg-ink text-white" : "text-ink-2 hover:bg-ink/5")}>{v}</Link>
            ))}
          </div>
        </div>
      </div>

      {view === "month" ? (
        <div>
          <div className="grid grid-cols-7 border-b border-line bg-cream/40 text-center text-xs font-semibold text-muted">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => <div key={d} className="py-2">{d}</div>)}
          </div>
          <div className="grid grid-cols-7">
            {Array.from({ length: days }, (_, i) => addDays(from, i)).map((d) => {
              const list = byDay.get(d) ?? [];
              const inMonth = d.slice(0, 7) === date.slice(0, 7);
              const blocked = blockedOn(d);
              return (
                <div key={d} className={cn("min-h-24 border-b border-r border-line p-1.5 sm:min-h-28", !inMonth && "bg-cream/30 text-muted", blocked.length > 0 && "bg-[repeating-linear-gradient(135deg,transparent,transparent_6px,rgb(11_21_48/.03)_6px,rgb(11_21_48/.03)_12px)]")}>
                  <Link href={href("day", d)} className={cn("inline-flex size-6 items-center justify-center rounded-full text-xs font-semibold hover:bg-ink/5", d === today && "bg-ink text-white hover:bg-ink")}>{Number(d.slice(8))}</Link>
                  {blocked[0] && <p className="truncate text-[10px] font-medium text-muted">{blocked[0].reason || "Blocked"}</p>}
                  <div className="mt-1 space-y-1">
                    {list.slice(0, 3).map((a) => (
                      <button key={a.id} onClick={() => setSel(a)} className={cn("block w-full truncate rounded-md border-l-2 px-1.5 py-0.5 text-left text-[11px] font-medium", CHIP[a.status])}>
                        <span className="tabular-nums">{fmtT(a.starts_at).replace(" ", "")}</span> {a.patient_name.split(" ")[0]}
                      </button>
                    ))}
                    {list.length > 3 && <Link href={href("day", d)} className="block px-1 text-[11px] font-semibold text-teal-700">+{list.length - 3} more</Link>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <div className={cn("grid", view === "week" ? "min-w-[52rem] grid-cols-[3.5rem_repeat(7,1fr)]" : "grid-cols-[3.5rem_1fr]")}>
            <div className="border-b border-line" />
            {Array.from({ length: days }, (_, i) => addDays(from, i)).map((d) => (
              <Link key={d} href={href("day", d)} className={cn("border-b border-l border-line px-2 py-2 text-center hover:bg-ink/[0.02]", d === today && "bg-teal-50/60")}>
                <span className="block text-xs text-muted">{fmt(d, { weekday: "short" })}</span>
                <span className={cn("font-display text-lg font-bold", d === today && "text-teal-700")}>{Number(d.slice(8))}</span>
              </Link>
            ))}
            <div className="relative" style={{ height: (endMin - startMin) * PX }}>
              {Array.from({ length: (endMin - startMin) / 60 }, (_, i) => (
                <span key={i} className="absolute right-2 -translate-y-1/2 text-[10px] text-muted" style={{ top: i * 60 * PX }}>{i === 0 ? "" : label12(startMin + i * 60)}</span>
              ))}
            </div>
            {Array.from({ length: days }, (_, i) => addDays(from, i)).map((d) => {
              const wd = String(new Date(d + "T00:00:00Z").getUTCDay()) as keyof WeeklyHours;
              const h = hours[wd];
              const list = byDay.get(d) ?? [];
              return (
                <div key={d} className="relative border-l border-line" style={{ height: (endMin - startMin) * PX }}>
                  {Array.from({ length: (endMin - startMin) / 60 }, (_, k) => <div key={k} className="absolute inset-x-0 border-t border-line/60" style={{ top: k * 60 * PX }} />)}
                  {/* closed / break shading */}
                  {!h ? <div className="absolute inset-0 bg-ink/[0.03]" /> : (
                    <>
                      <div className="absolute inset-x-0 top-0 bg-ink/[0.03]" style={{ height: (toMin(h.open) - startMin) * PX }} />
                      <div className="absolute inset-x-0 bottom-0 bg-ink/[0.03]" style={{ top: (toMin(h.close) - startMin) * PX }} />
                      {h.breaks.map((b) => <div key={b.start} className="absolute inset-x-0 bg-[repeating-linear-gradient(135deg,transparent,transparent_5px,rgb(11_21_48/.05)_5px,rgb(11_21_48/.05)_10px)]" style={{ top: (toMin(b.start) - startMin) * PX, height: (toMin(b.end) - toMin(b.start)) * PX }} />)}
                    </>
                  )}
                  {blockedOn(d).map((b) => {
                    const s = istDate(b.starts_at) < d ? startMin : Math.max(startMin, istMinutes(b.starts_at));
                    const e = istDate(new Date(Date.parse(b.ends_at) - 1).toISOString()) > d ? endMin : Math.min(endMin, istMinutes(b.ends_at));
                    return <div key={b.id} className="absolute inset-x-0 flex items-start justify-center bg-lavender-100/70 pt-1 text-[10px] font-semibold text-indigo-800" style={{ top: (s - startMin) * PX, height: Math.max(12, (e - s) * PX) }}>{b.reason || (b.kind === "holiday" ? "Holiday" : "Blocked")}</div>;
                  })}
                  {list.map((a) => {
                    const s = istMinutes(a.starts_at), e = istMinutes(a.ends_at);
                    return (
                      <button key={a.id} onClick={() => setSel(a)} title={`${a.patient_name} · ${a.service_name}`}
                        className={cn("absolute inset-x-1 overflow-hidden rounded-lg border-l-[3px] px-2 py-1 text-left text-xs shadow-sm transition hover:z-10 hover:shadow-lift", CHIP[a.status])}
                        style={{ top: (s - startMin) * PX + 1, height: Math.max(22, (e - s) * PX - 2) }}>
                        <p className="truncate font-semibold">{a.patient_name}</p>
                        <p className="truncate opacity-75">{fmtT(a.starts_at)} · {a.service_name}</p>
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      )}
      <AppointmentDrawer a={sel} onClose={() => setSel(null)} />
    </Card>
  );
}

function toMin(t: string) { const [h, m] = t.split(":").map(Number); return h * 60 + m; }
function label12(m: number) { const h = Math.floor(m / 60); return `${((h + 11) % 12) + 1} ${h < 12 ? "AM" : "PM"}`; }
function shiftMonth(d: string, n: number) {
  const [y, m] = d.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1 + n, 1)).toISOString().slice(0, 10);
}
