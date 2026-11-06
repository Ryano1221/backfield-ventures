import type { Metadata } from "next";
import { headers } from "next/headers";
import { NightFrame } from "@/components/os/night/NightFrame";
import { SpvDetail } from "@/components/os/night/SpvDetail";
import { readDoc } from "@/lib/os/doc-store";
import { isOsHost } from "@/lib/os/host";
import { osChromeCounts, osHrefs } from "@/lib/os/nav";
import { buildToday } from "@/lib/os/night";
import { loadOsPage } from "@/lib/os/page-data";
import { parseSpvs } from "@/lib/os/spv";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "SPV | Backfield OS",
  robots: { index: false, follow: false },
};

export default async function SpvItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const page = await loadOsPage();
  const headerList = await headers();
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host") ?? "";
  const onOs = isOsHost(host);
  const hrefs = osHrefs(onOs);
  const model = buildToday(page.snapshot, page.actions);
  const book = parseSpvs(await readDoc("spvs").catch(() => null));
  let key = id;
  try {
    key = decodeURIComponent(id);
  } catch {
    key = id;
  }
  const spv = book.spvs.find((row) => row.id === key);
  // Anyone in the CRM can be an SPV investor; LPs are listed first.
  const people = [...(page.snapshot?.crm.people ?? [])].sort((a, b) => Number(Boolean(b.lp)) - Number(Boolean(a.lp))).slice(0, 2000);
  return (
    <NightFrame onOs={onOs} active="raise" counts={osChromeCounts(page.snapshot, model)} stamp={model.stamp} stale={page.model.stale} initialActions={page.actions} finder={page.finder}>
      <SpvDetail
        initial={book}
        id={key}
        backHref={hrefs.spv}
        dealHref={spv?.deal_id ? hrefs.deal(spv.deal_id) : null}
        lps={people.map((person) => ({ id: person.id, name: person.name }))}
        now={readClock()}
      />
    </NightFrame>
  );
}

function readClock(): number {
  return Date.now();
}
