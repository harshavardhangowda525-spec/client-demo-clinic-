"use client";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Bell, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { markNotificationsReadAction, retryAllSyncAction } from "@/app/admin/actions";
import { useToast } from "./toast";

export function Notifications({ items, failed }: { items: { id: string; message: string; created_at: string }[]; failed: number }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  const toast = useToast();
  if (!items.length && !failed) return null;
  return (
    <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="flex items-center gap-2 font-semibold text-amber-900"><Bell className="size-4" /> Needs attention</p>
        <div className="flex gap-2">
          {failed > 0 && (
            <Button size="sm" variant="outline" disabled={pending} onClick={() => start(async () => {
              const r = await retryAllSyncAction();
              if (r.ok) toast(r.data!.failed ? "err" : "ok", `Retried ${r.data!.total}: ${r.data!.synced} synced, ${r.data!.failed} still failing.`);
              else toast("err", r.error);
              router.refresh();
            })}><RefreshCw className={pending ? "animate-spin" : ""} /> Retry {failed} failed sync{failed > 1 ? "s" : ""}</Button>
          )}
          {items.length > 0 && <Button size="sm" variant="ghost" disabled={pending} onClick={() => start(async () => { await markNotificationsReadAction(); router.refresh(); })}>Dismiss all</Button>}
        </div>
      </div>
      <ul className="mt-3 space-y-1.5 text-sm text-amber-900">
        {items.slice(0, 5).map((n) => <li key={n.id} className="flex items-start gap-2"><AlertTriangle className="mt-0.5 size-3.5 shrink-0" />{n.message}</li>)}
      </ul>
    </div>
  );
}
