"use client";
import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, CalendarDays, CircleCheck, Clock, Link2, Loader2, Plus, RefreshCw, Trash2, Unlink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge, Card } from "@/components/ui/misc";
import { Field, Input, Select, Switch, Textarea } from "@/components/ui/field";
import { ImageUpload } from "./image-upload";
import { useToast } from "./toast";
import {
  addBlockAction, changePasswordAction, deleteBlockAction, deletePractitionerAction, deleteTestimonialAction, disconnectCalendarAction,
  listCalendarsAction, purgeOldDataAction, retryAllSyncAction, savePractitionerAction, saveSettingsAction, saveTestimonialAction, selectCalendarAction,
} from "@/app/admin/actions";
import type { BlockedPeriod, ClinicSettings, DayHours, Practitioner, Testimonial, WeeklyHours } from "@/lib/types";
import { cn } from "@/lib/utils";

type Cal = { configured: boolean; status: string; google_email: string | null; calendar_id: string | null; calendar_summary: string | null; last_error: string | null; last_sync_at: string | null; connected_at: string | null; redirectUri: string };

const TABS = [
  ["clinic", "Clinic details"], ["hours", "Hours & booking rules"], ["holidays", "Holidays & blocks"], ["calendar", "Calendar Integration"],
  ["notifications", "Notifications"], ["team", "Team"], ["reviews", "Testimonials"], ["account", "Account & privacy"],
] as const;
const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const fdt = (iso: string) => new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" }).format(new Date(iso));

