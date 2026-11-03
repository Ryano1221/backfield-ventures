import type { Metadata } from "next";
import { Clamp } from "@/components/os/Clamp";
import { OsFrame } from "@/components/os/OsFrame";
import { loadOsPage } from "@/lib/os/page-data";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Activity | Backfield OS",
  robots: { index: false, follow: false },
};

export default async function ActivityPage() {
  const { hrefs, model, actions, finder } = await loadOsPage();
  return (
    <OsFrame
      active="activity"
      hrefs={hrefs}
      loginPath={hrefs.login}
      updated={model.relative || "Not yet"}
      updatedDetail={model.generatedLabel || "Waiting on the first ingest"}
      actions={actions}
      finder={finder}
    >
      <h1 className="os-page-title">Activity</h1>
      {model.activity.length === 0 ? (
        <p className="os-missing">No activity in this snapshot.</p>
      ) : (
        <ol className="os-feed">
          {model.activity.map((item) => (
            <li key={`${item.actor}-${item.timeLabel}-${item.summary}`}>
              <time>{item.relative || item.timeLabel}</time>
              <span className="os-actor">{item.actor}</span>
              <p>
                <Clamp text={item.summary} />
              </p>
            </li>
          ))}
        </ol>
      )}
    </OsFrame>
  );
}
