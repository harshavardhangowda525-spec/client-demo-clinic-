"use client";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  AlertTriangle, ArrowLeft, ArrowRight, CalendarCheck, CalendarPlus, Check, ChevronLeft, ChevronRight, Clock, Download, Loader2,
  MapPin, MessageCircle, Phone, RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { Skeleton } from "@/components/ui/misc";
import { ServiceIcon } from "./service-icon";
import { cn } from "@/lib/utils";

export type BookableService = { id: string; slug: string; name: string; short_description: string; duration_minutes: number; price_inr: string | null; icon: string };
type Day = { date: string; open: boolean; slots: { start: string; time: string }[] };
type Clinic = { name: string; address: string; phone: string; phoneDisplay: string; whatsapp: string | null };
type Confirmation = { ref: string; status: string; patientName: string; serviceName: string; startsAt: string; endsAt: string; emailSent: boolean; email: string | null };

const TZ = "Asia/Kolkata";
const STEPS = ["Service", "Date & time", "Your details", "Confirm"];
const fDate = (iso: string, o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("en-IN", { timeZone: TZ, ...o }).format(new Date(iso));
const longDate = (iso: string) => fDate(iso, { weekday: "long", day: "numeric", month: "long", year: "numeric" });
const time12 = (iso: string) => fDate(iso, { hour: "numeric", minute: "2-digit", hour12: true });
const inr = (v: string | null) => (v ? new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Number(v)) : null);
const dateObj = (d: string) => new Date(d + "T00:00:00Z"); // format with timeZone UTC

