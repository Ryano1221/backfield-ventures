"use client";

import { useState } from "react";
import { gmailThreadUrl, repliesWaiting } from "@/lib/os/outreach/plan";
import { INTENT_LABEL, type OutreachBook } from "@/lib/os/outreach/types";

/** People who replied to outreach and are waiting on Ryan. The reply itself is in his Gmail. */
export function RepliesPanel({ book, onBook }: { book: OutreachBook; onBook: (book: OutreachBook) => void }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sentNote, setSentNote] = useState<string | null>(null);
  const [added, setAdded] = useState<Record<string, string>>({});

  // An interested LP belongs in the raise pipeline: add them to Fundraising's warm leads, marked reached.
  async function toFundraising(e: (typeof replies)[number]) {
    setBusy(e.lead_id);
    setError(null);
    try {
      const said = e.reply?.triage?.summary || e.reply?.snippet || "";
      const res = await fetch("/api/os/leads", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ op: "add_lead", name: e.name, firm: e.company, source: "other", note: `Replied to outreach${said ? `: "${said.slice(0, 300)}"` : "."}` }) });
      const data = (await res.json().catch(() => ({}))) as { error?: string; id?: string };
      if (!res.ok || !data.id) {
        setAdded((current) => ({ ...current, [e.lead_id]: data.error || "Could not add them." }));
        return;
      }
      await fetch("/api/os/leads", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ op: "lead_status", id: data.id, status: "reached" }) }).catch(() => undefined);
      setAdded((current) => ({ ...current, [e.lead_id]: "Added to Fundraising warm leads." }));
    } catch {
      setAdded((current) => ({ ...current, [e.lead_id]: "No connection. Nothing was saved." }));
    } finally {
      setBusy(null);
    }
  }
  const replies = repliesWaiting(book);
  if (!replies.length)
    return sentNote ? (
      <p className="sx-ok leads-toast" role="status">
        {sentNote}
      </p>
    ) : null;

  // Sends Ryan's answer from his Gmail in the same thread; the reply then leaves this list.
  async function answer(leadId: string, text: string): Promise<boolean> {
    setBusy(leadId);
    setError(null);
    try {
      const res = await fetch("/api/os/outreach/reply", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ lead_id: leadId, body: text }) });
      const data = (await res.json().catch(() => ({}))) as { error?: string; book?: OutreachBook };
      if (!res.ok || !data.book) {
        setError(data.error || "Could not send that.");
        return false;
      }
      setSentNote("Sent from your Gmail, in the same thread.");
      onBook(data.book);
      return true;
    } catch {
      setError("No connection. Nothing was sent.");
      return false;
    } finally {
      setBusy(null);
    }
  }

  async function done(leadId: string) {
    setBusy(leadId);
    setError(null);
    try {
      const res = await fetch("/api/os/outreach", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ op: "handled", lead_id: leadId }) });
      const data = (await res.json().catch(() => ({}))) as { error?: string; book?: OutreachBook };
      if (!res.ok || !data.book) setError(data.error || "Could not save that.");
      else onBook(data.book);
    } catch {
      setError("No connection. Nothing was saved.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="sx-card autopilot" aria-label="Replies">
      <h2 className="lead-name">{replies.length === 1 ? "1 reply" : `${replies.length} replies`} to answer</h2>
      {error ? (
        <p className="sx-error" role="alert">
          {error}
        </p>
      ) : null}
      <ul className="reply-threads">
        {replies.map((e, i) => {
          const sent = e.steps.filter((step) => step.sent_at);
          const mine = sent[sent.length - 1];
          const triage = e.reply!.triage;
          return (
            <li key={e.lead_id} className="reply-thread" style={{ animationDelay: `${i * 60}ms` }}>
              <p className="reply-meta">
                <b>{[e.name, e.company].filter(Boolean).join(", ")}</b>
                <span className="sx-hint">{new Date(e.reply!.at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</span>
                {triage ? <span className={`lead-chip reply-intent is-${triage.intent}`}>{INTENT_LABEL[triage.intent]}</span> : null}
              </p>
              <div className="bubbles">
                {mine ? (
                  <div className="bubble is-me">
                    <span className="bubble-who">You</span>
                    <b>{mine.subject}</b>
                    <span className="bubble-text">{mine.body.length > 240 ? `${mine.body.slice(0, 240).trimEnd()}…` : mine.body}</span>
                  </div>
                ) : null}
                {e.reply!.snippet ? (
                  <div className="bubble is-them">
                    <span className="bubble-who">{e.name || e.email}</span>
                    <span className="bubble-text">{e.reply!.snippet}</span>
                  </div>
                ) : null}
              </div>
              {triage?.summary ? <p className="sx-hint reply-gist">In short: {triage.summary}</p> : null}
              {added[e.lead_id] ? (
                <p className="sx-ok" role="status">
                  {added[e.lead_id]}
                </p>
              ) : null}
              {e.thread_id ? <Composer key={`${e.lead_id}-${triage?.suggested ?? ""}`} name={e.name || e.email} suggested={triage?.suggested ?? ""} busy={busy === e.lead_id} onSend={(text) => answer(e.lead_id, text)} /> : null}
              <div className="sx-actions">
                {e.thread_id ? (
                  <a className="btn" href={gmailThreadUrl(e.thread_id)} target="_blank" rel="noopener noreferrer">
                    Open in Gmail
                  </a>
                ) : null}
                {e.kind === "lp" && e.name && !added[e.lead_id] ? (
                  <button type="button" className="btn" disabled={busy === e.lead_id} onClick={() => toFundraising(e)}>
                    Add to Fundraising
                  </button>
                ) : null}
                <button type="button" className="btn" disabled={busy === e.lead_id} onClick={() => done(e.lead_id)}>
                  Done, no answer needed
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** The suggested answer as a draft Ryan can edit and send, or his own words when there's none. */
function Composer({ name, suggested, busy, onSend }: { name: string; suggested: string; busy: boolean; onSend: (text: string) => Promise<boolean> }) {
  const [text, setText] = useState(suggested);
  const [sure, setSure] = useState(false);
  return (
    <form
      className="composer"
      onSubmit={async (event) => {
        event.preventDefault();
        if (!sure) {
          setSure(true);
          return;
        }
        if (await onSend(text)) setText("");
        setSure(false);
      }}
    >
      <label className="sx-field">
        <span className="lbl">{suggested ? "Suggested answer, edit before sending" : `Your answer to ${name}`}</span>
        <textarea value={text} onChange={(event) => { setText(event.target.value); setSure(false); }} rows={Math.min(8, Math.max(3, text.split("\n").length + 1))} maxLength={5000} />
      </label>
      <div className="sx-actions">
        <button type="submit" className={`btn primary${sure ? " is-sure" : ""}`} disabled={busy || !text.trim()}>
          {busy ? "Sending…" : sure ? `Send to ${name} now` : "Send from Gmail"}
        </button>
        {sure ? (
          <button type="button" className="btn" onClick={() => setSure(false)}>
            Not yet
          </button>
        ) : null}
      </div>
    </form>
  );
}
