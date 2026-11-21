import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { q } from "@/lib/db";
import { retryFailedSyncs } from "@/lib/booking";

export const dynamic = "force-dynamic";

/** Scheduled by Vercel Cron: retries calendar syncs, applies data retention, prunes login attempts. */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  if (!secret || auth.length !== expected.length || !timingSafeEqual(Buffer.from(auth), Buffer.from(expected))) {
    return NextResponse.json({ error: "Not authorised" }, { status: 401 });
  }
  const sync = await retryFailedSyncs(50);
  const anonymised = await q(
    `update appointments set patient_name = 'Anonymised', patient_phone = '+000000000', patient_email = null, notes = null, anonymized_at = now()
      where anonymized_at is null and ends_at < now() - make_interval(months => (select data_retention_months from clinic_settings where id = 1)) returning id`,
  );
  await q("delete from login_attempts where created_at < now() - interval '30 days'");
  return NextResponse.json({ sync, anonymised: anonymised.length });
}
