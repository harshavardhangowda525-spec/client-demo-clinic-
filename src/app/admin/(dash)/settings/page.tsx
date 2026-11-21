import { PageHeader } from "@/components/admin/page-header";
import { SettingsTabs } from "@/components/admin/settings-tabs";
import { q } from "@/lib/db";
import { getSettings } from "@/lib/data";
import { getConnectionStatus, redirectUri } from "@/lib/google";
import { emailConfigured } from "@/lib/email";
import { requireAdminPage } from "@/lib/auth";
import type { BlockedPeriod, Practitioner, Testimonial } from "@/lib/types";

export const metadata = { title: "Settings" };

export default async function SettingsPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  const admin = await requireAdminPage();
  const [settings, blocks, team, reviews, conn] = await Promise.all([
    getSettings(),
    q<BlockedPeriod>("select * from blocked_periods where ends_at > now() - interval '7 days' order by starts_at"),
    q<Practitioner>("select * from practitioners order by sort_order, name"),
    q<Testimonial>("select * from testimonials order by sort_order, created_at"),
    getConnectionStatus(),
  ]);
  return (
    <>
      <PageHeader title="Settings" />
      <SettingsTabs
        tab={sp.tab ?? "clinic"}
        settings={settings}
        blocks={blocks}
        team={team}
        reviews={reviews}
        calendar={{ ...conn, redirectUri: redirectUri() }}
        googleResult={sp.google ? { status: sp.google, message: sp.message ?? null } : null}
        emailReady={emailConfigured()}
        adminEmail={admin.email}
      />
    </>
  );
}
