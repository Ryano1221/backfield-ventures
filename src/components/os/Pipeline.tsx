"use client";

import { useMemo, useState } from "react";
import type { PitchRow } from "@/lib/os/metrics";
import { viewPitches } from "@/lib/os/overlays";
import { blankToNull, mutedLine } from "@/lib/os/present";
import { Mark } from "./Mark";
import { useOsActions } from "./OsShell";

const STATUS = { new: "New", reviewing: "Reviewing", passed: "Passed", advanced: "Advanced" } as const;
const PREFERRED = ["Pre-Seed", "Seed", "Series A", "Series B"];

export function Pipeline({ pitches }: { pitches: PitchRow[] }) {
  const { actions, enqueue } = useOsActions();
  const viewed = useMemo(() => viewPitches(pitches, actions), [pitches, actions]);
  const [view, setView] = useState<"board" | "table">("board");
  const stages = useMemo(() => {
    const present = [...new Set(viewed.map((pitch) => pitch.stage || "No stage"))];
    const named = present.filter((stage) => stage !== "No stage");
    const ordered = [...PREFERRED.filter((stage) => named.includes(stage)), ...named.filter((stage) => !PREFERRED.includes(stage)).sort()];
    return present.includes("No stage") ? [...ordered, "No stage"] : ordered;
  }, [viewed]);

  if (pitches.length === 0) return <p className="os-missing">No pitches in this snapshot.</p>;

  function move(company: string, stage: string) {
    enqueue({
      type: "pitch_status",
      target_id: `pitch:${company}`,
      payload: { stage: stage === "No stage" ? "" : stage },
      label: `Moved ${company} to ${stage}.`,
    });
  }

  return (
    <div>
      <div className="os-tools">
        <button type="button" className="os-floor-btn" onClick={() => setView(view === "board" ? "table" : "board")}>
          {view === "board" ? "Table" : "Board"}
        </button>
      </div>
      {view === "board" ? (
        <div className="os-board">
          {stages.map((stage) => (
            <section
              key={stage}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                const company = event.dataTransfer.getData("text/plain");
                if (company) move(company, stage);
              }}
            >
              <h3>{stage}</h3>
              {viewed
                .filter((pitch) => (pitch.stage || "No stage") === stage)
                .map((pitch) => (
                  <article key={`${pitch.company}-${pitch.received}`} className="os-card" draggable onDragStart={(event) => event.dataTransfer.setData("text/plain", pitch.company)}>
                    <div className="os-need">
                      <Mark name={pitch.company} domain={pitch.domain} logoUrl={pitch.logo_url} />
                      <strong className="os-need-title">{pitch.company}</strong>
                    </div>
                    {blankToNull(pitch.founder) ? <p className="os-quiet">{pitch.founder}</p> : null}
                    {pitch.summary ? <p className="os-summary">{mutedLine(pitch.summary)}</p> : null}
                    <p className="os-quiet">
                      {STATUS[pitch.status]}
                      {pitch.score == null ? "" : ` · ${pitch.score}`}
                      {pitch.badge ? ` · ${pitch.badge}` : ""}
                    </p>
                    <label className="os-sr">
                      Move {pitch.company}
                      <select value={pitch.stage || "No stage"} onChange={(event) => move(pitch.company, event.target.value)} aria-label={`Move ${pitch.company}`}>
                        {stages.map((item) => (
                          <option key={item} value={item}>{item}</option>
                        ))}
                      </select>
                    </label>
                  </article>
                ))}
            </section>
          ))}
        </div>
      ) : (
        <div className="os-table-wrap">
          <table className="os-table">
            <thead>
              <tr>
                <th>Company</th>
                <th>Stage</th>
                <th>Status</th>
                <th>Score</th>
                <th>Received</th>
              </tr>
            </thead>
            <tbody>
              {viewed.map((pitch) => (
                <tr key={`${pitch.company}-${pitch.received}`}>
                  <td>
                    <span className="os-name-cell">
                      <Mark name={pitch.company} domain={pitch.domain} logoUrl={pitch.logo_url} />
                      <span className="os-company">{pitch.company}</span>
                    </span>
                  </td>
                  <td>{pitch.stage || ""}</td>
                  <td>{STATUS[pitch.status]}</td>
                  <td>{pitch.score ?? ""}</td>
                  <td>{pitch.receivedLabel}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
