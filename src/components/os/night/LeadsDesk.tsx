"use client";

import { useMemo, useState } from "react";
import { gmailLink } from "@/lib/os/leads/book";
import { KIND_LABEL, LEAD_KINDS, type Lead, type LeadBook, type LeadKind, type LeadStatus } from "@/lib/os/leads/types";

const STATUS_LABEL: Record<LeadStatus, string> = { new: "To review", approved: "Approved", contacted: "Sent", skipped: "Skipped" };
const STATUSES: LeadStatus[] = ["new", "approved", "contacted", "skipped"];
const CONFIDENCE = { high: "Named person", medium: "Team inbox", low: "Unverified" } as const;

type Setup = { ai: boolean; vendor: string | null };

/** The lead list. Every change saves to the OS; nothing here sends email. */
export function LeadsDesk({ initial, setup }: { initial: LeadBook; setup: Setup }) {
  const [book, setBook] = useState(initial);
  const [kind, setKind] = useState<LeadKind>("founder");
  const [status, setStatus] = useState<LeadStatus>("new");
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  const counts = useMemo(() => {
    const out: Record<string, number> = {};
    for (const lead of book.leads) out[`${lead.kind}:${lead.status}`] = (out[`${lead.kind}:${lead.status}`] ?? 0) + 1;
    return out;
  }, [book]);
  const shown = book.leads.filter((lead) => lead.kind === kind && lead.status === status).sort((a, b) => b.score - a.score);

  async function send(url: string, body: unknown, label: string): Promise<boolean> {
    setBusy(label);
    setMessage(null);
    try {
      const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = (await res.json().catch(() => ({}))) as { error?: string; book?: LeadBook; run?: { scanned: number; added: number; errors: string[] } };
      if (!res.ok || !data.book) {
        setMessage({ tone: "error", text: data.error || "Could not save that." });
        return false;
      }
      setBook(data.book);
      if (data.run) {
        const found = data.run.added === 1 ? "1 new lead" : `${data.run.added} new leads`;
        setMessage({ tone: "ok", text: `Read ${data.run.scanned} ${data.run.scanned === 1 ? "filing" : "filings"}. ${found}.${data.run.errors.length ? ` ${data.run.errors.length} could not be read.` : ""}` });
      }
      return true;
    } catch {
      setMessage({ tone: "error", text: "No connection. Nothing was saved." });
      return false;
    } finally {
      setBusy(null);
    }
  }

  const op = (body: Record<string, unknown>) => send("/api/os/leads", body, String(body.id ?? body.op));

  return (
    <div className="leads">
      <div className="leads-bar">
        <div className="segment" role="group" aria-label="Lead type">
          {LEAD_KINDS.map((value) => (
            <button key={value} type="button" aria-pressed={kind === value} onClick={() => setKind(value)}>
              {KIND_LABEL[value]} {counts[`${value}:new`] ? `(${counts[`${value}:new`]})` : ""}
            </button>
          ))}
        </div>
        <button type="button" className="btn primary" disabled={busy === "find"} onClick={() => send("/api/os/leads/find", {}, "find")}>
          {busy === "find" ? "Searching…" : "Find new leads"}
        </button>
      </div>
      <p className="sx-hint leads-run" aria-live="polite">
        {book.last_run ? `Last search ${new Date(book.last_run.at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}: read ${book.last_run.scanned} ${book.last_run.scanned === 1 ? "filing" : "filings"}, ${book.last_run.added} new.` : "No search yet. Each search reads the next batch of SEC filings."}{" "}
        {setup.ai ? "AI writes the drafts." : "Drafts use a plain template until an AI key is set."} {setup.vendor ? `Contacts: company sites and ${setup.vendor}.` : "Contacts: company sites only, until a paid finder is connected."}
      </p>
      {message ? (
        <p className={message.tone === "error" ? "sx-error" : "sx-ok"} role={message.tone === "error" ? "alert" : "status"}>
          {message.text}
        </p>
      ) : null}

      <div className="segment sx-wrap" role="group" aria-label="Status">
        {STATUSES.map((value) => (
          <button key={value} type="button" aria-pressed={status === value} onClick={() => setStatus(value)}>
            {STATUS_LABEL[value]} {counts[`${kind}:${value}`] ?? 0}
          </button>
        ))}
      </div>

      {kind === "lp" ? <ImportLps busy={busy === "import"} onImport={(text) => send("/api/os/leads", { op: "import", kind: "lp", text }, "import")} /> : null}

      {shown.length ? (
        <ul className="leads-list">
          {shown.map((lead) => (
            <LeadCard key={lead.id} lead={lead} busy={busy === lead.id} onOp={op} />
          ))}
        </ul>
      ) : (
        <p className="t-body muted">{emptyText(kind, status)}</p>
      )}
    </div>
  );
}

function emptyText(kind: LeadKind, status: LeadStatus): string {
  if (status !== "new") return `No ${STATUS_LABEL[status].toLowerCase()} ${KIND_LABEL[kind].toLowerCase()} yet.`;
  if (kind === "lp") return "No LPs yet. Paste a list above, or connect a paid data source.";
  return `Nothing to review. Find new leads to read the next batch of filings.`;
}