export function BookingFlow({ services, initialSlug, initialDate, clinic }: {
  services: BookableService[]; initialSlug?: string; initialDate?: string; clinic: Clinic;
}) {
  const reduce = useReducedMotion();
  const initial = services.find((s) => s.slug === initialSlug);
  const [step, setStep] = useState(initial ? 1 : 0);
  const [dir, setDir] = useState(1);
  const [service, setService] = useState<BookableService | undefined>(initial);
  const [days, setDays] = useState<Day[] | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [date, setDate] = useState<string | null>(initialDate ?? null);
  const [slot, setSlot] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", phone: "", email: "", notes: "", consent: false, company: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);
  const [done, setDone] = useState<Confirmation | null>(null);
  const topRef = useRef<HTMLDivElement>(null);

  const go = (n: number) => {
    setDir(n > step ? 1 : -1);
    setStep(n);
    requestAnimationFrame(() => topRef.current?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" }));
  };

  const loadDays = useCallback(async (svc: BookableService) => {
    setDays(null); setLoadErr(null);
    try {
      const r = await fetch(`/api/availability?service=${svc.id}`, { cache: "no-store" });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? "Could not load availability");
      if (d.disabled) throw new Error("Online booking is temporarily paused. Please call the clinic to book.");
      setDays(d.days);
    } catch (e) {
      setLoadErr((e as Error).message || "Could not load availability");
    }
  }, []);

  useEffect(() => { if (service) loadDays(service); }, [service, loadDays]);

  // Keep the selected date valid once availability arrives
  useEffect(() => {
    if (!days) return;
    const withSlots = days.filter((d) => d.slots.length);
    if (!date || !withSlots.some((d) => d.date === date)) setDate(withSlots[0]?.date ?? null);
  }, [days]); // eslint-disable-line react-hooks/exhaustive-deps

  const selectedDay = days?.find((d) => d.date === date);
  const slotObj = selectedDay?.slots.find((s) => s.start === slot);

  function validateDetails() {
    const e: Record<string, string> = {};
    if (form.name.trim().length < 2) e.name = "Please enter your full name";
    const digits = form.phone.replace(/\D/g, "");
    if (!(/^(91|0)?[6-9]\d{9}$/.test(digits) || (form.phone.trim().startsWith("+") && digits.length >= 8 && digits.length <= 15))) e.phone = "Please enter a valid mobile number";
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "Please enter a valid email";
    if (!form.consent) e.consent = "Please accept the privacy notice to continue";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function submit() {
    if (!service || !slot) return;
    setSubmitting(true); setBanner(null);
    try {
      const r = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serviceId: service.id, startsAt: slot, ...form }),
      });
      const d = await r.json();
      if (r.status === 201) { setDone(d); setDir(1); setStep(4); topRef.current?.scrollIntoView({ block: "start" }); return; }
      if (r.status === 409) {
        setBanner(d.error); setSlot(null); go(1); loadDays(service); return;
      }
      if (r.status === 422 && d.fields) { setErrors(d.fields); go(2); return; }
      setBanner(d.error ?? "Something went wrong. Please try again.");
    } catch {
      setBanner("We couldn't reach the server. Please check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const variants = {
    enter: (d: number) => (reduce ? { opacity: 0 } : { opacity: 0, x: d * 40 }),
    center: { opacity: 1, x: 0 },
    exit: (d: number) => (reduce ? { opacity: 0 } : { opacity: 0, x: d * -40 }),
  };

  return (
    <div ref={topRef} className="scroll-mt-24">
      {step < 4 && <Stepper step={step} onJump={(n) => n < step && go(n)} />}

      {banner && (
        <div role="alert" className="mt-5 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" /> <span>{banner}</span>
        </div>
      )}

      <div className="relative mt-6">
        <AnimatePresence mode="wait" custom={dir} initial={false}>
          <motion.div key={step} custom={dir} variants={variants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}>
            {/* ------------------------------------------------ STEP 1: SERVICE */}
            {step === 0 && (
              <div>
                <StepTitle n={1} title="Which service do you need?" sub="Not sure? Choose a Personalized Physiotherapy Consultation." />
                <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Services">
                  {services.map((s) => {
                    const active = service?.id === s.id;
                    return (
                      <button key={s.id} type="button" role="radio" aria-checked={active}
                        onClick={() => { setService(s); setSlot(null); setDate(null); go(1); }}
                        className={cn("group flex items-start gap-4 rounded-2xl border bg-white p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-soft",
                          active ? "border-teal-400 ring-4 ring-teal-100" : "border-line hover:border-teal-400/60")}>
                        <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-teal-50 to-lavender-100 text-teal-700 transition group-hover:scale-105">
                          <ServiceIcon name={s.icon} className="size-5" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block font-semibold text-ink">{s.name}</span>
                          <span className="mt-1 line-clamp-2 block text-sm text-muted">{s.short_description}</span>
                          <span className="mt-2 flex items-center gap-3 text-xs font-medium text-muted">
                            <span className="inline-flex items-center gap-1"><Clock className="size-3.5" />{s.duration_minutes} min</span>
                            {inr(s.price_inr) && <span className="text-ink">{inr(s.price_inr)}</span>}
                          </span>
                        </span>
                        <ArrowRight className="mt-1 size-4 shrink-0 text-muted transition group-hover:translate-x-0.5 group-hover:text-teal-600" />
                      </button>
                    );
                  })}
                </div>
                {!services.length && <p className="rounded-2xl border border-line bg-white p-6 text-muted">Online booking isn&apos;t available right now. Please call <a className="font-semibold text-teal-700" href={`tel:${clinic.phone}`}>{clinic.phoneDisplay}</a>.</p>}
              </div>
            )}

            {/* ------------------------------------------------ STEP 2: DATE & TIME */}
            {step === 1 && service && (
              <div>
                <StepTitle n={2} title="Pick a date and time" sub={`${service.name} · ${service.duration_minutes} min · times shown in IST`} />
                {loadErr ? (
                  <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-800">
                    <p>{loadErr}</p>
                    <Button variant="outline" size="sm" className="mt-3" onClick={() => loadDays(service)}><RefreshCw /> Try again</Button>
                  </div>
                ) : !days ? (
                  <div className="grid gap-5 lg:grid-cols-[1.1fr_1fr]"><Skeleton className="h-80 w-full rounded-2xl" /><Skeleton className="h-80 w-full rounded-2xl" /></div>
                ) : !days.some((d) => d.slots.length) ? (
                  <div className="rounded-2xl border border-line bg-white p-6 text-center">
                    <p className="font-semibold">No online slots are open in the coming weeks.</p>
                    <p className="mt-1 text-sm text-muted">Please call us and we&apos;ll find a time for you.</p>
                    <Button asChild className="mt-4"><a href={`tel:${clinic.phone}`}><Phone /> Call {clinic.phoneDisplay}</a></Button>
                  </div>
                ) : (
                  <div className="grid gap-5 lg:grid-cols-[1.1fr_1fr]">
                    <MonthCalendar days={days} value={date} onChange={(d) => { setDate(d); setSlot(null); }} />
                    <SlotPicker day={selectedDay} value={slot} onChange={setSlot} />
                  </div>
                )}
                <NavRow onBack={() => go(0)} backLabel="Change service" nextDisabled={!slot} onNext={() => go(2)} />
              </div>
            )}

            {/* ------------------------------------------------ STEP 3: DETAILS */}
            {step === 2 && (
              <form noValidate onSubmit={(e) => { e.preventDefault(); if (validateDetails()) go(3); }}>
                <StepTitle n={3} title="Your details" sub="We only ask for what we need to manage your appointment." />
                <div className="grid gap-4 rounded-2xl border border-line bg-white p-5 sm:grid-cols-2 sm:p-6">
                  <Field label="Full name" htmlFor="name" error={errors.name} className="sm:col-span-2">
                    <Input id="name" autoComplete="name" value={form.name} aria-invalid={!!errors.name} aria-describedby={errors.name ? "name-error" : undefined}
                      onChange={(e) => setForm({ ...form, name: e.target.value })} required maxLength={120} />
                  </Field>
                  <Field label="Mobile number" htmlFor="phone" error={errors.phone} hint="10-digit Indian mobile, or international with +">
                    <Input id="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="98765 43210" value={form.phone} aria-invalid={!!errors.phone}
                      aria-describedby={errors.phone ? "phone-error" : undefined} onChange={(e) => setForm({ ...form, phone: e.target.value })} required maxLength={20} />
                  </Field>
                  <Field label="Email (optional)" htmlFor="email" error={errors.email} hint="For an email confirmation">
                    <Input id="email" type="email" inputMode="email" autoComplete="email" value={form.email} aria-invalid={!!errors.email}
                      aria-describedby={errors.email ? "email-error" : undefined} onChange={(e) => setForm({ ...form, email: e.target.value })} maxLength={200} />
                  </Field>
                  <Field label="Anything we should know? (optional)" htmlFor="notes" hint="Please don't include detailed medical history — we'll discuss it in person." className="sm:col-span-2">
                    <Textarea id="notes" rows={2} maxLength={500} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                  </Field>
                  <div className="absolute left-[-9999px]" aria-hidden>
                    <label htmlFor="company">Company</label>
                    <input id="company" tabIndex={-1} autoComplete="off" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="flex items-start gap-3 text-sm text-muted">
                      <input type="checkbox" checked={form.consent} onChange={(e) => setForm({ ...form, consent: e.target.checked })}
                        className="mt-0.5 size-4.5 rounded border-line accent-teal-600" aria-invalid={!!errors.consent} />
                      <span>I agree that {clinic.name} may use these details to manage my appointment, as described in the <Link href="/privacy" target="_blank" className="font-medium text-teal-700 underline">privacy notice</Link>.</span>
                    </label>
                    {errors.consent && <p role="alert" className="mt-1.5 text-sm text-red-600">{errors.consent}</p>}
                  </div>
                </div>
                <NavRow onBack={() => go(1)} nextType="submit" />
              </form>
            )}

            {/* ------------------------------------------------ STEP 4: CONFIRM */}
            {step === 3 && service && slotObj && (
              <div>
                <StepTitle n={4} title="Review and confirm" sub="Please check everything looks right." />
                <div className="overflow-hidden rounded-2xl border border-line bg-white">
                  <div className="bg-gradient-to-r from-teal-50 via-white to-lavender-100 px-5 py-5 sm:px-6">
                    <p className="text-xs font-semibold uppercase tracking-wider text-teal-700">Appointment</p>
                    <p className="mt-1 font-display text-xl font-bold">{service.name}</p>
                    <p className="mt-1 text-ink-2">{longDate(slotObj.start)} · {time12(slotObj.start)}</p>
                  </div>
                  <dl className="divide-y divide-line text-sm">
                    <Row k="Duration" v={`${service.duration_minutes} minutes`} />
                    {inr(service.price_inr) && <Row k="Fee" v={inr(service.price_inr)!} />}
                    <Row k="Name" v={form.name} />
                    <Row k="Mobile" v={form.phone} />
                    {form.email && <Row k="Email" v={form.email} />}
                    <Row k="Location" v={`${clinic.name}, ${clinic.address}`} />
                  </dl>
                </div>
                <p className="mt-3 text-xs text-muted">We&apos;ll check this time is still free when you confirm.</p>
                <NavRow onBack={() => go(2)} onNext={submit} nextLabel={submitting ? "Confirming…" : "Confirm appointment"} nextDisabled={submitting} loading={submitting} />
              </div>
            )}

            {/* ------------------------------------------------ STEP 5: DONE */}
            {step === 4 && done && <Success c={done} clinic={clinic} />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

function Stepper({ step, onJump }: { step: number; onJump: (n: number) => void }) {
  return (
    <nav aria-label="Booking progress">
      <ol className="flex items-center gap-2">
        {STEPS.map((label, i) => {
          const state = i < step ? "done" : i === step ? "current" : "todo";
          return (
            <li key={label} className="flex flex-1 items-center gap-2">
              <button type="button" disabled={state !== "done"} onClick={() => onJump(i)} aria-current={state === "current" ? "step" : undefined}
                className="group flex min-w-0 items-center gap-2 disabled:cursor-default">
                <span className={cn("relative inline-flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-bold transition-all duration-300",
                  state === "done" && "bg-teal-500 text-white group-hover:bg-teal-600",
                  state === "current" && "bg-ink text-white ring-4 ring-teal-100",
                  state === "todo" && "border border-line bg-white text-muted")}>
                  {state === "done" ? <Check className="size-4" /> : i + 1}
                </span>
                <span className={cn("hidden truncate text-sm font-medium md:block", state === "todo" ? "text-muted" : "text-ink")}>{label}</span>
              </button>
              {i < STEPS.length - 1 && (
                <span className="relative h-0.5 flex-1 overflow-hidden rounded-full bg-line">
                  <motion.span className="absolute inset-y-0 left-0 bg-teal-400" initial={false} animate={{ width: i < step ? "100%" : "0%" }} transition={{ duration: 0.4 }} />
                </span>
              )}
            </li>
          );
        })}
      </ol>
      <p className="mt-3 text-sm text-muted md:hidden">Step {step + 1} of 4 · <span className="font-medium text-ink">{STEPS[step]}</span></p>
    </nav>
  );
}

function StepTitle({ n, title, sub }: { n: number; title: string; sub?: string }) {
  return (
    <div className="mb-5">
      <h2 className="text-2xl font-extrabold sm:text-3xl" tabIndex={-1}><span className="sr-only">Step {n}: </span>{title}</h2>
      {sub && <p className="mt-1.5 text-sm text-muted">{sub}</p>}
    </div>
  );
}

function NavRow({ onBack, onNext, nextLabel = "Continue", nextDisabled, nextType = "button", backLabel = "Back", loading }: {
  onBack?: () => void; onNext?: () => void; nextLabel?: string; nextDisabled?: boolean; nextType?: "button" | "submit"; backLabel?: string; loading?: boolean;
}) {
  return (
    <div className="sticky bottom-0 z-10 -mx-4 mt-6 flex items-center justify-between gap-3 border-t border-line/70 bg-ivory/90 px-4 py-3 backdrop-blur sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
      {onBack ? <Button type="button" variant="ghost" onClick={onBack}><ArrowLeft /> {backLabel}</Button> : <span />}
      <Button type={nextType} onClick={onNext} disabled={nextDisabled} size="lg" className="min-w-40">
        {loading && <Loader2 className="animate-spin" />}{nextLabel}{!loading && <ArrowRight />}
      </Button>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="grid grid-cols-[7rem_1fr] gap-3 px-5 py-3 sm:px-6">
      <dt className="text-muted">{k}</dt>
      <dd className="font-medium text-ink">{v}</dd>
    </div>
  );
}

function MonthCalendar({ days, value, onChange }: { days: Day[]; value: string | null; onChange: (d: string) => void }) {
  const byDate = useMemo(() => new Map(days.map((d) => [d.date, d])), [days]);
  const first = days[0].date, last = days[days.length - 1].date;
  const months = useMemo(() => {
    const out: string[] = [];
    let m = first.slice(0, 7);
    while (m <= last.slice(0, 7)) {
      out.push(m);
      const [y, mo] = m.split("-").map(Number);
      m = mo === 12 ? `${y + 1}-01` : `${y}-${String(mo + 1).padStart(2, "0")}`;
    }
    return out;
  }, [first, last]);
  const [mi, setMi] = useState(() => Math.max(0, months.indexOf((value ?? first).slice(0, 7))));
  const month = months[mi];
  const [y, mo] = month.split("-").map(Number);
  const startDow = new Date(Date.UTC(y, mo - 1, 1)).getUTCDay();
  const nDays = new Date(Date.UTC(y, mo, 0)).getUTCDate();
  const cells = [...Array(startDow).fill(null), ...Array.from({ length: nDays }, (_, i) => `${month}-${String(i + 1).padStart(2, "0")}`)];
  const title = new Intl.DateTimeFormat("en-IN", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(y, mo - 1, 1)));

  return (
    <div className="rounded-2xl border border-line bg-white p-4 sm:p-5">
      <div className="mb-3 flex items-center justify-between">
        <p className="font-display font-bold" aria-live="polite">{title}</p>
        <div className="flex gap-1">
          <button type="button" aria-label="Previous month" disabled={mi === 0} onClick={() => setMi(mi - 1)} className="inline-flex size-9 items-center justify-center rounded-full hover:bg-ink/5 disabled:opacity-30"><ChevronLeft className="size-4" /></button>
          <button type="button" aria-label="Next month" disabled={mi === months.length - 1} onClick={() => setMi(mi + 1)} className="inline-flex size-9 items-center justify-center rounded-full hover:bg-ink/5 disabled:opacity-30"><ChevronRight className="size-4" /></button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-muted" aria-hidden>
        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => <span key={i} className="py-1">{d}</span>)}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1" role="grid" aria-label={`Available dates in ${title}`}>
        {cells.map((d, i) => {
          if (!d) return <span key={`e${i}`} />;
          const info = byDate.get(d);
          const available = !!info?.slots.length;
          const selected = d === value;
          const label = `${new Intl.DateTimeFormat("en-IN", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(new Date(d + "T00:00:00Z"))}${available ? `, ${info!.slots.length} times available` : ", unavailable"}`;
          return (
            <button key={d} type="button" disabled={!available} onClick={() => onChange(d)} aria-pressed={selected} aria-label={label}
              className={cn("relative flex aspect-square items-center justify-center rounded-xl text-sm font-semibold transition-all",
                available ? "text-ink hover:bg-teal-50" : "cursor-not-allowed text-muted/35 line-through decoration-muted/20",
                selected && "text-white hover:bg-transparent")}>
              {selected && <motion.span layoutId="date-pill" className="absolute inset-0 rounded-xl bg-ink shadow-lift" transition={{ type: "spring", stiffness: 420, damping: 34 }} />}
              <span className="relative">{Number(d.slice(8))}</span>
              {available && !selected && <span className="absolute bottom-1.5 size-1 rounded-full bg-teal-400" />}
            </button>
          );
        })}
      </div>
      <p className="mt-3 flex items-center gap-2 text-xs text-muted"><span className="size-1.5 rounded-full bg-teal-400" /> Dates with open times</p>
    </div>
  );
}