export function SettingsTabs(p: {
  tab: string; settings: ClinicSettings; blocks: BlockedPeriod[]; team: Practitioner[]; reviews: Testimonial[]; calendar: Cal;
  googleResult: { status: string; message: string | null } | null; emailReady: boolean; adminEmail: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  const [s, setS] = useState<ClinicSettings>(p.settings);
  const tab = TABS.some(([k]) => k === p.tab) ? p.tab : "clinic";
  const set = <K extends keyof ClinicSettings>(k: K, v: ClinicSettings[K]) => setS((x) => ({ ...x, [k]: v }));
  const saveSettings = () => start(async () => {
    const r = await saveSettingsAction(s);
    toast(r.ok ? "ok" : "err", r.ok ? r.message ?? "Saved" : r.error);
    if (r.ok) router.refresh();
  });
  const SaveBar = () => <div className="mt-6 flex justify-end"><Button disabled={pending} onClick={saveSettings}>{pending && <Loader2 className="animate-spin" />} Save changes</Button></div>;

  return (
    <div className="grid gap-6 lg:grid-cols-[13rem_1fr]">
      <nav aria-label="Settings sections" className="flex gap-1 overflow-x-auto pb-1 lg:flex-col">
        {TABS.map(([k, l]) => (
          <Link key={k} href={`/admin/settings?tab=${k}`} aria-current={tab === k ? "page" : undefined}
            className={cn("whitespace-nowrap rounded-xl px-3 py-2 text-sm font-medium", tab === k ? "bg-white text-ink shadow-soft" : "text-ink-2 hover:bg-ink/5")}>{l}</Link>
        ))}
      </nav>
      <div className="min-w-0">
        {tab === "clinic" && (
          <Card className="p-5 sm:p-6">
            <h2 className="font-bold">Clinic details</h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <Field label="Clinic name" htmlFor="cn" className="sm:col-span-2"><Input id="cn" value={s.clinic_name} onChange={(e) => set("clinic_name", e.target.value)} /></Field>
              <Field label="Tagline" htmlFor="tg" className="sm:col-span-2"><Input id="tg" value={s.tagline} onChange={(e) => set("tagline", e.target.value)} /></Field>
              <Field label="Phone" htmlFor="ph"><Input id="ph" value={s.phone} onChange={(e) => set("phone", e.target.value)} /></Field>
              <Field label="Email (optional)" htmlFor="em"><Input id="em" type="email" value={s.email ?? ""} onChange={(e) => set("email", e.target.value)} /></Field>
              <Field label="WhatsApp number" htmlFor="wa"><Input id="wa" value={s.whatsapp_number ?? ""} onChange={(e) => set("whatsapp_number", e.target.value || null)} /></Field>
              <div className="flex items-end"><label className="flex w-full items-center justify-between gap-3 rounded-xl border border-line px-3 py-2.5 text-sm">Show WhatsApp button<Switch label="Show WhatsApp button" checked={s.whatsapp_enabled} onChange={(v) => set("whatsapp_enabled", v)} /></label></div>
              <Field label="Street" htmlFor="ad" className="sm:col-span-2"><Input id="ad" value={s.address_line} onChange={(e) => set("address_line", e.target.value)} /></Field>
              <Field label="Locality" htmlFor="lo"><Input id="lo" value={s.locality} onChange={(e) => set("locality", e.target.value)} /></Field>
              <Field label="City" htmlFor="ci"><Input id="ci" value={s.city} onChange={(e) => set("city", e.target.value)} /></Field>
              <Field label="State" htmlFor="st"><Input id="st" value={s.state} onChange={(e) => set("state", e.target.value)} /></Field>
              <Field label="PIN code" htmlFor="pc"><Input id="pc" value={s.postal_code} onChange={(e) => set("postal_code", e.target.value)} /></Field>
              <Field label="Google Maps search text" htmlFor="mq" hint="Used for the map, directions and structured data" className="sm:col-span-2"><Input id="mq" value={s.maps_query} onChange={(e) => set("maps_query", e.target.value)} /></Field>
              <Field label="Google rating" htmlFor="gr" hint="As shown on your Google listing"><Input id="gr" type="number" step="0.1" min={1} max={5} value={s.google_rating ?? ""} onChange={(e) => set("google_rating", e.target.value ? Number(e.target.value) : null)} /></Field>
              <Field label="Number of Google reviews" htmlFor="gc"><Input id="gc" type="number" min={0} value={s.google_review_count ?? ""} onChange={(e) => set("google_review_count", e.target.value ? Number(e.target.value) : null)} /></Field>
              <Field label="Google reviews link" htmlFor="gu" className="sm:col-span-2"><Input id="gu" value={s.google_reviews_url ?? ""} onChange={(e) => set("google_reviews_url", e.target.value || null)} /></Field>
              <Field label="Clinic story (About section)" htmlFor="as" className="sm:col-span-2"><Textarea id="as" rows={4} value={s.about_story} onChange={(e) => set("about_story", e.target.value)} /></Field>
              <Field label="Approach to rehabilitation" htmlFor="aa" className="sm:col-span-2"><Textarea id="aa" rows={4} value={s.about_approach} onChange={(e) => set("about_approach", e.target.value)} /></Field>
              <div className="sm:col-span-2"><ImageUpload label="Homepage hero photo (optional — replaces the illustration)" value={s.hero_image_id} onChange={(id) => set("hero_image_id", id)} /></div>
            </div>
            <SaveBar />
          </Card>
        )}

        {tab === "hours" && (
          <Card className="p-5 sm:p-6">
            <h2 className="font-bold">Working hours</h2>
            <p className="mt-1 text-sm text-muted">Online booking only offers times inside these hours, outside breaks.</p>
            {!s.hours_confirmed && <p className="mt-3 flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900"><AlertTriangle className="mt-0.5 size-4 shrink-0" />These hours are provisional. Check them, then switch on &ldquo;Hours confirmed&rdquo; to show them on the website.</p>}
            <div className="mt-5 space-y-3">
              {[1, 2, 3, 4, 5, 6, 0].map((d) => (
                <HoursRow key={d} day={DAYS[d]} value={s.working_hours[String(d) as keyof WeeklyHours]}
                  onChange={(v) => set("working_hours", { ...s.working_hours, [String(d)]: v })} />
              ))}
            </div>
            <label className="mt-5 flex items-center justify-between gap-3 rounded-xl border border-line px-4 py-3 text-sm"><span><b>Hours confirmed</b><br /><span className="text-muted">Show these hours publicly and in structured data</span></span><Switch label="Hours confirmed" checked={s.hours_confirmed} onChange={(v) => set("hours_confirmed", v)} /></label>

            <h2 className="mt-8 font-bold">Booking rules</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label="Slot interval (minutes)" htmlFor="si" hint="How often start times are offered"><Input id="si" type="number" min={5} max={240} value={s.slot_interval_minutes} onChange={(e) => set("slot_interval_minutes", Number(e.target.value))} /></Field>
              <Field label="Buffer after each appointment (minutes)" htmlFor="bu"><Input id="bu" type="number" min={0} max={240} value={s.buffer_minutes} onChange={(e) => set("buffer_minutes", Number(e.target.value))} /></Field>
              <Field label="Minimum notice (minutes)" htmlFor="mn" hint="e.g. 120 = no online bookings within 2 hours"><Input id="mn" type="number" min={0} value={s.min_notice_minutes} onChange={(e) => set("min_notice_minutes", Number(e.target.value))} /></Field>
              <Field label="Booking window (days ahead)" htmlFor="bw"><Input id="bw" type="number" min={1} max={365} value={s.booking_window_days} onChange={(e) => set("booking_window_days", Number(e.target.value))} /></Field>
            </div>
            <div className="mt-4 space-y-3">
              <label className="flex items-center justify-between gap-3 rounded-xl border border-line px-4 py-3 text-sm"><span><b>Online booking enabled</b><br /><span className="text-muted">Turn off to pause all online bookings</span></span><Switch label="Online booking enabled" checked={s.online_booking_enabled} onChange={(v) => set("online_booking_enabled", v)} /></label>
              <label className="flex items-center justify-between gap-3 rounded-xl border border-line px-4 py-3 text-sm"><span><b>Auto-confirm online bookings</b><br /><span className="text-muted">Off = online bookings arrive as Pending for you to confirm</span></span><Switch label="Auto-confirm online bookings" checked={s.auto_confirm_online} onChange={(v) => set("auto_confirm_online", v)} /></label>
            </div>
            <SaveBar />
          </Card>
        )}

        {tab === "holidays" && <Blocks blocks={p.blocks} />}
        {tab === "calendar" && <CalendarIntegration cal={p.calendar} result={p.googleResult} includeName={s.calendar_include_patient_name} onIncludeName={(v) => set("calendar_include_patient_name", v)} save={saveSettings} pendingSave={pending} />}

        {tab === "notifications" && (
          <Card className="p-5 sm:p-6">
            <h2 className="font-bold">Booking notifications</h2>
            <div className={cn("mt-4 flex items-start gap-2 rounded-xl px-3 py-2 text-sm", p.emailReady ? "bg-emerald-50 text-emerald-900" : "bg-ink/5 text-ink-2")}>
              {p.emailReady ? <CircleCheck className="mt-0.5 size-4 shrink-0" /> : <AlertTriangle className="mt-0.5 size-4 shrink-0" />}
              {p.emailReady ? "Email provider configured (Resend)." : "Email is not configured. Set RESEND_API_KEY and EMAIL_FROM on the server to send confirmations. Until then no emails are sent, and patients are not told one was."}
            </div>
            <div className="mt-5 space-y-4">
              <label className="flex items-center justify-between gap-3 rounded-xl border border-line px-4 py-3 text-sm"><span><b>Email patients</b><br /><span className="text-muted">Confirmation, reschedule and cancellation emails (when they gave an email)</span></span><Switch label="Email patients" checked={s.send_patient_emails} onChange={(v) => set("send_patient_emails", v)} /></label>
              <Field label="Notify these staff emails about new online bookings" htmlFor="ne" hint="Comma separated"><Input id="ne" value={s.notify_admin_emails} onChange={(e) => set("notify_admin_emails", e.target.value)} placeholder="frontdesk@example.com" /></Field>
            </div>
            <SaveBar />
          </Card>
        )}

        {tab === "team" && <Team team={p.team} />}
        {tab === "reviews" && <Reviews items={p.reviews} />}
        {tab === "account" && <Account email={p.adminEmail} retention={s.data_retention_months} onRetention={(v) => set("data_retention_months", v)} saveRetention={saveSettings} />}
      </div>
    </div>
  );
}

function HoursRow({ day, value, onChange }: { day: string; value: DayHours; onChange: (v: DayHours) => void }) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-line p-3 sm:flex-row sm:items-start">
      <label className="flex w-36 items-center gap-3 pt-2 text-sm font-semibold"><Switch label={`${day} open`} checked={!!value} onChange={(v) => onChange(v ? { open: "09:00", close: "19:00", breaks: [] } : null)} />{day}</label>
      {value ? (
        <div className="flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <Input type="time" aria-label={`${day} opens`} value={value.open} onChange={(e) => onChange({ ...value, open: e.target.value })} className="h-9 w-32" />
            <span className="text-muted">to</span>
            <Input type="time" aria-label={`${day} closes`} value={value.close} onChange={(e) => onChange({ ...value, close: e.target.value })} className="h-9 w-32" />
            <Button type="button" size="sm" variant="ghost" onClick={() => onChange({ ...value, breaks: [...value.breaks, { start: "13:00", end: "14:00" }] })}><Plus /> Break</Button>
          </div>
          {value.breaks.map((b, i) => (
            <div key={i} className="flex flex-wrap items-center gap-2 pl-1 text-sm text-muted">
              <Clock className="size-3.5" /> Break
              <Input type="time" aria-label="Break start" value={b.start} onChange={(e) => onChange({ ...value, breaks: value.breaks.map((x, k) => (k === i ? { ...x, start: e.target.value } : x)) })} className="h-8 w-28" />
              –
              <Input type="time" aria-label="Break end" value={b.end} onChange={(e) => onChange({ ...value, breaks: value.breaks.map((x, k) => (k === i ? { ...x, end: e.target.value } : x)) })} className="h-8 w-28" />
              <button type="button" aria-label="Remove break" className="text-muted hover:text-red-600" onClick={() => onChange({ ...value, breaks: value.breaks.filter((_, k) => k !== i) })}><Trash2 className="size-4" /></button>
            </div>
          ))}
        </div>
      ) : <p className="pt-2 text-sm text-muted">Closed</p>}
    </div>
  );
}

