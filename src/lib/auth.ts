import "server-only";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { q, q1 } from "./db";
import { SESSION_COOKIE, SESSION_TTL_SECONDS, signSession, verifySession } from "./session";

export type AdminUser = { id: string; email: string; name: string; role: "owner" | "admin"; session_version: number };

export class AuthError extends Error {}

/** Returns the current admin or null. Verifies signature, expiry, account status and session version. */
export async function getAdmin(): Promise<AdminUser | null> {
  const jar = await cookies();
  const claims = await verifySession(jar.get(SESSION_COOKIE)?.value);
  if (!claims) return null;
  const user = await q1<AdminUser>(
    "select id, email, name, role, session_version from admin_users where id = $1 and is_active",
    [claims.sub],
  );
  if (!user || user.session_version !== claims.ver) return null;
  return user;
}

/** For server components/pages. */
export async function requireAdminPage(): Promise<AdminUser> {
  const a = await getAdmin();
  if (!a) redirect("/admin/login");
  return a;
}

/** For server actions and route handlers. Throws if not signed in. */
export async function requireAdmin(): Promise<AdminUser> {
  const a = await getAdmin();
  if (!a) throw new AuthError("Not authorised");
  return a;
}

async function clientIp() {
  const h = await headers();
  return (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || h.get("x-real-ip") || "unknown";
}

const GENERIC = "Incorrect email or password.";
let dummyHash: string | null = null;
const getDummyHash = async () => (dummyHash ??= await bcrypt.hash("not-a-real-password", 12));

export async function login(emailRaw: string, password: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const email = emailRaw.trim().toLowerCase();
  const ip = await clientIp();
  const [{ by_email, by_ip }] = await q<{ by_email: number; by_ip: number }>(
    `select count(*) filter (where email = $1)::int as by_email, count(*) filter (where ip = $2)::int as by_ip
       from login_attempts where not success and created_at > now() - interval '15 minutes'`,
    [email, ip],
  );
  if (by_email >= 5 || by_ip >= 20) {
    return { ok: false, error: "Too many failed attempts. Please wait 15 minutes and try again." };
  }
  const user = await q1<{ id: string; password_hash: string; session_version: number; is_active: boolean }>(
    "select id, password_hash, session_version, is_active from admin_users where email = $1",
    [email],
  );
  // Always run bcrypt to keep timing similar whether or not the user exists.
  const valid = await bcrypt.compare(password, user?.password_hash ?? (await getDummyHash()));
  const success = !!user && user.is_active && valid;
  await q("insert into login_attempts (email, ip, success) values ($1, $2, $3)", [email, ip, success]);
  if (!success) return { ok: false, error: GENERIC };

  await q("update admin_users set last_login_at = now() where id = $1", [user!.id]);
  const token = await signSession({ sub: user!.id, ver: user!.session_version });
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
  return { ok: true };
}

export async function logout() {
  (await cookies()).delete(SESSION_COOKIE);
}

export async function changePassword(userId: string, current: string, next: string) {
  if (next.length < 10) return { ok: false as const, error: "New password must be at least 10 characters." };
  const u = await q1<{ password_hash: string }>("select password_hash from admin_users where id = $1", [userId]);
  if (!u || !(await bcrypt.compare(current, u.password_hash))) return { ok: false as const, error: "Current password is incorrect." };
  const hash = await bcrypt.hash(next, 12);
  const [row] = await q<{ session_version: number }>(
    "update admin_users set password_hash = $2, session_version = session_version + 1 where id = $1 returning session_version",
    [userId, hash],
  );
  const token = await signSession({ sub: userId, ver: row.session_version });
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: SESSION_TTL_SECONDS,
  });
  return { ok: true as const };
}
