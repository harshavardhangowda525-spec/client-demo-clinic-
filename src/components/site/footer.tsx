import Link from "next/link";
import { Logo } from "./logo";
import type { ClinicSettings } from "@/lib/types";
import { fullAddress } from "@/lib/data";
import { formatPhoneDisplay } from "@/lib/utils";

export function Footer({ s }: { s: ClinicSettings }) {
  return (
    <footer className="relative border-t border-line/70 bg-cream/60 pb-28 pt-14 sm:pb-10">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <Logo />
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted">{s.tagline}</p>
        </div>
        <div>
          <h2 className="text-sm font-semibold">Visit</h2>
          <address className="mt-3 text-sm not-italic leading-relaxed text-muted">{fullAddress(s)}</address>
          <a href={`tel:${s.phone}`} className="mt-2 inline-block text-sm font-medium text-teal-700 hover:underline">{formatPhoneDisplay(s.phone)}</a>
        </div>
        <div>
          <h2 className="text-sm font-semibold">Explore</h2>
          <ul className="mt-3 space-y-2 text-sm text-muted">
            <li><Link className="hover:text-ink" href="/services">Services</Link></li>
            <li><Link className="hover:text-ink" href="/book">Book an appointment</Link></li>
            <li><Link className="hover:text-ink" href="/privacy">Privacy notice</Link></li>
          </ul>
        </div>
      </div>
      <div className="mx-auto mt-10 max-w-7xl px-4 text-xs text-muted sm:px-6">
        <p>© {new Date().getFullYear()} {s.clinic_name}. Information on this website is general and is not a substitute for an in-person assessment.</p>
      </div>
    </footer>
  );
}
