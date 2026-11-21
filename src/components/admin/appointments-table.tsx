"use client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { Input, Select } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/misc";
import { AppointmentDrawer, fmtT, fmtWhen } from "./appointment-drawer";
import { StatusBadge, SyncBadge } from "./status";
import type { Appointment } from "@/lib/types";
import { formatPhoneDisplay } from "@/lib/utils";

export function AppointmentsTable({ rows, total, page, pageSize, filters }: {
  rows: Appointment[]; total: number; page: number; pageSize: number;
  filters: { q: string; status: string; sort: string; when: string; sync: string };
}) {
  const router = useRouter();
  const path = usePathname();
  const sp = useSearchParams();
  const [qv, setQv] = useState(filters.q);
  const [sel, setSel] = useState<Appointment | null>(null);
  const set = (k: string, v: string) => {
    const p = new URLSearchParams(sp);
    if (v) p.set(k, v); else p.delete(k);
    if (k !== "page") p.delete("page");
    p.delete("new");
    router.push(`${path}?${p}`);
  };
  // open drawer automatically if searching an exact reference
  useEffect(() => {
    if (rows.length === 1 && filters.q && rows[0].booking_ref.toLowerCase() === filters.q.toLowerCase()) setSel(rows[0]);
  }, [rows, filters.q]);
  // keep the drawer's data fresh after actions
  useEffect(() => { if (sel) setSel(rows.find((r) => r.id === sel.id) ?? null); }, [rows]); // eslint-disable-line react-hooks/exhaustive-deps

  const pages = Math.max(1, Math.ceil(total / pageSize));
  return (
    <Card className="overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-line p-4 lg:flex-row lg:items-center">
        <form className="relative flex-1" onSubmit={(e) => { e.preventDefault(); set("q", qv); }} role="search">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
          <Input aria-label="Search by patient, phone or booking reference" placeholder="Search patient, phone or reference…" value={qv} onChange={(e) => setQv(e.target.value)} className="pl-9" />
        </form>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Select aria-label="Status" value={filters.status} onChange={(e) => set("status", e.target.value)}>
            <option value="">All statuses</option><option value="pending">Pending</option><option value="confirmed">Confirmed</option>
            <option value="completed">Completed</option><option value="cancelled">Cancelled</option><option value="no_show">No-show</option>
          </Select>
          <Select aria-label="When" value={filters.when} onChange={(e) => set("when", e.target.value)}>
            <option value="">Any time</option><option value="upcoming">Upcoming</option><option value="past">Past</option>
          </Select>
          <Select aria-label="Calendar sync" value={filters.sync} onChange={(e) => set("sync", e.target.value)}>
            <option value="">Any sync state</option><option value="failed">Sync failed</option>
          </Select>
          <Select aria-label="Sort" value={filters.sort} onChange={(e) => set("sort", e.target.value)}>
            <option value="desc">Date: newest first</option><option value="asc">Date: oldest first</option><option value="created">Recently booked</option>
          </Select>
        </div>
      </div>

      {/* desktop table */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-sm">
          <thead className="bg-cream/50 text-left text-xs uppercase tracking-wider text-muted">
            <tr>{["Booking", "Patient", "Contact", "Service", "Date", "Time", "Status", "Calendar"].map((h) => <th key={h} scope="col" className="px-4 py-3 font-semibold">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((a) => (
              <tr key={a.id} onClick={() => setSel(a)} className="cursor-pointer transition hover:bg-teal-50/40">
                <td className="whitespace-nowrap px-4 py-3 font-mono text-xs font-semibold"><button className="hover:underline" onClick={(e) => { e.stopPropagation(); setSel(a); }}>{a.booking_ref}</button></td>
                <td className="px-4 py-3 font-semibold">{a.patient_name}</td>
                <td className="whitespace-nowrap px-4 py-3 text-muted"><div>{formatPhoneDisplay(a.patient_phone)}</div>{a.patient_email && <div className="max-w-44 truncate text-xs">{a.patient_email}</div>}</td>
                <td className="max-w-48 truncate px-4 py-3">{a.service_name}</td>
                <td className="whitespace-nowrap px-4 py-3">{fmtWhen(a.starts_at)}</td>
                <td className="whitespace-nowrap px-4 py-3 tabular-nums">{fmtT(a.starts_at)}</td>
                <td className="px-4 py-3"><StatusBadge s={a.status} /></td>
                <td className="whitespace-nowrap px-4 py-3"><SyncBadge s={a.sync_status} short /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* mobile cards */}
      <ul className="divide-y divide-line md:hidden">
        {rows.map((a) => (
          <li key={a.id}>
            <button className="w-full px-4 py-3 text-left" onClick={() => setSel(a)}>
              <div className="flex items-center justify-between gap-2"><span className="font-semibold">{a.patient_name}</span><StatusBadge s={a.status} /></div>
              <p className="mt-0.5 text-sm text-muted">{fmtWhen(a.starts_at)} · {fmtT(a.starts_at)}</p>
              <p className="text-xs text-muted">{a.service_name} · <span className="font-mono">{a.booking_ref}</span></p>
              <div className="mt-1.5"><SyncBadge s={a.sync_status} short /></div>
            </button>
          </li>
        ))}
      </ul>
      {!rows.length && <p className="py-16 text-center text-sm text-muted">No appointments match these filters.</p>}

      <div className="flex items-center justify-between border-t border-line px-4 py-3 text-sm">
        <span className="text-muted">Page {page} of {pages}</span>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => set("page", String(page - 1))}><ChevronLeft /> Prev</Button>
          <Button size="sm" variant="outline" disabled={page >= pages} onClick={() => set("page", String(page + 1))}>Next <ChevronRight /></Button>
        </div>
      </div>
      <AppointmentDrawer a={sel} onClose={() => setSel(null)} />
    </Card>
  );
}
