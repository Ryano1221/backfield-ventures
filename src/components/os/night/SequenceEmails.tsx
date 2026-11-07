"use client";

import { useState } from "react";
import { OPT_OUT, STEP_LABEL, stepDates } from "@/lib/os/outreach/plan";
import type { Enrollment, OutreachBook, Step } from "@/lib/os/outreach/types";

const day = (iso: string) => new Date(iso).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });

/** Every email in a lead's sequence, when it went or roughly when it goes, editable until sent. */
export function SequenceEmails({ sequence, now, onBook }: { sequence: Enrollment; now: number; onBook: (book: OutreachBook) => void }) {
  const dates = stepDates(sequence, new Date(now));
  return (
    <details className="lead-why seq-emails">
      <summary>The {sequence.steps.length} emails</summary>
      <ol className="seq-list">
        {sequence.steps.map((step, i) => (
          <SequenceStep key={step.n} leadId={sequence.lead_id} step={step} when={dates[i]} live={sequence.status === "active"} onBook={onBook} />
        ))}
      </ol>
    </details>
  );
}

function SequenceStep({ leadId, step, when, live, onBook }: { leadId: string; step: Step; when: { at: string; sent: boolean }; live: boolean; onBook: (book: OutreachBook) => void }) {
  const [editing, setEditing] = useState(false);
  const [subject, setSubject] = useState(step.subject);
  const [body, setBody] = useState(step.body.replace(OPT_OUT, "").trim());
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/os/outreach", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ op: "edit_step", lead_id: leadId, n: step.n, subject, body }) });
      const data = (await res.json().catch(() => ({}))) as { error?: string; book?: OutreachBook };
      if (!res.ok || !data.book) setError(data.error || "Could not save that.");
      else {
        onBook(data.book);
        setEditing(false);
      }
    } catch {
      setError("No connection. Nothing was saved.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <li className={`seq-step${step.sent_at ? " is-sent" : ""}`}>
      <p className="sx-hint">
        <b>
          {step.n}. {STEP_LABEL[step.kind]}
        </b>{" "}
        · {when.sent ? `Sent ${day(when.at)}` : live ? `Around ${day(when.at)}, their morning` : "Not sending"}
      </p>
      {editing ? (
        <form className="lead-edit" onSubmit={save}>
          {step.new_thread ? (
            <label className="sx-field">
              <span className="lbl">Subject</span>
              <input value={subject} onChange={(event) => setSubject(event.target.value)} maxLength={200} />
            </label>
          ) : null}
          <label className="sx-field">
            <span className="lbl">Email</span>
            <textarea className="sx-text" rows={8} value={body} onChange={(event) => setBody(event.target.value)} maxLength={4000} />
          </label>
          <p className="sx-hint">The opt-out line is added at the end automatically.</p>
          {error ? (
            <p className="sx-error" role="alert">
              {error}
            </p>
          ) : null}
          <div className="sx-actions">
            <button type="submit" className="btn primary" disabled={busy}>
              Save email
            </button>
            <button type="button" className="btn" onClick={() => setEditing(false)}>
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <>
          <p className="lead-subject">{step.subject}</p>
          <p className="lead-body">{step.body}</p>
          {!step.sent_at && live ? (
            <button type="button" className="btn sm" onClick={() => setEditing(true)}>
              Edit email {step.n}
            </button>
          ) : null}
        </>
      )}
    </li>
  );
}
