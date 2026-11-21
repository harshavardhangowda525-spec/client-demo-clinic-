// Pure slot computation — no I/O, fully unit-testable.
import { addDays, istToUtc, istTime, minutesOf, weekday } from "./time.ts";
import type { WeeklyHours } from "./types.ts";

export type Interval = { start: number; end: number }; // epoch ms, half-open [start, end)

export type SlotRules = {
  hours: WeeklyHours;
  slotIntervalMinutes: number;
  bufferMinutes: number;
  minNoticeMinutes: number;
  bookingWindowDays: number;
};

export type SlotInput = {
  fromDate: string; // IST YYYY-MM-DD
  days: number;
  durationMinutes: number;
  rules: SlotRules;
  now: Date;
  /** Existing active appointments: [starts_at, blocked_until) */
  appointments: Interval[];
  /** Holidays and manual blocks */
  blocks: Interval[];
  /** Busy periods from Google Calendar */
  external: Interval[];
  enforceNotice?: boolean;
  enforceWindow?: boolean;
};

export type DaySlots = { date: string; open: boolean; slots: { start: string; time: string }[] };

const MIN = 60_000;
const overlaps = (a: Interval, b: Interval) => a.start < b.end && b.start < a.end;

export function computeSlots(input: SlotInput): DaySlots[] {
  const { rules, now } = input;
  const enforceNotice = input.enforceNotice ?? true;
  const enforceWindow = input.enforceWindow ?? true;
  const earliest = enforceNotice ? now.getTime() + rules.minNoticeMinutes * MIN : now.getTime();
  const todayIst = new Date(now.getTime() + 330 * MIN).toISOString().slice(0, 10);
  const lastDate = addDays(todayIst, rules.bookingWindowDays);
  const dur = input.durationMinutes * MIN;
  const buf = rules.bufferMinutes * MIN;
  const step = Math.max(5, rules.slotIntervalMinutes) * MIN;

  const out: DaySlots[] = [];
  for (let i = 0; i < input.days; i++) {
    const date = addDays(input.fromDate, i);
    const day = rules.hours[String(weekday(date)) as keyof WeeklyHours];
    const res: DaySlots = { date, open: !!day, slots: [] };
    out.push(res);
    if (!day || (enforceWindow && date > lastDate) || date < todayIst) continue;

    // Working windows = open..close minus breaks
    let windows: Interval[] = [{ start: istToUtc(date, day.open).getTime(), end: istToUtc(date, day.close).getTime() }];
    for (const b of [...(day.breaks ?? [])].sort((a, c) => minutesOf(a.start) - minutesOf(c.start))) {
      const br = { start: istToUtc(date, b.start).getTime(), end: istToUtc(date, b.end).getTime() };
      windows = windows.flatMap((w) => {
        if (!overlaps(w, br)) return [w];
        const parts: Interval[] = [];
        if (br.start > w.start) parts.push({ start: w.start, end: br.start });
        if (br.end < w.end) parts.push({ start: br.end, end: w.end });
        return parts;
      });
    }

    for (const w of windows) {
      for (let t = w.start; t + dur <= w.end; t += step) {
        if (t < earliest) continue;
        const visit = { start: t, end: t + dur };
        const occupied = { start: t, end: t + dur + buf };
        if (input.blocks.some((b) => overlaps(visit, b))) continue;
        if (input.appointments.some((a) => overlaps(occupied, a))) continue;
        if (input.external.some((e) => overlaps(occupied, e))) continue;
        const d = new Date(t);
        res.slots.push({ start: d.toISOString(), time: istTime(d) });
      }
    }
  }
  return out;
}
