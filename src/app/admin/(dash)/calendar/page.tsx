import { PageHeader } from "@/components/admin/page-header";
import { CalendarView } from "@/components/admin/calendar-view";
import { NewAppointmentButton } from "@/components/admin/new-appointment";
import { q } from "@/lib/db";
import { getAllServices, getSettings } from "@/lib/data";
import { addDays, istToUtc, istToday, isValidDate, weekday } from "@/lib/time";
import type { Appointment, BlockedPeriod } from "@/lib/types";

export const metadata = { title: "Calendar" };

export default async function CalendarPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  const view = (["day", "week", "month"].includes(sp.view) ? sp.view : "week") as "day" | "week" | "month";
  const date = sp.date && isValidDate(sp.date) ? sp.date : istToday();
  let from: string, days: number;
  if (view === "day") { from = date; days = 1; }
  else if (view === "week") { from = addDays(date, -((weekday(date) + 6) % 7)); days = 7; }
  else {
    const first = date.slice(0, 8) + "01";
    from = addDays(first, -((weekday(first) + 6) % 7));
    days = 42;
  }
  const [appts, blocks, services, settings] = await Promise.all([
    q<Appointment>("select * from appointments where starts_at >= $1 and starts_at < $2 order by starts_at", [istToUtc(from).toISOString(), istToUtc(addDays(from, days)).toISOString()]),
    q<BlockedPeriod>("select * from blocked_periods where starts_at < $2 and ends_at > $1", [istToUtc(from).toISOString(), istToUtc(addDays(from, days)).toISOString()]),
    getAllServices(),
    getSettings(),
  ]);
  return (
    <>
      <PageHeader title="Calendar" sub="Times shown in IST" actions={<NewAppointmentButton services={services.map((s) => ({ id: s.id, name: s.name, duration: s.duration_minutes }))} initialDate={date} />} />
      <CalendarView view={view} date={date} from={from} days={days} appointments={appts} blocks={blocks} hours={settings.working_hours} today={istToday()} />
    </>
  );
}
