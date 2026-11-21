// Edge-safe session token helpers (used by middleware and server code).
import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "spynus_admin";
export const SESSION_TTL_SECONDS = 60 * 60 * 12;

function secret() {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) throw new Error("SESSION_SECRET must be set (32+ characters)");
  return new TextEncoder().encode(s);
}

export type SessionClaims = { sub: string; ver: number };

export async function signSession(c: SessionClaims) {
  return new SignJWT({ ver: c.ver })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(c.sub)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .setAudience("spynus-admin")
    .sign(secret());
}

export async function verifySession(token: string | undefined): Promise<SessionClaims | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret(), { audience: "spynus-admin", algorithms: ["HS256"] });
    if (!payload.sub) return null;
    return { sub: payload.sub, ver: Number(payload.ver) };
  } catch {
    return null;
  }
}
