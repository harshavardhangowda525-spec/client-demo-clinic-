import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { timingSafeEqual } from "node:crypto";
import { getAdmin } from "@/lib/auth";
import { exchangeCode } from "@/lib/google";
import { retryFailedSyncs } from "@/lib/booking";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const back = (status: string, msg?: string) => {
    const u = new URL("/admin/settings", req.url);
    u.searchParams.set("tab", "calendar");
    u.searchParams.set("google", status);
    if (msg) u.searchParams.set("message", msg.slice(0, 200));
    return NextResponse.redirect(u);
  };
  const admin = await getAdmin();
  if (!admin) return NextResponse.redirect(new URL("/admin/login", req.url));

  const jar = await cookies();
  const cookie = jar.get("g_oauth_state")?.value ?? "";
  jar.delete({ name: "g_oauth_state", path: "/api/admin/google" });
  const [state, adminId] = cookie.split(".");
  const got = req.nextUrl.searchParams.get("state") ?? "";
  const valid = state && got.length === state.length && timingSafeEqual(Buffer.from(state), Buffer.from(got)) && adminId === admin.id;
  if (!valid) return back("error", "The sign-in request expired or was invalid. Please try again.");

  const err = req.nextUrl.searchParams.get("error");
  if (err) return back("error", err === "access_denied" ? "Access was not granted." : `Google returned: ${err}`);
  const code = req.nextUrl.searchParams.get("code");
  if (!code) return back("error", "No authorisation code was returned.");

  try {
    await exchangeCode(code);
  } catch (e) {
    return back("error", (e as Error).message);
  }
  // Push any upcoming appointments that were booked while the calendar was disconnected.
  await retryFailedSyncs(50).catch(() => undefined);
  return back("connected");
}
