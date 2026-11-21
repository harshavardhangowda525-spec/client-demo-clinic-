"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { changePassword, login, logout, requireAdmin } from "@/lib/auth";
import { q, q1 } from "@/lib/db";
import {
  BookingError, createAppointment, getAvailability, patientSchema, reschedule, retryFailedSyncs, setStatus, syncAppointment,
} from "@/lib/booking";
import { disconnect, listCalendars, selectCalendar } from "@/lib/google";
import { istToUtc, isValidDate } from "@/lib/time";
import type { AppointmentStatus } from "@/lib/types";

type Result<T = undefined> = { ok: true; data?: T; message?: string } | { ok: false; error: string };

function fail(e: unknown): { ok: false; error: string } {
  if (e instanceof BookingError || e instanceof z.ZodError) return { ok: false, error: e instanceof z.ZodError ? e.issues[0]?.message ?? "Invalid input" : e.message };
  const msg = (e as Error)?.message ?? "Something went wrong";
  console.error("[admin action]", e);
  return { ok: false, error: msg.length < 200 ? msg : "Something went wrong" };
}

function refreshPublic() {
  revalidatePath("/", "layout");
}

// ------------------------------------------------------------------ auth
export async function loginAction(_: unknown, fd: FormData): Promise<{ error?: string; email?: string }> {
  const email = String(fd.get("email") ?? "");
  const r = await login(email, String(fd.get("password") ?? ""));
  if (!r.ok) return { error: r.error, email };
  redirect("/admin");
}

export async function logoutAction() {
  await logout();
  redirect("/admin/login");
}

export async function changePasswordAction(current: string, next: string): Promise<Result> {
  const a = await requireAdmin();
  const r = await changePassword(a.id, current, next);
  return r.ok ? { ok: true, message: "Password updated. Other sessions have been signed out." } : { ok: false, error: r.error };
}

// ------------------------------------------------------------------ appointments
export async function appointmentAction(id: string, action: AppointmentStatus | "reschedule" | "sync", payload?: { startsAt?: string; reason?: string }): Promise<Result<{ sync: string }>> {
  await requireAdmin();
  try {
    let sync: string;
    if (action === "reschedule") {
      if (!payload?.startsAt) return { ok: false, error: "Choose a new time" };
      sync = (await reschedule(id, payload.startsAt)).sync;
    } else if (action === "sync") {
      sync = await syncAppointment(id);
    } else {
      sync = (await setStatus(id, action, payload?.reason)).sync;
    }
    revalidatePath("/admin", "layout");
    return { ok: true, data: { sync } };
  } catch (e) {
    return fail(e);
  }
}

export async function retryAllSyncAction(): Promise<Result<{ synced: number; failed: number; total: number }>> {
  await requireAdmin();
  try {
    const r = await retryFailedSyncs(50);
    revalidatePath("/admin", "layout");
    return { ok: true, data: r };
  } catch (e) {
    return fail(e);
  }
}

export async function adminSlotsAction(serviceId: string, date: string, excludeAppointmentId?: string): Promise<Result<{ slots: { start: string; time: string }[]; calendar: string }>> {
  await requireAdmin();
  if (!isValidDate(date)) return { ok: false, error: "Invalid date" };
  let duration: number | undefined;
  if (excludeAppointmentId) {
    const a = await q1<{ d: number }>("select extract(epoch from ends_at - starts_at)::int / 60 as d from appointments where id = $1", [excludeAppointmentId]);
    duration = a?.d;
  } else {
    duration = (await q1<{ duration_minutes: number }>("select duration_minutes from services where id = $1", [serviceId]))?.duration_minutes;
  }
  if (!duration) return { ok: false, error: "Service not found" };
  const r = await getAvailability({ durationMinutes: duration, fromDate: date, days: 1, admin: true, excludeAppointmentId });
  return { ok: true, data: { slots: r.days[0]?.slots ?? [], calendar: r.calendar } };
}

