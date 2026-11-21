import { Badge } from "@/components/ui/misc";
import type { AppointmentStatus, SyncStatus } from "@/lib/types";

export const STATUS_META: Record<AppointmentStatus, { label: string; tone: "amber" | "teal" | "green" | "red" | "gray"; dot: string }> = {
  pending: { label: "Pending", tone: "amber", dot: "bg-amber-500" },
  confirmed: { label: "Confirmed", tone: "teal", dot: "bg-teal-500" },
  completed: { label: "Completed", tone: "green", dot: "bg-emerald-600" },
  cancelled: { label: "Cancelled", tone: "red", dot: "bg-red-500" },
  no_show: { label: "No-show", tone: "gray", dot: "bg-ink/40" },
};

export function StatusBadge({ s }: { s: AppointmentStatus }) {
  const m = STATUS_META[s];
  return <Badge tone={m.tone}><span className={`size-1.5 rounded-full ${m.dot}`} />{m.label}</Badge>;
}

const SYNC: Record<SyncStatus, { label: string; tone: "gray" | "amber" | "green" | "red" | "blue" }> = {
  not_connected: { label: "Not synced · calendar not connected", tone: "gray" },
  pending: { label: "Sync pending", tone: "amber" },
  synced: { label: "In Google Calendar", tone: "green" },
  failed: { label: "Sync failed", tone: "red" },
  removed: { label: "Removed from calendar", tone: "blue" },
};

export function SyncBadge({ s, short }: { s: SyncStatus; short?: boolean }) {
  const m = SYNC[s];
  return <Badge tone={m.tone} title={m.label}>{short ? m.label.split(" · ")[0] : m.label}</Badge>;
}
