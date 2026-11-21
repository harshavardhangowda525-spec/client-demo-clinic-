import { requireAdminPage } from "@/lib/auth";
import { getConnectionStatus } from "@/lib/google";
import { Sidebar } from "@/components/admin/sidebar";
import { ToastProvider } from "@/components/admin/toast";

export const dynamic = "force-dynamic";

export default async function DashLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdminPage();
  const conn = await getConnectionStatus();
  return (
    <ToastProvider>
      <Sidebar name={admin.name} email={admin.email} calendar={conn.configured ? conn.status : "disconnected"} />
      <div className="lg:pl-64">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:py-10">{children}</div>
      </div>
    </ToastProvider>
  );
}
