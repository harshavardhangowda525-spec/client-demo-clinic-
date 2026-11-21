-- SPYNUS Physiotherapy & Wellness Centre — core schema
-- All access happens from server code with a server-only connection string.
-- The browser never talks to the database directly.

create extension if not exists pgcrypto;
create extension if not exists btree_gist;

-- ---------------------------------------------------------------------------
-- Admin accounts & auth
-- ---------------------------------------------------------------------------
create table if not exists admin_users (
  id            uuid primary key default gen_random_uuid(),
  email         text not null unique check (email = lower(email)),
  name          text not null default '',
  password_hash text not null,
  role          text not null default 'admin' check (role in ('owner', 'admin')),
  is_active     boolean not null default true,
  session_version int not null default 1,         -- bump to revoke all sessions
  last_login_at timestamptz,
  created_at    timestamptz not null default now()
);

create table if not exists login_attempts (
  id         bigserial primary key,
  email      text not null,
  ip         text,
  success    boolean not null,
  created_at timestamptz not null default now()
);
create index if not exists login_attempts_email_time on login_attempts (email, created_at desc);
create index if not exists login_attempts_ip_time on login_attempts (ip, created_at desc);

-- ---------------------------------------------------------------------------
-- Media (small images stored in Postgres so no extra storage service is needed)
-- ---------------------------------------------------------------------------
create table if not exists media (
  id           uuid primary key default gen_random_uuid(),
  content_type text not null check (content_type in ('image/jpeg', 'image/png', 'image/webp')),
  bytes        bytea not null check (octet_length(bytes) <= 2000000),
  alt          text not null default '',
  created_at   timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Clinic settings (single row)
-- ---------------------------------------------------------------------------
create table if not exists clinic_settings (
  id                      int primary key default 1 check (id = 1),
  clinic_name             text not null,
  tagline                 text not null default '',
  phone                   text not null,
  whatsapp_number         text,
  whatsapp_enabled        boolean not null default false,     -- off until clinic confirms
  email                   text,
  address_line            text not null,
  locality                text not null,
  city                    text not null,
  state                   text not null,
  postal_code             text not null,
  country                 text not null default 'IN',
  maps_query              text not null,
  google_rating           numeric(2,1),
  google_review_count     int,
  google_reviews_url      text,
  rating_snapshot_note    text not null default '',
  about_story             text not null default '',
  about_approach          text not null default '',
  hero_image_id           uuid references media(id) on delete set null,
  -- Weekly hours: {"0": null | {"open":"09:00","close":"20:00","breaks":[{"start":"13:00","end":"16:00"}]}, ... } (0 = Sunday)
  working_hours           jsonb not null,
  hours_confirmed         boolean not null default false,     -- show hours publicly only once confirmed
  slot_interval_minutes   int not null default 30 check (slot_interval_minutes between 5 and 240),
  buffer_minutes          int not null default 10 check (buffer_minutes between 0 and 240),
  min_notice_minutes      int not null default 120 check (min_notice_minutes between 0 and 10080),
  booking_window_days     int not null default 30 check (booking_window_days between 1 and 365),
  auto_confirm_online     boolean not null default true,
  online_booking_enabled  boolean not null default true,
  notify_admin_emails     text not null default '',           -- comma separated
  send_patient_emails     boolean not null default true,
  data_retention_months   int not null default 24 check (data_retention_months between 3 and 120),
  updated_at              timestamptz not null default now()
);

-- Holidays & manually blocked periods
create table if not exists blocked_periods (
  id          uuid primary key default gen_random_uuid(),
  starts_at   timestamptz not null,
  ends_at     timestamptz not null,
  reason      text not null default '',
  kind        text not null default 'block' check (kind in ('holiday', 'block')),
  created_at  timestamptz not null default now(),
  check (ends_at > starts_at)
);
create index if not exists blocked_periods_range on blocked_periods using gist (tstzrange(starts_at, ends_at, '[)'));

-- ---------------------------------------------------------------------------
-- Practitioners (future multi-practitioner support)
-- ---------------------------------------------------------------------------
create table if not exists practitioners (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  title        text not null default '',
  credentials  text not null default '',          -- only verified qualifications
  bio          text not null default '',
  photo_id     uuid references media(id) on delete set null,
  is_public    boolean not null default false,
  sort_order   int not null default 0,
  created_at   timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Services
-- ---------------------------------------------------------------------------
create table if not exists services (
  id                uuid primary key default gen_random_uuid(),
  slug              text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name              text not null,
  short_description text not null default '',
  description       text not null default '',
  conditions        text[] not null default '{}',
  approach          text not null default '',
  duration_minutes  int not null default 45 check (duration_minutes between 10 and 480),
  price_inr         numeric(10,2) check (price_inr is null or price_inr >= 0),
  image_id          uuid references media(id) on delete set null,
  icon              text not null default 'activity',
  is_published      boolean not null default false,   -- requires admin approval before showing publicly
  online_booking    boolean not null default true,
  sort_order        int not null default 0,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Testimonials — only content the clinic has approved
-- ---------------------------------------------------------------------------
create table if not exists testimonials (
  id            uuid primary key default gen_random_uuid(),
  author_label  text not null,                    -- e.g. "Google reviewer" or first name, with consent
  content       text not null,
  rating        int check (rating between 1 and 5),
  is_verbatim   boolean not null default true,    -- false => rendered as a summary, never with quote marks
  source_url    text,
  is_approved   boolean not null default false,
  sort_order    int not null default 0,
  created_at    timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Appointments
-- ---------------------------------------------------------------------------
create table if not exists appointments (
  id                  uuid primary key default gen_random_uuid(),
  booking_ref         text not null unique,
  patient_name        text not null check (char_length(patient_name) between 2 and 120),
  patient_phone       text not null check (char_length(patient_phone) between 8 and 20),
  patient_email       text,
  notes               text check (notes is null or char_length(notes) <= 500),
  service_id          uuid references services(id) on delete set null,
  service_name        text not null,             -- snapshot at booking time
  practitioner_id     uuid references practitioners(id) on delete set null,
  resource_key        text not null default 'clinic',   -- the schedulable resource (clinic or a practitioner)
  starts_at           timestamptz not null,
  ends_at             timestamptz not null,
  blocked_until       timestamptz not null,      -- ends_at + buffer; used for conflict protection
  status              text not null default 'confirmed'
                      check (status in ('pending', 'confirmed', 'completed', 'cancelled', 'no_show')),
  source              text not null default 'online' check (source in ('online', 'admin')),
  google_calendar_id  text,
  google_event_id     text,
  sync_status         text not null default 'not_connected'
                      check (sync_status in ('not_connected', 'pending', 'synced', 'failed', 'removed')),
  sync_error          text,
  sync_attempts       int not null default 0,
  last_synced_at      timestamptz,
  email_status        text not null default 'not_configured'
                      check (email_status in ('not_configured', 'not_requested', 'sent', 'failed')),
  cancelled_at        timestamptz,
  cancel_reason       text,
  anonymized_at       timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  check (ends_at > starts_at),
  check (blocked_until >= ends_at),
  -- The core double-booking guarantee: two active appointments for the same resource
  -- can never overlap (including their buffer), even under concurrent requests.
  constraint appointments_no_overlap exclude using gist (
    resource_key with =,
    tstzrange(starts_at, blocked_until, '[)') with &&
  ) where (status in ('pending', 'confirmed'))
);
create index if not exists appointments_starts_at on appointments (starts_at);
create index if not exists appointments_status on appointments (status);
create index if not exists appointments_sync_status on appointments (sync_status) where sync_status in ('failed', 'pending');
create index if not exists appointments_created_at on appointments (created_at);
create index if not exists appointments_phone on appointments (patient_phone);

-- ---------------------------------------------------------------------------
-- Google Calendar connection (single clinic account). Tokens are AES-256-GCM
-- encrypted by the application before being stored.
-- ---------------------------------------------------------------------------
create table if not exists calendar_connections (
  id                     int primary key default 1 check (id = 1),
  status                 text not null default 'disconnected' check (status in ('connected', 'disconnected', 'error')),
  google_email           text,
  calendar_id            text,
  calendar_summary       text,
  refresh_token_enc      text,
  access_token_enc       text,
  access_token_expires_at timestamptz,
  scopes                 text,
  last_error             text,
  last_sync_at           timestamptz,
  connected_at           timestamptz,
  updated_at             timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Admin notifications (sync failures, token expiry, etc.)
-- ---------------------------------------------------------------------------
create table if not exists admin_notifications (
  id             uuid primary key default gen_random_uuid(),
  kind           text not null,
  message        text not null,
  appointment_id uuid references appointments(id) on delete cascade,
  is_read        boolean not null default false,
  created_at     timestamptz not null default now()
);
create index if not exists admin_notifications_unread on admin_notifications (is_read, created_at desc);

-- ---------------------------------------------------------------------------
-- Defense in depth: the app connects as the owner role, but no role other than
-- the owner may touch patient data.
-- ---------------------------------------------------------------------------
revoke all on all tables in schema public from public;

-- Row Level Security: enabled with no policies, so any role other than the
-- table owner (e.g. a future read-only or Data API role) can read nothing.
alter table admin_users enable row level security;
alter table login_attempts enable row level security;
alter table appointments enable row level security;
alter table calendar_connections enable row level security;
alter table admin_notifications enable row level security;
