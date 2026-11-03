import type { osHrefs } from "@/lib/os/nav";
import type { FinderItem } from "@/lib/os/finder";
import type { Decision, OsAction, Pitch } from "@/lib/os/types";
import { NeedsYou } from "./NeedsYou";
import { OsFrame } from "./OsFrame";
import type { DashboardModel } from "@/lib/os/metrics";

export function Dashboard({
  model,
  decisions,
  pitches,
  actions,
  finder,
  loginPath,
  hrefs,
}: {
  model: DashboardModel;
  decisions: Decision[];
  pitches: Pitch[];
  actions: OsAction[];
  finder: FinderItem[];
  loginPath: string;
  hrefs: ReturnType<typeof osHrefs>;
}) {
  const { kpis } = model;
  return (
    <OsFrame
      active="today"
      hrefs={hrefs}
      loginPath={loginPath}
      updated={model.relative || "Not yet"}
      updatedDetail={model.generatedLabel || "Waiting on the first ingest"}
      actions={actions}
      finder={finder}
    >
      {!model.hasSnapshot ? <p className="os-empty-line">No snapshot yet. The office picture shows up after the first ingest.</p> : null}
      {model.stale ? <p className="os-empty-line">This picture is older than 6 hours.</p> : null}
      <NeedsYou decisions={decisions} pitches={pitches} />
      <section className="os-block">
        <h2>Outreach</h2>
        {model.outreach.length === 0 ? (
          <p className="os-missing">No outreach tracks in this snapshot.</p>
        ) : (
          <ul className="os-tracks">
            {model.outreach.map((track) => (
              <li key={track.track}>
                <span>{track.label}</span>
                <span className={track.met ? "os-meter is-met" : "os-meter"} aria-hidden>
                  <span style={{ width: `${track.pct}%` }} />
                </span>
                <span className="os-track-stat">
                  {track.sent} / {track.floor}
                </span>
              </li>
            ))}
          </ul>
        )}
        {model.hasSnapshot ? (
          <p className="os-quiet">
            {kpis.outreachSent ?? 0} sent of {kpis.outreachFloor ?? 0}
            {kpis.tracksUnder ? `. ${kpis.tracksUnder} short.` : "."}
          </p>
        ) : null}
      </section>
    </OsFrame>
  );
}
