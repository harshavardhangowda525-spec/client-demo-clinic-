"use client";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Ban, CalendarClock, Check, CircleCheck, Copy, Loader2, Mail, Phone, RefreshCw, UserX } from "lucide-react";
import { Sheet } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/field";
import { StatusBadge, SyncBadge } from "./status";
import { useToast } from "./toast";
import { adminSlotsAction, appointmentAction } from "@/app/admin/actions";
import type { Appointment, AppointmentStatus } from "@/lib/types";
import { cn, formatPhoneDisplay } from "@/lib/utils";

const TZ = "Asia/Kolkata";
const f = (iso: string, o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("en-IN", { timeZone: TZ, ...o }).format(new Date(iso));
export const fmtWhen = (iso: string) => f(iso, { weekday: "short", day: "numeric", month: "short", year: "numeric" });
export const fmtT = (iso: string) => f(iso, { hour: "numeric", minute: "2-digit", hour12: true });
const istDate = (iso: string) => new Date(new Date(iso).getTime() + 330 * 60000).toISOString().slice(0, 10);

const SYNC_MSG: Record<string, string> = {
  synced: "Google Calendar updated.",
  removed: "Removed from Google Calendar.",
  failed: "Saved, but the Google Calendar update failed. You can retry from the appointment.",
  not_connected: "Saved. Google Calendar is not connected, so no calendar event was changed.",
};

export function AppointmentDrawer({ a, onClose }: { a: Appointment | null; onClose: () => void }) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  const [mode, setMode] = useState<"view" | "reschedule" | "cancel">("view");
  const [date, setDate] = useState("");
  const [slots, setSlots] = useState<{ start: string; time: string }[] | null>(null);
  const [slot, setSlot] = useState<string | null>(null);
  const [reason, setReason] = useState("");

  useEffect(() => { setMode("view"); setSlots(null); setSlot(null); setReason(""); if (a) setDate(istDate(a.starts_at)); }, [a?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (mode !== "reschedule" || !a || !date) return;
    setSlots(null); setSlot(null);
    adminSlotsAction(a.service_id ?? "", date, a.id).then((r) => setSlots(r.ok ? r.data!.slots : []));
  }, [mode, date, a]);

  if (!a) return <Sheet open={false} onOpenChange={() => {}} title="">{null}</Sheet>;

  const run = (action: AppointmentStatus | "reschedule" | "sync", payload?: { startsAt?: string; reason?: string }) =>
    start(async () => {
      const r = await appointmentAction(a.id, action, payload);
      if (!r.ok) { toast("err", r.error); return; }
      const s = r.data?.sync ?? "";
      toast(s === "failed" ? "err" : "ok", action === "sync" ? (s === "synced" || s === "removed" ? "Calendar is in sync." : SYNC_MSG[s] ?? "Done") : SYNC_MSG[s] ?? "Saved");
      setMode("view");
      router.refresh();
      if (action !== "sync") onClose();
    });

  const active = a.status === "pending" || a.status === "confirmed";

  return (
    <Sheet open={!!a} onOpenChange={(v) => !v && onClose()} title={a.patient_name} description={`${a.booking_ref} · ${a.service_name}`}>
      <div className="space-y-6">
        <div className="flex flex-wrap gap-2"><StatusBadge s={a.status} /><SyncBadge s={a.sync_status} /></div>

        <div className="rounded-2xl bg-gradient-to-br from-teal-50 to-lavender-100 p-4">
          <p className="font-display text-lg font-bold">{fmtWhen(a.starts_at)}</p>
          <p className="text-ink-2">{fmtT(a.starts_at)} – {fmtT(a.ends_at)} IST</p>
        </div>

        <dl className="grid grid-cols-[6.5rem_1fr] gap-y-2.5 text-sm">
          <dt className="text-muted">Reference</dt>
          <dd className="flex items-center gap-2 font-mono font-semibold">{a.booking_ref}
            <button aria-label="Copy reference" className="text-muted hover:text-ink" onClick={() => { navigator.clipboard?.writeText(a.booking_ref); toast("ok", "Copied"); }}><Copy className="size-3.5" /></button>
          </dd>
          <dt className="text-muted">Mobile</dt><dd><a className="inline-flex items-center gap-1.5 font-medium text-teal-700 hover:underline" href={`tel:${a.patient_phone}`}><Phone className="size-3.5" />{formatPhoneDisplay(a.patient_phone)}</a></dd>
          <dt className="text-muted">Email</dt><dd>{a.patient_email ? <a className="inline-flex items-center gap-1.5 text-teal-700 hover:underline" href={`mailto:${a.patient_email}`}><Mail className="size-3.5" />{a.patient_email}</a> : <span className="text-muted">—</span>}</dd>
          <dt className="text-muted">Service</dt><dd>{a.service_name}</dd>
          <dt className="text-muted">Source</dt><dd className="capitalize">{a.source === "admin" ? "Added by clinic" : "Online booking"}</dd>
          <dt className="text-muted">Booked</dt><dd>{fmtWhen(a.created_at)}, {fmtT(a.created_at)}</dd>
          {a.notes && (<><dt className="text-muted">Notes</dt><dd className="whitespace-pre-wrap">{a.notes}</dd></>)}
          <dt className="text-muted">Email status</dt><dd className="capitalize">{a.email_status.replace("_", " ")}</dd>
        </dl>

        {a.sync_status === "failed" && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            <p className="font-semibold">Calendar sync failed{a.sync_attempts ? ` (${a.sync_attempts} attempt${a.sync_attempts > 1 ? "s" : ""})` : ""}</p>
            {a.sync_error && <p className="mt-1 break-words text-xs">{a.sync_error}</p>}
          </div>
        )}

        {mode === "view" && (
          <div className="grid gap-2 sm:grid-cols-2">
            {a.status === "pending" && <Button disabled={pending} variant="teal" onClick={() => run("confirmed")}><Check /> Confirm</Button>}
            {a.status === "confirmed" && <Button disabled={pending} variant="teal" onClick={() => run("completed")}><CircleCheck /> Mark completed</Button>}
            {active && <Button disabled={pending} variant="outline" onClick={() => setMode("reschedule")}><CalendarClock /> Reschedule</Button>}
            {a.status === "confirmed" && <Button disabled={pending} variant="outline" onClick={() => run("no_show")}><UserX /> No-show</Button>}
            {active && <Button disabled={pending} variant="outline" className="text-red-700 hover:border-red-300" onClick={() => setMode("cancel")}><Ban /> Cancel</Button>}
            {(a.sync_status === "failed" || a.sync_status === "pending") && (
              <Button disabled={pending} variant="soft" onClick={() => run("sync")} className="sm:col-span-2">{pending ? <Loader2 className="animate-spin" /> : <RefreshCw />} Retry calendar sync</Button>
            )}
          </div>
        )}

        {mode === "cancel" && (
          <div className="space-y-3 rounded-2xl border border-red-200 bg-red-50/50 p-4">
            <p className="text-sm font-semibold">Cancel this appointment?</p>
            <p className="text-xs text-muted">The time slot will be released and the Google Calendar event removed.</p>
            <div><Label htmlFor="reason">Reason (optional, internal)</Label><Input id="reason" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={200} /></div>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setMode("view")}>Keep</Button>
              <Button variant="danger" disabled={pending} onClick={() => run("cancelled", { reason })}>{pending && <Loader2 className="animate-spin" />} Cancel appointment</Button>
            </div>
          </div>
        )}

        {mode === "reschedule" && (
          <div className="space-y-3 rounded-2xl border border-line p-4">
            <p className="text-sm font-semibold">Choose a new time</p>
            <div><Label htmlFor="rdate">Date</Label><Input id="rdate" type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
            {!slots ? <p className="flex items-center gap-2 text-sm text-muted"><Loader2 className="size-4 animate-spin" /> Checking availability…</p>
              : slots.length === 0 ? <p className="text-sm text-muted">No free times on this date.</p>
              : (
                <div className="grid max-h-56 grid-cols-3 gap-2 overflow-y-auto sm:grid-cols-4">
                  {slots.map((s) => (
                    <button key={s.start} type="button" onClick={() => setSlot(s.start)} aria-pressed={slot === s.start}
                      className={cn("rounded-lg border px-2 py-2 text-sm font-semibold transition", slot === s.start ? "border-ink bg-ink text-white" : "border-line hover:border-teal-400")}>
                      {fmtT(s.start)}
                    </button>
                  ))}
                </div>
              )}
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setMode("view")}>Back</Button>
              <Button disabled={!slot || pending} onClick={() => run("reschedule", { startsAt: slot! })}>{pending && <Loader2 className="animate-spin" />} Save new time</Button>
            </div>
          </div>
        )}
      </div>
    </Sheet>
  );
}
