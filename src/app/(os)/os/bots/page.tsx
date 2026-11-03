import type { Metadata } from "next";
import { BotMap } from "@/components/os/BotMap";
import { OsFrame } from "@/components/os/OsFrame";
import { buildMap } from "@/lib/os/interactions";
import { loadOsPage } from "@/lib/os/page-data";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Bots | Backfield OS",
  robots: { index: false, follow: false },
};

export default async function BotsPage() {
  const { hrefs, snapshot, model, actions, finder } = await loadOsPage();
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
      <p className="os-lede-page">How work moves between Ryan, the executive, and the directors. Specialists stay folded until you open a group.</p>
      {!model.hasSnapshot ? <p className="os-empty-line">No snapshot yet.</p> : null}
      <BotMap map={buildMap(snapshot)} />
    </OsFrame>
  );
}
