"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarCheck, Phone } from "lucide-react";

export function MobileBookBar({ phone }: { phone: string }) {
  const path = usePathname();
  if (path.startsWith("/book")) return null;
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line/70 bg-ivory/90 px-4 pb-[calc(env(safe-area-inset-bottom)+10px)] pt-2.5 backdrop-blur-xl sm:hidden">
      <div className="flex gap-2">
        <a href={`tel:${phone}`} aria-label="Call the clinic" className="inline-flex h-12 w-14 items-center justify-center rounded-full border border-line bg-white text-ink">
          <Phone className="size-5 text-teal-600" />
        </a>
        <Link href="/book" className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-full bg-ink font-semibold text-white shadow-lift active:scale-[0.98]">
          <CalendarCheck className="size-5" /> Book Your Appointment
        </Link>
      </div>
    </div>
  );
}
