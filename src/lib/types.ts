export type TimeRange = { start: string; end: string };
export type DayHours = { open: string; close: string; breaks: TimeRange[] } | null;
export type WeeklyHours = Record<"0" | "1" | "2" | "3" | "4" | "5" | "6", DayHours>;

export type ClinicSettings = {
  clinic_name: string;
  tagline: string;
  phone: string;
  whatsapp_number: string | null;
  whatsapp_enabled: boolean;
  email: string | null;
  address_line: string;
  locality: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  maps_query: string;
  google_rating: number | null;
  google_review_count: number | null;
  google_reviews_url: string | null;
  rating_snapshot_note: string;
  about_story: string;
  about_approach: string;
  hero_image_id: string | null;
  working_hours: WeeklyHours;
  hours_confirmed: boolean;
  slot_interval_minutes: number;
  buffer_minutes: number;
  min_notice_minutes: number;
  booking_window_days: number;
  auto_confirm_online: boolean;
  online_booking_enabled: boolean;
  notify_admin_emails: string;
  send_patient_emails: boolean;
  data_retention_months: number;
  calendar_include_patient_name: boolean;
};

export type Service = {
  id: string;
  slug: string;
  name: string;
  short_description: string;
  description: string;
  conditions: string[];
  approach: string;
  duration_minutes: number;
  price_inr: string | null;
  image_id: string | null;
  icon: string;
  is_published: boolean;
  needs_review: boolean;
  online_booking: boolean;
  sort_order: number;
};

export type AppointmentStatus = "pending" | "confirmed" | "completed" | "cancelled" | "no_show";
export type SyncStatus = "not_connected" | "pending" | "synced" | "failed" | "removed";

export type Appointment = {
  id: string;
  booking_ref: string;
  patient_name: string;
  patient_phone: string;
  patient_email: string | null;
  notes: string | null;
  service_id: string | null;
  service_name: string;
  practitioner_id: string | null;
  resource_key: string;
  starts_at: string;
  ends_at: string;
  blocked_until: string;
  status: AppointmentStatus;
  source: "online" | "admin";
  google_calendar_id: string | null;
  google_event_id: string | null;
  sync_status: SyncStatus;
  sync_error: string | null;
  sync_attempts: number;
  last_synced_at: string | null;
  email_status: "not_configured" | "not_requested" | "sent" | "failed";
  cancelled_at: string | null;
  created_at: string;
};

export type Practitioner = { id: string; name: string; title: string; credentials: string; bio: string; photo_id: string | null; is_public: boolean; sort_order: number };
export type Testimonial = { id: string; author_label: string; content: string; rating: number | null; is_verbatim: boolean; source_url: string | null; is_approved: boolean; sort_order: number };
export type BlockedPeriod = { id: string; starts_at: string; ends_at: string; reason: string; kind: "holiday" | "block" };

export type CalendarConnection = {
  status: "connected" | "disconnected" | "error";
  google_email: string | null;
  calendar_id: string | null;
  calendar_summary: string | null;
  last_error: string | null;
  last_sync_at: string | null;
  connected_at: string | null;
};
