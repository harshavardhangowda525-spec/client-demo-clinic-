import { PageHeader } from "@/components/admin/page-header";
import { ServicesManager } from "@/components/admin/services-manager";
import { getAllServices } from "@/lib/data";

export const metadata = { title: "Services" };

export default async function ServicesAdmin() {
  const services = await getAllServices();
  return (
    <>
      <PageHeader title="Services" sub="Changes appear on the public website automatically." />
      <ServicesManager services={services} />
    </>
  );
}
