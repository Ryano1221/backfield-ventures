"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { StepDots } from "./Charts";
import { bulkPick, gmailLink, leadsCsv } from "@/lib/os/leads/book";
import { plainName } from "@/lib/os/leads/draft";
import { SIGNAL_LABEL } from "@/lib/os/leads/research";
import { KIND_LABEL, LEAD_KINDS, type Lead, type LeadBook, type LeadKind, type LeadStatus } from "@/lib/os/leads/types";
import { dailyCap, firstTouchesToday } from "@/lib/os/outreach/plan";
import type { Enrollment, OutreachBook } from "@/lib/os/outreach/types";
import type { Known } from "@/lib/os/leads/known";
import { FindymailPanel } from "./FindymailPanel";
import { RepliesPanel } from "./RepliesPanel";
import { SequenceEmails } from "./SequenceEmails";
import { OutreachPanel, sequenceLine, type OutreachSetup } from "./OutreachPanel";

const STEPS = ["1", "2", "3", "4", "5"] as const;
const STATUS_LABEL: Record<LeadStatus, string> = { new: "To review", approved: "Approved", contacted: "Sent", skipped: "Skipped" };
const STATUSES: LeadStatus[] = ["new", "approved", "contacted", "skipped"];
const CONFIDENCE = { high: "Named person", medium: "Team inbox", low: "Unverified" } as const;

type Setup = { ai: boolean; vendor: string | null };

/** The lead list. Every change saves to the OS; nothing here sends email. */
const GMAIL_NOTE: Record<string, { tone: "ok" | "error"; text: string }> = {
  connected: { tone: "ok", text: "Gmail connected. Autopilot can send once it's switched on." },
  declined: { tone: "error", text: "Gmail was not connected: access was declined." },
  expired: { tone: "error", text: "That Gmail sign-in expired. Try Connect Gmail again." },
  failed: { tone: "error", text: "Gmail could not be connected. Check the Google client settings and try again." },
};

