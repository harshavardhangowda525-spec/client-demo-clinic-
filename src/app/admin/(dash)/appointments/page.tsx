import { PageHeader } from "@/components/admin/page-header";
import { AppointmentsTable } from "@/components/admin/appointments-table";
import { NewAppointmentButton } from "@/components/admin/new-appointment";
import { q } from "@/lib/db";
import { getAllServices } from "@/lib/data";
import type { Appointment } from "@/lib/types";

export const metadata = { title: "Appointments" };
const PAGE = 25;
const STATUSES = ["pending", "confirmed", "completed", "cancelled", "no_show"];

export default async function AppointmentsPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  const where: string[] = [];
  const params: unknown[] = [];
  const qstr = (sp.q ?? "").trim().slice(0, 100);
  if (qstr) {
    params.push(`%${qstr.replace(/[%_\\]/g, (m) => "\\" + m)}%`);
    const digits = qstr.replace(/\D/g, "");
    // Only treat the query as a phone search when it is essentially a number (4+ digits, no letters).
    params.push(digits.length >= 4 && !/[a-z]/i.test(qstr) ? `%${digits}%` : null);
    where.push(`(patient_name ilike $${params.length - 1} or booking_ref ilike $${params.length - 1} or patient_email ilike $${params.length - 1} or ($${params.length}::text is not null and patient_phone like $${params.length}))`);
  }
  if (sp.status && STATUSES.includes(sp.status)) { params.push(sp.status); where.push(`status = $${params.length}`); }
  if (sp.sync === "failed") where.push(`sync_status = 'failed'`);
  if (sp.when === "upcoming") where.push(`starts_at >= now()`);
  if (sp.when === "past") where.push(`starts_at < now()`);
  const order = sp.sort === "asc" ? "asc" : sp.sort === "created" ? "created" : "desc";
  const orderSql = order === "created" ? "created_at desc" : `starts_at ${order}`;
  const page = Math.max(1, Number(sp.page) || 1);
  const w = where.length ? `where ${where.join(" and ")}` : "";
  const [rows, [{ n }], services] = await Promise.all([
    q<Appointment>(`select * from appointments ${w} order by ${orderSql} limit ${PAGE} offset ${(page - 1) * PAGE}`, params),
    q<{ n: number }>(`select count(*)::int n from appointments ${w}`, params),
    getAllServices(),
  ]);
  return (
    <>
      <PageHeader title="Appointments" sub={`${n} appointment${n === 1 ? "" : "s"}`} actions={<NewAppointmentButton services={services.map((s) => ({ id: s.id, name: s.name, duration: s.duration_minutes }))} autoOpen={sp.new === "1"} />} />
      <AppointmentsTable rows={rows} total={n} page={page} pageSize={PAGE} filters={{ q: qstr, status: sp.status ?? "", sort: order, when: sp.when ?? "", sync: sp.sync ?? "" }} />
    </>
  );
}