function Blocks({ blocks }: { blocks: BlockedPeriod[] }) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  const today = new Date(Date.now() + 330 * 60000).toISOString().slice(0, 10);
  const [f, setF] = useState({ startDate: today, endDate: today, startTime: "", endTime: "", reason: "", kind: "holiday" as "holiday" | "block", partial: false });
  return (
    <Card className="p-5 sm:p-6">
      <h2 className="font-bold">Holidays &amp; blocked periods</h2>
      <p className="mt-1 text-sm text-muted">No online bookings are offered during these times.</p>
      <div className="mt-5 grid gap-3 rounded-xl border border-line p-4 sm:grid-cols-2">
        <Field label="Type" htmlFor="bk"><Select id="bk" value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value as "holiday" | "block" })}><option value="holiday">Holiday / closure</option><option value="block">Blocked time</option></Select></Field>
        <Field label="Reason" htmlFor="br"><Input id="br" value={f.reason} onChange={(e) => setF({ ...f, reason: e.target.value })} placeholder="e.g. Diwali" /></Field>
        <Field label="From date" htmlFor="bs"><Input id="bs" type="date" value={f.startDate} onChange={(e) => setF({ ...f, startDate: e.target.value, endDate: e.target.value > f.endDate ? e.target.value : f.endDate })} /></Field>
        <Field label="To date" htmlFor="be"><Input id="be" type="date" value={f.endDate} min={f.startDate} onChange={(e) => setF({ ...f, endDate: e.target.value })} /></Field>
        <label className="flex items-center gap-3 text-sm sm:col-span-2"><Switch label="Specific hours only" checked={f.partial} onChange={(v) => setF({ ...f, partial: v })} /> Specific hours only</label>
        {f.partial && <>
          <Field label="Start time" htmlFor="bst"><Input id="bst" type="time" value={f.startTime} onChange={(e) => setF({ ...f, startTime: e.target.value })} /></Field>
          <Field label="End time" htmlFor="bet"><Input id="bet" type="time" value={f.endTime} onChange={(e) => setF({ ...f, endTime: e.target.value })} /></Field>
        </>}
        <div className="sm:col-span-2"><Button disabled={pending} onClick={() => start(async () => {
          const r = await addBlockAction({ ...f, startTime: f.partial ? f.startTime : undefined, endTime: f.partial ? f.endTime : undefined });
          toast(r.ok ? "ok" : "err", r.ok ? r.message! : r.error); if (r.ok) router.refresh();
        })}><Plus /> Add</Button></div>
      </div>
      <ul className="mt-5 divide-y divide-line">
        {blocks.map((b) => (
          <li key={b.id} className="flex items-center justify-between gap-3 py-3 text-sm">
            <div><p className="font-semibold">{b.reason || (b.kind === "holiday" ? "Holiday" : "Blocked")} <Badge tone={b.kind === "holiday" ? "blue" : "gray"}>{b.kind}</Badge></p><p className="text-muted">{fdt(b.starts_at)} → {fdt(b.ends_at)}</p></div>
            <Button size="sm" variant="ghost" className="text-red-700" disabled={pending} onClick={() => start(async () => { await deleteBlockAction(b.id); router.refresh(); })}><Trash2 /></Button>
          </li>
        ))}
        {!blocks.length && <li className="py-6 text-center text-sm text-muted">No upcoming holidays or blocks.</li>}
      </ul>
    </Card>
  );
}

