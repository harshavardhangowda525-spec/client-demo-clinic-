"use client";
import { useState } from "react";
import { AppointmentDrawer, fmtT, fmtWhen } from "./appointment-drawer";
import { StatusBadge, SyncBadge } from "./status";
import type { Appointment } from "@/lib/types";

export function AppointmentList({ items, empty, showDate = false }: { items: Appointment[]; empty: string; showDate?: boolean }) {
  const [sel, setSel] = useState<Appointment | null>(null);
  if (!items.length) return <p className="py-8 text-center text-sm text-muted">{empty}</p>;
  return (
    <>
      <ul className="divide-y divide-line">
        {items.map((a) => (
          <li key={a.id}>
            <button onClick={() => setSel(a)} className="flex w-full items-center gap-4 px-1 py-3 text-left transition hover:bg-ink/[0.02]">
              <div className="w-20 shrink-0">
                <p className="text-sm font-bold tabular-nums">{fmtT(a.starts_at)}</p>
                {showDate && <p className="text-xs text-muted">{fmtWhen(a.starts_at).replace(/, \d{4}$/, "")}</p>}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{a.patient_name}</p>
                <p className="truncate text-xs text-muted">{a.service_name} · {a.booking_ref}</p>
              </div>
              <div className="hidden flex-col items-end gap-1 sm:flex"><StatusBadge s={a.status} /><SyncBadge s={a.sync_status} short /></div>
            </button>
          </li>
        ))}
      </ul>
      <AppointmentDrawer a={sel} onClose={() => setSel(null)} />
    </>
  );
}
