import type { Metadata } from "next";
import { headers } from "next/headers";
import { NightFrame } from "@/components/os/night/NightFrame";
import { PortfolioDesk, type Suggestion } from "@/components/os/night/PortfolioDesk";
import { loadCompanyExtras } from "@/lib/os/company-extras";
import { readDoc } from "@/lib/os/doc-store";
import { parseHoldings } from "@/lib/os/holdings";
import { isOsHost } from "@/lib/os/host";
import { osChromeCounts, osHrefs } from "@/lib/os/nav";
import { buildAllDeals, buildToday } from "@/lib/os/night";
import { loadOsPage } from "@/lib/os/page-data";
import { summarizeSpv } from "@/lib/os/spv";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Portfolio | Backfield OS",
  robots: { index: false, follow: false },
};

export default async function PortfolioPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const page = await loadOsPage();
  const headerList = await headers();
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host") ?? "";
  const onOs = isOsHost(host);
  const hrefs = osHrefs(onOs);
  const model = buildToday(page.snapshot, page.actions);
  const [book, extras] = await Promise.all([readDoc("holdings").catch(() => null).then(parseHoldings), loadCompanyExtras()]);
  const deals = buildAllDeals(page.snapshot, extras).map((deal) => ({ id: deal.id, company: deal.company, detail: [deal.stage, deal.sector, deal.status === "tracking" ? deal.source : deal.statusLabel].filter(Boolean).join(" · "), domain: deal.domain, logoUrl: deal.logoUrl }));
  const now = readClock();
  const booked = new Set(book.holdings.map((h) => h.spv_id).filter(Boolean));
  // A closed SPV with money in is a holding waiting to be recorded.
  const suggestions: Suggestion[] = (extras.spvs ?? [])
    .filter((spv) => spv.status === "closed" && !booked.has(spv.id))
    .map((spv) => {
      const s = summarizeSpv(spv, now);
      return { spvId: spv.id, company: spv.company, dealId: spv.deal_id, amount: s.wired || s.hard, date: (spv.close_date ?? spv.updated_at).slice(0, 10) };
    })
    .filter((row) => row.amount > 0);
  return (
    <NightFrame onOs={onOs} active="deals" counts={osChromeCounts(page.snapshot, model)} stamp={model.stamp} stale={page.model.stale} initialActions={page.actions} finder={page.finder}>
      <PortfolioDesk book={book} today={new Date(now).toISOString()} deals={deals} suggestions={suggestions} dealBase={hrefs.deals} spvBase={hrefs.spv} startOpen={params.add === "1"} />
    </NightFrame>
  );
}

function readClock(): number {
  return Date.now();
}