export async function createManualAppointmentAction(input: {
  serviceId: string; startsAt: string; name: string; phone: string; email?: string; notes?: string; status: "pending" | "confirmed";
}): Promise<Result<{ ref: string; sync: string }>> {
  await requireAdmin();
  try {
    const patient = patientSchema.parse(input);
    const r = await createAppointment({ serviceId: input.serviceId, startsAt: input.startsAt, patient, source: "admin", status: input.status });
    revalidatePath("/admin", "layout");
    return { ok: true, data: { ref: r.appointment.booking_ref, sync: r.appointment.sync_status } };
  } catch (e) {
    return fail(e);
  }
}

export async function markNotificationsReadAction(): Promise<Result> {
  await requireAdmin();
  await q("update admin_notifications set is_read = true where not is_read");
  revalidatePath("/admin", "layout");
  return { ok: true };
}

// ------------------------------------------------------------------ services
const serviceSchema = z.object({
  id: z.string().uuid().optional(),
  slug: z.string().trim().toLowerCase().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Slug may contain lowercase letters, numbers and dashes"),
  name: z.string().trim().min(2).max(120),
  short_description: z.string().trim().max(300),
  description: z.string().trim().max(4000),
  conditions: z.array(z.string().trim().min(1).max(120)).max(20),
  approach: z.string().trim().max(2000),
  duration_minutes: z.coerce.number().int().min(10).max(480),
  price_inr: z.union([z.literal(""), z.null(), z.coerce.number().min(0).max(1_000_000)]).transform((v) => (v === "" ? null : v)),
  image_id: z.string().uuid().nullable(),
  icon: z.string().max(30),
  is_published: z.boolean(),
  online_booking: z.boolean(),
  sort_order: z.coerce.number().int(),
});

export async function saveServiceAction(raw: unknown): Promise<Result<{ id: string }>> {
  await requireAdmin();
  try {
    const s = serviceSchema.parse(raw);
    const vals = [s.slug, s.name, s.short_description, s.description, s.conditions, s.approach, s.duration_minutes, s.price_inr, s.image_id, s.icon, s.is_published, s.online_booking, s.sort_order];
    const row = s.id
      ? await q1<{ id: string }>(
          `update services set slug=$2, name=$3, short_description=$4, description=$5, conditions=$6, approach=$7, duration_minutes=$8,
             price_inr=$9, image_id=$10, icon=$11, is_published=$12, online_booking=$13, sort_order=$14, needs_review=false, updated_at=now()
           where id=$1 returning id`, [s.id, ...vals])
      : await q1<{ id: string }>(
          `insert into services (slug, name, short_description, description, conditions, approach, duration_minutes, price_inr, image_id, icon,
             is_published, online_booking, sort_order, needs_review) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,false) returning id`, vals);
    refreshPublic();
    return { ok: true, data: { id: row!.id }, message: "Service saved" };
  } catch (e) {
    if ((e as { code?: string }).code === "23505") return { ok: false, error: "Another service already uses that slug." };
    return fail(e);
  }
}

export async function approveServiceAction(id: string): Promise<Result> {
  await requireAdmin();
  await q("update services set needs_review = false, updated_at = now() where id = $1", [id]);
  refreshPublic();
  return { ok: true };
}

export async function deleteServiceAction(id: string): Promise<Result> {
  await requireAdmin();
  const [{ n }] = await q<{ n: number }>("select count(*)::int n from appointments where service_id = $1", [id]);
  if (n > 0) {
    await q("update services set is_published = false, online_booking = false, updated_at = now() where id = $1", [id]);
    refreshPublic();
    return { ok: true, message: "This service has appointment history, so it was unpublished instead of deleted." };
  }
  await q("delete from services where id = $1", [id]);
  refreshPublic();
  return { ok: true, message: "Service deleted" };
}

// ------------------------------------------------------------------ settings
const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:MM");
const dayHours = z.object({ open: hhmm, close: hhmm, breaks: z.array(z.object({ start: hhmm, end: hhmm })).max(4) })
  .refine((d) => d.open < d.close, "Closing time must be after opening time")
  .refine((d) => d.breaks.every((b) => b.start < b.end && b.start >= d.open && b.end <= d.close), "Breaks must fall within opening hours")
  .nullable();

