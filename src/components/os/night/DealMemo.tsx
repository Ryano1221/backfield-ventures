"use client";

import { useState } from "react";
import { blankMemo, CHECKLIST, DECISION_LABEL, DECISIONS, type Decision, type Memo, type MemoBook } from "@/lib/os/deal-memo";

/** Decision, reason, memo, diligence and the next step for one deal. */
export function DealMemo({ dealId, initial }: { dealId: string; initial: Memo | null }) {
  const start = initial ?? blankMemo(new Date(0).toISOString());
  const [saved, setSaved] = useState<Memo>(start);
  const [decision, setDecision] = useState<Decision>(start.decision);
  const [reason, setReason] = useState(start.reason);
  const [memo, setMemo] = useState(start.memo);
  const [checks, setChecks] = useState<string[]>(start.checks);
  const [owner, setOwner] = useState(start.owner);
  const [next, setNext] = useState(start.next_action);
  const [due, setDue] = useState(start.next_due ?? "");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  const dirty =
    decision !== saved.decision || reason !== saved.reason || memo !== saved.memo || owner !== saved.owner || next !== saved.next_action || due !== (saved.next_due ?? "") || checks.join("|") !== saved.checks.join("|");
  const needsReason = (decision === "invest" || decision === "pass") && !reason.trim();

  async function save() {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/os/deal-memo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ op: "set", deal_id: dealId, reason, memo, checks, owner, next_action: next, next_due: due || null, decision }),
      });
      const data = (await res.json().catch(() => ({}))) as { book?: MemoBook; error?: string };
      if (!res.ok || !data.book) setMessage({ tone: "error", text: data.error || "Could not save that." });
      else {
        setSaved(data.book.deals[dealId]);
        setMessage({ tone: "ok", text: "Saved." });
      }
    } catch {
      setMessage({ tone: "error", text: "No connection. Nothing was saved." });
    }
    setBusy(false);
  }

  return (
    <section className="deal-memo" aria-label="Investment memo">
      <h2 className="sx-h2">Decision and memo</h2>
      <p className="sx-muted">Your call on this company, separate from the score and your quick rating. Only you can see this.</p>

      <div className="sx-field">
        <span className="lbl" id="dm-decision">Decision</span>
        <div className="segment sx-wrap" role="group" aria-labelledby="dm-decision">
          {DECISIONS.map((value) => (
            <button key={value} type="button" aria-pressed={decision === value} onClick={() => setDecision(value)}>
              {DECISION_LABEL[value]}
            </button>
          ))}
        </div>
      </div>
      <label className="sx-field">
        <span className="lbl">Why{decision === "invest" || decision === "pass" ? " (required)" : ""}</span>
        <textarea className="sx-text" rows={3} value={reason} maxLength={2000} onChange={(event) => setReason(event.target.value)} placeholder="The one or two reasons that decide it" />
      </label>

      <div className="sx-field">
        <span className="lbl" id="dm-checks">Diligence ({checks.length} of {CHECKLIST.length})</span>
        <div className="dm-checks" role="group" aria-labelledby="dm-checks">
          {CHECKLIST.map((item) => (
            <label key={item} className="dm-check">
              <input type="checkbox" checked={checks.includes(item)} onChange={(event) => setChecks((current) => (event.target.checked ? [...current, item] : current.filter((row) => row !== item)))} />
              <span>{item}</span>
            </label>
          ))}
        </div>
      </div>

      <label className="sx-field">
        <span className="lbl">Memo</span>
        <textarea className="sx-text" rows={8} value={memo} maxLength={20000} onChange={(event) => setMemo(event.target.value)} placeholder="What they do, why now, risks, what you would need to believe" />
      </label>

      <div className="dm-next">
        <label className="sx-field">
          <span className="lbl">Next step</span>
          <input value={next} maxLength={300} onChange={(event) => setNext(event.target.value)} placeholder="Call references, ask for the data room" />
        </label>
        <label className="sx-field">
          <span className="lbl">Owner</span>
          <input value={owner} maxLength={80} onChange={(event) => setOwner(event.target.value)} />
        </label>
        <label className="sx-field">
          <span className="lbl">Due</span>
          <input type="date" value={due} onChange={(event) => setDue(event.target.value)} />
        </label>
      </div>

      {message ? (
        <p className={message.tone === "error" ? "sx-error" : "sx-ok"} role={message.tone === "error" ? "alert" : "status"}>
          {message.text}
        </p>
      ) : null}
      <div className="sx-actions">
        <button type="button" className="btn primary" disabled={busy || !dirty || needsReason} onClick={save}>
          {busy ? "Saving…" : "Save"}
        </button>
        {needsReason ? <span className="sx-muted">Write why before saving an invest or pass.</span> : null}
        {saved.decided_at && (saved.decision === "invest" || saved.decision === "pass") ? (
          <span className="sx-muted">
            Decided {new Date(saved.decided_at).toLocaleDateString("en-US", { timeZone: "America/Chicago", month: "short", day: "numeric" })}
          </span>
        ) : null}
      </div>
    </section>
  );
}
