import { Header } from "@/components/site/header";
import { Footer } from "@/components/site/footer";
import { MobileBookBar } from "@/components/site/mobile-book-bar";
import { getSettings } from "@/lib/data";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const s = await getSettings();
  return (
    <>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-full focus:bg-ink focus:px-4 focus:py-2 focus:text-white">
        Skip to content
      </a>
      <Header phone={s.phone} />
      <main id="main">{children}</main>
      <Footer s={s} />
      <MobileBookBar phone={s.phone} />
    </>
  );
}