const settingsSchema = z.object({
  clinic_name: z.string().trim().min(2).max(160),
  tagline: z.string().trim().max(300),
  phone: z.string().trim().min(8).max(20),
  whatsapp_number: z.string().trim().max(20).nullable(),
  whatsapp_enabled: z.boolean(),
  email: z.union([z.literal(""), z.string().email()]).nullable().transform((v) => v || null),
  address_line: z.string().trim().min(2).max(200),
  locality: z.string().trim().max(120),
  city: z.string().trim().max(80),
  state: z.string().trim().max(80),
  postal_code: z.string().trim().max(12),
  maps_query: z.string().trim().min(3).max(300),
  google_rating: z.union([z.null(), z.coerce.number().min(1).max(5)]),
  google_review_count: z.union([z.null(), z.coerce.number().int().min(0)]),
  google_reviews_url: z.union([z.literal(""), z.string().url()]).nullable().transform((v) => v || null),
  about_story: z.string().trim().max(4000),
  about_approach: z.string().trim().max(4000),
  hero_image_id: z.string().uuid().nullable(),
  working_hours: z.object({ "0": dayHours, "1": dayHours, "2": dayHours, "3": dayHours, "4": dayHours, "5": dayHours, "6": dayHours }),
  hours_confirmed: z.boolean(),
  slot_interval_minutes: z.coerce.number().int().min(5).max(240),
  buffer_minutes: z.coerce.number().int().min(0).max(240),
  min_notice_minutes: z.coerce.number().int().min(0).max(10080),
  booking_window_days: z.coerce.number().int().min(1).max(365),
  auto_confirm_online: z.boolean(),
  online_booking_enabled: z.boolean(),
  notify_admin_emails: z.string().trim().max(500),
  send_patient_emails: z.boolean(),
  data_retention_months: z.coerce.number().int().min(3).max(120),
  calendar_include_patient_name: z.boolean(),
});

export async function saveSettingsAction(raw: unknown): Promise<Result> {
  await requireAdmin();
  try {
    const s = settingsSchema.parse(raw);
    const keys = Object.keys(s) as (keyof typeof s)[];
    const sets = keys.map((k, i) => `${k} = $${i + 1}`).join(", ");
    await q(`update clinic_settings set ${sets}, updated_at = now() where id = 1`, keys.map((k) => (k === "working_hours" ? JSON.stringify(s[k]) : s[k])));
    refreshPublic();
    return { ok: true, message: "Settings saved" };
  } catch (e) {
    return fail(e);
  }
}

export async function addBlockAction(input: { startDate: string; endDate: string; startTime?: string; endTime?: string; reason: string; kind: "holiday" | "block" }): Promise<Result> {
  await requireAdmin();
  if (!isValidDate(input.startDate) || !isValidDate(input.endDate)) return { ok: false, error: "Choose valid dates" };
  const allDay = !input.startTime || !input.endTime;
  const start = istToUtc(input.startDate, allDay ? "00:00" : input.startTime);
  const end = allDay ? new Date(istToUtc(input.endDate, "00:00").getTime() + 86_400_000) : istToUtc(input.endDate, input.endTime);
  if (end <= start) return { ok: false, error: "End must be after start" };
  await q("insert into blocked_periods (starts_at, ends_at, reason, kind) values ($1, $2, $3, $4)", [start.toISOString(), end.toISOString(), input.reason.slice(0, 200), input.kind]);
  revalidatePath("/admin", "layout");
  return { ok: true, message: "Blocked period added. Existing appointments in this period are not changed — review them separately." };
}

export async function deleteBlockAction(id: string): Promise<Result> {
  await requireAdmin();
  await q("delete from blocked_periods where id = $1", [id]);
  revalidatePath("/admin", "layout");
  return { ok: true };
}

// ------------------------------------------------------------------ team & testimonials
const practitionerSchema = z.object({
  id: z.string().uuid().optional(), name: z.string().trim().min(2).max(120), title: z.string().trim().max(120),
  credentials: z.string().trim().max(300), bio: z.string().trim().max(2000), photo_id: z.string().uuid().nullable(),
  is_public: z.boolean(), sort_order: z.coerce.number().int(),
});

