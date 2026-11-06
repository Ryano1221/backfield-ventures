import type { Metadata } from "next";
import { DealMemo } from "@/components/os/night/DealMemo";
import { parseMemos } from "@/lib/os/deal-memo";
import { readDoc } from "@/lib/os/doc-store";
import Link from "next/link";
import { parseSpvs } from "@/lib/os/spv";
import { headers } from "next/headers";
import { DealDetail } from "@/components/os/night/DealDetail";
import { RemoveAdded } from "@/components/os/night/RemoveAdded";
import { NightFrame } from "@/components/os/night/NightFrame";
import { loadCompanyExtras } from "@/lib/os/company-extras";
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
  const deal = buildDeal(page.snapshot, key, key.startsWith("co_") ? await loadCompanyExtras() : {});
  const memos = parseMemos(await readDoc("deal-memos").catch(() => null));
  const hrefs = osHrefs(onOs);
  const spv = deal ? parseSpvs(await readDoc("spvs").catch(() => null)).spvs.find((row) => row.deal_id === deal.id && row.status !== "cancelled") : undefined;
  return (
    <NightFrame onOs={onOs} active="deals" counts={osChromeCounts(page.snapshot, model)} stamp={model.stamp} stale={page.model.stale} initialActions={page.actions} finder={page.finder} askAbout={deal?.id ?? null}>
      {deal ? (
        <>
          <DealDetail deal={deal} dealsHref={osHrefs(onOs).deals} />
          <div className="deal-spv">
            {spv ? (
              <Link className="btn" href={hrefs.spvItem(spv.id)} prefetch>
                Open {spv.name}
              </Link>
            ) : (
              <Link className="btn" href={`${hrefs.spv}?company=${encodeURIComponent(deal.company)}&deal=${encodeURIComponent(deal.id)}`} prefetch>
                Start an SPV for this deal
              </Link>
            )}
          </div>
          <DealMemo dealId={deal.id} initial={memos.deals[deal.id] ?? null} />
          {deal.status === "tracking" && deal.source?.includes("added by you") ? <RemoveAdded name={deal.company} backHref={hrefs.deals} /> : null}
        </>
      ) : (
        <p className="t-body muted">That pitch is not in this snapshot.</p>
      )}
    </NightFrame>
  );
}
