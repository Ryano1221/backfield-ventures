import { Clamp } from "./Clamp";
import { DealFlow } from "./DealFlow";
import { OsFrame } from "./OsFrame";
import type { DashboardModel } from "@/lib/os/metrics";

const STATUS_LABEL = {
  new: "New",
  reviewing: "Reviewing",
  passed: "Passed",
  advanced: "Advanced",
} as const;

export function Dashboard({
  model,
  loginPath,
  homeHref,
  botsHref,
}: {
  model: DashboardModel;
  loginPath: string;
  homeHref: string;
  botsHref: string;
}) {
  const review = model.pitches.filter((pitch) => pitch.status === "new" || pitch.status === "reviewing");
  const { kpis } = model;
  return (
    <OsFrame
      active="today"
      homeHref={homeHref}
      botsHref={botsHref}
      loginPath={loginPath}
      updated={model.relative || "Not yet"}
      updatedDetail={model.generatedLabel || "Waiting on the first ingest"}
    >
      {!model.hasSnapshot ? (
        <p className="os-empty-line">No snapshot yet. The office picture shows up after the first ingest.</p>
      ) : null}
      <section className="os-status" aria-label="Today">
        <Status
          label="Needs you"
          value={count(add(kpis.decisions, kpis.toReview))}
          detail={needsDetail(kpis.decisions, kpis.toReview, model.hasSnapshot)}
        />
        <Status
          label="Outreach today"
          value={count(kpis.outreachSent)}
          detail={outreachDetail(kpis.outreachSent, kpis.outreachFloor, kpis.tracksUnder)}
        />
        <Status
          label="Picture"
          value={model.stale ? "Stale" : model.hasSnapshot ? "Current" : "None"}
          detail={model.stale ? "Older than 6 hours." : model.hasSnapshot ? model.relative || "" : "No ingest yet."}
          warn={model.stale}
        />
      </section>

      <section className="os-block">
        <h2>Waiting</h2>
        {model.decisions.length === 0 && review.length === 0 ? (
          <p className="os-missing">{model.hasSnapshot ? "Nothing is waiting on you." : "No decisions yet."}</p>
        ) : (
          <ul className="os-lines">
            {model.decisions.slice(0, 4).map((decision) => (
              <li key={`${decision.title}-${decision.sinceLabel}`}>
                <div>
                  <strong>{decision.link ? <a href={decision.link}>{decision.title}</a> : decision.title}</strong>
                  <p>Waiting {decision.relative || decision.sinceLabel}</p>
                </div>
                <span className="os-kicker">Decision</span>
              </li>
            ))}
            {review.slice(0, 4).map((pitch) => (
              <li key={`${pitch.company}-${pitch.founder}`}>
                <div>
                  <strong>{pitch.company}</strong>
                  <p>
                    {pitch.founder} · {pitch.sector} · {pitch.stage}
                  </p>
                </div>
                <span className={`os-chip os-chip-${pitch.status}`}>{STATUS_LABEL[pitch.status]}</span>
              </li>
            ))}
          </ul>
        )}
        {model.decisions.length > 4 || review.length > 4 ? (
          <p className="os-quiet">
            {Math.max(0, model.decisions.length - 4) + Math.max(0, review.length - 4)} more in the lists below.
          </p>
        ) : null}
      </section>

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
      </section>

      <section className="os-block os-office-link">
        <div>
          <h2>Bots</h2>
          <p className="os-quiet">
            {model.hasSnapshot
              ? `${kpis.working ?? 0} working, ${kpis.needsRyan ?? 0} need you, ${kpis.failed ?? 0} failing.`
              : "The handoff map opens after a snapshot arrives."}
          </p>
        </div>
        <a className="os-text-link" href={botsHref}>
          Open bot map
        </a>
      </section>

      <details className="os-fold">
        <summary>Deals{model.hasSnapshot ? `, ${model.pitches.length}` : ""}</summary>
        <DealFlow pitches={model.pitches} />
      </details>

      <details className="os-fold">
        <summary>Activity{model.hasSnapshot ? `, ${model.activity.length}` : ""}</summary>
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
      </details>
    </OsFrame>
  );
}

function Status({
  label,
  value,
  detail,
  warn = false,
}: {
  label: string;
  value: string;
  detail: string;
  warn?: boolean;
}) {
  return (
    <div className={warn ? "os-status-cell is-warn" : "os-status-cell"}>
      <p className="os-kicker">{label}</p>
      <p className={value === "None" || value === "Stale" || value === "Current" ? "os-status-value is-word" : "os-status-value"}>
        {value}
      </p>
      {detail ? <p className="os-quiet">{detail}</p> : null}
    </div>
  );
}

function count(value: number | null): string {
  return value == null ? "None" : String(value);
}

function add(a: number | null, b: number | null): number | null {
  if (a == null || b == null) return null;
  return a + b;
}

function needsDetail(decisions: number | null, pitches: number | null, hasSnapshot: boolean): string {
  if (!hasSnapshot || decisions == null || pitches == null) return "Decisions and pitches.";
  if (decisions === 0 && pitches === 0) return "Nothing is waiting.";
  return `${decisions} decisions, ${pitches} pitches.`;
}

function outreachDetail(sent: number | null, floor: number | null, under: number | null): string {
  if (sent == null || floor == null) return "Sent against the daily floor.";
  if (!under) return `${sent} sent of ${floor}.`;
  return `${sent} sent of ${floor}. ${under} short.`;
}