function SlotPicker({ day, value, onChange }: { day?: Day; value: string | null; onChange: (s: string) => void }) {
  if (!day) return <div className="rounded-2xl border border-line bg-white p-5 text-sm text-muted">Select a date to see times.</div>;
  const groups = [
    { label: "Morning", f: (t: string) => t < "12:00" },
    { label: "Afternoon", f: (t: string) => t >= "12:00" && t < "17:00" },
    { label: "Evening", f: (t: string) => t >= "17:00" },
  ];
  return (
    <div className="rounded-2xl border border-line bg-white p-4 sm:p-5">
      <p className="font-display font-bold">{new Intl.DateTimeFormat("en-IN", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(dateObj(day.date))}</p>
      <div className="mt-3 max-h-[22rem] space-y-4 overflow-y-auto pr-1">
        {groups.map((g) => {
          const slots = day.slots.filter((s) => g.f(s.time));
          if (!slots.length) return null;
          return (
            <fieldset key={g.label}>
              <legend className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">{g.label}</legend>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4">
                {slots.map((s) => {
                  const sel = s.start === value;
                  return (
                    <button key={s.start} type="button" aria-pressed={sel} onClick={() => onChange(s.start)}
                      className={cn("rounded-xl border px-2 py-2.5 text-sm font-semibold transition-all active:scale-95",
                        sel ? "border-ink bg-ink text-white shadow-lift" : "border-line bg-white text-ink hover:border-teal-400 hover:bg-teal-50")}>
                      {time12(s.start)}
                    </button>
                  );
                })}
              </div>
            </fieldset>
          );
        })}
      </div>
    </div>
  );
}

function icsStamp(iso: string) {
  return new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function Success({ c, clinic }: { c: Confirmation; clinic: Clinic }) {
  const reduce = useReducedMotion();
  const confirmed = c.status === "confirmed";
  const title = `${clinic.name} – ${c.serviceName}`;
  const details = `Booking reference: ${c.ref}`;
  const gcal = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${icsStamp(c.startsAt)}/${icsStamp(c.endsAt)}&details=${encodeURIComponent(details)}&location=${encodeURIComponent(`${clinic.name}, ${clinic.address}`)}`;
  const downloadIcs = () => {
    const ics = [
      "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//SPYNUS//Booking//EN", "BEGIN:VEVENT",
      `UID:${c.ref}@spynus`, `DTSTAMP:${icsStamp(new Date().toISOString())}`, `DTSTART:${icsStamp(c.startsAt)}`, `DTEND:${icsStamp(c.endsAt)}`,
      `SUMMARY:${title.replace(/[,;]/g, "\\$&")}`, `DESCRIPTION:${details}`, `LOCATION:${`${clinic.name}, ${clinic.address}`.replace(/[,;]/g, "\\$&")}`,
      "END:VEVENT", "END:VCALENDAR",
    ].join("\r\n");
    const url = URL.createObjectURL(new Blob([ics], { type: "text/calendar" }));
    const a = Object.assign(document.createElement("a"), { href: url, download: `${c.ref}.ics` });
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mx-auto max-w-xl text-center" role="status" aria-live="polite">
      <div className="relative mx-auto size-24">
        {!reduce && [0, 1].map((k) => (
          <motion.span key={k} className="absolute inset-0 rounded-full bg-teal-300" initial={{ scale: 0.6, opacity: 0.5 }} animate={{ scale: 1.8, opacity: 0 }} transition={{ duration: 1.6, delay: 0.3 + k * 0.4, repeat: 1 }} />
        ))}
        <motion.div initial={{ scale: reduce ? 1 : 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 260, damping: 18 }}
          className="relative flex size-24 items-center justify-center rounded-full bg-gradient-to-br from-teal-400 to-teal-600 shadow-lift">
          <svg viewBox="0 0 24 24" className="size-11 text-white" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <motion.path d="M5 12.5l4.5 4.5L19 7.5" initial={{ pathLength: reduce ? 1 : 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.5, delay: 0.25 }} />
          </svg>
        </motion.div>
      </div>
      <h2 className="mt-7 text-3xl font-extrabold sm:text-4xl">{confirmed ? "Your Appointment Is Confirmed!" : "Appointment Request Received"}</h2>
      <p className="mt-2 text-muted">
        {confirmed ? `Thank you, ${c.patientName.split(" ")[0]}. We look forward to seeing you.` : `Thank you, ${c.patientName.split(" ")[0]}. The clinic will confirm your appointment shortly.`}
      </p>

      <div className="mt-7 overflow-hidden rounded-2xl border border-line bg-white text-left shadow-soft">
        <div className="flex items-center justify-between bg-ink px-5 py-4 text-white">
          <span className="text-xs uppercase tracking-wider text-white/70">Booking reference</span>
          <span className="font-mono text-lg font-bold tracking-wider">{c.ref}</span>
        </div>
        <dl className="divide-y divide-line text-sm">
          <Row k="Patient" v={c.patientName} />
          <Row k="Service" v={c.serviceName} />
          <Row k="Date" v={longDate(c.startsAt)} />
          <Row k="Time" v={`${time12(c.startsAt)} – ${time12(c.endsAt)} IST`} />
          <Row k="Clinic" v={`${clinic.name}, ${clinic.address}`} />
        </dl>
      </div>
      {c.emailSent && c.email && <p className="mt-4 text-sm text-teal-700">A confirmation email has been sent to {c.email}.</p>}
      <p className="mt-3 text-xs text-muted">Please keep your booking reference. To change or cancel, call the clinic.</p>

      <div className="mt-6 grid gap-2 sm:grid-cols-2">
        <Button asChild variant="outline"><a href={gcal} target="_blank" rel="noopener noreferrer"><CalendarPlus /> Add to Google Calendar</a></Button>
        <Button variant="outline" onClick={downloadIcs}><Download /> Download .ics</Button>
        <Button asChild><a href={`tel:${clinic.phone}`}><Phone /> Call clinic</a></Button>
        {clinic.whatsapp ? (
          <Button asChild variant="soft"><a href={clinic.whatsapp} target="_blank" rel="noopener noreferrer"><MessageCircle /> WhatsApp</a></Button>
        ) : (
          <Button asChild variant="soft"><a href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(clinic.name + ", " + clinic.address)}`} target="_blank" rel="noopener noreferrer"><MapPin /> Directions</a></Button>
        )}
      </div>
      <Link href="/" className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-ink hover:text-teal-700"><CalendarCheck className="size-4" /> Back to home</Link>
    </div>
  );
}
