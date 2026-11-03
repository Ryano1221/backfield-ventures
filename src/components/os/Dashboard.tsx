import { BotsBoard } from "./BotsBoard";
import { DealFlow } from "./DealFlow";
import { OsActions } from "./OsActions";
import type { Bar, DashboardModel } from "@/lib/os/metrics";

export function Dashboard({ model, loginPath }: { model: DashboardModel; loginPath: string }) {
  const { kpis } = model;
  return (
    <>
      <header className="os-top">
        <div className="os-top-inner">
          <div>
            <p className="os-kicker">Backfield Ventures</p>
            <h1 className="os-brand">Operating system</h1>
          </div>
          <div className="os-updated">
            <p className="os-kicker">Last updated</p>
            <strong>{model.relative || "Not updated yet"}</strong>
            <span>{model.generatedLabel || "Waiting on the first ingest"}</span>
            {model.botFeedLabel ? <span> Bot feed {model.botFeedLabel}</span> : null}
          </div>
          <nav className="os-jump" aria-label="Sections">
            <a href="#deals">Deals</a>
            <a href="#bots">Bots</a>
            <a href="#outreach">Outreach</a>
            <a href="#decisions">Decisions</a>
            <a href="#activity">Activity</a>
            <OsActions loginPath={loginPath} />
          </nav>
        </div>
      </header>
      {model.stale ? (
        <div className="os-stale" role="status">
          <p>Stale. This picture is more than 6 hours old.</p>
        </div>
      ) : null}
      {!model.hasSnapshot ? (
        <div className="os-empty">
          <p>No snapshot yet. The office picture shows up after the first ingest.</p>
        </div>
      ) : null}
      <main className="os-page">
        <section className="os-kpis" aria-label="Today">
          <Kpi label="Pitches to review" value={num(kpis.toReview)} sub={model.hasSnapshot ? "New and reviewing" : undefined} />
          <Kpi label="New in 7 days" value={num(kpis.new7)} />
          <Kpi label="New in 30 days" value={num(kpis.new30)} />
          <Kpi label="Decisions waiting" value={num(kpis.decisions)} sub={model.hasSnapshot ? "On Ryan" : undefined} />
          <Kpi
            label="Working now"
            value={num(kpis.working)}
            sub={kpis.failed == null ? undefined : `${kpis.failed} failed`}
          />
          <Kpi
            label="Outreach today"
            value={num(kpis.outreachSent)}
            sub={
              kpis.outreachFloor == null
                ? undefined
                : `${kpis.outreachFloor} floor${kpis.tracksUnder ? `, ${kpis.tracksUnder} under` : ""}`
            }
          />
        </section>

        <section className="os-section" id="deals">
          <h2>Deal flow {model.hasSnapshot ? model.pitches.length : ""}</h2>
          <div className="os-deals">
            <div className="os-panel">
              <DealFlow pitches={model.pitches} />
            </div>
            <div>
              <Chart title="Sector" rows={model.sectors} empty="No sector mix yet." />
              <div style={{ height: 12 }} />
              <Chart title="Stage" rows={model.stages} empty="No stage mix yet." />
            </div>
          </div>
        </section>

        <section className="os-section" id="bots">
          <h2>Bots {model.hasSnapshot ? model.teams.reduce((sum, team) => sum + team.bots.length, 0) : ""}</h2>
          <BotsBoard teams={model.teams} />
          {model.usage ? (
            <div className="os-usage">
              {model.usage.weekly ? (
                <p>
                  <span className="os-kicker">Weekly used</span>
                  <strong>{model.usage.weekly}%</strong>
                </p>
              ) : null}
              {model.usage.onDemand ? (
                <p>
                  <span className="os-kicker">On demand this cycle</span>
                  <strong>{model.usage.onDemand}</strong>
                </p>
              ) : null}
              {model.usage.reset ? (
                <p>
                  <span className="os-kicker">Weekly reset</span>
                  <strong>{model.usage.reset}</strong>
                </p>
              ) : null}
            </div>
          ) : null}
          {model.routines.length ? (
            <div className="os-panel" style={{ marginTop: 14 }}>
              <h3>Routines</h3>
              <ul className="os-list">
                {model.routines.map((routine) => (
                  <li key={`${routine.name}-${routine.last}`}>
                    <div className="os-row-meta">
                      <strong>{routine.name}</strong>
                      <span className={routineChip(routine.status)}>{routine.status}</span>
                    </div>
                    {routine.last ? <p className="os-meta">{routine.last}</p> : null}
                    {routine.note ? <p className="os-note">{routine.note}</p> : null}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>

        <div className="os-split">
          <section className="os-section" id="outreach">
            <h2>Outreach</h2>
            <div className="os-panel">
              {model.outreach.length === 0 ? (
                <p className="os-missing">No outreach tracks in this snapshot.</p>
              ) : (
                <ul className="os-list">
                  {model.outreach.map((track) => (
                    <li key={track.track}>
                      <div className="os-row-meta">
                        <strong>{track.label}</strong>
                        <span className="os-track-stat">
                          {track.sent} / {track.floor}
                        </span>
                      </div>
                      <span className={track.met ? "os-meter is-met" : "os-meter"} style={{ marginTop: 8 }}>
                        <span style={{ width: `${track.pct}%` }} />
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
          <section className="os-section" id="decisions">
            <h2>Decisions</h2>
            <div className="os-panel">
              {model.decisions.length === 0 ? (
                <p className="os-missing">Nothing is waiting on you.</p>
              ) : (
                <ol className="os-list">
                  {model.decisions.map((decision) => (
                    <li key={`${decision.title}-${decision.sinceLabel}`}>
                      {decision.link ? (
                        <a href={decision.link} target="_blank" rel="noreferrer noopener">
                          {decision.title}
                        </a>
                      ) : (
                        <strong className="os-company" style={{ fontSize: 26 }}>
                          {decision.title}
                        </strong>
                      )}
                      <p className="os-meta">
                        Waiting since {decision.relative || decision.sinceLabel}
                        {decision.relative ? ` (${decision.sinceLabel})` : ""}
                      </p>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </section>
        </div>

        <section className="os-section" id="activity">
          <h2>Activity</h2>
          <div className="os-panel">
            {model.activity.length === 0 ? (
              <p className="os-missing">No activity in this snapshot.</p>
            ) : (
              <ol className="os-feed">
                {model.activity.map((item) => (
                  <li key={`${item.actor}-${item.timeLabel}-${item.summary}`}>
                    <time dateTime={item.timeLabel}>{item.relative || item.timeLabel}</time>
                    <span className="os-actor">{item.actor}</span>
                    <p>{item.summary}</p>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </section>
      </main>
    </>
  );
}

function Kpi({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <article className="os-kpi">
      <p className="os-kicker">{label}</p>
      <p className={value === "None" ? "os-kpi-value is-none" : "os-kpi-value"}>{value}</p>
      {sub ? <p className="os-kpi-sub">{sub}</p> : null}
    </article>
  );
}

function Chart({ title, rows, empty }: { title: string; rows: Bar[]; empty: string }) {
  const max = Math.max(1, ...rows.map((row) => row.count));
  return (
    <div className="os-panel">
      <h3>{title}</h3>
      {rows.length === 0 ? (
        <p className="os-missing">{empty}</p>
      ) : (
        <ul className="os-bars">
          {rows.map((row) => (
            <li key={row.label}>
              <span className="os-bar-label">{row.label}</span>
              <span className="os-bar-track">
                <span className="os-bar-fill" style={{ width: `${Math.round((row.count / max) * 100)}%` }} />
              </span>
              <span className="os-bar-n">{row.count}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function num(value: number | null): string {
  return value == null ? "None" : String(value);
}

function routineChip(status: string): string {
  const value = status.toLowerCase();
  if (value.includes("fail")) return "os-chip os-chip-failed";
  if (value.includes("succeed") || value === "working") return "os-chip os-chip-working";
  if (value === "paused") return "os-chip os-chip-paused";
  return "os-chip os-chip-idle";
}
