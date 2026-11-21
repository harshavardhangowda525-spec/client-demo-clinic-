import { redirect } from "next/navigation";
import { getAdmin } from "@/lib/auth";
import { LoginForm } from "@/components/admin/login-form";
import { Logo } from "@/components/site/logo";
import { MeshBackground } from "@/components/site/section";

export const metadata = { title: "Sign in" };
export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (await getAdmin()) redirect("/admin");
  return (
    <div className="grain relative flex min-h-screen items-center justify-center overflow-hidden px-4">
      <MeshBackground />
      <div className="relative w-full max-w-sm">
        <div className="mb-8 flex justify-center"><Logo /></div>
        <div className="rounded-[1.5rem] border border-white bg-white/85 p-7 shadow-lift backdrop-blur-xl">
          <h1 className="text-2xl font-extrabold">Clinic admin</h1>
          <p className="mt-1 text-sm text-muted">Sign in to manage appointments.</p>
          <LoginForm />
        </div>
        <p className="mt-6 text-center text-xs text-muted">Authorised clinic staff only.</p>
      </div>
    </div>
  );
}
