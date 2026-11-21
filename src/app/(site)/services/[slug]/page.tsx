import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarCheck, Check, Clock, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ServiceIcon } from "@/components/site/service-icon";
import { MeshBackground } from "@/components/site/section";
import { Reveal } from "@/components/site/reveal";
import { getPublishedServices, getServiceBySlug, getSettings, mediaUrl } from "@/lib/data";
import { formatINR, formatPhoneDisplay } from "@/lib/utils";

export const revalidate = 300;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const s = await getServiceBySlug((await params).slug);
  if (!s) return { title: "Service not found" };
  return {
    title: `${s.name} in Bengaluru`,
    description: `${s.short_description} Book ${s.name.toLowerCase()} at SPYNUS Physiotherapy & Wellness Centre, Chikkanagamangala.`,
    alternates: { canonical: `/services/${s.slug}` },
  };
}

export default async function ServicePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [s, settings, all] = await Promise.all([getServiceBySlug(slug), getSettings(), getPublishedServices()]);
  if (!s) notFound();
  const img = mediaUrl(s.image_id);
  const price = formatINR(s.price_inr);
  const others = all.filter((x) => x.id !== s.id).slice(0, 3);
  return (
    <article className="grain relative overflow-hidden pb-24 pt-28 sm:pt-32">
      <MeshBackground className="opacity-60" />
      <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
        <Link href="/services" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-ink"><ArrowLeft className="size-4" /> All services</Link>
        <div className="mt-6 grid gap-10 lg:grid-cols-[1.3fr_1fr]">
          <div>
            <Reveal>
              <span className="inline-flex size-14 items-center justify-center rounded-2xl bg-white text-teal-600 shadow-soft"><ServiceIcon name={s.icon} className="size-7" /></span>
              <h1 className="mt-5 text-4xl font-extrabold leading-tight sm:text-5xl">{s.name}</h1>
              <p className="mt-4 text-lg leading-relaxed text-muted">{s.short_description}</p>
            </Reveal>
            {img && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={img} alt="" className="mt-8 aspect-[16/9] w-full rounded-2xl object-cover shadow-soft" />
            )}
            <Reveal delay={0.08}><p className="mt-8 leading-relaxed text-ink-2">{s.description}</p></Reveal>
            {s.conditions.length > 0 && (
              <Reveal delay={0.12}>
                <h2 className="mt-10 text-xl font-bold">Common concerns we help with</h2>
                <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                  {s.conditions.map((c) => (
                    <li key={c} className="flex items-start gap-2.5 rounded-xl border border-line/80 bg-white/80 px-4 py-3 text-sm">
                      <Check className="mt-0.5 size-4 shrink-0 text-teal-600" /> {c}
                    </li>
                  ))}
                </ul>
              </Reveal>
            )}
            {s.approach && (
              <Reveal delay={0.14}>
                <h2 className="mt-10 text-xl font-bold">Our treatment approach</h2>
                <p className="mt-3 leading-relaxed text-ink-2">{s.approach}</p>
              </Reveal>
            )}
            <p className="mt-10 rounded-xl bg-cream/80 px-4 py-3 text-xs leading-relaxed text-muted">
              This information is general. Your physiotherapist will recommend a plan after assessing you in person; results vary from person to person.
            </p>
          </div>
          <aside className="lg:pt-20">
            <div className="sticky top-28 rounded-[1.5rem] border border-white bg-white/85 p-6 shadow-lift backdrop-blur">
              <p className="text-xs font-semibold uppercase tracking-wider text-teal-700">Book this service</p>
              <p className="mt-2 font-display text-xl font-bold">{s.name}</p>
              <div className="mt-3 flex flex-wrap gap-3 text-sm text-muted">
                <span className="inline-flex items-center gap-1"><Clock className="size-4" />{s.duration_minutes} minutes</span>
                {price && <span className="font-semibold text-ink">{price}</span>}
              </div>
              <div className="mt-6 grid gap-2">
                {s.online_booking && settings.online_booking_enabled ? (
                  <Button asChild size="lg"><Link href={`/book?service=${s.slug}`}><CalendarCheck /> Book This Service</Link></Button>
                ) : null}
                <Button asChild variant="outline"><a href={`tel:${settings.phone}`}><Phone /> Call {formatPhoneDisplay(settings.phone)}</a></Button>
              </div>
            </div>
          </aside>
        </div>
        {others.length > 0 && (
          <div className="mt-20">
            <h2 className="text-2xl font-bold">Other services</h2>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              {others.map((o) => (
                <Link key={o.id} href={`/services/${o.slug}`} className="group flex items-center gap-3 rounded-2xl border border-line bg-white p-4 transition hover:-translate-y-0.5 hover:shadow-soft">
                  <ServiceIcon name={o.icon} className="size-5 text-teal-600" /><span className="font-semibold group-hover:text-teal-700">{o.name}</span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </article>
  );
}
