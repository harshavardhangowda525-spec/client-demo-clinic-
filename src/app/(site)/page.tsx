import Link from "next/link";
import { ArrowRight, CalendarCheck, Clock, HeartHandshake, ListChecks, MapPin, MessageCircle, Navigation, Phone, Sparkles, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/site/reveal";
import { MeshBackground, SectionHeading } from "@/components/site/section";
import { HeroVisual } from "@/components/site/hero-visual";
import { NextSlotCard } from "@/components/site/next-slot-card";
import { GoogleRating, Stars } from "@/components/site/rating";
import { ServiceCard } from "@/components/site/service-card";
import { Experiences } from "@/components/site/experiences";
import {
  fullAddress, getApprovedTestimonials, getPublicPractitioners, getPublishedServices, getSettings, mapsLinks, mediaUrl, whatsappLink,
} from "@/lib/data";
import { formatPhoneDisplay } from "@/lib/utils";
import type { ClinicSettings } from "@/lib/types";

export const revalidate = 300;

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const t12 = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
};

function jsonLd(s: ClinicSettings, site: string) {
  const data: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Physiotherapy",
    name: s.clinic_name,
    url: site,
    telephone: s.phone,
    address: {
      "@type": "PostalAddress",
      streetAddress: `${s.address_line}, ${s.locality}`,
      addressLocality: s.city,
      addressRegion: s.state,
      postalCode: s.postal_code,
      addressCountry: s.country,
    },
    hasMap: mapsLinks(s).view,
    areaServed: "Bengaluru",
  };
  if (s.hours_confirmed) {
    data.openingHoursSpecification = Object.entries(s.working_hours)
      .filter(([, d]) => d)
      .map(([k, d]) => ({ "@type": "OpeningHoursSpecification", dayOfWeek: DAYS[Number(k)], opens: d!.open, closes: d!.close }));
  }
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

