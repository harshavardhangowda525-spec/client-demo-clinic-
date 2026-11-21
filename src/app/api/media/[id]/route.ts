import { q1 } from "@/lib/db";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new Response("Not found", { status: 404 });
  const row = await q1<{ content_type: string; b64: string }>("select content_type, encode(bytes, 'base64') as b64 from media where id = $1", [id]);
  if (!row) return new Response("Not found", { status: 404 });
  return new Response(Buffer.from(row.b64, "base64"), {
    headers: { "Content-Type": row.content_type, "Cache-Control": "public, max-age=31536000, immutable" },
  });
}
