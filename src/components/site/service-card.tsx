import Link from "next/link";
import { ArrowRight, CalendarCheck, Clock } from "lucide-react";
import { ServiceIcon } from "./service-icon";
import type { Service } from "@/lib/types";
import { mediaUrl } from "@/lib/data";
import { formatINR } from "@/lib/utils";

const TINTS = [
  "from-teal-100 via-mint-100 to-white",
  "from-lavender-200 via-lavender-100 to-white",
  "from-mint-200 via-teal-50 to-white",
];

export function ServiceCard({ s, i }: { s: Service; i: number }) {
  const img = mediaUrl(s.image_id);
  const price = formatINR(s.price_inr);
  return (
    <article className="ring-gradient group relative flex h-full flex-col overflow-hidden rounded-[1.4rem] border border-line/80 bg-white shadow-soft transition-all duration-500 [transform-style:preserve-3d] hover:-translate-y-1.5 hover:shadow-lift hover:[transform:perspective(900px)_rotateX(2deg)_translateY(-6px)]">
      <div className={`relative h-40 overflow-hidden bg-gradient-to-br ${TINTS[i % TINTS.length]}`}>
        {img ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={img} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
        ) : (
          <>
            <div className="absolute -right-10 -top-10 size-44 rounded-full bg-white/60 blur-2xl transition-transform duration-700 group-hover:scale-125" />
            <div className="absolute bottom-0 left-6 h-24 w-24 rounded-full border border-white/80" />
            <div className="absolute bottom-6 right-6 h-14 w-28 rounded-full border border-teal-400/20" />
            <div className="absolute left-6 top-6 inline-flex size-14 items-center justify-center rounded-2xl bg-white shadow-soft transition-transform duration-500 group-hover:-rotate-6 group-hover:scale-110">
              <ServiceIcon name={s.icon} className="size-7 text-teal-600" />
            </div>
          </>
        )}
      </div>
      <div className="flex flex-1 flex-col p-6">
        <h3 className="text-lg font-bold">
          <Link href={`/services/${s.slug}`} className="after:absolute after:inset-0 focus:outline-none">{s.name}</Link>
        </h3>
        <p className="mt-2 flex-1 text-sm leading-relaxed text-muted">{s.short_description}</p>
        <div className="mt-4 flex flex-wrap items-center gap-3 text-xs font-medium text-muted">
          <span className="inline-flex items-center gap-1"><Clock className="size-3.5" /> {s.duration_minutes} min</span>
          {price && <span className="rounded-full bg-cream px-2 py-0.5 text-ink">{price}</span>}
        </div>
        <div className="relative z-10 mt-5 flex items-center justify-between gap-2">
          {s.online_booking ? (
            <Link href={`/book?service=${s.slug}`} className="inline-flex items-center gap-1.5 rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-700">
              <CalendarCheck className="size-4" /> Book this service
            </Link>
          ) : <span className="text-xs text-muted">Call to book</span>}
          <Link href={`/services/${s.slug}`} aria-label={`Learn more about ${s.name}`} className="inline-flex size-9 items-center justify-center rounded-full border border-line text-ink transition group-hover:border-teal-400 group-hover:text-teal-700">
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </div>
    </article>
  );
}
