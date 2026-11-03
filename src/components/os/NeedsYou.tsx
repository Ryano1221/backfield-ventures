"use client";

import { useMemo, useState } from "react";
import { decisionKey } from "@/lib/os/decision-id";
import { isSnoozed, viewPitches } from "@/lib/os/overlays";
import { blankToNull, mutedLine, readableDetail, shortTitle, summaryLine } from "@/lib/os/present";
import { snoozeUntil } from "@/lib/os/snooze";
import type { Decision, Pitch } from "@/lib/os/types";
import { Mark } from "./Mark";
import { useOsActions } from "./OsShell";

const PITCH_ACTIONS = [
  ["take_call", "Take a call", "advanced"],
  ["watch", "Watch", "reviewing"],
  ["pass", "Pass", "passed"],
  ["ask_memo", "Ask for memo", ""],
] as const;

export function NeedsYou({ decisions, pitches }: { decisions: Decision[]; pitches: Pitch[] }) {
  const { actions, enqueue } = useOsActions();
  const [editing, setEditing] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const rows = useMemo(() => viewPitches(pitches, actions).filter((pitch) => !pitch.snoozed), [pitches, actions]);
  const openDecisions = decisions.filter((decision) => !isSnoozed(decisionKey(decision), actions));
  const review = rows.filter((pitch) => pitch.status === "new" || pitch.status === "reviewing" || pitch.intent === "ask_memo");

  function snooze(target: string, label: string, which: "tomorrow" | "week") {
    enqueue({
      type: "snooze",
      target_id: target,
      payload: { until: snoozeUntil(which) },
      label: `Snoozed ${label} until ${which === "tomorrow" ? "tomorrow" : "next week"}.`,
    });
  }

  function onDrop(event: React.DragEvent, which: "tomorrow" | "week") {
    event.preventDefault();
    const target = event.dataTransfer.getData("text/plain");
    if (!target) return;
    snooze(target, "that item", which);
  }

  return (
    <section className="os-block os-needs">
      <h2>Needs you</h2>
      {openDecisions.length === 0 && review.length === 0 ? <p className="os-missing">Nothing is waiting on you.</p> : null}
      <ol className="os-decisions">
        {openDecisions.map((decision) => {
          const id = decisionKey(decision);
          const answer = [...actions].reverse().find((action) => action.type === "decide" && action.target_id === id);
          const title = shortTitle(decision.title);
          const summary = summaryLine(decision.summary, decision.context || decision.title);
          const options = decision.options?.length
            ? decision.options
            : [
                { value: "approve", label: "Approve" },
                { value: "skip", label: "Skip" },
              ];
          return (
            <li key={id} draggable onDragStart={(event) => event.dataTransfer.setData("text/plain", id)}>
              <div className="os-need">
                <Mark name={title} domain={decision.domain} logoUrl={decision.logo_url} />
                <div>
                  <p className="os-need-title">{title}</p>
                  {summary ? <p className="os-summary">{summary}</p> : null}
                  {answer ? <p className="os-sent">{answer.status === "failed" ? "Failed" : answer.acked_at ? "Done" : "Pending"}{answer.result ? `. ${answer.result}` : ""}</p> : null}
                </div>
              </div>
              {decision.context || decision.exact_message || (decision.summary && decision.summary.length > 140) ? (
                <details className="os-details">
                  <summary>Details</summary>
                  {readableDetail(decision.context) ? <p>{readableDetail(decision.context)}</p> : null}
                  {decision.title.length > title.length ? <p className="os-quiet">{readableDetail(decision.title)}</p> : null}
                  {decision.exact_message ? <pre className="os-exact">{decision.exact_message}</pre> : null}
                  {decision.summary ? <p className="os-summary">{mutedLine(decision.summary)}</p> : null}
                </details>
              ) : null}
              {answer ? null : editing === id ? (
                <div className="os-stack">
                  <label className="os-note-label">
                    Exact message
                    <textarea value={drafts[id] ?? decision.exact_message ?? ""} onChange={(event) => setDrafts((current) => ({ ...current, [id]: event.target.value }))} rows={5} />
                  </label>
                  <div className="os-choice-row">
                    <button
                      type="button"
                      onClick={() => {
                        const edited = (drafts[id] ?? decision.exact_message ?? "").trim();
                        if (!edited || edited === (decision.exact_message || "")) return;
                        enqueue({
                          type: "decide",
                          target_id: id,
                          payload: { choice: "edit", edited_message: edited, note: notes[id] || "" },
                          label: `Edited ${title}.`,
                        });
                        setEditing(null);
                      }}
                    >
                      Save edit
                    </button>
                    <button type="button" className="os-floor-btn" onClick={() => setEditing(null)}>
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="os-choice-row">
                    {options.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() =>
                          enqueue({
                            type: "decide",
                            target_id: id,
                            payload: { choice: option.value, note: notes[id] || "" },
                            label: `${option.label} on ${title}.`,
                          })
                        }
                      >
                        {option.label}
                      </button>
                    ))}
                    <button type="button" onClick={() => setEditing(id)}>
                      Edit
                    </button>
                    <button type="button" className="os-floor-btn" onClick={() => snooze(id, title, "tomorrow")}>
                      Tomorrow
                    </button>
                    <button type="button" className="os-floor-btn" onClick={() => snooze(id, title, "week")}>
                      Next week
                    </button>
                  </div>
                  <label className="os-note-label">
                    Note
                    <input value={notes[id] || ""} onChange={(event) => setNotes((current) => ({ ...current, [id]: event.target.value }))} maxLength={500} />
                  </label>
                </>
              )}
            </li>
          );
        })}
      </ol>
      <ul className="os-lines">
        {review.map((pitch) => {
          const founder = blankToNull(pitch.founder);
          const summary = mutedLine(pitch.summary);
          return (
            <li key={pitch.target} draggable onDragStart={(event) => event.dataTransfer.setData("text/plain", pitch.target)}>
              <div className="os-need">
                <Mark name={pitch.company} domain={pitch.domain} logoUrl={pitch.logo_url} />
                <div>
                  <p className="os-need-title">{pitch.company}</p>
                  {founder || summary ? <p className="os-summary">{[founder, summary].filter(Boolean).join(" · ")}</p> : null}
                  <div className="os-chips">
                    {blankToNull(pitch.sector) ? <span className="os-chip">{pitch.sector}</span> : null}
                    {blankToNull(pitch.stage) ? <span className="os-chip">{pitch.stage}</span> : null}
                    <span className={`os-chip os-chip-${pitch.status}`}>{labelStatus(pitch.status)}</span>
                    {pitch.intent === "ask_memo" ? <span className="os-chip">Asked for memo</span> : null}
                    {pitch.badge ? <span className="os-chip">{pitch.badge}</span> : null}
                  </div>
                  <div className="os-choice-row">
                    {PITCH_ACTIONS.map(([intent, label, status]) => (
                      <button
                        key={intent}
                        type="button"
                        onClick={() =>
                          enqueue({
                            type: "pitch_status",
                            target_id: pitch.target,
                            payload: status ? { intent, status } : { intent },
                            label: `${label} for ${pitch.company}.`,
                          })
                        }
                      >
                        {label}
                      </button>
                    ))}
                    <button type="button" className="os-floor-btn" onClick={() => snooze(pitch.target, pitch.company, "tomorrow")}>
                      Tomorrow
                    </button>
                    <button type="button" className="os-floor-btn" onClick={() => snooze(pitch.target, pitch.company, "week")}>
                      Next week
                    </button>
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
      <div className="os-snooze-row">
        <div className="os-drop" onDragOver={(event) => event.preventDefault()} onDrop={(event) => onDrop(event, "tomorrow")}>
          Snooze until tomorrow
        </div>
        <div className="os-drop" onDragOver={(event) => event.preventDefault()} onDrop={(event) => onDrop(event, "week")}>
          Snooze until next week
        </div>
      </div>
    </section>
  );
}

function labelStatus(status: string): string {
  if (status === "new") return "New";
  if (status === "reviewing") return "Reviewing";
  if (status === "passed") return "Passed";
  if (status === "advanced") return "Advanced";
  return status;
}
