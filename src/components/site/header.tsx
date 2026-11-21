"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { CalendarCheck, Menu, Phone, X } from "lucide-react";
import { Logo } from "./logo";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/#services", label: "Services" },
  { href: "/#about", label: "About" },
  { href: "/#experiences", label: "Patient experiences" },
  { href: "/#contact", label: "Contact" },
];

export function Header({ phone }: { phone: string }) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const path = usePathname();
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 12);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  useEffect(() => setOpen(false), [path]);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
  }, [open]);

  return (
    <header className={cn("fixed inset-x-0 top-0 z-50 transition-all duration-300", scrolled || open ? "py-2" : "py-4")}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className={cn("flex items-center justify-between rounded-2xl px-3 py-2 transition-all duration-300 sm:px-4",
          scrolled || open ? "glass" : "bg-transparent")}>
          <Link href="/" aria-label="SPYNUS Physiotherapy & Wellness Centre — home"><Logo /></Link>
          <nav aria-label="Main" className="hidden items-center gap-1 lg:flex">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} className="rounded-full px-4 py-2 text-sm font-medium text-ink-2 transition hover:bg-ink/5 hover:text-ink">
                {n.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <a href={`tel:${phone}`} className="hidden items-center gap-2 rounded-full px-3 py-2 text-sm font-medium text-ink-2 hover:bg-ink/5 md:inline-flex">
              <Phone className="size-4 text-teal-600" /> Call
            </a>
            <Button asChild size="sm" className="hidden sm:inline-flex">
              <Link href="/book"><CalendarCheck /> Book appointment</Link>
            </Button>
            <button type="button" className="inline-flex size-10 items-center justify-center rounded-full hover:bg-ink/5 lg:hidden"
              aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open} aria-controls="mobile-nav" onClick={() => setOpen((v) => !v)}>
              {open ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
          </div>
        </div>
        <AnimatePresence>
          {open && (
            <motion.nav id="mobile-nav" aria-label="Mobile"
              initial={{ opacity: 0, y: -8, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -8, scale: 0.98 }}
              transition={{ duration: 0.2 }} className="glass mt-2 rounded-2xl p-2 lg:hidden">
              {NAV.map((n, i) => (
                <motion.div key={n.href} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.03 * i }}>
                  <Link href={n.href} onClick={() => setOpen(false)} className="block rounded-xl px-4 py-3 text-base font-medium text-ink hover:bg-ink/5">{n.label}</Link>
                </motion.div>
              ))}
              <div className="grid grid-cols-2 gap-2 p-2">
                <Button asChild variant="outline"><a href={`tel:${phone}`}><Phone /> Call</a></Button>
                <Button asChild><Link href="/book" onClick={() => setOpen(false)}><CalendarCheck /> Book</Link></Button>
              </div>
            </motion.nav>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
}
