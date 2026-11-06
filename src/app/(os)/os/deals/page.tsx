import type { Metadata } from "next";
import { headers } from "next/headers";
import { DealsDesk } from "@/components/os/night/DealsDesk";
import { NightFrame } from "@/components/os/night/NightFrame";
import { parseMemos } from "@/lib/os/deal-memo";
import { readDoc } from "@/lib/os/doc-store";
import { isOsHost } from "@/lib/os/host";
import { osChromeCounts } from "@/lib/os/nav";
import { buildAllDeals, buildToday } from "@/lib/os/night";
import { loadOsPage } from "@/lib/os/page-data";
import { buildPortfolio } from "@/lib/os/portfolio";
import { parseSpvs } from "@/lib/os/spv";

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
  const deals = buildAllDeals(page.snapshot);
  const [memos, spvs] = await Promise.all([readDoc("deal-memos").catch(() => null), readDoc("spvs").catch(() => null)]);
  const companies = new Map(deals.map((deal) => [deal.id, deal.company]));
  const portfolio = buildPortfolio(parseMemos(memos), parseSpvs(spvs), (id) => companies.get(id) ?? null);
  return (
    <NightFrame onOs={isOsHost(host)} active="deals" counts={osChromeCounts(page.snapshot, model)} stamp={model.stamp} stale={page.model.stale} initialActions={page.actions} finder={page.finder}>
      <DealsDesk deals={deals} reviewing={model.reviewingCount} onOs={isOsHost(host)} portfolio={portfolio} />
    </NightFrame>
  );
}