export function LeadsDesk({ initial, setup, outreach: initialOutreach, outreachSetup, known = {}, preview = [] }: { initial: LeadBook; setup: Setup; outreach: OutreachBook; outreachSetup: OutreachSetup; known?: Record<string, Known>; preview?: { id: string; company: string; score: number; email: string }[] }) {
  const [book, setBook] = useState(initial);
  const [outreach, setOutreach] = useState(initialOutreach);
  const [mailSetup, setMailSetup] = useState(outreachSetup);
  const [now] = useState(() => Date.now());
  const [kind, setKind] = useState<LeadKind>("founder");
  const [status, setStatus] = useState<LeadStatus>("new");
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string; undo?: string; undoMany?: string[] } | null>(null);

  useEffect(() => {
    const result = new URLSearchParams(window.location.search).get("gmail");
    if (result && GMAIL_NOTE[result]) setMessage(GMAIL_NOTE[result]);
  }, []);
  const sequences = useMemo(() => new Map(outreach.enrollments.map((e) => [e.lead_id, e])), [outreach]);
  // The best lead starts open; the rest are one tap (or Enter) away.
  const [open, setOpen] = useState<Set<string>>(() => new Set());
  const [touched, setTouched] = useState(false);
  const listRef = useRef<HTMLUListElement>(null);
  // Flip what's on screen: the best lead counts as open until the first toggle.
  function toggle(id: string, showing: boolean) {
    setOpen((current) => {
      const next = new Set(current);
      if (!touched && firstId && firstId !== id) next.add(firstId);
      if (showing) next.delete(id);
      else next.add(id);
      return next;
    });
    setTouched(true);
  }

  async function enroll(lead: Lead, to: string) {
    setBusy(lead.id);
    setMessage(null);
    try {
      const res = await fetch("/api/os/outreach", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ op: "enroll", lead_id: lead.id, to }) });
      const data = (await res.json().catch(() => ({}))) as { error?: string; book?: OutreachBook };
      if (!res.ok || !data.book) setMessage({ tone: "error", text: data.error || "Could not start the sequence." });
      else {
        setOutreach(data.book);
        setMessage({ tone: "ok", text: `Sequence started for ${lead.company}. The first email goes out in their next Tuesday to Thursday morning.` });
      }
    } catch {
      setMessage({ tone: "error", text: "No connection. Nothing was saved." });
    } finally {
      setBusy(null);
    }
  }

  const counts = useMemo(() => {
    const out: Record<string, number> = {};
    for (const lead of book.leads) out[`${lead.kind}:${lead.status}`] = (out[`${lead.kind}:${lead.status}`] ?? 0) + 1;
    return out;
  }, [book]);
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const matches = (lead: Lead) => !q || `${lead.company} ${lead.people.map((p) => p.name).join(" ")} ${lead.location ?? ""} ${lead.contacts.map((c) => c.email).join(" ")}`.toLowerCase().includes(q);
  const [sort, setSort] = useState<"score" | "newest">("score");
  const shown = book.leads
    .filter((lead) => lead.kind === kind && lead.status === status && matches(lead))
    .sort((a, b) => (sort === "newest" ? b.found_at.localeCompare(a.found_at) || b.score - a.score : b.score - a.score));
  const isOpen = (id: string, index: number) => open.has(id) || (!touched && index === 0);
  const firstId = shown[0]?.id ?? null;

  // Triage from the keyboard: j and k move between leads, a approves, s skips. Typing in a field is left alone.
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (event.metaKey || event.ctrlKey || event.altKey || target?.closest("input, textarea, select, [contenteditable='true']")) return;
      const rows = [...(listRef.current?.querySelectorAll<HTMLButtonElement>(".lead-row") ?? [])];
      if (!rows.length) return;
      const at = rows.findIndex((row) => row === document.activeElement);
      if (event.key === "j" || event.key === "k") {
        event.preventDefault();
        const next = event.key === "j" ? Math.min(rows.length - 1, at + 1) : Math.max(0, at < 0 ? 0 : at - 1);
        rows[next]?.focus();
        rows[next]?.scrollIntoView({ block: "nearest", behavior: "smooth" });
        return;
      }
      if ((event.key === "a" || event.key === "s") && at >= 0) {
        const id = rows[at].dataset.lead;
        const lead = book.leads.find((l) => l.id === id);
        if (!lead || lead.status !== "new") return;
        event.preventDefault();
        if (event.key === "s") void send("/api/os/leads/book", { op: "skip", id: lead.id }, lead.id);
        else void send("/api/os/leads/book", { op: "approve", id: lead.id, to: lead.to ?? lead.contacts[0]?.email ?? "" }, lead.id);
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  });

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
      const change = body as { op?: string; id?: string; action?: string; ids?: string[] };
      if (change.op === "bulk" && change.ids) setMessage({ tone: "ok", text: `${change.action === "approve" ? "Approved" : "Skipped"} ${change.ids.length} ${change.ids.length === 1 ? "lead" : "leads"}.`, undoMany: change.ids });
      if ((change.op === "skip" || change.op === "approve") && change.id) {
        const company = data.book.leads.find((lead) => lead.id === change.id)?.company ?? "Lead";
        setMessage({ tone: "ok", text: `${change.op === "skip" ? "Skipped" : "Approved"} ${company}.`, undo: change.id });
      }
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

  const op = (body: Record<string, unknown>) => send("/api/os/leads/book", body, String(body.id ?? body.op));

  return (
    <div className="leads">
      <RepliesPanel book={outreach} onBook={setOutreach} />
      <OutreachPanel
        book={outreach}
        setup={mailSetup}
        capToday={dailyCap(outreach.settings, outreach, new Date(now))}
        sentToday={firstTouchesToday(outreach, new Date(now))}
        now={now}
        preview={preview}
        onBook={(next, nextSetup) => {
          setOutreach(next);
          if (nextSetup) setMailSetup(nextSetup);
        }}
      />
      <FindymailPanel onBook={setBook} />
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
        {book.last_run?.errors.length ? <span className="sx-error leads-run-errors">Last search problems: {book.last_run.errors.slice(0, 3).join("; ")}{book.last_run.errors.length > 3 ? ` and ${book.last_run.errors.length - 3} more` : ""}. </span> : null}
        {setup.ai ? "AI writes the drafts." : "Drafts use a plain template until an AI key is set."} {setup.vendor ? `Contacts: company sites and ${setup.vendor}.` : "Contacts: company sites only, until a paid finder is connected."}
      </p>
      {message ? (
        <p className={`${message.tone === "error" ? "sx-error" : "sx-ok"} leads-toast`} role={message.tone === "error" ? "alert" : "status"}>
          {message.text}
          {message.undoMany ? (
            <button type="button" className="btn sm" onClick={() => send("/api/os/leads/book", { op: "restore_many", ids: message.undoMany }, "bulk")}>
              Undo
            </button>
          ) : null}
          {message.undo ? (
            <button type="button" className="btn sm" onClick={() => send("/api/os/leads/book", { op: "restore", id: message.undo }, message.undo!)}>
              Undo
            </button>
          ) : null}
        </p>
      ) : null}

      <div className="segment sx-wrap" role="group" aria-label="Status">
        {STATUSES.map((value) => (
          <button key={value} type="button" aria-pressed={status === value} onClick={() => setStatus(value)}>
            {STATUS_LABEL[value]} {counts[`${kind}:${value}`] ?? 0}
          </button>
        ))}
      </div>

      {status === "new" ? <BulkBar book={book} kind={kind} busy={busy === "bulk"} onBulk={(action, score, ids) => send("/api/os/leads/book", { op: "bulk", kind, action, score, ids }, "bulk")} /> : null}

      {kind === "lp" ? <ImportLps busy={busy === "import"} onImport={(text) => send("/api/os/leads/book", { op: "import", kind: "lp", text }, "import")} /> : null}

      <div className="segment sx-wrap" role="group" aria-label="Sort leads">
        <button type="button" aria-pressed={sort === "score"} onClick={() => setSort("score")}>
          Best first
        </button>
        <button type="button" aria-pressed={sort === "newest"} onClick={() => setSort("newest")}>
          Newest first
        </button>
      </div>
      <label className="sx-field leads-search">
        <span className="lbl">Find a lead</span>
        <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Company, person, city or email" autoComplete="off" />
      </label>
      {shown.length ? (
        <div className="sx-actions">
          <button
            type="button"
            className="btn sm"
            onClick={() => {
              const blob = new Blob([leadsCsv(shown)], { type: "text/csv;charset=utf-8" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `backfield-${KIND_LABEL[kind].toLowerCase()}-${STATUS_LABEL[status].toLowerCase().replace(/\s+/g, "-")}.csv`;
              a.click();
              setTimeout(() => URL.revokeObjectURL(url), 1000);
              setMessage({ tone: "ok", text: `Exported ${shown.length} ${shown.length === 1 ? "lead" : "leads"} to CSV.` });
            }}
          >
            Export CSV
          </button>
        </div>
      ) : null}
      {shown.length ? (
        <p className="sx-hint leads-keys">
          <kbd>j</kbd> <kbd>k</kbd> move · <kbd>Enter</kbd> open · <kbd>a</kbd> approve · <kbd>s</kbd> skip
        </p>
      ) : null}
      {shown.length ? (
        <ul className="leads-list" ref={listRef}>
          {shown.map((lead, index) => (
            <LeadCard
              key={lead.id}
              open={isOpen(lead.id, index)}
              onToggle={() => toggle(lead.id, isOpen(lead.id, index))}
              lead={lead}
              busy={busy === lead.id}
              researching={busy === `research:${lead.id}`}
              canResearch={setup.ai}
              onOp={op}
              onResearch={() => send("/api/os/leads/research", { id: lead.id }, `research:${lead.id}`)}
              sequence={sequences.get(lead.id) ?? null}
              onEnroll={enroll}
              now={now}
              onSequence={setOutreach}
              known={known[lead.id] ?? null}
            />
          ))}
        </ul>
      ) : (
        <p className="t-body muted">{q ? `No ${KIND_LABEL[kind].toLowerCase()} match "${query.trim()}".` : emptyText(kind, status)}</p>
      )}
    </div>
  );
}

function emptyText(kind: LeadKind, status: LeadStatus): string {
  if (status !== "new") return `No ${STATUS_LABEL[status].toLowerCase()} ${KIND_LABEL[kind].toLowerCase()} yet.`;
  if (kind === "lp") return "No LPs yet. Paste a list above, or connect a paid data source.";
  return `Nothing to review. Find new leads to read the next batch of filings.`;
}

function LeadCard({
  open,
  onToggle,
  now,
  onSequence,
  known,
  lead,
  busy,
  researching,
  canResearch,
  onOp,
  onResearch,
  sequence,
  onEnroll,
}: {
  open: boolean;
  onToggle: () => void;
  now: number;
  onSequence: (book: OutreachBook) => void;
  known: Known | null;
  lead: Lead;
  busy: boolean;
  researching: boolean;
  canResearch: boolean;
  onOp: (body: Record<string, unknown>) => Promise<boolean>;
  onResearch: () => Promise<boolean>;
  sequence: Enrollment | null;
  onEnroll: (lead: Lead, to: string) => Promise<void>;
}) {
  const [to, setTo] = useState(lead.to ?? lead.contacts[0]?.email ?? "");
  const [editing, setEditing] = useState(false);
  const [subject, setSubject] = useState(lead.draft?.subject ?? "");
  const [body, setBody] = useState(lead.draft?.body ?? "");
  const [copied, setCopied] = useState(false);
  const gmail = gmailLink(lead);
  const days = Math.max(0, Math.floor((now - Date.parse(lead.found_at)) / 86_400_000));
  const age = Number.isFinite(days) ? (days === 0 ? "found today" : days === 1 ? "found yesterday" : `found ${days}d ago`) : null;
  const headline = [lead.people.slice(0, 2).map((p) => p.name).join(", "), lead.location, age].filter(Boolean).join(" · ");
  // One tap to look the person up yourself, in your own browser.
  const plainCompany = plainName(lead.company);
  const lookup = lead.people[0] ? `${lead.people[0].name} ${plainCompany}`.trim() : null;
  const band = lead.score >= 80 ? "is-high" : lead.score >= 60 ? "is-mid" : "is-low";
  const said = lead.research?.status === "found" ? lead.research.findings[0] : null;
  const warm = Boolean(said);
  const chip = known ? `Known: ${known.where}` : said ? `Said: ${SIGNAL_LABEL[said.signal].toLowerCase()}` : (lead.reasons.find((r) => r.startsWith("+"))?.replace(/^\+\d+\s+/, "") ?? null);

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
    <li className={`sx-card lead${open ? " is-open" : ""}`}>
      <h2 className="lead-title">
        <button type="button" className="lead-row" data-lead={lead.id} aria-expanded={open} aria-controls={`${lead.id}-body`} onClick={onToggle}>
          <span className={`lead-score ${band}`} aria-label={`Fit score ${lead.score} out of 100`}>
            {lead.score}
          </span>
          <span className="lead-id">
            <span className="lead-name">{lead.company}</span>
            {headline ? <span className="sx-hint">{headline}</span> : null}
          </span>
          {chip ? <span className={`lead-chip${known ? " is-known" : warm ? " is-warm" : ""}`}>{chip}</span> : null}
          {sequence ? <StepDots steps={STEPS.slice(0, sequence.steps.length)} done={sequence.steps.filter((s) => s.sent_at).map((s) => String(s.n))} label={`Sequence: ${sequenceLine(sequence)}`} /> : null}
          <span className="lead-chev" aria-hidden="true" />
        </button>
      </h2>
      {open ? (
      <div className="lead-panel" id={`${lead.id}-body`}>
      {lead.signals.length ? (
        <ul className="lead-facts-grid">
          {lead.signals.map((signal) => (
            <li key={signal.label}>
              <span className="lbl">{signal.label}</span>
              <b>{signal.value}</b>
            </li>
          ))}
        </ul>
      ) : null}
      {known ? (
        <p className="sx-ok lead-known" role="note">
          Already in {known.where}: {known.name}
          {known.detail ? ` (${known.detail})` : ""}. Autopilot won&apos;t send this person a cold sequence; reach out yourself.
        </p>
      ) : null}
      <NoteField lead={lead} onOp={onOp} />
      <Research lead={lead} canResearch={canResearch} researching={researching} onResearch={onResearch} />
      {sequence ? (
        <p className="sx-ok" role="status">
          Sequence: {sequenceLine(sequence)}. {sequence.reason}
        </p>
      ) : null}
      {sequence ? <SequenceEmails sequence={sequence} now={now} onBook={onSequence} /> : null}

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
            <button type="button" className="btn" disabled={busy} onClick={() => onOp({ op: "snooze", id: lead.id, days: 30 })}>
              Snooze 30 days
            </button>
          </>
        ) : null}
        {lead.status === "approved" ? (
          <>
            {!sequence || sequence.status !== "active" ? (
              <button type="button" className="btn primary" disabled={busy} onClick={() => onEnroll(lead, to)}>
                Start sequence
              </button>
            ) : null}
            {gmail ? (
              <a className="btn" href={gmail} target="_blank" rel="noopener noreferrer">
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
        {lead.status === "skipped" && lead.snoozed_until ? <p className="sx-hint">Snoozed. Back to review on {lead.snoozed_until}.</p> : null}
        {lead.status === "skipped" || lead.status === "contacted" ? (
          <button type="button" className="btn" disabled={busy} onClick={() => onOp({ op: "restore", id: lead.id })}>
            Back to review
          </button>
        ) : null}
        {lookup ? (
          <>
            <a className="btn" href={`https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(lookup)}`} target="_blank" rel="noopener noreferrer">
              LinkedIn
            </a>
            <a className="btn" href={`https://www.google.com/search?q=${encodeURIComponent(`"${lead.people[0].name}" ${plainCompany}`)}`} target="_blank" rel="noopener noreferrer">
              Google
            </a>
          </>
        ) : null}
        {lead.source_url ? (
          <a className="btn" href={lead.source_url} target="_blank" rel="noopener noreferrer">
            {lead.source === "SEC Form D" ? "SEC filing" : "Source"}
          </a>
        ) : null}
      </div>
      </div>
      ) : null}
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

/** What the lead said publicly in the last year, each with its source. Only verified quotes are shown. */
function Research({ lead, canResearch, researching, onResearch }: { lead: Lead; canResearch: boolean; researching: boolean; onResearch: () => Promise<boolean> }) {
  const research = lead.research;
  if (!research && !canResearch) return null;
  return (
    <div className="lead-research">
      <span className="lbl">Said in the last year</span>
      {research?.status === "found" ? (
        <ul className="lead-said">
          {research.findings.map((finding) => (
            <li key={`${finding.url}-${finding.quote.slice(0, 20)}`}>
              <p className="sx-hint">
                {SIGNAL_LABEL[finding.signal]} · {finding.date} · {finding.title ?? finding.source}
              </p>
              <blockquote>&ldquo;{finding.quote}&rdquo;</blockquote>
              {finding.why ? <p className="t-body">{finding.why}</p> : null}
              <a className="btn sm" href={finding.url} target="_blank" rel="noopener noreferrer">
                Source
              </a>
            </li>
          ))}
        </ul>
      ) : research?.status === "nothing" ? (
        <p className="sx-hint">Nothing from the last year checks out. {research.note} The email sticks to the public facts.</p>
      ) : research?.status === "failed" ? (
        <p className="sx-hint">The research didn&apos;t finish: {research.note}</p>
      ) : (
        <p className="sx-hint">Not researched yet.</p>
      )}
      {research && research.dropped ? <p className="sx-hint">{research.dropped === 1 ? "1 finding" : `${research.dropped} findings`} dropped: couldn&apos;t confirm the quote, the page, or that it&apos;s from the last year.</p> : null}
      {canResearch ? (
        <div className="sx-actions">
          <button type="button" className="btn" disabled={researching} onClick={() => onResearch()}>
            {researching ? "Researching, about 2 minutes…" : research ? "Research again" : "Research"}
          </button>
        </div>
      ) : null}
    </div>
  );
}

/** One-tap triage for long lists: skip the weak ones, approve the strong ones that have an email. */
function BulkBar({ book, kind, busy, onBulk }: { book: LeadBook; kind: LeadKind; busy: boolean; onBulk: (action: "approve" | "skip", score: number, ids: string[]) => Promise<boolean> }) {
  const weak = bulkPick(book, kind, "skip", 50);
  const strong = bulkPick(book, kind, "approve", 85);
  if (!weak.length && !strong.length) return null;
  return (
    <div className="sx-actions leads-bulk">
      {strong.length ? (
        <button type="button" className="btn" disabled={busy} onClick={() => onBulk("approve", 85, strong.map((lead) => lead.id))}>
          Approve the {strong.length} at 85+ with an email
        </button>
      ) : null}
      {weak.length ? (
        <button type="button" className="btn" disabled={busy} onClick={() => onBulk("skip", 50, weak.map((lead) => lead.id))}>
          Skip the {weak.length} under 50
        </button>
      ) : null}
    </div>
  );
}

/** Ryan's own note on a lead. Saves when he leaves the box; AI drafts use it. */
function NoteField({ lead, onOp }: { lead: Lead; onOp: (body: Record<string, unknown>) => Promise<boolean> }) {
  const [note, setNote] = useState(lead.note);
  const [saved, setSaved] = useState(false);
  return (
    <label className="sx-field">
      <span className="lbl">Your note{saved ? " · saved" : ""}</span>
      <textarea
        className="sx-text"
        rows={2}
        value={note}
        maxLength={1000}
        placeholder="How you know them, what to mention, anything to avoid"
        onChange={(event) => {
          setNote(event.target.value);
          setSaved(false);
        }}
        onBlur={async () => {
          if (note.trim() === lead.note.trim()) return;
          if (await onOp({ op: "note", id: lead.id, note })) setSaved(true);
        }}
      />
    </label>
  );
}
