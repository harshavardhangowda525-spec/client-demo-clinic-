import "server-only";
import { z } from "zod";
import { pgErrorCode, q, q1 } from "./db";
import { fullAddress, getSettings } from "./data";
import { computeSlots, type DaySlots, type Interval } from "./slots";
import { addDays, istDate, istToUtc, isValidDate } from "./time";
import {
  createEvent, deleteEvent, getBusyIntervals, getConnectionRow, GoogleError, isCalendarConnected, notifyAdmin, updateEvent,
} from "./google";
import { emailConfigured, patientEmail, sendEmail } from "./email";
import type { Appointment, AppointmentStatus, ClinicSettings, Service } from "./types";

export class BookingError extends Error {
  constructor(message: string, public code: "SLOT_UNAVAILABLE" | "SLOT_TAKEN" | "INVALID" | "SERVICE" | "LIMIT" | "DISABLED" | "NOT_FOUND") {
    super(message);
  }
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------
export function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/[^\d+]/g, "");
  const only = digits.replace(/\D/g, "");
  if (/^[6-9]\d{9}$/.test(only)) return `+91${only}`;
  if (/^91[6-9]\d{9}$/.test(only)) return `+${only}`;
  if (/^0[6-9]\d{9}$/.test(only)) return `+91${only.slice(1)}`;
  if (digits.startsWith("+") && only.length >= 8 && only.length <= 15) return `+${only}`;
  return null;
}

export const patientSchema = z.object({
  name: z.string().trim().min(2, "Please enter your full name").max(120),
  phone: z.string().trim().transform((v, ctx) => {
    const n = normalizePhone(v);
    if (!n) { ctx.addIssue({ code: "custom", message: "Please enter a valid mobile number" }); return z.NEVER; }
    return n;
  }),
  email: z.union([z.literal(""), z.string().trim().toLowerCase().email("Please enter a valid email").max(200)]).optional()
    .transform((v) => (v ? v : null)),
  notes: z.string().trim().max(500).optional().transform((v) => (v ? v : null)),
});

// ---------------------------------------------------------------------------
// Availability
// ---------------------------------------------------------------------------
type Busy = { appointments: Interval[]; blocks: Interval[]; external: Interval[]; calendar: "ok" | "unavailable" | "not_connected" };

async function loadBusy(from: Date, to: Date, excludeAppointmentId?: string): Promise<Busy> {
  const [appts, blocks] = await Promise.all([
    q<{ s: string; e: string }>(
      `select starts_at as s, blocked_until as e from appointments
        where status in ('pending','confirmed') and resource_key = 'clinic'
          and starts_at < $2 and blocked_until > $1 and ($3::uuid is null or id <> $3::uuid)`,
      [from.toISOString(), to.toISOString(), excludeAppointmentId ?? null],
    ),
    q<{ s: string; e: string }>("select starts_at as s, ends_at as e from blocked_periods where starts_at < $2 and ends_at > $1", [
      from.toISOString(), to.toISOString(),
    ]),
  ]);
  let external: Interval[] = [];
  let calendar: Busy["calendar"] = "not_connected";
  if (await isCalendarConnected()) {
    try {
      external = await getBusyIntervals(from, to);
      calendar = "ok";
    } catch (e) {
      calendar = "unavailable";
      console.error("[availability] Google busy check failed:", (e as Error).message);
    }
  }
  const toI = (r: { s: string; e: string }) => ({ start: Date.parse(r.s), end: Date.parse(r.e) });
  return { appointments: appts.map(toI), blocks: blocks.map(toI), external, calendar };
}

export async function getAvailability(opts: {
  durationMinutes: number; fromDate: string; days: number; admin?: boolean; excludeAppointmentId?: string; settings?: ClinicSettings;
}): Promise<{ days: DaySlots[]; calendar: Busy["calendar"] }> {
  const s = opts.settings ?? (await getSettings());
  const from = istToUtc(opts.fromDate);
  const to = istToUtc(addDays(opts.fromDate, opts.days));
  const busy = await loadBusy(from, to, opts.excludeAppointmentId);
  const days = computeSlots({
    fromDate: opts.fromDate,
    days: opts.days,
    durationMinutes: opts.durationMinutes,
    rules: {
      hours: s.working_hours,
      slotIntervalMinutes: s.slot_interval_minutes,
      bufferMinutes: s.buffer_minutes,
      minNoticeMinutes: s.min_notice_minutes,
      bookingWindowDays: s.booking_window_days,
    },
    now: new Date(),
    appointments: busy.appointments,
    blocks: busy.blocks,
    external: busy.external,
    enforceNotice: !opts.admin,
    enforceWindow: !opts.admin,
  });
  return { days, calendar: busy.calendar };
}

