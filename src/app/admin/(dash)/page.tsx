import Link from "next/link";
import { ArrowRight, CalendarCheck, CalendarClock, CheckCircle2, CircleDashed, Clock, ListChecks, Plus, XCircle } from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { RangeFilter } from "@/components/admin/range-filter";
import { Counter } from "@/components/admin/counter";
import { AppointmentList } from "@/components/admin/appointment-list";
import { Notifications } from "@/components/admin/notifications";
import { BarChart } from "@/components/admin/bar-chart";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/misc";
import { q } from "@/lib/db";
import { getOverviewStats, resolveRange, upcomingWorkload } from "@/lib/stats";
import { getSettings } from "@/lib/data";
import { getConnectionStatus } from "@/lib/google";
import { emailConfigured } from "@/lib/email";
import { addDays, istToUtc, istToday } from "@/lib/time";
import type { Appointment } from "@/lib/types";

export const metadata = { title: "Overview" };

export default async function Overview({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const range = resolveRange(await searchParams);
  const today = istToday();
  const [stats, todays, upcoming, notes, settings, conn, review, workload] = await Promise.all([
    getOverviewStats(range.fromUtc, range.toUtc),
    q<Appointment>("select * from appointments where starts_at >= $1 and starts_at < $2 order by starts_at", [istToUtc(today).toISOString(), istToUtc(addDays(today, 1)).toISOString()]),
    q<Appointment>("select * from appointments where starts_at >= $1 and status in ('pending','confirmed') order by starts_at limit 8", [istToUtc(addDays(today, 1)).toISOString()]),
    q<{ id: string; message: string; created_at: string }>("select id, message, created_at from admin_notifications where not is_read order by created_at desc limit 10"),
    getSettings(),
    getConnectionStatus(),
    q<{ n: number }>("select count(*)::int n from services where needs_review"),
    upcomingWorkload(14),
  ]);
  const short = (d: string) => new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(d + "T00:00:00Z"));
  const rangeLabel = ({ all: "all time", today: "today", week: "this week", month: "this month" } as Record<string, string>)[range.key] ?? `${short(range.from)} – ${short(range.to)}`;
  const cards = [
    { label: "Total appointments", v: stats.total, icon: ListChecks, sub: rangeLabel, tint: "from-teal-50" },
    { label: "Today's appointments", v: stats.today, icon: CalendarCheck, sub: "excluding cancelled", tint: "from-lavender-100" },
    { label: "Upcoming", v: stats.upcoming, icon: CalendarClock, sub: "from now on", tint: "from-mint-100" },
    { label: "Completed", v: stats.completed, icon: CheckCircle2, sub: rangeLabel, tint: "from-emerald-50" },
    { label: "Cancelled", v: stats.cancelled, icon: XCircle, sub: rangeLabel, tint: "from-red-50" },
    { label: "Pending", v: stats.pending, icon: CircleDashed, sub: rangeLabel, tint: "from-amber-50" },
  ];
  const checklist = [
    { done: conn.configured && conn.status === "connected", label: "Connect Google Calendar", href: "/admin/settings?tab=calendar" },
    { done: review[0].n === 0, label: `Review the provisional services${review[0].n ? ` (${review[0].n} to review)` : ""}`, href: "/admin/services" },
    { done: settings.hours_confirmed, label: "Confirm clinic working hours", href: "/admin/settings?tab=hours" },
    { done: emailConfigured(), label: "Configure email confirmations (optional)", href: "/admin/settings?tab=notifications" },
  ];

  return (
    <>
      <PageHeader title="Overview" sub={new Intl.DateTimeFormat("en-IN", { dateStyle: "full", timeZone: "Asia/Kolkata" }).format(new Date())}
        actions={<Button asChild><Link href="/admin/appointments?new=1"><Plus /> New appointment</Link></Button>} />

      <Notifications items={notes} failed={stats.sync_failed} />

      {checklist.some((c) => !c.done) && (
        <Card className="mb-6 p-5">
          <p className="text-sm font-semibold">Finish setting up</p>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {checklist.map((c) => (
              <li key={c.label}>
                <Link href={c.href} className="flex items-center gap-2.5 rounded-xl px-2 py-1.5 text-sm hover:bg-ink/5">
                  {c.done ? <CheckCircle2 className="size-4.5 text-emerald-600" /> : <CircleDashed className="size-4.5 text-muted" />}
                  <span className={c.done ? "text-muted line-through" : "text-ink"}>{c.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <div className="mb-4"><RangeFilter active={range.key} from={range.from} to={range.to} /></div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        {cards.map((c) => (
          <Card key={c.label} className={`relative overflow-hidden bg-gradient-to-br ${c.tint} to-white p-4 transition hover:-translate-y-0.5 hover:shadow-lift`}>
            <c.icon className="size-5 text-teal-600" />
            <p className="mt-3 font-display text-3xl font-extrabold"><Counter value={c.v} /></p>
            <p className="mt-0.5 text-sm font-medium">{c.label}</p>
            <p className="text-xs text-muted">{c.sub}</p>
          </Card>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <Card className="p-5">
          <div className="mb-2 flex items-center justify-between"><h2 className="font-bold">Today</h2><Link href="/admin/calendar?view=day" className="text-sm font-semibold text-teal-700 hover:underline">Day view</Link></div>
          <AppointmentList items={todays} empty="No appointments today." />
        </Card>
        <Card className="p-5">
          <div className="mb-2 flex items-center justify-between"><h2 className="font-bold">Coming up</h2><Link href="/admin/appointments" className="inline-flex items-center gap-1 text-sm font-semibold text-teal-700 hover:underline">All <ArrowRight className="size-3.5" /></Link></div>
          <AppointmentList items={upcoming} showDate empty="Nothing scheduled after today yet." />
        </Card>
      </div>

      <Card className="mt-6 p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-bold"><Clock className="size-4 text-teal-600" /> Upcoming workload · next 14 days</h2>
          <Link href="/admin/analytics" className="text-sm font-semibold text-teal-700 hover:underline">Analytics</Link>
        </div>
        <BarChart title="Appointments scheduled per day for the next 14 days" data={workload.map((d) => ({
          key: d.key, value: d.value,
          label: new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(d.key + "T00:00:00Z")),
          tip: `${new Intl.DateTimeFormat("en-IN", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(d.key + "T00:00:00Z"))} · ${Math.round(d.minutes / 6) / 10} h booked`,
        }))} />
      </Card>
    </>
  );
}
