import type { Metadata } from "next";
import { headers } from "next/headers";
import { LeadsDesk } from "@/components/os/night/LeadsDesk";
import { NightFrame } from "@/components/os/night/NightFrame";
import { isOsHost } from "@/lib/os/host";
import { leadsSetup, readLeads } from "@/lib/os/leads/server";
import { osChromeCounts } from "@/lib/os/nav";
import { buildToday } from "@/lib/os/night";
import { loadOsPage } from "@/lib/os/page-data";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Leads | Backfield OS",
  robots: { index: false, follow: false },
};

export default async function LeadsPage() {
  const page = await loadOsPage();
  const headerList = await headers();
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host") ?? "";
  const model = buildToday(page.snapshot, page.actions);
  const book = await readLeads();
  return (
    <NightFrame onOs={isOsHost(host)} active="leads" counts={osChromeCounts(page.snapshot, model)} stamp={model.stamp} stale={page.model.stale} initialActions={page.actions} finder={page.finder}>
      <div className="lbl eyebrow">Operations</div>
      <h1 className="d-xl">Leads</h1>
      <p className="lede">Founders raising, investors running syndicates, and LPs worth a first email. Found from public SEC filings and company websites. Nothing sends from here.</p>
      <LeadsDesk initial={book} setup={leadsSetup()} />
    </NightFrame>
  );
}
