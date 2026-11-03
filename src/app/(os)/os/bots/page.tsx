import type { Metadata } from "next";
import { HandoffFeed } from "@/components/os/HandoffFeed";
import { Office } from "@/components/os/Office";
import { OsFrame } from "@/components/os/OsFrame";
import { loadOsPage } from "@/lib/os/page-data";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Bots | Backfield OS",
  robots: { index: false, follow: false },
};

export default async function BotsPage() {
  const { hrefs, snapshot, model, actions, finder } = await loadOsPage();
  const bots = (snapshot?.bots.bots ?? []).map((bot) => ({
    name: bot.name,
    director: bot.director || "other",
    status: bot.status,
    failed: bot.status.toLowerCase().includes("fail") || (bot.registry_status || "").toLowerCase() === "failing",
    last: bot.last || "",
    result: bot.result || "",
    role: bot.role || "",
    scope: bot.scope || "",
  }));
  const moves = (snapshot?.interactions ?? []).map((item) => ({
    from: item.from,
    to: item.to,
    title: item.title,
    timestamp: item.timestamp,
  }));
  return (
    <OsFrame
      active="bots"
      hrefs={hrefs}
      loginPath={hrefs.login}
      updated={model.relative || "Not yet"}
      updatedDetail={model.generatedLabel || "Waiting on the first ingest"}
      actions={actions}
      finder={finder}
    >
      <p className="os-lede-page">The office. Robots sit on their floors. Recent handoffs walk across when you press play.</p>
      <div className="os-map-layout">
        <Office bots={bots} moves={moves} />
        <section className="os-feed-panel" aria-label="Handoff feed">
          <h2>Handoffs</h2>
          <HandoffFeed moves={moves} />
        </section>
      </div>
    </OsFrame>
  );
}