function CalendarIntegration({ cal, result, includeName, onIncludeName, save, pendingSave }: {
  cal: Cal; result: { status: string; message: string | null } | null; includeName: boolean; onIncludeName: (v: boolean) => void; save: () => void; pendingSave: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  const [cals, setCals] = useState<{ id: string; summary: string; primary: boolean }[] | null>(null);
  const connected = cal.configured && cal.status === "connected";
  const load = () => start(async () => { const r = await listCalendarsAction(); if (r.ok) setCals(r.data!); else toast("err", r.error); });

  return (
    <div className="space-y-5">
      {result?.status === "connected" && <div className="flex items-start gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-900"><CircleCheck className="mt-0.5 size-4" /> Google Calendar connected. Upcoming appointments are being added to your calendar.</div>}
      {result?.status === "error" && <div className="flex items-start gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800"><AlertTriangle className="mt-0.5 size-4" /> Connection failed: {result.message}</div>}
      {result?.status === "not_configured" && <div className="flex items-start gap-2 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900"><AlertTriangle className="mt-0.5 size-4" /> Google OAuth credentials are not set on the server yet (see setup steps below).</div>}

      <Card className="p-5 sm:p-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div className="flex items-start gap-4">
            <span className="inline-flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-50 to-lavender-100"><CalendarDays className="size-6 text-teal-700" /></span>
            <div>
              <h2 className="font-bold">Google Calendar</h2>
              <div className="mt-1">
                {connected ? <Badge tone="green"><span className="size-1.5 rounded-full bg-emerald-500" /> Connected</Badge>
                  : cal.status === "error" ? <Badge tone="red">Needs reconnection</Badge>
                  : <Badge>Not Connected</Badge>}
              </div>
              {cal.google_email && <p className="mt-2 text-sm">Account: <b>{cal.google_email}</b></p>}
              {cal.calendar_summary && <p className="text-sm">Calendar: <b>{cal.calendar_summary}</b></p>}
              {cal.last_sync_at && <p className="text-xs text-muted">Last busy-time check: {fdt(cal.last_sync_at)}</p>}
              {cal.last_error && <p className="mt-1 text-xs text-red-700">{cal.last_error}</p>}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {cal.configured ? (
              <form action="/api/admin/google/connect" method="get" className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                <Input name="login_hint" type="email" aria-label="Clinic Google account email" placeholder="clinic@gmail.com"
                  defaultValue={cal.google_email ?? ""} className="h-11 sm:w-64" />
                <Button type="submit" variant={connected ? "outline" : "primary"}><Link2 /> {connected || cal.status === "error" ? "Reconnect" : "Connect Google Calendar"}</Button>
              </form>
            ) : (
              <Button disabled title="Server credentials missing"><Link2 /> Connect Google Calendar</Button>
            )}
            {(connected || cal.status === "error") && (
              <Button variant="ghost" className="text-red-700" disabled={pending} onClick={() => confirm("Disconnect Google Calendar? Existing events stay in Google, but new bookings won't be synced.") && start(async () => { const r = await disconnectCalendarAction(); toast(r.ok ? "ok" : "err", r.ok ? r.message! : r.error); router.refresh(); })}><Unlink /> Disconnect</Button>
            )}
          </div>
        </div>

        {connected && (
          <div className="mt-6 space-y-4 border-t border-line pt-5">
            <div>
              <p className="text-sm font-semibold">Calendar used for appointments</p>
              {cals ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  <Select aria-label="Calendar" defaultValue={cal.calendar_id ?? ""} onChange={(e) => start(async () => { const r = await selectCalendarAction(e.target.value); toast(r.ok ? "ok" : "err", r.ok ? r.message! : r.error); router.refresh(); })} className="max-w-sm">
                    {cals.map((c) => <option key={c.id} value={c.id}>{c.summary}{c.primary ? " (primary)" : ""}</option>)}
                  </Select>
                </div>
              ) : <Button size="sm" variant="outline" className="mt-2" disabled={pending} onClick={load}>{pending ? <Loader2 className="animate-spin" /> : null} Choose a different calendar</Button>}
            </div>
            <label className="flex items-center justify-between gap-3 rounded-xl border border-line px-4 py-3 text-sm">
              <span><b>Include patient first name in event title</b><br /><span className="text-muted">Off by default. Events otherwise contain only the service, time and booking reference.</span></span>
              <Switch label="Include patient first name" checked={includeName} onChange={onIncludeName} />
            </label>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" disabled={pendingSave} onClick={save}>Save calendar options</Button>
              <Button size="sm" variant="outline" disabled={pending} onClick={() => start(async () => { const r = await retryAllSyncAction(); toast(r.ok && !r.data!.failed ? "ok" : "err", r.ok ? `Checked ${r.data!.total}: ${r.data!.synced} synced, ${r.data!.failed} failed` : r.error); router.refresh(); })}><RefreshCw /> Sync upcoming &amp; failed appointments</Button>
            </div>
          </div>
        )}
      </Card>

      <Card className="p-5 sm:p-6 text-sm leading-relaxed">
        <h3 className="font-bold">How it works</h3>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-ink-2">
          <li>Each confirmed or pending booking creates an event in the selected calendar; reschedules update it and cancellations remove it.</li>
          <li>Busy events in that calendar block online booking times. Events marked &ldquo;Free&rdquo; are ignored.</li>
          <li>If Google is unreachable, the booking is still saved and protected against double-booking, marked &ldquo;Sync failed&rdquo;, and can be retried here or from the appointment.</li>
          <li>Permissions requested: manage calendar events and see your calendar list. Your Google password is never seen or stored; tokens are encrypted on the server.</li>
        </ul>
        <h3 className="mt-5 font-bold">One-time server setup</h3>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-ink-2">
          <li>In Google Cloud Console, enable the <b>Google Calendar API</b> and configure the OAuth consent screen.</li>
          <li>Create an OAuth client ID (type: Web application) with this authorised redirect URI:<br /><code className="mt-1 inline-block break-all rounded bg-cream px-2 py-1 text-xs">{cal.redirectUri}</code></li>
          <li>Set <code>GOOGLE_CLIENT_ID</code> and <code>GOOGLE_CLIENT_SECRET</code> in the hosting environment and redeploy.</li>
          <li>Return here, enter the clinic&apos;s Google account email and click <b>Connect Google Calendar</b>. Google opens with that account selected; the clinic signs in and clicks <b>Allow</b>.</li>
        </ol>
        <p className="mt-3 text-xs text-muted">Server credentials: {cal.configured ? "present" : "not configured"}.</p>
      </Card>
    </div>
  );
}

