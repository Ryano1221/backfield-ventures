import type { Metadata } from "next";
import { headers } from "next/headers";
import { DealsDesk } from "@/components/os/night/DealsDesk";
import { NightFrame } from "@/components/os/night/NightFrame";
import { isOsHost } from "@/lib/os/host";
import { osChromeCounts } from "@/lib/os/nav";
import { buildDeals, buildToday } from "@/lib/os/night";
import { loadOsPage } from "@/lib/os/page-data";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Deals | Backfield OS",
  robots: { index: false, follow: false },
};

export default async function DealsPage() {
  const page = await loadOsPage();
  const headerList = await headers();
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host") ?? "";
  const model = buildToday(page.snapshot, page.actions);
  return (
    <NightFrame onOs={isOsHost(host)} active="deals" counts={osChromeCounts(page.snapshot, model)} stamp={model.stamp} stale={page.model.stale} initialActions={page.actions} finder={page.finder}>
      <DealsDesk deals={buildDeals(page.snapshot)} reviewing={model.reviewingCount} onOs={isOsHost(host)} />
    </NightFrame>
  );
}
