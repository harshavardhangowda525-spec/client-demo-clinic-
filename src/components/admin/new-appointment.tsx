"use client";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus } from "lucide-react";
import { Sheet } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { adminSlotsAction, createManualAppointmentAction } from "@/app/admin/actions";
import { useToast } from "./toast";
import { fmtT } from "./appointment-drawer";
import { cn } from "@/lib/utils";

type Svc = { id: string; name: string; duration: number };
const todayIst = () => new Date(Date.now() + 330 * 60000).toISOString().slice(0, 10);

export function NewAppointmentButton({ services, autoOpen, initialDate, label = "New appointment" }: { services: Svc[]; autoOpen?: boolean; initialDate?: string; label?: string }) {
  const [open, setOpen] = useState(!!autoOpen);
  return (
    <>
      <Button onClick={() => setOpen(true)}><Plus /> {label}</Button>
      <NewAppointmentSheet open={open} onOpenChange={setOpen} services={services} initialDate={initialDate} />
    </>
  );
}

export function NewAppointmentSheet({ open, onOpenChange, services, initialDate }: { open: boolean; onOpenChange: (v: boolean) => void; services: Svc[]; initialDate?: string }) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  const [serviceId, setServiceId] = useState(services[0]?.id ?? "");
  const [date, setDate] = useState(initialDate ?? todayIst());
  const [slots, setSlots] = useState<{ start: string; time: string }[] | null>(null);
  const [calendar, setCalendar] = useState("");
  const [slot, setSlot] = useState<string | null>(null);
  const [f, setF] = useState({ name: "", phone: "", email: "", notes: "", status: "confirmed" as "confirmed" | "pending" });
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !serviceId || !date) return;
    setSlots(null); setSlot(null);
    adminSlotsAction(serviceId, date).then((r) => { setSlots(r.ok ? r.data!.slots : []); setCalendar(r.ok ? r.data!.calendar : ""); });
  }, [open, serviceId, date]);

  const submit = () => start(async () => {
    setErr(null);
    if (!slot) { setErr("Choose a time"); return; }
    const r = await createManualAppointmentAction({ serviceId, startsAt: slot, ...f });
    if (!r.ok) { setErr(r.error); return; }
    const s = r.data!.sync;
    toast(s === "failed" ? "err" : "ok", `Appointment ${r.data!.ref} created. ${s === "synced" ? "Added to Google Calendar." : s === "failed" ? "Google Calendar sync failed — retry from the appointment." : "Google Calendar not connected."}`);
    onOpenChange(false);
    setF({ name: "", phone: "", email: "", notes: "", status: "confirmed" });
    router.refresh();
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange} title="New appointment" description="For patients who call or walk in. Uses the same availability checks as online booking.">
      <div className="space-y-4">
        <Field label="Service" htmlFor="svc"><Select id="svc" value={serviceId} onChange={(e) => setServiceId(e.target.value)}>{services.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.duration} min)</option>)}</Select></Field>
        <Field label="Date" htmlFor="ndate"><Input id="ndate" type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
        <div>
          <p className="mb-1.5 text-sm font-medium">Time</p>
          {!slots ? <p className="flex items-center gap-2 text-sm text-muted"><Loader2 className="size-4 animate-spin" /> Checking availability…</p>
            : !slots.length ? <p className="text-sm text-muted">No free times on this date (closed, fully booked, or blocked).</p>
            : (
              <div className="grid max-h-48 grid-cols-3 gap-2 overflow-y-auto sm:grid-cols-4">
                {slots.map((s) => (
                  <button key={s.start} type="button" onClick={() => setSlot(s.start)} aria-pressed={slot === s.start}
                    className={cn("rounded-lg border px-2 py-2 text-sm font-semibold transition", slot === s.start ? "border-ink bg-ink text-white" : "border-line hover:border-teal-400")}>{fmtT(s.start)}</button>
                ))}
              </div>
            )}
          {calendar === "unavailable" && <p className="mt-2 text-xs text-amber-700">Google Calendar busy times couldn&apos;t be checked right now; only clinic bookings are considered.</p>}
        </div>
        <Field label="Patient name" htmlFor="pn"><Input id="pn" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Mobile" htmlFor="pp"><Input id="pp" type="tel" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></Field>
          <Field label="Email (optional)" htmlFor="pe"><Input id="pe" type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field>
        </div>
        <Field label="Notes (optional)" htmlFor="pno"><Textarea id="pno" rows={2} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} maxLength={500} /></Field>
        <Field label="Status" htmlFor="pst"><Select id="pst" value={f.status} onChange={(e) => setF({ ...f, status: e.target.value as "confirmed" | "pending" })}><option value="confirmed">Confirmed</option><option value="pending">Pending</option></Select></Field>
        {err && <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{err}</p>}
        <Button className="w-full" disabled={pending} onClick={submit}>{pending && <Loader2 className="animate-spin" />} Create appointment</Button>
      </div>
    </Sheet>
  );
}
