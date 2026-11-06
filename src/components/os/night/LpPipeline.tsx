"use client";

import { StackBar } from "./Charts";
import Link from "next/link";
import { useMemo, useState } from "react";
import {
  buildPipeline,
  CONFIDENCE,
  CONFIDENCE_LABEL,
  PIPE_STAGES,
  STAGE_LABEL,
  type Confidence,
  type PipePerson,
  type Pipeline,
  type PipeRow,
  type PipeStage,
} from "@/lib/os/lp-pipeline";
import { usd, type RaiseLedger } from "@/lib/os/raise-model";

/**
 * Every LP from the CRM with where they stand, the check Ryan expects, how
 * sure he is, and the next action. Money rows come from the commitments above.
 */
export function LpPipeline({ people, initial, ledger, today, personRoot }: { people: PipePerson[]; initial: Pipeline; ledger: RaiseLedger; today: string; personRoot: string }) {
  const [pipeline, setPipeline] = useState(initial);
  const [editing, setEditing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const built = useMemo(() => buildPipeline(people, pipeline, ledger, today), [people, pipeline, ledger, today]);
  const target = ledger.target_usd && ledger.target_usd > 0 ? ledger.target_usd : null;

  async function save(personId: string, fields: Record<string, unknown>) {
    setError(null);
    try {
      const res = await fetch("/api/os/lp-pipeline", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ op: "set", person_id: personId, ...fields }) });
      const data = (await res.json().catch(() => ({}))) as { pipeline?: Pipeline; error?: string };
      if (!res.ok || !data.pipeline) {
        setError(data.error || "Could not save that.");
        return false;
      }
      setPipeline(data.pipeline);
      setEditing(null);
      return true;
    } catch {
      setError("No connection. Nothing was saved.");
      return false;
    }
  }

  if (!people.length) {
    return (
      <section className="stack lp-pipe" aria-label="LP pipeline">
        <h2>LP pipeline</h2>
        <p className="raise-empty">No LPs flagged in the CRM yet. Flag people as LPs and they show up here.</p>
      </section>
    );
  }

  const stages = ["call_booked", "interested", "replied", "reached", "soft", "committed", "wired"] as const;
  return (
    <section className="stack lp-pipe" aria-label="LP pipeline">
      <h2>LP pipeline</h2>
      <div className="lp-sum">
        <div>
          <b>{usd(built.weighted)}</b>
          <span>
            weighted{target ? ` of ${usd(target)}` : ""}. Committed and wired count in full, everything else at your confidence.
          </span>
        </div>
        <div>
          <b>{usd(built.expected)}</b>
          <span>if every expected check closes.</span>
        </div>
      </div>
      <StackBar
        label="Expected money by stage"
        total={target ?? undefined}
        format={usd}
        parts={[
          { key: "in", label: "Committed or wired", value: sumBy(built.rows, ["committed", "wired"]), tone: "hard" },
          { key: "soft", label: "Soft circled", value: sumBy(built.rows, ["soft"]), tone: "mid" },
          { key: "talks", label: "In talks", value: sumBy(built.rows, ["interested", "call_booked"]), tone: "soft" },
          { key: "early", label: "Early", value: sumBy(built.rows, ["reached", "replied"]), tone: "pale" },
        ]}
      />
      <p className="lp-stages">
        {stages
          .filter((stage) => built.counts[stage])
          .map((stage) => `${built.counts[stage]} ${STAGE_LABEL[stage].toLowerCase()}`)
          .join(" · ")}
      </p>
      {error ? <p className="sx-error" role="alert">{error}</p> : null}
      <ul className="lp-list">
        {built.rows.map((row) => (
          <li key={row.id} className={row.overdue ? "is-due" : ""}>
            <div className="lp-row">
              <Link href={`${personRoot}/${encodeURIComponent(row.id)}`} className="lp-name">
                <b>{row.name}</b>
                {row.firm ? <span>{row.firm}</span> : null}
              </Link>
              <span className={`sx-chip lp-stage is-${row.stage}`} title={row.stageSet === "crm" ? "From the CRM stage" : row.stageSet === "ledger" ? "From commitments" : "Set by you"}>
                {STAGE_LABEL[row.stage]}
                {row.stageSet === "crm" ? " (CRM)" : ""}
              </span>
              <span className="lp-money">
                {row.expected ? usd(row.expected) : "No check yet"}
                {row.confidence ? ` · ${row.confidence}` : ""}
              </span>
              <button type="button" className="btn sm" aria-expanded={editing === row.id} onClick={() => setEditing((current) => (current === row.id ? null : row.id))}>
                {editing === row.id ? "Close" : "Edit"}
              </button>
            </div>
            {row.next ? (
              <p className="lp-next">
                {row.overdue ? <b>Overdue: </b> : row.due ? <span className="sx-muted">Due {row.due}: </span> : null}
                {row.next}
              </p>
            ) : null}
            {editing === row.id ? <Editor row={row} entry={pipeline.entries[row.id]} onSave={(fields) => save(row.id, fields)} /> : null}
          </li>
        ))}
      </ul>
    </section>
  );
}

