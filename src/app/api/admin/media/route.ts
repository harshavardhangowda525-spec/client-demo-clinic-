import { NextResponse } from "next/server";
import { AuthError, requireAdmin } from "@/lib/auth";
import { q1 } from "@/lib/db";

export const dynamic = "force-dynamic";
const TYPES = ["image/jpeg", "image/png", "image/webp"];

export async function POST(req: Request) {
  try {
    await requireAdmin();
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: "Not authorised" }, { status: 401 });
    throw e;
  }
  const origin = req.headers.get("origin");
  if (origin && new URL(origin).host !== req.headers.get("host")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const fd = await req.formData();
  const file = fd.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "No file" }, { status: 400 });
  if (!TYPES.includes(file.type)) return NextResponse.json({ error: "Use a JPEG, PNG or WebP image" }, { status: 415 });
  if (file.size > 2_000_000) return NextResponse.json({ error: "Image must be under 2 MB" }, { status: 413 });
  const b64 = Buffer.from(await file.arrayBuffer()).toString("base64");
  const row = await q1<{ id: string }>("insert into media (content_type, bytes, alt) values ($1, decode($2, 'base64'), $3) returning id", [
    file.type, b64, String(fd.get("alt") ?? "").slice(0, 200),
  ]);
  return NextResponse.json({ id: row!.id, url: `/api/media/${row!.id}` }, { status: 201 });
}
