"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Check, Clock, Eye, EyeOff, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { Sheet } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge, Card } from "@/components/ui/misc";
import { Field, Input, Select, Switch, Textarea } from "@/components/ui/field";
import { ServiceIcon, SERVICE_ICONS } from "@/components/site/service-icon";
import { ImageUpload } from "./image-upload";
import { useToast } from "./toast";
import { approveServiceAction, deleteServiceAction, saveServiceAction } from "@/app/admin/actions";
import type { Service } from "@/lib/types";
import { formatINR } from "@/lib/utils";

type Draft = Omit<Service, "id" | "needs_review" | "price_inr" | "conditions"> & { id?: string; price_inr: string; conditions: string };
const blank: Draft = { slug: "", name: "", short_description: "", description: "", conditions: "", approach: "", duration_minutes: 45, price_inr: "", image_id: null, icon: "activity", is_published: false, online_booking: true, sort_order: 10 };
const slugify = (s: string) => s.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export function ServicesManager({ services }: { services: Service[] }) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  const [edit, setEdit] = useState<Draft | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const review = services.filter((s) => s.needs_review).length;

  const save = () => start(async () => {
    if (!edit) return;
    setErr(null);
    const r = await saveServiceAction({ ...edit, conditions: edit.conditions.split("\n").map((x) => x.trim()).filter(Boolean), price_inr: edit.price_inr === "" ? null : edit.price_inr });
    if (!r.ok) { setErr(r.error); return; }
    toast("ok", r.message ?? "Saved"); setEdit(null); router.refresh();
  });
  const act = (fn: () => Promise<{ ok: boolean; message?: string; error?: string }>) => start(async () => {
    const r = await fn(); toast(r.ok ? "ok" : "err", r.ok ? r.message ?? "Done" : r.error!); router.refresh();
  });

  return (
    <>
      {review > 0 && (
        <div className="mb-5 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <p><b>{review} provisional service{review > 1 ? "s" : ""}</b> were created from patient-review themes and have not been confirmed by the clinic. Review each one — edit, approve, unpublish or delete — before launch.</p>
        </div>
      )}
      <div className="mb-4 flex justify-end"><Button onClick={() => { setErr(null); setEdit({ ...blank }); }}><Plus /> Add service</Button></div>
      <div className="grid gap-3">
        {services.map((s) => (
          <Card key={s.id} className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
            <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-teal-50 to-lavender-100 text-teal-700">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {s.image_id ? <img src={`/api/media/${s.image_id}`} alt="" className="size-12 rounded-xl object-cover" /> : <ServiceIcon name={s.icon} className="size-5" />}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-semibold">{s.name}</p>
                {s.is_published ? <Badge tone="green"><Eye className="size-3" /> Published</Badge> : <Badge><EyeOff className="size-3" /> Hidden</Badge>}
                {!s.online_booking && <Badge tone="amber">Online booking off</Badge>}
                {s.needs_review && <Badge tone="amber">Needs review</Badge>}
              </div>
              <p className="mt-0.5 truncate text-sm text-muted">{s.short_description}</p>
              <p className="mt-1 flex items-center gap-3 text-xs text-muted"><span className="inline-flex items-center gap-1"><Clock className="size-3" />{s.duration_minutes} min</span>{formatINR(s.price_inr) ?? "No price shown"}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {s.needs_review && <Button size="sm" variant="soft" disabled={pending} onClick={() => act(() => approveServiceAction(s.id))}><Check /> Approve</Button>}
              <Button size="sm" variant="outline" onClick={() => { setErr(null); setEdit({ ...s, price_inr: s.price_inr ?? "", conditions: s.conditions.join("\n") }); }}><Pencil /> Edit</Button>
              <Button size="sm" variant="ghost" className="text-red-700" disabled={pending} onClick={() => confirm(`Delete “${s.name}”?`) && act(() => deleteServiceAction(s.id))}><Trash2 /></Button>
            </div>
          </Card>
        ))}
      </div>

      <Sheet open={!!edit} onOpenChange={(v) => !v && setEdit(null)} title={edit?.id ? "Edit service" : "New service"}>
        {edit && (
          <div className="space-y-4">
            <Field label="Name" htmlFor="sn"><Input id="sn" value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value, slug: edit.id ? edit.slug : slugify(e.target.value) })} /></Field>
            <Field label="URL slug" htmlFor="ss" hint={`/services/${edit.slug || "…"}`}><Input id="ss" value={edit.slug} onChange={(e) => setEdit({ ...edit, slug: slugify(e.target.value) })} /></Field>
            <Field label="Short description" htmlFor="ssd"><Textarea id="ssd" rows={2} value={edit.short_description} onChange={(e) => setEdit({ ...edit, short_description: e.target.value })} maxLength={300} /></Field>
            <Field label="Full description" htmlFor="sd"><Textarea id="sd" rows={4} value={edit.description} onChange={(e) => setEdit({ ...edit, description: e.target.value })} /></Field>
            <Field label="Common symptoms or conditions (one per line)" htmlFor="sc"><Textarea id="sc" rows={4} value={edit.conditions} onChange={(e) => setEdit({ ...edit, conditions: e.target.value })} /></Field>
            <Field label="Treatment approach" htmlFor="sa"><Textarea id="sa" rows={3} value={edit.approach} onChange={(e) => setEdit({ ...edit, approach: e.target.value })} /></Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Duration (minutes)" htmlFor="sdu"><Input id="sdu" type="number" min={10} max={480} value={edit.duration_minutes} onChange={(e) => setEdit({ ...edit, duration_minutes: Number(e.target.value) })} /></Field>
              <Field label="Price ₹ (optional)" htmlFor="sp" hint="Leave blank to hide"><Input id="sp" type="number" min={0} value={edit.price_inr} onChange={(e) => setEdit({ ...edit, price_inr: e.target.value })} /></Field>
              <Field label="Icon" htmlFor="si"><Select id="si" value={edit.icon} onChange={(e) => setEdit({ ...edit, icon: e.target.value })}>{Object.keys(SERVICE_ICONS).map((k) => <option key={k} value={k}>{k}</option>)}</Select></Field>
              <Field label="Display order" htmlFor="so"><Input id="so" type="number" value={edit.sort_order} onChange={(e) => setEdit({ ...edit, sort_order: Number(e.target.value) })} /></Field>
            </div>
            <ImageUpload value={edit.image_id} onChange={(id) => setEdit({ ...edit, image_id: id })} />
            <div className="space-y-3 rounded-xl border border-line p-4">
              <label className="flex items-center justify-between gap-4 text-sm"><span><b>Published</b><br /><span className="text-muted">Show on the website</span></span><Switch label="Published" checked={edit.is_published} onChange={(v) => setEdit({ ...edit, is_published: v })} /></label>
              <label className="flex items-center justify-between gap-4 text-sm"><span><b>Online booking</b><br /><span className="text-muted">Patients can book this online</span></span><Switch label="Online booking" checked={edit.online_booking} onChange={(v) => setEdit({ ...edit, online_booking: v })} /></label>
            </div>
            {err && <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{err}</p>}
            <Button className="w-full" disabled={pending} onClick={save}>{pending && <Loader2 className="animate-spin" />} Save service</Button>
          </div>
        )}
      </Sheet>
    </>
  );
}