function Team({ team }: { team: Practitioner[] }) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  const [edit, setEdit] = useState<Partial<Practitioner> | null>(null);
  const save = () => start(async () => {
    const r = await savePractitionerAction({ title: "", credentials: "", bio: "", photo_id: null, is_public: false, sort_order: 0, ...edit });
    toast(r.ok ? "ok" : "err", r.ok ? r.message! : r.error); if (r.ok) { setEdit(null); router.refresh(); }
  });
  return (
    <Card className="p-5 sm:p-6">
      <div className="flex items-center justify-between"><h2 className="font-bold">Team</h2><Button size="sm" onClick={() => setEdit({ name: "", is_public: false })}><Plus /> Add</Button></div>
      <p className="mt-1 text-sm text-muted">Add only verified names, qualifications and photos.</p>
      <ul className="mt-4 divide-y divide-line">
        {team.map((m) => (
          <li key={m.id} className="flex items-center justify-between gap-3 py-3">
            <div><p className="font-semibold">{m.name} {m.is_public ? <Badge tone="green">Shown</Badge> : <Badge>Hidden</Badge>}</p><p className="text-sm text-muted">{[m.title, m.credentials].filter(Boolean).join(" · ") || "No title or credentials added"}</p></div>
            <div className="flex gap-1"><Button size="sm" variant="outline" onClick={() => setEdit(m)}>Edit</Button><Button size="sm" variant="ghost" className="text-red-700" onClick={() => confirm("Remove?") && start(async () => { await deletePractitionerAction(m.id); router.refresh(); })}><Trash2 /></Button></div>
          </li>
        ))}
      </ul>
      {edit && (
        <div className="mt-4 grid gap-3 rounded-xl border border-line p-4 sm:grid-cols-2">
          <Field label="Name" htmlFor="tn"><Input id="tn" value={edit.name ?? ""} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></Field>
          <Field label="Title / role" htmlFor="tt"><Input id="tt" value={edit.title ?? ""} onChange={(e) => setEdit({ ...edit, title: e.target.value })} /></Field>
          <Field label="Verified qualifications" htmlFor="tc" className="sm:col-span-2"><Input id="tc" value={edit.credentials ?? ""} onChange={(e) => setEdit({ ...edit, credentials: e.target.value })} /></Field>
          <Field label="Short bio" htmlFor="tb" className="sm:col-span-2"><Textarea id="tb" rows={3} value={edit.bio ?? ""} onChange={(e) => setEdit({ ...edit, bio: e.target.value })} /></Field>
          <ImageUpload label="Photo" value={edit.photo_id ?? null} onChange={(id) => setEdit({ ...edit, photo_id: id })} />
          <label className="flex items-center gap-3 text-sm"><Switch label="Show on website" checked={!!edit.is_public} onChange={(v) => setEdit({ ...edit, is_public: v })} /> Show on website</label>
          <div className="flex gap-2 sm:col-span-2"><Button disabled={pending} onClick={save}>Save</Button><Button variant="ghost" onClick={() => setEdit(null)}>Cancel</Button></div>
        </div>
      )}
    </Card>
  );
}