async function assertSlotAvailable(startsAt: Date, durationMinutes: number, settings: ClinicSettings, admin: boolean, excludeId?: string) {
  const date = istDate(startsAt);
  const { days } = await getAvailability({ durationMinutes, fromDate: date, days: 1, admin, excludeAppointmentId: excludeId, settings });
  const ok = days[0]?.slots.some((sl) => Date.parse(sl.start) === startsAt.getTime());
  if (!ok) throw new BookingError("Sorry, that time is no longer available. Please choose another slot.", "SLOT_UNAVAILABLE");
}

// ---------------------------------------------------------------------------
// Create
// ---------------------------------------------------------------------------
const REF_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function newRef() {
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  return "SPY-" + Array.from(bytes, (b) => REF_ALPHABET[b % REF_ALPHABET.length]).join("");
}

export type CreateInput = {
  serviceId: string;
  startsAt: string;
  patient: z.infer<typeof patientSchema>;
  source: "online" | "admin";
  status?: "pending" | "confirmed";
};

export type BookingResult = {
  appointment: Appointment;
  calendarSynced: boolean;
  emailSent: boolean;
};

export async function createAppointment(input: CreateInput): Promise<BookingResult> {
  const settings = await getSettings();
  const admin = input.source === "admin";
  if (!admin && !settings.online_booking_enabled) throw new BookingError("Online booking is temporarily unavailable. Please call the clinic.", "DISABLED");

  const service = await q1<Service>("select * from services where id = $1", [input.serviceId]);
  if (!service || (!admin && (!service.is_published || !service.online_booking))) {
    throw new BookingError("This service is not available for online booking.", "SERVICE");
  }
  const start = new Date(input.startsAt);
  if (Number.isNaN(start.getTime())) throw new BookingError("Invalid appointment time.", "INVALID");

  if (!admin) {
    const [{ n }] = await q<{ n: number }>(
      "select count(*)::int as n from appointments where patient_phone = $1 and status in ('pending','confirmed') and starts_at > now()",
      [input.patient.phone],
    );
    if (n >= 3) throw new BookingError("You already have several upcoming appointments. Please call the clinic to book more.", "LIMIT");
  }

  // 1. Verify availability against hours, blocks, existing bookings and Google busy times.
  await assertSlotAvailable(start, service.duration_minutes, settings, admin);

  const end = new Date(start.getTime() + service.duration_minutes * 60_000);
  const blockedUntil = new Date(end.getTime() + settings.buffer_minutes * 60_000);
  const status: AppointmentStatus = admin ? (input.status ?? "confirmed") : settings.auto_confirm_online ? "confirmed" : "pending";
  const connected = await isCalendarConnected();

  // 2+3. Reserve and store atomically. The exclusion constraint rejects any overlap,
  // so two people submitting the same slot at the same moment cannot both succeed.
  let appt: Appointment | null = null;
  for (let attempt = 0; attempt < 4 && !appt; attempt++) {
    try {
      appt = await q1<Appointment>(
        `insert into appointments (booking_ref, patient_name, patient_phone, patient_email, notes, service_id, service_name,
            starts_at, ends_at, blocked_until, status, source, sync_status, email_status)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) returning *`,
        [
          newRef(), input.patient.name, input.patient.phone, input.patient.email, input.patient.notes, service.id, service.name,
          start.toISOString(), end.toISOString(), blockedUntil.toISOString(), status, input.source,
          connected ? "pending" : "not_connected",
          emailConfigured() ? "not_requested" : "not_configured",
        ],
      );
    } catch (e) {
      const code = pgErrorCode(e);
      if (code === "23P01") throw new BookingError("Sorry, someone has just booked that time. Please choose another slot.", "SLOT_TAKEN");
      if (code === "23505") continue; // booking_ref collision — retry with a new one
      throw e;
    }
  }
  if (!appt) throw new Error("Could not allocate a booking reference");

  // 4+5. Create the Google Calendar event and store its id (or record the failure honestly).
  let calendarSynced = false;
  if (connected) calendarSynced = (await syncAppointment(appt.id)) === "synced";

  // Email confirmation (only reported as sent if the provider accepted it).
  let emailSent = false;
  if (appt.patient_email && settings.send_patient_emails && emailConfigured()) {
    emailSent = await sendPatientMail(appt, settings, "booked");
  }
  await notifyAdminsByEmail(appt, settings);

  const fresh = (await q1<Appointment>("select * from appointments where id = $1", [appt.id]))!;
  return { appointment: fresh, calendarSynced, emailSent };
}