export async function savePractitionerAction(raw: unknown): Promise<Result> {
  await requireAdmin();
  try {
    const p = practitionerSchema.parse(raw);
    const v = [p.name, p.title, p.credentials, p.bio, p.photo_id, p.is_public, p.sort_order];
    if (p.id) await q("update practitioners set name=$2, title=$3, credentials=$4, bio=$5, photo_id=$6, is_public=$7, sort_order=$8 where id=$1", [p.id, ...v]);
    else await q("insert into practitioners (name, title, credentials, bio, photo_id, is_public, sort_order) values ($1,$2,$3,$4,$5,$6,$7)", v);
    refreshPublic();
    return { ok: true, message: "Saved" };
  } catch (e) {
    return fail(e);
  }
}

export async function deletePractitionerAction(id: string): Promise<Result> {
  await requireAdmin();
  await q("delete from practitioners where id = $1", [id]);
  refreshPublic();
  return { ok: true };
}

const testimonialSchema = z.object({
  id: z.string().uuid().optional(), author_label: z.string().trim().min(1).max(120), content: z.string().trim().min(5).max(1200),
  rating: z.union([z.null(), z.coerce.number().int().min(1).max(5)]), is_verbatim: z.boolean(),
  source_url: z.union([z.literal(""), z.string().url()]).nullable().transform((v) => v || null),
  is_approved: z.boolean(), sort_order: z.coerce.number().int(),
});

export async function saveTestimonialAction(raw: unknown): Promise<Result> {
  await requireAdmin();
  try {
    const t = testimonialSchema.parse(raw);
    const v = [t.author_label, t.content, t.rating, t.is_verbatim, t.source_url, t.is_approved, t.sort_order];
    if (t.id) await q("update testimonials set author_label=$2, content=$3, rating=$4, is_verbatim=$5, source_url=$6, is_approved=$7, sort_order=$8 where id=$1", [t.id, ...v]);
    else await q("insert into testimonials (author_label, content, rating, is_verbatim, source_url, is_approved, sort_order) values ($1,$2,$3,$4,$5,$6,$7)", v);
    refreshPublic();
    return { ok: true, message: "Saved" };
  } catch (e) {
    return fail(e);
  }
}

export async function deleteTestimonialAction(id: string): Promise<Result> {
  await requireAdmin();
  await q("delete from testimonials where id = $1", [id]);
  refreshPublic();
  return { ok: true };
}

// ------------------------------------------------------------------ google calendar
export async function listCalendarsAction(): Promise<Result<{ id: string; summary: string; primary: boolean }[]>> {
  await requireAdmin();
  try {
    return { ok: true, data: await listCalendars() };
  } catch (e) {
    return fail(e);
  }
}

export async function selectCalendarAction(id: string): Promise<Result> {
  await requireAdmin();
  try {
    const c = await selectCalendar(id);
    revalidatePath("/admin", "layout");
    return { ok: true, message: `New appointments will be added to “${c.summary}”.` };
  } catch (e) {
    return fail(e);
  }
}

export async function disconnectCalendarAction(): Promise<Result> {
  await requireAdmin();
  await disconnect();
  revalidatePath("/admin", "layout");
  return { ok: true, message: "Google Calendar disconnected" };
}

// ------------------------------------------------------------------ privacy
export async function purgeOldDataAction(): Promise<Result<{ count: number }>> {
  await requireAdmin();
  const rows = await q<{ id: string }>(
    `update appointments set patient_name = 'Anonymised', patient_phone = '+000000000', patient_email = null, notes = null, anonymized_at = now()
      where anonymized_at is null and ends_at < now() - make_interval(months => (select data_retention_months from clinic_settings where id = 1))
      returning id`,
  );
  revalidatePath("/admin", "layout");
  return { ok: true, data: { count: rows.length }, message: `${rows.length} old appointment record(s) anonymised.` };
}
