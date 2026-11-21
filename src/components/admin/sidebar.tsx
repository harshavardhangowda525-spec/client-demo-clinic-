"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { BarChart3, CalendarDays, ExternalLink, LayoutDashboard, ListChecks, LogOut, Menu, Settings, Stethoscope, X } from "lucide-react";
import { Logo } from "@/components/site/logo";
import { logoutAction } from "@/app/admin/actions";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/appointments", label: "Appointments", icon: ListChecks },
  { href: "/admin/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/admin/services", label: "Services", icon: Stethoscope },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

export function Sidebar({ name, email, calendar }: { name: string; email: string; calendar: "connected" | "disconnected" | "error" }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const nav = (
    <nav className="flex flex-1 flex-col gap-1" aria-label="Admin">
      {NAV.map((n) => {
        const active = n.href === "/admin" ? path === "/admin" : path.startsWith(n.href);
        return (
          <Link key={n.href} href={n.href} onClick={() => setOpen(false)} aria-current={active ? "page" : undefined}
            className={cn("group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
              active ? "bg-ink text-white shadow-soft" : "text-ink-2 hover:bg-ink/5")}>
            <n.icon className={cn("size-4.5", active ? "text-glow" : "text-muted group-hover:text-ink")} /> {n.label}
          </Link>
        );
      })}
      <div className="mt-auto space-y-3 pt-6">
        <Link href="/admin/settings?tab=calendar" onClick={() => setOpen(false)} className="flex items-center gap-2 rounded-xl border border-line bg-white px-3 py-2 text-xs">
          <span className={cn("size-2 rounded-full", calendar === "connected" ? "bg-emerald-500" : calendar === "error" ? "bg-red-500" : "bg-ink/25")} />
          Google Calendar: <b className="font-semibold">{calendar === "connected" ? "Connected" : calendar === "error" ? "Needs attention" : "Not Connected"}</b>
        </Link>
        <a href="/" target="_blank" className="flex items-center gap-2 px-3 text-xs text-muted hover:text-ink"><ExternalLink className="size-3.5" /> View website</a>
        <div className="flex items-center justify-between gap-2 rounded-xl px-3 py-2">
          <div className="min-w-0 text-xs"><p className="truncate font-semibold text-ink">{name || "Admin"}</p><p className="truncate text-muted">{email}</p></div>
          <form action={logoutAction}><button className="inline-flex size-8 items-center justify-center rounded-lg text-muted hover:bg-ink/5 hover:text-ink" aria-label="Sign out"><LogOut className="size-4" /></button></form>
        </div>
      </div>
    </nav>
  );
  return (
    <>
      <div className="sticky top-0 z-30 flex items-center justify-between border-b border-line bg-[#f6f6f2]/90 px-4 py-3 backdrop-blur lg:hidden">
        <Logo />
        <button onClick={() => setOpen(true)} aria-label="Open menu" className="inline-flex size-10 items-center justify-center rounded-xl hover:bg-ink/5"><Menu className="size-5" /></button>
      </div>
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-line bg-white/60 p-4 backdrop-blur lg:flex">
        <div className="mb-8 px-2 pt-2"><Logo /></div>
        {nav}
      </aside>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-ink/30 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-72 flex-col bg-white p-4 shadow-lift">
            <div className="mb-6 flex items-center justify-between px-2 pt-1"><Logo /><button onClick={() => setOpen(false)} aria-label="Close menu" className="inline-flex size-9 items-center justify-center rounded-lg hover:bg-ink/5"><X className="size-5" /></button></div>
            {nav}
          </aside>
        </div>
      )}
    </>
  );
}