function Editor({ row, entry, onSave }: { row: PipeRow; entry: Pipeline["entries"][string] | undefined; onSave: (fields: Record<string, unknown>) => Promise<boolean> }) {
  const money = row.stageSet === "ledger";
  const [stage, setStage] = useState<PipeStage | "">(entry?.stage ?? "");
  const [expected, setExpected] = useState(entry?.expected_usd != null ? usd(entry.expected_usd) : "");
  const [confidence, setConfidence] = useState<Confidence | "">(entry?.confidence ?? "");
  const [next, setNext] = useState(entry?.next_action ?? "");
  const [due, setDue] = useState(entry?.next_due ?? "");
  const [busy, setBusy] = useState(false);
  return (
    <div className="lp-edit">
      {money ? (
        <p className="sx-hint">This LP has a commitment. Change the amount or status in Commitments above.</p>
      ) : (
        <>
          <div className="sx-field">
            <span className="lbl" id={`st-${row.id}`}>Stage</span>
            <div className="segment sx-wrap" role="group" aria-labelledby={`st-${row.id}`}>
              <button type="button" aria-pressed={stage === ""} onClick={() => setStage("")}>
                Use CRM
              </button>
              {PIPE_STAGES.map((value) => (
                <button key={value} type="button" aria-pressed={stage === value} onClick={() => setStage(value)}>
                  {STAGE_LABEL[value]}
                </button>
              ))}
            </div>
          </div>
          <label className="sx-field">
            <span className="lbl">Expected check</span>
            <input value={expected} onChange={(event) => setExpected(event.target.value)} placeholder="$250K" inputMode="decimal" />
          </label>
        </>
      )}
      <div className="sx-field">
        <span className="lbl" id={`cf-${row.id}`}>Confidence{money ? " (soft circles only)" : ""}</span>
        <div className="segment sx-wrap" role="group" aria-labelledby={`cf-${row.id}`}>
          <button type="button" aria-pressed={confidence === ""} onClick={() => setConfidence("")}>
            Not set
          </button>
          {(Object.keys(CONFIDENCE) as Confidence[]).map((value) => (
            <button key={value} type="button" aria-pressed={confidence === value} onClick={() => setConfidence(value)}>
              {CONFIDENCE_LABEL[value]}
            </button>
          ))}
        </div>
      </div>
      <label className="sx-field">
        <span className="lbl">Next action</span>
        <input value={next} onChange={(event) => setNext(event.target.value)} maxLength={300} placeholder="Send the deck, book the call, follow up" />
      </label>
      <label className="sx-field">
        <span className="lbl">Due</span>
        <input type="date" value={due} onChange={(event) => setDue(event.target.value)} />
      </label>
      <div className="sx-actions">
        <button
          type="button"
          className="btn primary"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            const fields: Record<string, unknown> = { confidence: confidence || null, next_action: next, next_due: due || null };
            if (!money) {
              fields.stage = stage || null;
              fields.expected_usd = expected.trim() || null;
            }
            await onSave(fields);
            setBusy(false);
          }}
        >
          {busy ? "Saving…" : "Save"}
        </button>
      </div>
    </div>
  );
}

function sumBy(rows: { stage: string; expected: number | null }[], stages: string[]): number {
  return rows.filter((row) => stages.includes(row.stage)).reduce((sum, row) => sum + (row.expected ?? 0), 0);
}
