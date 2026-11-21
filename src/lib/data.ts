import "server-only";
import { cache } from "react";
import { q, q1 } from "./db";
import type { ClinicSettings, Practitioner, Service, Testimonial } from "./types";

export const getSettings = cache(async (): Promise<ClinicSettings> => {
  const row = await q1<ClinicSettings & { google_rating: string | null }>("select * from clinic_settings where id = 1");
  if (!row) throw new Error("Clinic settings are missing — run `npm run db:migrate`.");
  return { ...row, google_rating: row.google_rating === null ? null : Number(row.google_rating) };
});

export const getPublishedServices = cache(async () =>
  q<Service>("select * from services where is_published order by sort_order, name"),
);

export const getAllServices = () => q<Service>("select * from services order by sort_order, name");

export const getServiceBySlug = cache(async (slug: string) =>
  q1<Service>("select * from services where slug = $1 and is_published", [slug]),
);

export const getPublicPractitioners = cache(async () =>
  q<Practitioner>("select * from practitioners where is_public order by sort_order, name"),
);

export const getApprovedTestimonials = cache(async () =>
  q<Testimonial>("select * from testimonials where is_approved order by sort_order, created_at"),
);

export function mediaUrl(id: string | null | undefined) {
  return id ? `/api/media/${id}` : null;
}

export function fullAddress(s: ClinicSettings) {
  return `${s.address_line}, ${s.locality}, ${s.city}, ${s.state} ${s.postal_code}`;
}

export function mapsLinks(s: ClinicSettings) {
  const qs = encodeURIComponent(s.maps_query);
  return {
    embed: `https://www.google.com/maps?q=${qs}&output=embed`,
    directions: `https://www.google.com/maps/dir/?api=1&destination=${qs}`,
    view: `https://www.google.com/maps/search/?api=1&query=${qs}`,
  };
}

export function whatsappLink(s: ClinicSettings, text?: string) {
  if (!s.whatsapp_enabled || !s.whatsapp_number) return null;
  const n = s.whatsapp_number.replace(/\D/g, "");
  return `https://wa.me/${n}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
}
