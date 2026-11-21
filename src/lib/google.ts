import "server-only";
import { q, q1 } from "./db";
import { decrypt, encrypt } from "./crypto";
import type { Interval } from "./slots";
import { CLINIC_TZ, istToUtc } from "./time";

const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const REVOKE_URL = "https://oauth2.googleapis.com/revoke";
const API = "https://www.googleapis.com/calendar/v3";

/** Least-privilege scopes: manage events, list calendars (to pick one), and know which account is connected. */
export const GOOGLE_SCOPES = [
  "openid",
  "email",
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/calendar.calendarlist.readonly",
];

export class GoogleError extends Error {
  constructor(message: string, public status?: number, public kind: "auth" | "retryable" | "fatal" | "not_found" = "fatal") {
    super(message);
  }
}

export function googleConfigured() {
  return !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.TOKEN_ENCRYPTION_KEY);
}

export function redirectUri() {
  const base = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
  return `${base}/api/admin/google/callback`;
}

export function buildAuthUrl(state: string) {
  const p = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: redirectUri(),
    response_type: "code",
    scope: GOOGLE_SCOPES.join(" "),
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    state,
  });
  return `${AUTH_URL}?${p}`;
}

type ConnRow = {
  status: "connected" | "disconnected" | "error";
  google_email: string | null;
  calendar_id: string | null;
  calendar_summary: string | null;
  refresh_token_enc: string | null;
  access_token_enc: string | null;
  access_token_expires_at: string | null;
  last_error: string | null;
  last_sync_at: string | null;
  connected_at: string | null;
};

export async function getConnectionRow() {
  return q1<ConnRow>("select * from calendar_connections where id = 1");
}

/** Public-safe view of the connection (never includes tokens). */
export async function getConnectionStatus() {
  const c = await getConnectionRow();
  return {
    configured: googleConfigured(),
    status: c?.status ?? "disconnected",
    google_email: c?.google_email ?? null,
    calendar_id: c?.calendar_id ?? null,
    calendar_summary: c?.calendar_summary ?? null,
    last_error: c?.last_error ?? null,
    last_sync_at: c?.last_sync_at ?? null,
    connected_at: c?.connected_at ?? null,
  };
}

export async function isCalendarConnected() {
  const c = await getConnectionRow();
  return googleConfigured() && c?.status === "connected" && !!c.refresh_token_enc && !!c.calendar_id;
}

async function notify(kind: string, message: string, appointmentId: string | null = null) {
  await q(
    `insert into admin_notifications (kind, message, appointment_id)
     select $1, $2, $3 where not exists (
       select 1 from admin_notifications where kind = $1 and not is_read
         and appointment_id is not distinct from $3 and created_at > now() - interval '6 hours')`,
    [kind, message, appointmentId],
  );
}
export { notify as notifyAdmin };

async function markConnectionError(msg: string) {
  await q("update calendar_connections set status = 'error', last_error = $1, updated_at = now() where id = 1", [msg]);
  await notify("calendar_auth", `Google Calendar needs to be reconnected: ${msg}`);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function tokenRequest(body: Record<string, string>) {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      ...body,
    }),
    cache: "no-store",
  });
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    const err = String(json.error ?? res.status);
    throw new GoogleError(
      err === "invalid_grant" ? "Access was revoked or has expired" : `Token request failed (${err})`,
      res.status,
      err === "invalid_grant" ? "auth" : res.status >= 500 ? "retryable" : "fatal",
    );
  }
  return json as { access_token: string; expires_in: number; refresh_token?: string; scope?: string; id_token?: string };
}

