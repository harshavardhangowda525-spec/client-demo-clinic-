import "server-only";
import { q } from "./db";
import { addDays, istToUtc, istToday, isValidDate, weekday } from "./time";

export type RangeKey = "today" | "week" | "month" | "custom" | "all";

export function resolveRange(sp: { range?: string; from?: string; to?: string }) {
  const today = istToday();
  const key = (["today", "week", "month", "custom", "all"].includes(sp.range ?? "") ? sp.range : "month") as RangeKey;
  let from: string, to: string; // inclusive IST dates
  if (key === "today") { from = today; to = today; }
  else if (key === "week") { from = addDays(today, -((weekday(today) + 6) % 7)); to = addDays(from, 6); }
  else if (key === "custom" && sp.from && sp.to && isValidDate(sp.from) && isValidDate(sp.to) && sp.from <= sp.to) { from = sp.from; to = sp.to; }
  else if (key === "all") { from = "2000-01-01"; to = "2100-01-01"; }
  else { from = today.slice(0, 8) + "01"; const [y, m] = today.split("-").map(Number); to = new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10); }
  return { key: key === "custom" && from === today && to === today ? "today" : key, from, to, fromUtc: istToUtc(from), toUtc: istToUtc(addDays(to, 1)) };
}

export async function getOverviewStats(fromUtc: Date, toUtc: Date) {
  const today = istToday();
  const [r] = await q<Record<string, number>>(
    `select
       count(*) filter (where starts_at >= $1 and starts_at < $2)::int as total,
       count(*) filter (where starts_at >= $1 and starts_at < $2 and status = 'completed')::int as completed,
       count(*) filter (where starts_at >= $1 and starts_at < $2 and status = 'cancelled')::int as cancelled,
       count(*) filter (where starts_at >= $1 and starts_at < $2 and status = 'pending')::int as pending,
       count(*) filter (where starts_at >= $3 and starts_at < $4 and status <> 'cancelled')::int as today,
       count(*) filter (where starts_at >= now() and status in ('pending','confirmed'))::int as upcoming,
       count(*) filter (where sync_status = 'failed')::int as sync_failed
     from appointments`,
    [fromUtc.toISOString(), toUtc.toISOString(), istToUtc(today).toISOString(), istToUtc(addDays(today, 1)).toISOString()],
  );
  return r;
}

/** Series helpers — all grouped in IST. */
export async function bookingsPerDay(days = 30) {
  const start = addDays(istToday(), -(days - 1));
  const rows = await q<{ d: string; n: number }>(
    `select to_char(created_at at time zone 'Asia/Kolkata', 'YYYY-MM-DD') d, count(*)::int n from appointments
      where created_at >= $1 group by 1`, [istToUtc(start).toISOString()]);
  const m = new Map(rows.map((r) => [r.d, r.n]));
  return Array.from({ length: days }, (_, i) => { const d = addDays(start, i); return { key: d, value: m.get(d) ?? 0 }; });
}

export async function weeklyTrend(weeks = 12) {
  const rows = await q<{ w: string; booked: number; cancelled: number }>(
    `select to_char(date_trunc('week', created_at at time zone 'Asia/Kolkata'), 'YYYY-MM-DD') w,
            count(*)::int booked, count(*) filter (where status = 'cancelled')::int cancelled
       from appointments where created_at >= now() - make_interval(weeks => $1) group by 1`, [weeks]);
  const today = istToday();
  const monday = addDays(today, -((weekday(today) + 6) % 7));
  const m = new Map(rows.map((r) => [r.w, r]));
  return Array.from({ length: weeks }, (_, i) => {
    const w = addDays(monday, -7 * (weeks - 1 - i));
    return { key: w, booked: m.get(w)?.booked ?? 0, cancelled: m.get(w)?.cancelled ?? 0 };
  });
}

export async function monthlyTrend(months = 12) {
  const rows = await q<{ m: string; n: number }>(
    `select to_char(created_at at time zone 'Asia/Kolkata', 'YYYY-MM') m, count(*)::int n from appointments
      where created_at >= date_trunc('month', now() at time zone 'Asia/Kolkata') - make_interval(months => $1 - 1) group by 1`, [months]);
  const map = new Map(rows.map((r) => [r.m, r.n]));
  const [y, mo] = istToday().split("-").map(Number);
  return Array.from({ length: months }, (_, i) => {
    const d = new Date(Date.UTC(y, mo - 1 - (months - 1 - i), 1));
    const k = d.toISOString().slice(0, 7);
    return { key: k, value: map.get(k) ?? 0 };
  });
}

export async function topServices(fromUtc: Date, toUtc: Date) {
  return q<{ name: string; n: number }>(
    `select service_name as name, count(*)::int n from appointments where starts_at >= $1 and starts_at < $2 and status <> 'cancelled'
      group by 1 order by 2 desc limit 8`, [fromUtc.toISOString(), toUtc.toISOString()]);
}

export async function upcomingWorkload(days = 14) {
  const start = istToday();
  const rows = await q<{ d: string; n: number; mins: number }>(
    `select to_char(starts_at at time zone 'Asia/Kolkata', 'YYYY-MM-DD') d, count(*)::int n,
            coalesce(sum(extract(epoch from ends_at - starts_at) / 60), 0)::int mins
       from appointments where status in ('pending','confirmed') and starts_at >= $1 and starts_at < $2 group by 1`,
    [istToUtc(start).toISOString(), istToUtc(addDays(start, days)).toISOString()]);
  const m = new Map(rows.map((r) => [r.d, r]));
  return Array.from({ length: days }, (_, i) => { const d = addDays(start, i); return { key: d, value: m.get(d)?.n ?? 0, minutes: m.get(d)?.mins ?? 0 }; });
}