async function sendPatientMail(a: Appointment, s: ClinicSettings, kind: "booked" | "rescheduled" | "cancelled") {
  if (!a.patient_email) return false;
  const m = patientEmail(
    { clinicName: s.clinic_name, clinicPhone: s.phone, address: fullAddress(s), ref: a.booking_ref, patientName: a.patient_name,
      serviceName: a.service_name, startsAt: a.starts_at, status: a.status },
    kind,
  );
  const ok = await sendEmail(a.patient_email, m.subject, m.html, m.text);
  await q("update appointments set email_status = $2 where id = $1", [a.id, ok ? "sent" : "failed"]);
  return ok;
}

async function notifyAdminsByEmail(a: Appointment, s: ClinicSettings) {
  const to = s.notify_admin_emails.split(",").map((x) => x.trim()).filter(Boolean);
  if (!to.length || !emailConfigured() || a.source === "admin") return;
  const site = (process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/$/, "");
  const when = new Date(a.starts_at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "full", timeStyle: "short" });
  await sendEmail(
    to,
    `New booking ${a.booking_ref} – ${a.service_name}`,
    `<p>New ${a.status} appointment <b>${a.booking_ref}</b> for <b>${a.service_name}</b> on ${when}.</p><p><a href="${site}/admin/appointments?q=${a.booking_ref}">Open in dashboard</a></p>`,
    `New ${a.status} appointment ${a.booking_ref} for ${a.service_name} on ${when}. ${site}/admin/appointments?q=${a.booking_ref}`,
  );
}

// ---------------------------------------------------------------------------
// Google Calendar lifecycle sync (create / update / delete) with honest status
// ---------------------------------------------------------------------------
export async function syncAppointment(id: string): Promise<Appointment["sync_status"]> {
  const a = await q1<Appointment>("select * from appointments where id = $1", [id]);
  if (!a) throw new BookingError("Appointment not found", "NOT_FOUND");
  const conn = await getConnectionRow();
  const connected = await isCalendarConnected();
  const active = a.status === "pending" || a.status === "confirmed";
  const terminal = a.status === "completed" || a.status === "no_show";

  if (!connected) {
    const st = a.google_event_id ? "failed" : "not_connected";
    await q("update appointments set sync_status = $2, sync_error = $3 where id = $1", [
      id, st, st === "failed" ? "Google Calendar is not connected — reconnect to sync this change." : null,
    ]);
    return st;
  }
  const settings = await getSettings();
  const calId = a.google_calendar_id ?? conn!.calendar_id!;
  const input = {
    appointmentId: a.id, bookingRef: a.booking_ref, serviceName: a.service_name, startsAt: a.starts_at, endsAt: a.ends_at,
    status: a.status, location: `${settings.clinic_name}, ${fullAddress(settings)}`,
    patientFirstName: settings.calendar_include_patient_name ? a.patient_name.split(" ")[0] : null,
  };

  try {
    let status: Appointment["sync_status"];
    let eventId = a.google_event_id;
    let calendarId: string | null = a.google_calendar_id;
    if (active || terminal) {
      if (eventId) {
        try {
          await updateEvent(calId, eventId, input);
        } catch (e) {
          if (!(e instanceof GoogleError && e.kind === "not_found")) throw e;
          eventId = null; // event was deleted in Google — recreate it
        }
      }
      if (!eventId && active) {
        const ev = await createEvent(conn!.calendar_id!, input);
        eventId = ev.id;
        calendarId = conn!.calendar_id!;
      }
      status = eventId ? "synced" : "removed";
    } else {
      if (eventId) await deleteEvent(calId, eventId);
      status = "removed";
    }
    await q(
      `update appointments set google_event_id = $2, google_calendar_id = $3, sync_status = $4, sync_error = null,
         last_synced_at = now(), updated_at = now() where id = $1`,
      [id, eventId, calendarId, status],
    );
    await q("update admin_notifications set is_read = true where appointment_id = $1 and kind = 'sync_failed'", [id]);
    return status;
  } catch (e) {
    const msg = (e as Error).message.slice(0, 300);
    await q(
      "update appointments set sync_status = 'failed', sync_error = $2, sync_attempts = sync_attempts + 1, updated_at = now() where id = $1",
      [id, msg],
    );
    await notifyAdmin("sync_failed", `Calendar sync failed for ${a.booking_ref}: ${msg}`, id);
    return "failed";
  }
}

