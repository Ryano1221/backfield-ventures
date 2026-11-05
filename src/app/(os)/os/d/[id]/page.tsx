import type { Metadata } from "next";
import { headers } from "next/headers";
import { DecisionDesk } from "@/components/os/night/DecisionDesk";
import { NightFrame } from "@/components/os/night/NightFrame";
import { isOsHost } from "@/lib/os/host";
import { buildToday, presentDecision } from "@/lib/os/night";
import { osChromeCounts } from "@/lib/os/nav";
import { loadOsPage } from "@/lib/os/page-data";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Decision | Backfield OS",
  robots: { index: false, follow: false },
};

export default async function DecisionPage({ params }: { params: Promise<{ id: string }> }) {
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
  const items = page.snapshot
    ? page.snapshot.decisions.map((decision) => presentDecision(decision, page.snapshot!, page.actions, clock()))
    : [];
  const index = items.findIndex((item) => item.id === key);
  const item = index >= 0 ? items[index] : null;
  return (
    <NightFrame onOs={onOs} active="today" counts={osChromeCounts(page.snapshot, model)} stamp={model.stamp} stale={page.model.stale} initialActions={page.actions} finder={page.finder} askAbout={item?.id ?? null} askOwner={item?.requestedBy ?? null}>
      {item ? (
        <DecisionDesk item={item} index={index} total={items.length} next={items[index + 1] ?? null} onOs={onOs} />
      ) : (
        <p className="t-body muted">That decision is not in this snapshot.</p>
      )}
    </NightFrame>
  );
}

function clock(): number {
  return Date.now();
}