function LeadCard({ lead, busy, onOp }: { lead: Lead; busy: boolean; onOp: (body: Record<string, unknown>) => Promise<boolean> }) {
  const [to, setTo] = useState(lead.to ?? lead.contacts[0]?.email ?? "");
  const [editing, setEditing] = useState(false);
  const [subject, setSubject] = useState(lead.draft?.subject ?? "");
  const [body, setBody] = useState(lead.draft?.body ?? "");
  const [copied, setCopied] = useState(false);
  const gmail = gmailLink(lead);
  const headline = [lead.people.slice(0, 2).map((p) => p.name).join(", "), lead.location].filter(Boolean).join(" · ");

  async function copy() {
    if (!lead.draft) return;
    try {
      await navigator.clipboard.writeText(`To: ${lead.to ?? ""}\nSubject: ${lead.draft.subject}\n\n${lead.draft.body}`);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <li className="sx-card lead">
      <div className="lead-head">
        <div>
          <h2 className="lead-name">{lead.company}</h2>
          {headline ? <p className="sx-hint">{headline}</p> : null}
        </div>
        <span className="lead-score" aria-label={`Fit score ${lead.score} out of 100`}>
          {lead.score}
        </span>
      </div>

      {lead.signals.length ? (
        <dl className="dl lead-facts">
          {lead.signals.map((signal) => (
            <div key={signal.label} style={{ display: "contents" }}>
              <dt>{signal.label}</dt>
              <dd>{signal.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}
      {lead.note ? <p className="t-body">{lead.note}</p> : null}

      {lead.reasons.length ? (
        <details className="lead-why">
          <summary>Why {lead.score}</summary>
          <ul>
            {lead.reasons.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
        </details>
      ) : null}

      <div className="lead-to">
        <span className="lbl">Send to</span>
        {lead.contacts.length ? (
          <div className="segment sx-wrap" role="group" aria-label={`Contacts for ${lead.company}`}>
            {lead.contacts.slice(0, 4).map((contact) => (
              <button key={contact.email} type="button" aria-pressed={to === contact.email} title={contact.note} onClick={() => setTo(contact.email)}>
                {contact.email} · {contact.source.startsWith("vendor:") ? contact.source.slice(7) : CONFIDENCE[contact.confidence]}
              </button>
            ))}
          </div>
        ) : null}
        <label className="sx-field">
          <span className="lbl">{lead.contacts.length ? "Or type one" : "No address found yet. Type one"}</span>
          <input value={to} onChange={(event) => setTo(event.target.value)} type="email" inputMode="email" autoComplete="off" placeholder="name@company.com" />
        </label>
      </div>

      {lead.draft ? (
        editing ? (
          <form
            className="lead-edit"
            onSubmit={async (event) => {
              event.preventDefault();
              if (await onOp({ op: "draft", id: lead.id, subject, body })) setEditing(false);
            }}
          >
            <label className="sx-field">
              <span className="lbl">Subject</span>
              <input value={subject} onChange={(event) => setSubject(event.target.value)} maxLength={200} />
            </label>
            <label className="sx-field">
              <span className="lbl">Email</span>
              <textarea className="sx-text" rows={9} value={body} onChange={(event) => setBody(event.target.value)} maxLength={4000} />
            </label>
            <div className="sx-actions">
              <button type="submit" className="btn primary" disabled={busy}>
                Save draft
              </button>
              <button type="button" className="btn" onClick={() => setEditing(false)}>
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <div className="lead-draft">
            <p className="lbl">{lead.draft.by === "ai" ? "Draft by AI" : "Draft"}</p>
            <p className="lead-subject">{lead.draft.subject}</p>
            <p className="lead-body">{lead.draft.body}</p>
          </div>
        )
      ) : null}

      <div className="sx-actions lead-actions">
        {lead.status === "new" ? (
          <>
            <button type="button" className="btn primary" disabled={busy} onClick={() => onOp({ op: "approve", id: lead.id, to })}>
              Approve
            </button>
            {lead.draft && !editing ? (
              <button type="button" className="btn" onClick={() => setEditing(true)}>
                Edit draft
              </button>
            ) : null}
            <button type="button" className="btn" disabled={busy} onClick={() => onOp({ op: "skip", id: lead.id })}>
              Skip
            </button>
          </>
        ) : null}
        {lead.status === "approved" ? (
          <>
            {gmail ? (
              <a className="btn primary" href={gmail} target="_blank" rel="noopener noreferrer">
                Open in Gmail
              </a>
            ) : null}
            <button type="button" className="btn" onClick={copy} aria-live="polite">
              {copied ? "Copied" : "Copy email"}
            </button>
            <button type="button" className="btn" disabled={busy} onClick={() => onOp({ op: "contacted", id: lead.id })}>
              Mark sent
            </button>
          </>
        ) : null}
        {lead.status === "skipped" || lead.status === "contacted" ? (
          <button type="button" className="btn" disabled={busy} onClick={() => onOp({ op: "restore", id: lead.id })}>
            Back to review
          </button>
        ) : null}
        {lead.source_url ? (
          <a className="btn" href={lead.source_url} target="_blank" rel="noopener noreferrer">
            {lead.source === "SEC Form D" ? "SEC filing" : "Source"}
          </a>
        ) : null}
      </div>
    </li>
  );
}

function ImportLps({ busy, onImport }: { busy: boolean; onImport: (text: string) => Promise<boolean> }) {
  const [text, setText] = useState("");
  return (
    <form
      className="sx-card lead-import"
      onSubmit={async (event) => {
        event.preventDefault();
        if (await onImport(text)) setText("");
      }}
    >
      <label className="sx-field">
        <span className="lbl">Add LPs, one per line: name, firm, email, note</span>
        <textarea className="sx-text" rows={4} value={text} onChange={(event) => setText(event.target.value)} maxLength={40000} placeholder="Name, Family office, name@firm.com, met at the summit" />
      </label>
      <p className="sx-hint">LP drafts are a hello only, never fund terms. Ask fund counsel before any cold email about the raise.</p>
      <div className="sx-actions">
        <button type="submit" className="btn primary" disabled={busy || !text.trim()}>
          {busy ? "Adding…" : "Add to the list"}
        </button>
      </div>
    </form>
  );
}
