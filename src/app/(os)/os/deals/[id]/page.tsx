import type { Metadata } from "next";
import { headers } from "next/headers";
import { DealDetail } from "@/components/os/night/DealDetail";
import { NightFrame } from "@/components/os/night/NightFrame";
import { isOsHost } from "@/lib/os/host";
import { osChromeCounts, osHrefs } from "@/lib/os/nav";
import { buildDeal, buildToday } from "@/lib/os/night";
import { loadOsPage } from "@/lib/os/page-data";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Deal | Backfield OS",
  robots: { index: false, follow: false },
};

export default async function DealPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const page = await loadOsPage();
  const headerList = await headers();
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host") ?? "";
  const onOs = isOsHost(host);
  const model = buildToday(page.snapshot, page.actions);
  let key = id;
  try {
    key = decodeURIComponent(id);
  } catch {
    key = id;
  }
  const deal = buildDeal(page.snapshot, key);
  return (
    <NightFrame onOs={onOs} active="deals" counts={osChromeCounts(page.snapshot, model)} stamp={model.stamp} stale={page.model.stale} initialActions={page.actions} finder={page.finder}>
      {deal ? <DealDetail deal={deal} dealsHref={osHrefs(onOs).deals} /> : <p className="t-body muted">That pitch is not in this snapshot.</p>}
    </NightFrame>
  );
}
