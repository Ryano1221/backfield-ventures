import type { Metadata } from "next";
import { headers } from "next/headers";
import { NightFrame } from "@/components/os/night/NightFrame";
import { isOsHost } from "@/lib/os/host";
import { osChromeCounts } from "@/lib/os/nav";
import { buildToday } from "@/lib/os/night";
import { loadOsPage } from "@/lib/os/page-data";
import { waitingActions, waitingTitle } from "@/lib/os/waiting";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Waiting | Backfield OS",
  robots: { index: false, follow: false },
};

export default async function WaitingPage() {
  const page = await loadOsPage();
  const headerList = await headers();
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host") ?? "";
  const model = buildToday(page.snapshot, page.actions);
  const rows = waitingActions(page.actions);
  return (
    <NightFrame onOs={isOsHost(host)} active="waiting" counts={osChromeCounts(page.snapshot, model)} stamp={model.stamp} stale={page.model.stale} initialActions={page.actions} finder={page.finder}>
      <div className="lbl eyebrow">Waiting</div>
      <h1 className="d-xl">{rows.length.toLocaleString("en-US")} with the office.</h1>
      <p className="lede">These are saved here. The office has not picked them up yet.</p>
      {rows.length ? (
        <ul className="settled">
          {rows.map((row) => (
            <li key={row.action_id}>
              <b>{waitingTitle(row)}</b>
              <span>{row.target_id}</span>
              <span className="lbl">Not picked up</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="t-body muted">Nothing is waiting on the office.</p>
      )}
    </NightFrame>
  );
}
