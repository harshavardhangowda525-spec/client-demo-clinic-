import type { Metadata } from "next";
import { getSettings, fullAddress } from "@/lib/data";

export const metadata: Metadata = { title: "Privacy Notice", description: "How SPYNUS Physiotherapy & Wellness Centre handles the details you share when booking.", alternates: { canonical: "/privacy" } };
export const revalidate = 3600;

export default async function Privacy() {
  const s = await getSettings();
  return (
    <section className="mx-auto max-w-3xl px-4 pb-24 pt-32 sm:px-6">
      <h1 className="text-4xl font-extrabold">Privacy notice</h1>
      <div className="mt-8 space-y-6 leading-relaxed text-ink-2 [&_h2]:mt-10 [&_h2]:text-xl [&_h2]:font-bold">
        <p>This notice explains how {s.clinic_name} (&ldquo;we&rdquo;) uses the information you provide when booking an appointment on this website.</p>
        <h2>What we collect</h2>
        <p>Your name, mobile number, optional email address, the service and appointment time you choose, and any short note you add. We do not ask for medical history through this website.</p>
        <h2>How we use it</h2>
        <p>Only to schedule and manage your appointment: confirming, rescheduling or cancelling it, and contacting you about it. We do not sell your information or use it for advertising.</p>
        <h2>Who can see it</h2>
        <p>Only authorised clinic staff, through a password-protected dashboard. If the clinic uses Google Calendar for scheduling, the calendar entry contains the service, time and a booking reference — not your contact details. Email confirmations, when enabled, are delivered through a transactional email provider.</p>
        <h2>How long we keep it</h2>
        <p>Booking details are kept for up to {s.data_retention_months} months after your appointment and are then anonymised, unless the clinic needs to keep records for longer for legal or clinical reasons.</p>
        <h2>Your choices</h2>
        <p>You can ask us to correct or delete your booking details by calling <a className="font-semibold text-teal-700" href={`tel:${s.phone}`}>{s.phone}</a> or visiting us at {fullAddress(s)}.</p>
      </div>
    </section>
  );
}