export async function exchangeCode(code: string) {
  const t = await tokenRequest({ code, grant_type: "authorization_code", redirect_uri: redirectUri() });
  if (!t.refresh_token) throw new GoogleError("Google did not return a refresh token. Remove the app's access in your Google Account and try again.");
  let email: string | null = null;
  if (t.id_token) {
    try {
      const payload = JSON.parse(Buffer.from(t.id_token.split(".")[1], "base64url").toString("utf8"));
      email = payload.email ?? null;
    } catch { /* ignore */ }
  }
  await q(
    `update calendar_connections set status = 'connected', google_email = $1, refresh_token_enc = $2,
       access_token_enc = $3, access_token_expires_at = now() + make_interval(secs => $4), scopes = $5,
       calendar_id = coalesce(calendar_id, 'primary'), calendar_summary = coalesce(calendar_summary, 'Primary calendar'),
       last_error = null, connected_at = now(), updated_at = now() where id = 1`,
    [email, encrypt(t.refresh_token), encrypt(t.access_token), t.expires_in - 60, t.scope ?? GOOGLE_SCOPES.join(" ")],
  );
  await q("update admin_notifications set is_read = true where kind = 'calendar_auth'");
}

async function accessToken(force = false): Promise<string> {
  if (!googleConfigured()) throw new GoogleError("Google OAuth credentials are not configured", undefined, "auth");
  const c = await getConnectionRow();
  if (!c?.refresh_token_enc || c.status === "disconnected") throw new GoogleError("Google Calendar is not connected", undefined, "auth");
  if (!force && c.access_token_enc && c.access_token_expires_at && new Date(c.access_token_expires_at).getTime() > Date.now() + 30_000) {
    return decrypt(c.access_token_enc);
  }
  try {
    const t = await tokenRequest({ refresh_token: decrypt(c.refresh_token_enc), grant_type: "refresh_token" });
    await q(
      `update calendar_connections set access_token_enc = $1, access_token_expires_at = now() + make_interval(secs => $2),
         status = 'connected', last_error = null, updated_at = now() where id = 1`,
      [encrypt(t.access_token), t.expires_in - 60],
    );
    return t.access_token;
  } catch (e) {
    if (e instanceof GoogleError && e.kind === "auth") await markConnectionError(e.message);
    throw e;
  }
}

/** Calendar API request with token refresh, and exponential backoff for 429 / 5xx. */
async function gapi<T>(path: string, init: RequestInit & { query?: Record<string, string> } = {}): Promise<T> {
  const url = new URL(API + path);
  for (const [k, v] of Object.entries(init.query ?? {})) url.searchParams.set(k, v);
  let refreshed = false;
  for (let attempt = 0; ; attempt++) {
    const token = await accessToken(refreshed);
    const res = await fetch(url, {
      ...init,
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...(init.headers ?? {}) },
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    }).catch((e) => {
      throw new GoogleError(`Network error contacting Google: ${e?.message ?? e}`, undefined, "retryable");
    });
    if (res.status === 204) return undefined as T;
    if (res.ok) return (await res.json()) as T;
    const body = await res.text();
    if (res.status === 401 && !refreshed) { refreshed = true; continue; }
    const rateLimited = res.status === 429 || (res.status === 403 && /rateLimitExceeded|userRateLimitExceeded/.test(body));
    if ((rateLimited || res.status >= 500) && attempt < 3) {
      await sleep(400 * 2 ** attempt + Math.random() * 200);
      continue;
    }
    if (res.status === 404 || res.status === 410) throw new GoogleError("Event not found", res.status, "not_found");
    if (res.status === 401 || res.status === 403) {
      const msg = `Google denied the request (${res.status})`;
      if (res.status === 401) await markConnectionError(msg);
      throw new GoogleError(msg, res.status, "auth");
    }
    throw new GoogleError(`Google Calendar error ${res.status}: ${body.slice(0, 200)}`, res.status, rateLimited || res.status >= 500 ? "retryable" : "fatal");
  }
}

export async function listCalendars() {
  const r = await gapi<{ items: { id: string; summary: string; primary?: boolean; accessRole: string; timeZone?: string }[] }>(
    "/users/me/calendarList",
    { query: { minAccessRole: "writer", maxResults: "100" } },
  );
  return r.items.map((c) => ({ id: c.id, summary: c.summary, primary: !!c.primary, timeZone: c.timeZone ?? null }));
}

export async function selectCalendar(id: string) {
  const cals = await listCalendars();
  const cal = cals.find((c) => c.id === id);
  if (!cal) throw new GoogleError("That calendar is not available or not writable for the connected account.");
  await q("update calendar_connections set calendar_id = $1, calendar_summary = $2, updated_at = now() where id = 1", [cal.id, cal.summary]);
  return cal;
}

