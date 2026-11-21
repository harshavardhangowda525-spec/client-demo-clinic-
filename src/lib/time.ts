// Asia/Kolkata has a fixed +05:30 offset and no DST, so conversions are exact.
export const CLINIC_TZ = "Asia/Kolkata";
const OFFSET_MIN = 330;
const MIN = 60_000;

/** "YYYY-MM-DD" + "HH:MM" in IST -> UTC Date */
export function istToUtc(date: string, time = "00:00"): Date {
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  return new Date(Date.UTC(y, m - 1, d, hh, mm) - OFFSET_MIN * MIN);
}

function shifted(d: Date) {
  return new Date(d.getTime() + OFFSET_MIN * MIN);
}

/** UTC Date -> "YYYY-MM-DD" in IST */
export function istDate(d: Date): string {
  return shifted(d).toISOString().slice(0, 10);
}

/** UTC Date -> "HH:MM" in IST */
export function istTime(d: Date): string {
  return shifted(d).toISOString().slice(11, 16);
}

export function istToday(now = new Date()): string {
  return istDate(now);
}

export function addDays(date: string, n: number): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

/** 0 = Sunday */
export function weekday(date: string): number {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

export function minutesOf(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

export function isValidDate(s: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s + "T00:00:00Z"));
}

const fmtCache = new Map<string, Intl.DateTimeFormat>();
function fmt(opts: Intl.DateTimeFormatOptions) {
  const k = JSON.stringify(opts);
  let f = fmtCache.get(k);
  if (!f) { f = new Intl.DateTimeFormat("en-IN", { timeZone: CLINIC_TZ, ...opts }); fmtCache.set(k, f); }
  return f;
}

export const formatDateLong = (d: Date | string) => fmt({ weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date(d));
export const formatDateShort = (d: Date | string) => fmt({ weekday: "short", day: "numeric", month: "short" }).format(new Date(d));
export const formatTime = (d: Date | string) => fmt({ hour: "numeric", minute: "2-digit", hour12: true }).format(new Date(d));
export const formatDateTime = (d: Date | string) => `${formatDateShort(d)}, ${formatTime(d)}`;
