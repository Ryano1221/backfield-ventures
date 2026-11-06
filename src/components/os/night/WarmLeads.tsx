"use client";

import Link from "next/link";
import { useState } from "react";
import { usd } from "@/lib/os/raise-model";
import {
  askCandidates,
  LEAD_SOURCE_LABEL,
  LEAD_SOURCES,
  LEAD_STATUS_LABEL,
  LEAD_STATUSES,
  referrers,
  spvToFund,
  type Candidate,
  type LeadBook,
  type LeadSource,
  type LeadStatus,
} from "@/lib/os/warm-leads";

type Backer = { name: string; personId: string | null; spvs: number; committed: number };

/**
 * Warm leads for Fund I: SPV investors not in the fund yet, who to ask for
 * two names, and every intro with where it came from. Nothing sends.
 */
export function WarmLeads({ initial, candidates, backers, fundNames, personRoot }: { initial: LeadBook; candidates: Candidate[]; backers: Backer[]; fundNames: string[]; personRoot: string }) {
  const [book, setBook] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [name, setName] = useState("");
  const [referrer, setReferrer] = useState("");
  const [firm, setFirm] = useState("");
  const [source, setSource] = useState<LeadSource>("intro");

  const toAsk = askCandidates(book, candidates).slice(0, 6);
  const waitingOn = book.asks.filter((ask) => ask.status === "asked");
  const fromSpvs = spvToFund(backers, fundNames, book).slice(0, 8);
  const open = book.leads.filter((lead) => lead.status !== "passed" && lead.status !== "committed");
  const done = book.leads.filter((lead) => lead.status === "passed" || lead.status === "committed");
  const top = referrers(book).slice(0, 5);

  async function run(op: Record<string, unknown>, ok: string): Promise<boolean> {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/os/leads", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(op) });
      const data = (await res.json().catch(() => ({}))) as { error?: string; book?: LeadBook };
      if (!res.ok || !data.book) {
        setMessage({ tone: "error", text: data.error || "Could not save that." });
        return false;
      }
      setBook(data.book);
      setMessage({ tone: "ok", text: ok });
      return true;
    } catch {
      setMessage({ tone: "error", text: "No connection. Nothing was saved." });
      return false;
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="stack warm-leads" aria-label="Warm leads">
      <h2>Warm leads</h2>
      <p className="sx-hint">The warmest Fund I money is one step from people who already said yes. Nothing sends from here.</p>

      {message ? (
        <p className={message.tone === "error" ? "sx-error" : "sx-ok"} role={message.tone === "error" ? "alert" : "status"}>
          {message.text}
        </p>
      ) : null}

      <div className="wl-grid">
        <div className="sx-card wl-card" aria-label="Ask for two names" role="region">
          <h3 className="sx-h2">Ask for two names</h3>
          <p className="sx-hint">&ldquo;Who are two people who&rsquo;d want to see this?&rdquo; Ask for a forwardable intro.</p>
          {toAsk.length ? (
            <ul className="wl-list">
              {toAsk.map((row) => (
                <li key={row.name}>
                  <span>
                    <b>{row.name}</b>
                    <small>{row.why}</small>
                  </span>
                  <button type="button" className="btn sm" disabled={busy} onClick={() => run({ op: "ask", who: row.name, person_id: row.person_id }, `Asked ${row.name}. Log the names when they come.`)}>
                    I asked
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="sx-muted">Nobody new to ask. Every yes so far has been asked.</p>
          )}
          {waitingOn.length ? (
            <>
              <h4 className="wl-sub">Waiting on names</h4>
              <ul className="wl-list">
                {waitingOn.map((ask) => (
                  <li key={ask.id}>
                    <span>
                      <b>{ask.who}</b>
                      <small>Asked {new Date(ask.asked_at).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "America/Chicago" })}</small>
                    </span>
                    <span className="wl-btns">
                      <button
                        type="button"
                        className="btn sm"
                        onClick={() => {
                          setReferrer(ask.who);
                          setSource("intro");
                          document.getElementById("wl-name")?.focus();
                        }}
                      >
                        Log a name
                      </button>
                      <button type="button" className="btn sm quiet" disabled={busy} onClick={() => run({ op: "ask", who: ask.who, status: "no" }, `${ask.who}: no names this time.`)}>
                        No names
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </div>

        <div className="sx-card wl-card" aria-label="SPV investors not in Fund I" role="region">
          <h3 className="sx-h2">SPV investors not in Fund I</h3>
          <p className="sx-hint">They already trust your picks. &ldquo;If you liked this one, Fund I gets you the next 20.&rdquo;</p>
          {fromSpvs.length ? (
            <ul className="wl-list">
              {fromSpvs.map((row) => (
                <li key={row.name}>
                  <span>
                    <b>{row.personId ? <Link href={`${personRoot}/${encodeURIComponent(row.personId)}`}>{row.name}</Link> : row.name}</b>
                    <small>
                      {row.spvs} {row.spvs === 1 ? "SPV" : "SPVs"} · {usd(row.committed)}
                    </small>
                  </span>
                  <button type="button" className="btn sm" disabled={busy} onClick={() => run({ op: "add_lead", name: row.name, person_id: row.personId, source: "spv" }, `${row.name} is a Fund I lead.`)}>
                    Make a lead
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="sx-muted">Every SPV investor is in Fund I or already a lead.</p>
          )}
        </div>
      </div>

      <form
        className="sx-card wl-add"
        aria-label="Add a lead"
        onSubmit={async (event) => {
          event.preventDefault();
          if (await run({ op: "add_lead", name, referrer, firm, source }, `${name.trim()} added${referrer.trim() ? `, thanks to ${referrer.trim()}` : ""}.`)) {
            setName("");
            setFirm("");
          }
        }}
      >
        <h3 className="sx-h2">Add a lead</h3>
        <div className="port-form-grid">
          <label className="sx-field">
            <span className="lbl">Name</span>
            <input id="wl-name" value={name} onChange={(event) => setName(event.target.value)} maxLength={120} required autoComplete="off" />
          </label>
          <label className="sx-field">
            <span className="lbl">Introduced by (optional)</span>
            <input value={referrer} onChange={(event) => setReferrer(event.target.value)} maxLength={120} autoComplete="off" />
          </label>
          <label className="sx-field">
            <span className="lbl">Firm (optional)</span>
            <input value={firm} onChange={(event) => setFirm(event.target.value)} maxLength={160} autoComplete="off" />
          </label>
        </div>
        <div className="segment sx-wrap" role="group" aria-label="Where the lead came from">
          {LEAD_SOURCES.map((value) => (
            <button key={value} type="button" aria-pressed={source === value} onClick={() => setSource(value)}>
              {LEAD_SOURCE_LABEL[value]}
            </button>
          ))}
        </div>
        <div className="sx-actions">
          <button type="submit" className="btn primary" disabled={busy || !name.trim()}>
            Add lead
          </button>
        </div>
      </form>

      {open.length ? (
        <ul className="wl-leads" aria-label="Open leads">
          {open.map((lead) => (
            <li key={lead.id} className="sx-card">
              <div className="wl-lead-top">
                <span>
                  <b>{lead.person_id ? <Link href={`${personRoot}/${encodeURIComponent(lead.person_id)}`}>{lead.name}</Link> : lead.name}</b>
                  <small>{[lead.firm, lead.referrer ? `via ${lead.referrer}` : LEAD_SOURCE_LABEL[lead.source]].filter(Boolean).join(" · ")}</small>
                </span>
              </div>
              <div className="segment sx-wrap" role="group" aria-label={`Status for ${lead.name}`}>
                {LEAD_STATUSES.map((value: LeadStatus) => (
                  <button key={value} type="button" aria-pressed={lead.status === value} disabled={busy} onClick={() => run({ op: "lead_status", id: lead.id, status: value }, `${lead.name}: ${LEAD_STATUS_LABEL[value].toLowerCase()}.`)}>
                    {LEAD_STATUS_LABEL[value]}
                  </button>
                ))}
              </div>
            </li>
          ))}
        </ul>
      ) : null}

      {top.length ? (
        <div className="sx-card" role="region" aria-label="Best referrers">
          <h3 className="sx-h2">Best referrers</h3>
          <table className="port-table">
            <thead>
              <tr>
                <th scope="col">Who</th>
                <th scope="col">Leads</th>
                <th scope="col">Meetings</th>
                <th scope="col">Committed</th>
              </tr>
            </thead>
            <tbody>
              {top.map((row) => (
                <tr key={row.name}>
                  <th scope="row">{row.name}</th>
                  <td>{row.leads}</td>
                  <td>{row.meetings}</td>
                  <td>{row.committed}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {done.length ? (
        <details className="sx-revs">
          <summary>Committed and passed ({done.length})</summary>
          <ul className="wl-list">
            {done.map((lead) => (
              <li key={lead.id}>
                <span>
                  <b>{lead.name}</b>
                  <small>{LEAD_STATUS_LABEL[lead.status]}</small>
                </span>
                <button type="button" className="btn sm quiet" disabled={busy} onClick={() => run({ op: "lead_status", id: lead.id, status: "reached" }, `${lead.name} reopened.`)}>
                  Reopen
                </button>
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </section>
  );
}
