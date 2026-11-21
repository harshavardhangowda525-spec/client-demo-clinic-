// Usage: npm run admin:create -- admin@example.com "Full Name" [password]
// If no password is given, a strong random one is generated and printed once.
import "dotenv/config";
import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { neon } from "@neondatabase/serverless";

const [email, name = "", pw] = process.argv.slice(2);
if (!email) { console.error("Usage: npm run admin:create -- <email> [name] [password]"); process.exit(1); }
const password = pw || randomBytes(12).toString("base64url");
if (password.length < 10) { console.error("Password must be at least 10 characters"); process.exit(1); }
const sql = neon(process.env.DATABASE_URL);
const hash = await bcrypt.hash(password, 12);
await sql`insert into admin_users (email, name, password_hash, role)
          values (${email.toLowerCase()}, ${name}, ${hash}, 'owner')
          on conflict (email) do update set password_hash = excluded.password_hash, is_active = true,
          session_version = admin_users.session_version + 1`;
console.log(`Admin ready: ${email.toLowerCase()}`);
if (!pw) console.log(`Generated password (shown once): ${password}`);
