"use client";
import { useRef, useState } from "react";
import { ImageIcon, Loader2, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Resizes in the browser (max 1600px, WebP) before uploading, keeping files small and fast. */
async function shrink(file: File): Promise<Blob> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas");
  c.width = Math.round(bmp.width * scale); c.height = Math.round(bmp.height * scale);
  c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
  return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error("Could not process image"))), "image/webp", 0.82));
}

export function ImageUpload({ value, onChange, label = "Image" }: { value: string | null; onChange: (id: string | null) => void; label?: string }) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const pick = async (f: File) => {
    setBusy(true); setErr(null);
    try {
      const blob = await shrink(f);
      const fd = new FormData();
      fd.append("file", new File([blob], "image.webp", { type: "image/webp" }));
      const r = await fetch("/api/admin/media", { method: "POST", body: fd });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      onChange(d.id);
    } catch (e) { setErr((e as Error).message || "Upload failed"); } finally { setBusy(false); }
  };
  return (
    <div>
      <p className="mb-1.5 text-sm font-medium">{label}</p>
      <div className="flex items-center gap-3">
        <div className="flex size-20 items-center justify-center overflow-hidden rounded-xl border border-line bg-cream">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {value ? <img src={`/api/media/${value}`} alt="" className="h-full w-full object-cover" /> : <ImageIcon className="size-6 text-muted" />}
        </div>
        <div className="flex flex-col gap-2">
          <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => ref.current?.click()}>{busy ? <Loader2 className="animate-spin" /> : <Upload />} {value ? "Replace" : "Upload"}</Button>
          {value && <Button type="button" size="sm" variant="ghost" onClick={() => onChange(null)}><Trash2 /> Remove</Button>}
        </div>
        <input ref={ref} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => e.target.files?.[0] && pick(e.target.files[0])} />
      </div>
      {err && <p className="mt-1.5 text-sm text-red-600">{err}</p>}
      <p className="mt-1.5 text-xs text-muted">Use only photos you own or are licensed to use.</p>
    </div>
  );
}
