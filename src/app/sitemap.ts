import type { MetadataRoute } from "next";
import { getPublishedServices } from "@/lib/data";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
  const services = await getPublishedServices().catch(() => []);
  return [
    { url: `${base}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/book`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${base}/services`, changeFrequency: "monthly", priority: 0.8 },
    ...services.map((s) => ({ url: `${base}/services/${s.slug}`, changeFrequency: "monthly" as const, priority: 0.7 })),
    { url: `${base}/privacy`, changeFrequency: "yearly", priority: 0.2 },
  ];
}
