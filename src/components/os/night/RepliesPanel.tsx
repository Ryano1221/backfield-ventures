"use client";

import { useState } from "react";
import { gmailThreadUrl, repliesWaiting } from "@/lib/os/outreach/plan";
import { INTENT_LABEL, type OutreachBook } from "@/lib/os/outreach/types";

/** People who replied to outreach and are waiting on Ryan. The reply itself is in his Gmail. */
export function RepliesPanel({ book, onBook }: { book: OutreachBook; onBook: (book: OutreachBook) => void }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const replies = repliesWaiting(book);
  if (!replies.length) return null;

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
      <ul className="lead-said">
        {replies.map((e) => (
          <li key={e.lead_id}>
            <p className="sx-hint">
              {[e.name, e.company].filter(Boolean).join(", ")} · {new Date(e.reply!.at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
            </p>
            {e.reply!.triage ? (
              <p className="reply-sum">
                <span className={`lead-chip reply-intent is-${e.reply!.triage.intent}`}>{INTENT_LABEL[e.reply!.triage.intent]}</span> {e.reply!.triage.summary}
              </p>
            ) : null}
            {e.reply!.snippet ? <blockquote>&ldquo;{e.reply!.snippet}&rdquo;</blockquote> : null}
            {e.reply!.triage?.suggested ? (
              <details className="lead-why">
                <summary>Suggested answer</summary>
                <p className="lead-body">{e.reply!.triage.suggested}</p>
                <button
                  type="button"
                  className="btn sm"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(e.reply!.triage!.suggested);
                      setCopied(e.lead_id);
                    } catch {
                      setCopied(null);
                    }
                  }}
                >
                  {copied === e.lead_id ? "Copied" : "Copy answer"}
                </button>
              </details>
            ) : null}
            <div className="sx-actions">
              {e.thread_id ? (
                <a className="btn primary" href={gmailThreadUrl(e.thread_id)} target="_blank" rel="noopener noreferrer">
                  Open in Gmail
                </a>
              ) : null}
              <button type="button" className="btn" disabled={busy === e.lead_id} onClick={() => done(e.lead_id)}>
                Done
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
