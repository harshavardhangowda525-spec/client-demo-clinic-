import type { Metadata } from "next";
import { ShieldCheck } from "lucide-react";
import { BookingFlow } from "@/components/site/booking-flow";
import { MeshBackground } from "@/components/site/section";
import { GoogleRating } from "@/components/site/rating";
import { fullAddress, getPublishedServices, getSettings, whatsappLink } from "@/lib/data";
import { formatPhoneDisplay } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Book an Appointment",
  description: "Book your physiotherapy appointment online at SPYNUS Physiotherapy & Wellness Centre, Chikkanagamangala, Bengaluru. Choose a service, date and time in seconds.",
  alternates: { canonical: "/book" },
};
export const dynamic = "force-dynamic";

export default async function BookPage({ searchParams }: { searchParams: Promise<{ service?: string; date?: string }> }) {
  const sp = await searchParams;
  const [s, services] = await Promise.all([getSettings(), getPublishedServices()]);
  const bookable = s.online_booking_enabled ? services.filter((x) => x.online_booking) : [];
  return (
    <section className="grain relative min-h-screen overflow-hidden pb-24 pt-28 sm:pt-32">
      <MeshBackground className="opacity-50" />
      <div className="relative mx-auto max-w-5xl px-4 sm:px-6">
        <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <span className="eyebrow">Online booking</span>
            <h1 className="mt-3 text-3xl font-extrabold sm:text-5xl">Book your appointment</h1>
          </div>
          <GoogleRating rating={s.google_rating} count={s.google_review_count} href={s.google_reviews_url} />
        </div>
        <div className="rounded-[1.75rem] border border-white/80 bg-white/60 p-4 shadow-lift backdrop-blur-xl sm:p-8">
          <BookingFlow
            services={bookable.map(({ id, slug, name, short_description, duration_minutes, price_inr, icon }) => ({ id, slug, name, short_description, duration_minutes, price_inr, icon }))}
            initialSlug={sp.service}
            initialDate={sp.date && /^\d{4}-\d{2}-\d{2}$/.test(sp.date) ? sp.date : undefined}
            clinic={{ name: s.clinic_name, address: fullAddress(s), phone: s.phone, phoneDisplay: formatPhoneDisplay(s.phone), whatsapp: whatsappLink(s) }}
          />
        </div>
        <p className="mt-5 flex items-center justify-center gap-2 text-center text-xs text-muted">
          <ShieldCheck className="size-4 text-teal-600" /> Your details are only used to manage your appointment.
        </p>
      </div>
    </section>
  );
}
