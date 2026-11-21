# SPYNUS Physiotherapy & Wellness Centre

Website, online appointment booking, admin dashboard and Google Calendar sync for
**SPYNUS Physiotherapy & Wellness Centre**, Rayasandra Main Road, Chikkanagamangala, Bengaluru 560099.

- **Public site:** homepage, service pages, a 5-step booking flow, privacy notice, SEO (JSON-LD, sitemap, robots).
- **Admin (`/admin`):** overview stats, appointment management, day/week/month calendar, analytics, services, clinic settings.
- **Google Calendar:** OAuth connection, calendar picker, event create/update/delete, busy-time blocking, retries.

## Stack

| Layer | Choice |
| --- | --- |
| Frontend | Next.js 15 (App Router) · TypeScript · Tailwind CSS v4 · shadcn-style primitives (Radix) · Motion for React · Lucide |
| Backend | Next.js route handlers + server actions |
| Database | Neon Postgres (server-only connection) |
| Auth | Clinic admin accounts with bcrypt hashing + signed, httpOnly session cookies (jose) |
| Integrations | Google Calendar API (OAuth 2.0), Resend (optional email), Google Maps embed |
| Hosting | Vercel (`vercel.json` sets the Singapore region and a daily maintenance cron) |

## How booking works (and why it can't double-book)

1. Available slots are computed on the server (`src/lib/slots.ts`) from:
   - working hours and breaks,
   - holidays and blocked periods,
   - minimum notice and booking window,
   - existing appointments plus the buffer after each,
   - busy events in the connected Google Calendar.

   All times use Asia/Kolkata.
2. On confirm, the server re-checks that exact slot.
3. The insert is protected by a Postgres **exclusion constraint** (`appointments_no_overlap`), so two overlapping active appointments can't exist, even when requests arrive at the same moment. A load test of 5 simultaneous bookings for one slot produced exactly 1 success and 4 clean "slot just taken" responses.
4. The Google Calendar event is then created and its ID stored. If Google fails, the booking stays valid, is marked **Sync failed**, the admin is notified, and it can be retried from the dashboard or by the daily cron. It is never shown as synced.

## Security & privacy

- The database URL, session secret, Google client secret and refresh tokens exist only on the server.
- Refresh and access tokens are encrypted with AES-256-GCM before storage.
- Patients can't read any appointment data. The booking API returns only what the patient just submitted, and there is no public lookup endpoint.
- Every `/admin` page and admin API is checked twice:
  - Middleware verifies the signed session.
  - Each page and server action then re-checks the account and session version in the database.
- Logins are rate-limited (per email and per IP).
- Changing the password signs out all other sessions.
- Row Level Security is enabled with no policies on patient tables, so any non-owner role sees nothing.
- The booking form collects name, mobile, optional email and an optional short note. It asks for no medical history and requires consent to the privacy notice.
- A retention setting (default 24 months) anonymises old patient details daily.
- Google Calendar events carry only the service, time and booking reference. Including the patient's first name is opt-in.

## Local setup

```bash
npm install
```

```bash
cp .env.example .env.local
```

Fill in `DATABASE_URL`, `SESSION_SECRET`, `TOKEN_ENCRYPTION_KEY`; also copy them to `.env` for the scripts. Then:

```bash
npm run db:migrate
```

```bash
npm run admin:create -- owner@yourclinic.in "Owner Name"
```

The admin script prints a one-time generated password; change it under **Settings → Account**.

```bash
npm run dev
```

Other scripts: `npm test` (slot-engine unit tests), `npm run typecheck`, `npm run build`.

### Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | yes | Neon pooled connection string |
| `SESSION_SECRET` | yes | 32+ random chars (`openssl rand -base64 48`) |
| `TOKEN_ENCRYPTION_KEY` | yes | 32 bytes base64 (`openssl rand -base64 32`) for Google tokens |
| `NEXT_PUBLIC_SITE_URL` | yes | Public URL, e.g. `https://spynus.in` (used for the OAuth redirect, sitemap and emails) |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | for Calendar | OAuth web client |
| `RESEND_API_KEY`, `EMAIL_FROM` | optional | Transactional email |
| `CRON_SECRET` | recommended | Protects `/api/cron/maintenance` |

## Connecting the clinic's Google Calendar

1. Go to [Google Cloud Console](https://console.cloud.google.com/), create a project and enable the **Google Calendar API**.
2. Under **OAuth consent screen**, choose *External*, add the app name and support email, and add these scopes:
   - `openid`
   - `email`
   - `.../auth/calendar.events`
   - `.../auth/calendar.calendarlist.readonly`

   Add the clinic owner's Google account as a test user, or publish the app.
3. Under **Credentials**, choose **Create OAuth client ID** with type *Web application*, and add this authorised redirect URI:
   `https://YOUR-DOMAIN/api/admin/google/callback` (the exact value is shown in the admin under Settings → Calendar Integration).
4. Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in Vercel and redeploy.
5. Sign in at `/admin`, open **Settings → Calendar Integration**, click **Connect Google Calendar**, approve, then pick the calendar to use.
6. Click **Sync upcoming & failed appointments**. This pushes any bookings made before the calendar was connected.

The clinic's Google password is never seen or stored. **Disconnect** revokes the token and clears it from the database.

## Deploying to Vercel

1. Import the repository in Vercel (framework: Next.js).
2. Add the environment variables above for Production and Preview.
3. Run `npm run db:migrate` once against the production database, and create the owner admin.
4. Deploy, then set `NEXT_PUBLIC_SITE_URL` to the final domain, update the Google redirect URI to match, and redeploy.

## Before going live: items the clinic must confirm

These were **not** supplied as verified facts. They are seeded as editable, clearly flagged placeholders:

- **Services**: six provisional services derived from review themes, each marked *Needs review* in **Admin → Services**. Approve, edit, hide or delete them. No prices are shown.
- **Working hours**: seeded Mon–Sat 09:00–19:00 with a 13:00–14:00 break, marked unconfirmed. The website doesn't publish hours until **Hours confirmed** is switched on, but online slots use these hours, so check them first.
- **Team**: only "Dr. Swathi", with no qualifications. Add verified credentials, a bio and a photo, or hide the entry.
- **Testimonials**: five summaries of review themes, labelled on the site as "Summary, not a direct quote". Replace them with verbatim reviews the clinic has permission to publish.
- **WhatsApp button**: off until enabled in Settings.
- **Photography**: the hero uses an original animated illustration. Upload licensed clinic photos in Settings and Services.
- **Google rating** (4.9 · 65 reviews): from the supplied listing snapshot. Update it in Settings as it changes.

## Verification status

| Check | Status |
| --- | --- |
| Slot engine (hours, breaks, buffers, holidays, notice, window, external busy) | ✅ 8 unit tests |
| Patient books service → date → time → details → confirm (mobile, Playwright) | ✅ |
| Booking appears in admin; counts update | ✅ |
| Same slot can't be booked twice (5 concurrent requests) | ✅ 1 succeeded, 4 rejected |
| Admin login, wrong password rejected, admin APIs return 401 without a session | ✅ |
| Reschedule and cancel from the dashboard; cancelled slot released | ✅ |
| Google failure path: invalid credentials → booking kept, marked *Sync failed*, admin notified | ✅ (against Google's real token endpoint) |
| Unconnected calendar shown honestly as **Not Connected** | ✅ |
| Live Google event create/update/delete and busy-time blocking | ⚠️ **Not tested.** Code is complete, but no real Google OAuth credentials were available |
| Email delivery | ⚠️ Not tested. Needs a Resend key |
