import type { Metadata } from "next";
import { ServiceCard } from "@/components/site/service-card";
import { MeshBackground, SectionHeading } from "@/components/site/section";
import { Reveal } from "@/components/site/reveal";
import { getPublishedServices } from "@/lib/data";

export const metadata: Metadata = {
  title: "Physiotherapy Services",
  description: "Physiotherapy services at SPYNUS Physiotherapy & Wellness Centre, Bengaluru — back pain, frozen shoulder, joint and ankle rehabilitation, therapeutic exercise and consultations.",
  alternates: { canonical: "/services" },
};
export const revalidate = 300;

export default async function ServicesPage() {
  const services = await getPublishedServices();
  return (
    <section className="grain relative overflow-hidden pb-24 pt-32">
      <MeshBackground className="opacity-60" />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6">
        <SectionHeading eyebrow="Services" title={<>Physiotherapy services</>} intro="Every service starts with an assessment and a clear explanation of your plan." />
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((s, i) => <Reveal key={s.id} delay={(i % 3) * 0.06} className="h-full"><ServiceCard s={s} i={i} /></Reveal>)}
        </div>
      </div>
    </section>
  );
}
