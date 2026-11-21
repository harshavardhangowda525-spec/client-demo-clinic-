import "server-only";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

function key() {
  const raw = process.env.TOKEN_ENCRYPTION_KEY;
  if (!raw) throw new Error("TOKEN_ENCRYPTION_KEY is not configured");
  const k = Buffer.from(raw, "base64");
  if (k.length !== 32) throw new Error("TOKEN_ENCRYPTION_KEY must be 32 bytes, base64 encoded");
  return k;
}

/** AES-256-GCM. Output: v1.<iv>.<tag>.<ciphertext> (base64url) */
export function encrypt(plain: string): string {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", key(), iv);
  const enc = Buffer.concat([c.update(plain, "utf8"), c.final()]);
  return ["v1", iv.toString("base64url"), c.getAuthTag().toString("base64url"), enc.toString("base64url")].join(".");
}

export function decrypt(payload: string): string {
  const [v, iv, tag, data] = payload.split(".");
  if (v !== "v1") throw new Error("Unknown token format");
  const d = createDecipheriv("aes-256-gcm", key(), Buffer.from(iv, "base64url"));
  d.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([d.update(Buffer.from(data, "base64url")), d.final()]).toString("utf8");
}
