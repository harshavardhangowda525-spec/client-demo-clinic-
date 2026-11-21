import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { randomBytes } from "node:crypto";
import { getAdmin } from "@/lib/auth";
import { buildAuthUrl, googleConfigured } from "@/lib/google";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const admin = await getAdmin();
  if (!admin) return NextResponse.redirect(new URL("/admin/login", req.url));
  if (!googleConfigured()) {
    return NextResponse.redirect(new URL("/admin/settings?tab=calendar&google=not_configured", req.url));
  }
  const state = randomBytes(24).toString("base64url");
  (await cookies()).set("g_oauth_state", `${state}.${admin.id}`, {
    httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/api/admin/google", maxAge: 600,
  });
  const hint = new URL(req.url).searchParams.get("login_hint")?.trim().toLowerCase() ?? "";
  const loginHint = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,}$/.test(hint) ? hint : null;
  return NextResponse.redirect(buildAuthUrl(state, loginHint));
}