export default async function Home() {
  const [s, services, team, testimonials] = await Promise.all([getSettings(), getPublishedServices(), getPublicPractitioners(), getApprovedTestimonials()]);
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const maps = mapsLinks(s);
  const wa = whatsappLink(s, "Hello SPYNUS, I'd like to ask about an appointment.");
  const heroImg = mediaUrl(s.hero_image_id);
  const firstBookable = services.find((x) => x.online_booking);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(s, site) }} />

      {/* ------------------------------------------------------------------ HERO */}
      <section className="grain relative overflow-hidden pb-16 pt-28 sm:pt-36 lg:pb-24">
        <MeshBackground />
        <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-[1.05fr_1fr]">
          <div>
            <Reveal y={12}>
              <span className="eyebrow"><Sparkles className="size-3.5" /> Physiotherapy &amp; Wellness · Bengaluru</span>
            </Reveal>
            <Reveal delay={0.08}>
              <h1 className="mt-5 text-[2.6rem] font-extrabold leading-[1.02] sm:text-6xl lg:text-[4.4rem]">
                Move Better.<br />
                <span className="text-gradient">Feel Stronger.</span><br />
                Live Pain-Free.
              </h1>
            </Reveal>
            <Reveal delay={0.16}>
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted">
                Personalized physiotherapy and wellness care at {s.clinic_name}, Bengaluru.
              </p>
            </Reveal>
            <Reveal delay={0.24}>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button asChild size="lg"><Link href="/book"><CalendarCheck /> Book Your Appointment</Link></Button>
                <Button asChild size="lg" variant="outline"><Link href="#services">Explore Our Services <ArrowRight /></Link></Button>
              </div>
            </Reveal>
            <Reveal delay={0.32}>
              <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-4">
                <GoogleRating rating={s.google_rating} count={s.google_review_count} href={s.google_reviews_url} />
                <div className="h-8 w-px bg-line max-sm:hidden" />
                <a href={`tel:${s.phone}`} className="inline-flex items-center gap-2 text-sm font-medium text-ink-2 hover:text-teal-700">
                  <span className="inline-flex size-9 items-center justify-center rounded-full bg-white shadow-soft"><Phone className="size-4 text-teal-600" /></span>
                  {formatPhoneDisplay(s.phone)}
                </a>
              </div>
            </Reveal>
          </div>

          <Reveal delay={0.1} className="relative mx-auto w-full max-w-[34rem]">
            <div className="relative aspect-[7/8] overflow-hidden rounded-[2rem] border border-white/80 bg-gradient-to-br from-white/80 via-teal-50/70 to-lavender-100/80 shadow-lift">
              {heroImg ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={heroImg} alt="Inside SPYNUS Physiotherapy & Wellness Centre" className="h-full w-full object-cover" fetchPriority="high" />
              ) : (
                <div className="absolute inset-0 p-6"><HeroVisual /></div>
              )}
            </div>
            <div className="absolute -left-4 bottom-10 animate-float sm:-left-10">
              <NextSlotCard serviceId={firstBookable?.id} serviceName={firstBookable?.name} serviceSlug={firstBookable?.slug} />
            </div>
            {s.google_rating && (
              <div className="glass absolute -right-2 top-8 hidden animate-float rounded-2xl px-4 py-3 [animation-delay:-3s] sm:block">
                <div className="flex items-center gap-2"><Stars value={s.google_rating} /><span className="text-sm font-bold">{s.google_rating.toFixed(1)}</span></div>
                <p className="mt-1 text-xs text-muted">Google rating</p>
              </div>
            )}
          </Reveal>
        </div>
      </section>

      {/* ------------------------------------------------------------------ TRUST */}
      <section aria-labelledby="trust" className="relative py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <h2 id="trust" className="sr-only">Why patients choose SPYNUS</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: UserRound, t: "Personalized patient care", d: "Your plan is built around your concern, your body and your goals." },
              { icon: ListChecks, t: "Clear exercise guidance", d: "Every exercise explained — what it's for and how to do it safely at home." },
              { icon: HeartHandshake, t: "Patient-focused rehabilitation", d: "We listen first and progress your care at a pace that suits you." },
              { icon: CalendarCheck, t: "Convenient booking", d: "Pick a service and a time that works for you, online in under a minute." },
            ].map((f, i) => (
              <Reveal key={f.t} delay={i * 0.06}>
                <div className="group h-full rounded-2xl border border-line/80 bg-white/70 p-6 transition hover:-translate-y-1 hover:bg-white hover:shadow-soft">
                  <span className="inline-flex size-11 items-center justify-center rounded-xl bg-gradient-to-br from-teal-50 to-lavender-100 text-teal-700 transition group-hover:scale-110">
                    <f.icon className="size-5" />
                  </span>
                  <h3 className="mt-4 text-base font-bold">{f.t}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted">{f.d}</p>
                </div>
              </Reveal>
            ))}
          </div>
          {s.google_rating && (
            <Reveal delay={0.1}>
              <div className="mt-6 flex flex-col items-start justify-between gap-4 rounded-2xl bg-ink px-6 py-6 text-white sm:flex-row sm:items-center sm:px-8">
                <div className="flex items-center gap-4">
                  <span className="font-display text-5xl font-extrabold">{s.google_rating.toFixed(1)}</span>
                  <div>
                    <Stars value={s.google_rating} />
                    <p className="mt-1 text-sm text-white/75">Average Google rating{ s.google_review_count ? ` across ${s.google_review_count} reviews` : ""}</p>
                  </div>
                </div>
                {s.google_reviews_url && (
                  <a href={s.google_reviews_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-full bg-white/10 px-5 py-2.5 text-sm font-semibold hover:bg-white/20">
                    See reviews on Google <ArrowRight className="size-4" />
                  </a>
                )}
              </div>
            </Reveal>
          )}
        </div>
      </section>

      {/* ------------------------------------------------------------------ SERVICES */}
      <section id="services" aria-labelledby="services-h" className="relative py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <SectionHeading eyebrow="Our services" title={<span id="services-h">Care designed around how you move</span>}
              intro="Assessment-led physiotherapy with clear guidance at every step. Choose a service to learn more or book directly." />
            <Reveal><Button asChild variant="outline"><Link href="/services">All services <ArrowRight /></Link></Button></Reveal>
          </div>
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((sv, i) => (
              <Reveal key={sv.id} delay={(i % 3) * 0.06} className="h-full"><ServiceCard s={sv} i={i} /></Reveal>
            ))}
          </div>
          {!services.length && <p className="mt-10 text-muted">Services will be listed here soon. Please call us to book.</p>}
        </div>
      </section>

      {/* ------------------------------------------------------------------ ABOUT */}
      <section id="about" aria-labelledby="about-h" className="grain relative overflow-hidden bg-gradient-to-b from-cream/60 to-ivory py-16 sm:py-24">
        <div className="relative mx-auto grid max-w-7xl gap-12 px-4 sm:px-6 lg:grid-cols-2">
          <div>
            <SectionHeading eyebrow="About the clinic" title={<span id="about-h">A patient-focused physiotherapy &amp; wellness centre</span>} />
            <Reveal delay={0.1}><p className="mt-6 text-base leading-relaxed text-muted sm:text-lg">{s.about_story}</p></Reveal>
          </div>
          <div className="space-y-5">
            <Reveal delay={0.12}>
              <div className="rounded-2xl border border-white bg-white/80 p-6 shadow-soft sm:p-8">
                <h3 className="text-lg font-bold">Our approach to rehabilitation</h3>
                <p className="mt-3 leading-relaxed text-muted">{s.about_approach}</p>
              </div>
            </Reveal>
            {team.length > 0 && (
              <Reveal delay={0.18}>
                <div className="rounded-2xl border border-white bg-white/80 p-6 shadow-soft sm:p-8">
                  <h3 className="text-lg font-bold">Our team</h3>
                  <ul className="mt-4 grid gap-4 sm:grid-cols-2">
                    {team.map((p) => (
                      <li key={p.id} className="flex items-center gap-4">
                        {p.photo_id ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={mediaUrl(p.photo_id)!} alt={p.name} className="size-14 rounded-2xl object-cover" loading="lazy" />
                        ) : (
                          <span className="inline-flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-100 to-lavender-200 font-display text-lg font-bold text-ink">
                            {p.name.replace(/^Dr\.?\s*/, "").charAt(0)}
                          </span>
                        )}
                        <div>
                          <p className="font-semibold">{p.name}</p>
                          {p.title && <p className="text-sm text-muted">{p.title}</p>}
                          {p.credentials && <p className="text-xs text-muted">{p.credentials}</p>}
                        </div>
                      </li>
                    ))}
                  </ul>
                  {team.some((p) => p.bio) && <div className="mt-4 space-y-2 text-sm text-muted">{team.filter((p) => p.bio).map((p) => <p key={p.id}>{p.bio}</p>)}</div>}
                </div>
              </Reveal>
            )}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ EXPERIENCES */}
      {testimonials.length > 0 && (
        <section id="experiences" aria-labelledby="exp-h" className="relative overflow-hidden py-16 sm:py-24">
          <MeshBackground className="opacity-60" />
          <div className="relative mx-auto max-w-7xl px-4 sm:px-6">
            <SectionHeading center eyebrow="Patient experiences" title={<span id="exp-h">What patients say about their care</span>}
              intro={testimonials.some((t) => !t.is_verbatim) ? "Themes summarised from public Google reviews, alongside feedback patients have agreed to share." : undefined} />
            <Reveal delay={0.1} className="mt-12"><Experiences items={testimonials} reviewsUrl={s.google_reviews_url} /></Reveal>
          </div>
        </section>
      )}

      {/* ------------------------------------------------------------------ CONTACT */}
      <section id="contact" aria-labelledby="contact-h" className="py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <SectionHeading eyebrow="Visit us" title={<span id="contact-h">Find SPYNUS in Chikkanagamangala</span>} />
          <div className="mt-10 grid gap-5 lg:grid-cols-[1fr_1.3fr]">
            <Reveal>
              <div className="flex h-full flex-col gap-5 rounded-[1.5rem] border border-line/80 bg-white p-6 shadow-soft sm:p-8">
                <div className="flex gap-4">
                  <MapPin className="mt-0.5 size-5 shrink-0 text-teal-600" />
                  <div><p className="font-semibold">Address</p><address className="mt-1 not-italic leading-relaxed text-muted">{s.clinic_name}<br />{fullAddress(s)}</address></div>
                </div>
                <div className="flex gap-4">
                  <Clock className="mt-0.5 size-5 shrink-0 text-teal-600" />
                  <div className="w-full">
                    <p className="font-semibold">Clinic hours</p>
                    {s.hours_confirmed ? (
                      <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-6 gap-y-1 text-sm">
                        {[1, 2, 3, 4, 5, 6, 0].map((d) => {
                          const h = s.working_hours[String(d) as keyof typeof s.working_hours];
                          return (
                            <div key={d} className="contents">
                              <dt className="text-muted">{DAYS[d]}</dt>
                              <dd className="text-ink">{h ? `${t12(h.open)} – ${t12(h.close)}${h.breaks?.length ? ` (break ${h.breaks.map((b) => `${t12(b.start)}–${t12(b.end)}`).join(", ")})` : ""}` : "Closed"}</dd>
                            </div>
                          );
                        })}
                      </dl>
                    ) : (
                      <p className="mt-1 text-sm text-muted">Available appointment times are shown live when you book. Please call to confirm walk-in hours.</p>
                    )}
                  </div>
                </div>
                <div className="mt-auto grid gap-2 sm:grid-cols-2">
                  <Button asChild><a href={`tel:${s.phone}`}><Phone /> Call {formatPhoneDisplay(s.phone)}</a></Button>
                  <Button asChild variant="outline"><a href={maps.directions} target="_blank" rel="noopener noreferrer"><Navigation /> Get directions</a></Button>
                  {wa && <Button asChild variant="soft" className="sm:col-span-2"><a href={wa} target="_blank" rel="noopener noreferrer"><MessageCircle /> Message on WhatsApp</a></Button>}
                  <Button asChild variant="teal" className="sm:col-span-2"><Link href="/book"><CalendarCheck /> Book Your Appointment</Link></Button>
                </div>
              </div>
            </Reveal>
            <Reveal delay={0.08}>
              <div className="h-[22rem] overflow-hidden rounded-[1.5rem] border border-line/80 bg-cream shadow-soft lg:h-full lg:min-h-[26rem]">
                <iframe title={`Map showing ${s.clinic_name}`} src={maps.embed} className="h-full w-full border-0" loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
              </div>
            </Reveal>
          </div>
        </div>
      </section>
    </>
  );
}
