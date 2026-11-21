// Applies SQL files in db/migrations in order, once each.
import "dotenv/config";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { Pool } from "@neondatabase/serverless";

const url = process.env.DATABASE_URL;
if (!url) { console.error("DATABASE_URL is not set"); process.exit(1); }
const pool = new Pool({ connectionString: url });
const dir = join(process.cwd(), "db", "migrations");

const client = await pool.connect();
try {
  await client.query("create table if not exists schema_migrations (name text primary key, applied_at timestamptz not null default now())");
  const done = new Set((await client.query("select name from schema_migrations")).rows.map((r) => r.name));
  for (const file of readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()) {
    if (done.has(file)) { console.log(`skip  ${file}`); continue; }
    const sql = readFileSync(join(dir, file), "utf8");
    await client.query("begin");
    try {
      await client.query(sql);
      await client.query("insert into schema_migrations (name) values ($1)", [file]);
      await client.query("commit");
      console.log(`apply ${file}`);
    } catch (e) {
      await client.query("rollback");
      throw e;
    }
  }
} finally {
  client.release();
  await pool.end();
}
