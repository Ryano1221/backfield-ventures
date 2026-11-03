import type { Metadata } from "next";
import { OfficeDesign } from "@/components/os/design/OfficeDesign";
import { loadOsPage } from "@/lib/os/page-data";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Bots | Backfield OS",
  robots: { index: false, follow: false },
};

export default async function BotsPage() {
  const { hrefs } = await loadOsPage();
  return <OfficeDesign todayHref={hrefs.today} crmHref={hrefs.crm} botsHref={hrefs.bots} />;
}