export async function disconnect() {
  const c = await getConnectionRow();
  if (c?.refresh_token_enc) {
    try {
      await fetch(`${REVOKE_URL}?token=${encodeURIComponent(decrypt(c.refresh_token_enc))}`, { method: "POST" });
    } catch { /* best effort */ }
  }
  await q(
    `update calendar_connections set status = 'disconnected', google_email = null, calendar_id = null, calendar_summary = null,
       refresh_token_enc = null, access_token_enc = null, access_token_expires_at = null, scopes = null,
       last_error = null, connected_at = null, updated_at = now() where id = 1`,
  );
}

type GEvent = {
  id: string;
  status?: string;
  transparency?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
  extendedProperties?: { private?: Record<string, string> };
};

/**
 * Busy periods in the connected calendar between two instants.
 * Events created by this system are skipped (the database is their source of truth),
 * as are cancelled events and events marked "Free".
 */
export async function getBusyIntervals(from: Date, to: Date): Promise<Interval[]> {
  const c = await getConnectionRow();
  if (!c?.calendar_id) return [];
  const out: Interval[] = [];
  let pageToken: string | undefined;
  do {
    const r = await gapi<{ items: GEvent[]; nextPageToken?: string }>(`/calendars/${encodeURIComponent(c.calendar_id)}/events`, {
      query: {
        timeMin: from.toISOString(),
        timeMax: to.toISOString(),
        singleEvents: "true",
        maxResults: "250",
        showDeleted: "false",
        ...(pageToken ? { pageToken } : {}),
      },
    });
    for (const e of r.items ?? []) {
      if (e.status === "cancelled" || e.transparency === "transparent") continue;
      if (e.extendedProperties?.private?.spynus_appointment_id) continue;
      let s: number, en: number;
      if (e.start?.dateTime && e.end?.dateTime) {
        s = Date.parse(e.start.dateTime); en = Date.parse(e.end.dateTime);
      } else if (e.start?.date && e.end?.date) {
        s = istToUtc(e.start.date).getTime(); en = istToUtc(e.end.date).getTime();
      } else continue;
      out.push({ start: s, end: en });
    }
    pageToken = r.nextPageToken;
  } while (pageToken);
  await q("update calendar_connections set last_sync_at = now() where id = 1");
  return out;
}

export type EventInput = {
  appointmentId: string;
  bookingRef: string;
  serviceName: string;
  startsAt: string;
  endsAt: string;
  status: string;
  patientFirstName?: string | null;
  location: string;
};

function eventBody(e: EventInput) {
  const prefix = e.status === "pending" ? "[Pending] " : e.status === "completed" ? "[Completed] " : "";
  const site = (process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/$/, "");
  return {
    summary: `${prefix}SPYNUS Appointment – ${e.serviceName}${e.patientFirstName ? ` (${e.patientFirstName})` : ""}`,
    location: e.location,
    description: [`Booking reference: ${e.bookingRef}`, site ? `Manage: ${site}/admin/appointments?q=${e.bookingRef}` : ""].filter(Boolean).join("\n"),
    start: { dateTime: e.startsAt, timeZone: CLINIC_TZ },
    end: { dateTime: e.endsAt, timeZone: CLINIC_TZ },
    extendedProperties: { private: { spynus_appointment_id: e.appointmentId, spynus_ref: e.bookingRef } },
  };
}

export async function createEvent(calendarId: string, e: EventInput) {
  return gapi<{ id: string }>(`/calendars/${encodeURIComponent(calendarId)}/events`, { method: "POST", body: JSON.stringify(eventBody(e)) });
}

export async function updateEvent(calendarId: string, eventId: string, e: EventInput) {
  return gapi<{ id: string }>(`/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`, {
    method: "PATCH",
    body: JSON.stringify(eventBody(e)),
  });
}

export async function deleteEvent(calendarId: string, eventId: string) {
  try {
    await gapi(`/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`, { method: "DELETE" });
  } catch (err) {
    if (err instanceof GoogleError && err.kind === "not_found") return; // already gone
    throw err;
  }
}