function Reviews({ items }: { items: Testimonial[] }) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  const [edit, setEdit] = useState<Partial<Testimonial> | null>(null);
  const save = () => start(async () => {
    const r = await saveTestimonialAction({ rating: null, source_url: null, is_verbatim: true, is_approved: false, sort_order: 0, ...edit });
    toast(r.ok ? "ok" : "err", r.ok ? r.message! : r.error); if (r.ok) { setEdit(null); router.refresh(); }
  });
  return (
    <Card className="p-5 sm:p-6">
      <div className="flex items-center justify-between"><h2 className="font-bold">Testimonials</h2><Button size="sm" onClick={() => setEdit({ author_label: "", content: "", is_verbatim: true, is_approved: false })}><Plus /> Add</Button></div>
      <p className="mt-1 text-sm text-muted">Only publish feedback you have permission to share. Mark summaries as &ldquo;not verbatim&rdquo; so they are never shown as quotes.</p>
      <ul className="mt-4 divide-y divide-line">
        {items.map((t) => (
          <li key={t.id} className="flex items-start justify-between gap-3 py-3">
            <div className="min-w-0"><p className="text-sm">{t.is_verbatim ? `“${t.content}”` : t.content}</p><p className="mt-1 flex flex-wrap gap-2 text-xs text-muted">{t.author_label} {t.is_approved ? <Badge tone="green">Approved</Badge> : <Badge>Not shown</Badge>} {!t.is_verbatim && <Badge tone="blue">Summary</Badge>}</p></div>
            <div className="flex shrink-0 gap-1"><Button size="sm" variant="outline" onClick={() => setEdit(t)}>Edit</Button><Button size="sm" variant="ghost" className="text-red-700" onClick={() => confirm("Delete?") && start(async () => { await deleteTestimonialAction(t.id); router.refresh(); })}><Trash2 /></Button></div>
          </li>
        ))}
      </ul>
      {edit && (
        <div className="mt-4 grid gap-3 rounded-xl border border-line p-4 sm:grid-cols-2">
          <Field label="Content" htmlFor="rc" className="sm:col-span-2"><Textarea id="rc" rows={3} value={edit.content ?? ""} onChange={(e) => setEdit({ ...edit, content: e.target.value })} /></Field>
          <Field label="Attribution" htmlFor="ra" hint="e.g. first name with consent, or 'Google reviewer'"><Input id="ra" value={edit.author_label ?? ""} onChange={(e) => setEdit({ ...edit, author_label: e.target.value })} /></Field>
          <Field label="Rating (optional)" htmlFor="rr"><Select id="rr" value={edit.rating ?? ""} onChange={(e) => setEdit({ ...edit, rating: e.target.value ? Number(e.target.value) : null })}><option value="">None</option>{[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} stars</option>)}</Select></Field>
          <Field label="Source link (optional)" htmlFor="ru" className="sm:col-span-2"><Input id="ru" value={edit.source_url ?? ""} onChange={(e) => setEdit({ ...edit, source_url: e.target.value })} /></Field>
          <label className="flex items-center gap-3 text-sm"><Switch label="Verbatim quote" checked={!!edit.is_verbatim} onChange={(v) => setEdit({ ...edit, is_verbatim: v })} /> Exact words of the patient</label>
          <label className="flex items-center gap-3 text-sm"><Switch label="Approved for publication" checked={!!edit.is_approved} onChange={(v) => setEdit({ ...edit, is_approved: v })} /> Approved for publication</label>
          <div className="flex gap-2 sm:col-span-2"><Button disabled={pending} onClick={save}>Save</Button><Button variant="ghost" onClick={() => setEdit(null)}>Cancel</Button></div>
        </div>
      )}
    </Card>
  );
}

