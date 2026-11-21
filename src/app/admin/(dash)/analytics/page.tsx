import { PageHeader } from "@/components/admin/page-header";
import { RangeFilter } from "@/components/admin/range-filter";
import { BarChart } from "@/components/admin/bar-chart";
import { Card } from "@/components/ui/misc";
import { bookingsPerDay, monthlyTrend, resolveRange, topServices, upcomingWorkload, weeklyTrend } from "@/lib/stats";

export const metadata = { title: "Analytics" };
const d = (k: string, o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("en-IN", { timeZone: "UTC", ...o }).format(new Date(k.length === 7 ? k + "-01T00:00:00Z" : k + "T00:00:00Z"));

export default async function Analytics({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const range = resolveRange(await searchParams);
  const [daily, weekly, monthly, top, workload] = await Promise.all([bookingsPerDay(30), weeklyTrend(12), monthlyTrend(12), topServices(range.fromUtc, range.toUtc), upcomingWorkload(14)]);
  const cancelRate = weekly.reduce((a, w) => a + w.booked, 0) ? Math.round((weekly.reduce((a, w) => a + w.cancelled, 0) / weekly.reduce((a, w) => a + w.booked, 0)) * 100) : 0;
  return (
    <>
      <PageHeader title="Analytics" sub="Based on real appointment records. Dates in IST." />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-5 lg:col-span-2">
          <h2 className="font-bold">Appointments booked per day</h2>
          <p className="mb-4 text-xs text-muted">Last 30 days, by booking date</p>
          <BarChart title="Appointments booked per day, last 30 days" data={daily.map((x) => ({ key: x.key, value: x.value, label: d(x.key, { day: "numeric", month: "short" }), tip: d(x.key, { weekday: "short", day: "numeric", month: "short" }) }))} />
        </Card>
        <Card className="p-5">
          <h2 className="font-bold">Weekly booking trend</h2>
          <p className="mb-4 text-xs text-muted">Last 12 weeks, week starting Monday</p>
          <BarChart title="Bookings per week, last 12 weeks" data={weekly.map((x) => ({ key: x.key, value: x.booked, label: d(x.key, { day: "numeric", month: "short" }), tip: `Week of ${d(x.key, { day: "numeric", month: "short" })}` }))} />
        </Card>
        <Card className="p-5">
          <h2 className="font-bold">Monthly booking trend</h2>
          <p className="mb-4 text-xs text-muted">Last 12 months</p>
          <BarChart title="Bookings per month, last 12 months" color="#4f5bd5" data={monthly.map((x) => ({ key: x.key, value: x.value, label: d(x.key, { month: "short" }), tip: d(x.key, { month: "long", year: "numeric" }) }))} />
        </Card>
        <Card className="p-5">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div><h2 className="font-bold">Most-requested services</h2><p className="text-xs text-muted">Excludes cancelled appointments</p></div>
          </div>
          <div className="mb-4"><RangeFilter active={range.key} from={range.from} to={range.to} /></div>
          <BarChart horizontal title="Appointments by service" data={top.map((t) => ({ key: t.name, label: t.name, value: t.n }))} />
        </Card>
        <Card className="p-5">
          <h2 className="font-bold">Cancellations</h2>
          <p className="mb-4 text-xs text-muted">Bookings made each week that were later cancelled · {cancelRate}% over 12 weeks</p>
          <BarChart title="Cancelled bookings per week" color="#c2410c" data={weekly.map((x) => ({ key: x.key, value: x.cancelled, label: d(x.key, { day: "numeric", month: "short" }), tip: `Week of ${d(x.key, { day: "numeric", month: "short" })}` }))} />
        </Card>
        <Card className="p-5 lg:col-span-2">
          <h2 className="font-bold">Upcoming workload</h2>
          <p className="mb-4 text-xs text-muted">Pending and confirmed appointments, next 14 days</p>
          <BarChart title="Scheduled appointments per day, next 14 days" data={workload.map((x) => ({ key: x.key, value: x.value, label: d(x.key, { day: "numeric", month: "short" }), tip: `${d(x.key, { weekday: "short", day: "numeric", month: "short" })} · ${Math.round(x.minutes / 6) / 10} h` }))} />
        </Card>
      </div>
    </>
  );
}
