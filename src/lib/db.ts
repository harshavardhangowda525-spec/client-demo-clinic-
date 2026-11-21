import "server-only";
import { neon, type NeonQueryFunction } from "@neondatabase/serverless";

let _sql: NeonQueryFunction<false, false> | null = null;

/** Server-only SQL client (HTTP). Never import this from client components. */
export function db() {
  if (!_sql) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is not configured");
    _sql = neon(url);
  }
  return _sql;
}

/** Run a parameterised query: q("select * from x where id = $1", [id]) */
export async function q<T = Record<string, unknown>>(text: string, params: unknown[] = []): Promise<T[]> {
  return (await db().query(text, params)) as T[];
}

export async function q1<T = Record<string, unknown>>(text: string, params: unknown[] = []): Promise<T | null> {
  const rows = await q<T>(text, params);
  return rows[0] ?? null;
}

export function pgErrorCode(e: unknown): string | undefined {
  return typeof e === "object" && e && "code" in e ? String((e as { code: unknown }).code) : undefined;
}