function Account({ email, retention, onRetention, saveRetention }: { email: string; retention: number; onRetention: (v: number) => void; saveRetention: () => void }) {
  const toast = useToast();
  const [pending, start] = useTransition();
  const [pw, setPw] = useState({ current: "", next: "" });
  return (
    <div className="space-y-5">
      <Card className="p-5 sm:p-6">
        <h2 className="font-bold">Change password</h2>
        <p className="mt-1 text-sm text-muted">Signed in as {email}</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Field label="Current password" htmlFor="cp"><Input id="cp" type="password" autoComplete="current-password" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} /></Field>
          <Field label="New password (10+ characters)" htmlFor="np"><Input id="np" type="password" autoComplete="new-password" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} /></Field>
        </div>
        <Button className="mt-4" disabled={pending} onClick={() => start(async () => { const r = await changePasswordAction(pw.current, pw.next); toast(r.ok ? "ok" : "err", r.ok ? r.message! : r.error); if (r.ok) setPw({ current: "", next: "" }); })}>Update password</Button>
      </Card>
      <Card className="p-5 sm:p-6">
        <h2 className="font-bold">Data retention</h2>
        <p className="mt-1 text-sm text-muted">Patient contact details on past appointments are anonymised after this period (runs daily, or on demand). Counts and analytics are kept.</p>
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <Field label="Keep patient details for (months)" htmlFor="ret"><Input id="ret" type="number" min={3} max={120} value={retention} onChange={(e) => onRetention(Number(e.target.value))} className="w-40" /></Field>
          <Button variant="outline" onClick={saveRetention}>Save</Button>
          <Button variant="ghost" disabled={pending} onClick={() => confirm("Anonymise all appointments older than the retention period now?") && start(async () => { const r = await purgeOldDataAction(); toast(r.ok ? "ok" : "err", r.ok ? r.message! : r.error); })}>Run now</Button>
        </div>
      </Card>
    </div>
  );
}
