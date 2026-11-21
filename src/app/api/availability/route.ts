import { NextResponse, type NextRequest } from "next/server";
import { q1 } from "@/lib/db";
import { getAvailability } from "@/lib/booking";
import { getSettings } from "@/lib/data";
import { istToday, isValidDate } from "@/lib/time";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const key = sp.get("service") ?? "";
  const service = await q1<{ id: string; duration_minutes: number }>(
    `select id, duration_minutes from services where is_published and online_booking and (slug = $1 or id::text = $1)`,
    [key],
  );
  if (!service) return NextResponse.json({ error: "Service not found" }, { status: 404 });
  const s = await getSettings();
  if (!s.online_booking_enabled) return NextResponse.json({ days: [], calendar: "not_connected", disabled: true });

  const today = istToday();
  let from = sp.get("from") ?? today;
  if (!isValidDate(from) || from < today) from = today;
  const days = Math.min(Math.max(Number(sp.get("days")) || s.booking_window_days + 1, 1), Math.min(62, s.booking_window_days + 1));

  const r = await getAvailability({ durationMinutes: service.duration_minutes, fromDate: from, days, settings: s });
  return NextResponse.json(
    { days: r.days, durationMinutes: service.duration_minutes, windowDays: s.booking_window_days },
    { headers: { "Cache-Control": "no-store" } },
  );
}
