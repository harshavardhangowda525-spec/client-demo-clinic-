import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { BookingError, createAppointment, patientSchema } from "@/lib/booking";

export const dynamic = "force-dynamic";

const body = z.object({
  serviceId: z.string().uuid(),
  startsAt: z.string().datetime(),
  name: z.string(),
  phone: z.string(),
  email: z.string().optional(),
  notes: z.string().optional(),
  consent: z.literal(true, { message: "Please accept the privacy notice to continue" }),
  company: z.string().optional(), // honeypot
});

export async function POST(req: NextRequest) {
  const origin = req.headers.get("origin");
  if (origin && new URL(origin).host !== req.headers.get("host")) {
    return NextResponse.json({ error: "Cross-site requests are not allowed" }, { status: 403 });
  }
  const json = await req.json().catch(() => null);
  const parsed = body.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request" }, { status: 400 });
  if (parsed.data.company) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const patient = patientSchema.safeParse(parsed.data);
  if (!patient.success) {
    return NextResponse.json({ error: "Please check your details", fields: Object.fromEntries(patient.error.issues.map((i) => [i.path[0], i.message])) }, { status: 422 });
  }

  try {
    const r = await createAppointment({ serviceId: parsed.data.serviceId, startsAt: parsed.data.startsAt, patient: patient.data, source: "online" });
    const a = r.appointment;
    // Only data the patient just submitted is returned; nothing about other patients.
    return NextResponse.json({
      ref: a.booking_ref,
      status: a.status,
      patientName: a.patient_name,
      serviceName: a.service_name,
      startsAt: a.starts_at,
      endsAt: a.ends_at,
      emailSent: r.emailSent,
      email: r.emailSent ? a.patient_email : null,
    }, { status: 201 });
  } catch (e) {
    if (e instanceof BookingError) {
      const status = e.code === "SLOT_TAKEN" || e.code === "SLOT_UNAVAILABLE" ? 409 : e.code === "LIMIT" ? 429 : 400;
      return NextResponse.json({ error: e.message, code: e.code }, { status });
    }
    console.error("[booking] failed", e);
    return NextResponse.json({ error: "Something went wrong while booking. Please try again or call the clinic." }, { status: 500 });
  }
}
