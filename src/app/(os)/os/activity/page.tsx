import type { Metadata } from "next";
import { headers } from "next/headers";
import { NightFrame } from "@/components/os/night/NightFrame";
import { isOsHost } from "@/lib/os/host";
import { osChromeCounts } from "@/lib/os/nav";
import { buildToday } from "@/lib/os/night";
import { loadOsPage } from "@/lib/os/page-data";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Activity | Backfield OS",
  robots: { index: false, follow: false },
};

export default async function ActivityPage() {
  const page = await loadOsPage();
  const headerList = await headers();
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host") ?? "";
  const model = buildToday(page.snapshot, page.actions);
  return (
    <NightFrame onOs={isOsHost(host)} active="activity" counts={osChromeCounts(page.snapshot, model)} stamp={model.stamp} stale={page.model.stale} initialActions={page.actions} finder={page.finder}>
      <div className="lbl eyebrow">Activity</div>
      <h1 className="d-xl">What ran.</h1>
      {page.model.activity.length === 0 ? (
        <p className="t-body muted" style={{ marginTop: 24 }}>No activity in this snapshot.</p>
      ) : (
        <div className="tl" style={{ marginTop: 32 }}>
          {page.model.activity.map((item) => (
            <div className="e" key={`${item.actor}-${item.timeLabel}-${item.summary}`}>
              <div className="lbl when">{item.timeLabel}</div>
              <div className="what">{item.summary}</div>
              <div className="src">{item.actor}</div>
            </div>
          ))}
        </div>
      )}
    </NightFrame>
  );
}
