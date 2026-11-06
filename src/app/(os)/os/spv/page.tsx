import type { Metadata } from "next";
import { headers } from "next/headers";
import { FundTabs } from "@/components/os/night/FundTabs";
import { NightFrame } from "@/components/os/night/NightFrame";
import { SpvDesk } from "@/components/os/night/SpvDesk";
import { readDoc } from "@/lib/os/doc-store";
import { isOsHost } from "@/lib/os/host";
import { osChromeCounts, osHrefs } from "@/lib/os/nav";
import { buildDeals, buildToday } from "@/lib/os/night";
import { loadOsPage } from "@/lib/os/page-data";
import { parseSpvs } from "@/lib/os/spv";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "SPVs | Backfield OS",
  robots: { index: false, follow: false },
};

export default async function SpvPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const page = await loadOsPage();
  const headerList = await headers();
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host") ?? "";
  const onOs = isOsHost(host);
  const hrefs = osHrefs(onOs);
  const model = buildToday(page.snapshot, page.actions);
  const book = parseSpvs(await readDoc("spvs").catch(() => null));
  const one = (value: string | string[] | undefined) => (typeof value === "string" ? value.slice(0, 200) : "");
  // Every pitch, so a new SPV can be pulled straight from a deal by typing its name.
  const deals = buildDeals(page.snapshot).map((deal) => ({ id: deal.id, company: deal.company, detail: [deal.stage, deal.sector, deal.statusLabel].filter(Boolean).join(" · ") }));
  const open = book.spvs.filter((spv) => spv.status !== "closed" && spv.status !== "cancelled").length;
  return (
    <NightFrame onOs={onOs} active="raise" counts={osChromeCounts(page.snapshot, model)} stamp={model.stamp} stale={page.model.stale} initialActions={page.actions} finder={page.finder}>
      <FundTabs active="spv" fundHref={hrefs.raise} spvHref={hrefs.spv} spvCount={open} />
      <SpvDesk initial={book} root={hrefs.spv} now={readClock()} prefill={{ company: one(params.company), deal: one(params.deal) }} deals={deals} />
    </NightFrame>
  );
}

function readClock(): number {
  return Date.now();
}