export async function retryFailedSyncs(limit = 25) {
  const rows = await q<{ id: string }>(
    `select id from appointments
      where (sync_status in ('failed','pending') or (sync_status = 'not_connected' and status in ('pending','confirmed') and starts_at > now()))
      order by starts_at limit $1`,
    [limit],
  );
  const results = { synced: 0, failed: 0, other: 0 };
  for (const r of rows) {
    const st = await syncAppointment(r.id);
    if (st === "synced" || st === "removed") results.synced++;
    else if (st === "failed") results.failed++;
    else results.other++;
  }
  return { ...results, total: rows.length };
}

// ---------------------------------------------------------------------------
// Admin lifecycle actions
// ---------------------------------------------------------------------------
const TRANSITIONS: Record<AppointmentStatus, AppointmentStatus[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["completed", "cancelled", "no_show"],
  completed: [],
  no_show: [],
  cancelled: [],
};

export async function setStatus(id: string, next: AppointmentStatus, reason?: string) {
  const a = await q1<Appointment>("select * from appointments where id = $1", [id]);
  if (!a) throw new BookingError("Appointment not found", "NOT_FOUND");
  if (!TRANSITIONS[a.status].includes(next)) throw new BookingError(`Cannot change a ${a.status} appointment to ${next}.`, "INVALID");
  await q(
    `update appointments set status = $2, cancelled_at = case when $2 = 'cancelled' then now() else cancelled_at end,
       cancel_reason = case when $2 = 'cancelled' then $3 else cancel_reason end,
       sync_status = case when sync_status = 'not_connected' then sync_status else 'pending' end, updated_at = now()
     where id = $1`,
    [id, next, reason ?? null],
  );
  const sync = await syncAppointment(id);
  const settings = await getSettings();
  const fresh = (await q1<Appointment>("select * from appointments where id = $1", [id]))!;
  if (next === "cancelled" && fresh.patient_email && settings.send_patient_emails) await sendPatientMail(fresh, settings, "cancelled");
  return { appointment: fresh, sync };
}

export async function reschedule(id: string, startsAtIso: string) {
  const a = await q1<Appointment>("select * from appointments where id = $1", [id]);
  if (!a) throw new BookingError("Appointment not found", "NOT_FOUND");
  if (a.status !== "pending" && a.status !== "confirmed") throw new BookingError("Only upcoming appointments can be rescheduled.", "INVALID");
  const settings = await getSettings();
  const duration = Math.round((Date.parse(a.ends_at) - Date.parse(a.starts_at)) / 60_000);
  const start = new Date(startsAtIso);
  await assertSlotAvailable(start, duration, settings, true, id);
  const end = new Date(start.getTime() + duration * 60_000);
  const bu = new Date(end.getTime() + settings.buffer_minutes * 60_000);
  try {
    await q(
      `update appointments set starts_at = $2, ends_at = $3, blocked_until = $4,
         sync_status = case when sync_status = 'not_connected' then sync_status else 'pending' end, updated_at = now() where id = $1`,
      [id, start.toISOString(), end.toISOString(), bu.toISOString()],
    );
  } catch (e) {
    if (pgErrorCode(e) === "23P01") throw new BookingError("That time was just taken. Please choose another slot.", "SLOT_TAKEN");
    throw e;
  }
  const sync = await syncAppointment(id);
  const fresh = (await q1<Appointment>("select * from appointments where id = $1", [id]))!;
  if (fresh.patient_email && settings.send_patient_emails) await sendPatientMail(fresh, settings, "rescheduled");
  return { appointment: fresh, sync };
}

export { isValidDate };
