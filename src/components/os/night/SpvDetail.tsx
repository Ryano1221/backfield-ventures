"use client";

import Link from "next/link";
import { Ring } from "./Charts";
import { useState } from "react";
import { usd } from "@/lib/os/raise-model";
import {
  ALLOC_LABEL,
  ALLOC_STATUSES,
  spvBackers,
  spvNext,
  spvUpdateText,
  summarizeSpv,
  SPV_STATUS_LABEL,
  SPV_STATUSES,
  SPV_STEPS,
  type AllocStatus,
  type Backer,
  type Spv,
  type SpvBook,
  type SpvStatus,
} from "@/lib/os/spv";

type Lp = { id: string; name: string };

/** Short labels so each allocation's status fits on one line on a phone. */
const SHORT: Record<AllocStatus, string> = { soft: "Soft", committed: "Committed", wired: "Wired" };

export function SpvDetail({ initial, id, backHref, dealHref, lps, now }: { initial: SpvBook; id: string; backHref: string; dealHref: string | null; lps: Lp[]; now: number }) {
  const [book, setBook] = useState(initial);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const spv = book.spvs.find((row) => row.id === id) ?? null;

  if (!spv) {
    return (
      <div className="spv">
        <h1 className="d-l">This SPV is gone.</h1>
        <p className="lede">
          <Link href={backHref}>Back to SPVs</Link>
        </p>
      </div>
    );
  }

  async function run(op: Record<string, unknown>, done: string) {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/os/spvs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...op, id }) });
      const data = (await res.json().catch(() => ({}))) as { book?: SpvBook; error?: string };
      if (!res.ok || !data.book) {
        setMessage({ tone: "error", text: data.error || "Could not save that." });
        setBusy(false);
        return false;
      }
      setBook(data.book);
      setMessage({ tone: "ok", text: done });
      setBusy(false);
      return true;
    } catch {
      setMessage({ tone: "error", text: "No connection. Nothing was saved." });
      setBusy(false);
      return false;
    }
  }

  const s = summarizeSpv(spv, now);
  return (
    <div className="spv">
      <div className="lbl eyebrow">
        <Link href={backHref}>SPVs</Link> / {spv.company}
      </div>
      <div className="sx-head">
        <div>
          <h1 className="d-l">{spv.name}</h1>
          <p className="sx-meta">
            {spv.company}
            {dealHref ? (
              <>
                {" · "}
                <Link href={dealHref}>Open the deal</Link>
              </>
            ) : null}
          </p>
          <p className="sx-next-big">
            <span className="lbl">Next</span> {spvNext(spv, now)}
          </p>
        </div>
      </div>

      <div className="segment sx-wrap" role="group" aria-label="SPV status">
        {SPV_STATUSES.map((status: SpvStatus) => (
          <button key={status} type="button" aria-pressed={spv.status === status} disabled={busy} onClick={() => run({ op: "update", status }, `Marked ${SPV_STATUS_LABEL[status].toLowerCase()}.`)}>
            {SPV_STATUS_LABEL[status]}
          </button>
        ))}
      </div>

      {message ? (
        <p className={message.tone === "error" ? "sx-error" : "sx-ok"} role={message.tone === "error" ? "alert" : "status"}>
          {message.text}
        </p>
      ) : null}

      <section className="sx-card spv-progress" aria-label="Progress">
        <div className="spv-progress-row">
          <Ring
            size={148}
            stroke={14}
            total={spv.target_usd ?? 0}
            label={spv.target_usd ? `${Math.round(s.pctHard ?? 0)}% of the target committed or wired` : "No target set"}
            parts={[
              { key: "wired", label: `Wired ${usd(s.wired)}`, value: s.wired, tone: "hard" },
              { key: "committed", label: `Committed ${usd(s.committed)}`, value: s.committed, tone: "mid" },
              { key: "soft", label: `Soft circled ${usd(s.soft)}`, value: s.soft, tone: "hatch" },
            ]}
          >
            <b>{spv.target_usd ? `${Math.round(s.pctHard ?? 0)}%` : usd(s.hard)}</b>
            <span>{spv.target_usd ? `of ${usd(spv.target_usd)}` : "no target"}</span>
          </Ring>
          <div className="spv-stats">
            <div>
              <b>{usd(s.hard)}</b>
              <span>committed and wired</span>
            </div>
            <div>
              <b>{usd(s.wired)}</b>
              <span>wired</span>
            </div>
            <div>
              <b>{usd(s.soft)}</b>
              <span>soft circled</span>
            </div>
            <div>
              <b>{s.daysLeft != null ? s.daysLeft : "None"}</b>
              <span>{s.daysLeft != null ? "days to close" : "no close date"}</span>
            </div>
          </div>
        </div>
        <ul className="os-legend" aria-hidden="true">
          <li><i className="os-swatch is-hard" />Wired</li>
          <li><i className="os-swatch is-mid" />Committed</li>
          <li><i className="os-swatch is-hatch" />Soft circled</li>
        </ul>
        {s.belowMin.length ? <p className="sx-hint">Below the minimum check: {s.belowMin.join(", ")}.</p> : null}
      </section>

      <InvestorUpdate text={spvUpdateText(spv, now)} />

      <div className="sx-split">
        <Terms spv={spv} busy={busy} onSave={(fields) => run({ op: "update", ...fields }, "Terms saved.")} />
        <Steps spv={spv} busy={busy} onSave={(steps) => run({ op: "update", steps }, "Checklist saved.")} />
      </div>

      <Allocations spv={spv} lps={lps} busy={busy} run={run} backers={spvBackers(book)} />

      <Notes spv={spv} busy={busy} onSave={(fields) => run({ op: "update", ...fields }, "Saved.")} />
    </div>
  );
}

function Terms({ spv, busy, onSave }: { spv: Spv; busy: boolean; onSave: (fields: Record<string, unknown>) => void }) {
  const [target, setTarget] = useState(spv.target_usd != null ? usd(spv.target_usd) : "");
  const [min, setMin] = useState(spv.min_check_usd != null ? usd(spv.min_check_usd) : "");
  const [carry, setCarry] = useState(spv.carry_pct != null ? String(spv.carry_pct) : "");
  const [fee, setFee] = useState(spv.fee_pct != null ? String(spv.fee_pct) : "");
  const [close, setClose] = useState(spv.close_date ?? "");
  return (
    <section className="sx-card" aria-label="Terms">
      <h2 className="sx-h2">Terms</h2>
      <div className="spv-terms">
        <label className="sx-field">
          <span className="lbl">Target</span>
          <input value={target} onChange={(event) => setTarget(event.target.value)} placeholder="$500K" inputMode="decimal" />
        </label>
        <label className="sx-field">
          <span className="lbl">Minimum check</span>
          <input value={min} onChange={(event) => setMin(event.target.value)} placeholder="$10K" inputMode="decimal" />
        </label>
        <label className="sx-field">
          <span className="lbl">Carry %</span>
          <input value={carry} onChange={(event) => setCarry(event.target.value)} placeholder="20" inputMode="decimal" />
        </label>
        <label className="sx-field">
          <span className="lbl">Fee %</span>
          <input value={fee} onChange={(event) => setFee(event.target.value)} placeholder="0" inputMode="decimal" />
        </label>
        <label className="sx-field">
          <span className="lbl">Close date</span>
          <input type="date" value={close} onChange={(event) => setClose(event.target.value)} />
        </label>
      </div>
      <div className="sx-actions">
        <button type="button" className="btn primary" disabled={busy} onClick={() => onSave({ target_usd: target, min_check_usd: min, carry_pct: carry, fee_pct: fee, close_date: close || null })}>
          Save terms
        </button>
      </div>
    </section>
  );
}

function Steps({ spv, busy, onSave }: { spv: Spv; busy: boolean; onSave: (steps: string[]) => void }) {
  return (
    <section className="sx-card" aria-label="Checklist">
      <h2 className="sx-h2">
        Checklist ({SPV_STEPS.filter((step) => spv.steps.includes(step)).length} of {SPV_STEPS.length})
      </h2>
      <ol className="spv-steps">
        {SPV_STEPS.map((step) => {
          const done = spv.steps.includes(step);
          return (
            <li key={step} className={done ? "is-done" : ""}>
              <label className="dm-check spv-step">
                <input type="checkbox" checked={done} disabled={busy} onChange={() => onSave(done ? spv.steps.filter((row) => row !== step) : [...spv.steps, step])} />
                <span>{step}</span>
              </label>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function Allocations({ spv, lps, busy, run, backers }: { spv: Spv; lps: Lp[]; busy: boolean; run: (op: Record<string, unknown>, done: string) => Promise<boolean>; backers: Backer[] }) {
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [status, setStatus] = useState<AllocStatus>("soft");
  const match = lps.find((lp) => lp.name.toLowerCase() === name.trim().toLowerCase());
  const total = spv.allocations.reduce((sum, row) => sum + row.amount_usd, 0);
  const inThis = new Set(spv.allocations.flatMap((row) => [row.person_id ? `p:${row.person_id}` : "", `n:${row.name.trim().toLowerCase()}`]));
  const past = backers.filter((row) => !inThis.has(row.key) && !inThis.has(`n:${row.name.toLowerCase()}`)).slice(0, 8);
  return (
    <section className="sx-card" aria-label="Allocations">
      <h2 className="sx-h2">
        Allocations · {spv.allocations.length} {spv.allocations.length === 1 ? "investor" : "investors"} · {usd(total)}
      </h2>
      {spv.allocations.length ? (
        <ul className="spv-allocs">
          {[...spv.allocations]
            .sort((a, b) => b.amount_usd - a.amount_usd)
            .map((row) => (
              <li key={row.id}>
                <b>{row.name}</b>
                <span className="spv-alloc-amt">{usd(row.amount_usd)}</span>
                <div className="segment spv-alloc-status" role="group" aria-label={`Status for ${row.name}`}>
                  {ALLOC_STATUSES.map((value) => (
                    <button key={value} type="button" aria-pressed={row.status === value} aria-label={ALLOC_LABEL[value]} disabled={busy} onClick={() => run({ op: "allocate", allocation_id: row.id, amount_usd: row.amount_usd, status: value }, `${row.name}: ${ALLOC_LABEL[value].toLowerCase()}.`)}>
                      {SHORT[value]}
                    </button>
                  ))}
                </div>
                <button type="button" className="btn sm quiet" disabled={busy} onClick={() => run({ op: "remove_allocation", allocation_id: row.id }, `${row.name} removed.`)}>
                  Remove
                </button>
              </li>
            ))}
        </ul>
      ) : (
        <p className="sx-muted">No one in yet. Add the first investor when they say yes, even a soft yes.</p>
      )}
      {past.length ? (
        <div className="spv-past">
          <span className="lbl">Backed you before</span>
          <div className="spv-past-chips">
            {past.map((row) => (
              <button
                key={row.key}
                type="button"
                className="btn sm"
                onClick={() => {
                  setName(row.name);
                  setAmount(usd(row.typical));
                }}
              >
                {row.name} · {usd(row.typical)}
              </button>
            ))}
          </div>
        </div>
      ) : null}
      <div className="spv-add">
        <label className="sx-field">
          <span className="lbl">Investor</span>
          <input value={name} onChange={(event) => setName(event.target.value)} list="spv-lps" placeholder="Name" />
          <datalist id="spv-lps">
            {lps.map((lp) => (
              <option key={lp.id} value={lp.name} />
            ))}
          </datalist>
        </label>
        <label className="sx-field">
          <span className="lbl">Amount</span>
          <input value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="$25K" inputMode="decimal" />
        </label>
        <div className="segment sx-wrap" role="group" aria-label="New allocation status">
          {ALLOC_STATUSES.map((value) => (
            <button key={value} type="button" aria-pressed={status === value} onClick={() => setStatus(value)}>
              {ALLOC_LABEL[value]}
            </button>
          ))}
        </div>
        <button
          type="button"
          className="btn primary"
          disabled={busy || !name.trim() || !amount.trim()}
          onClick={async () => {
            if (await run({ op: "allocate", name, amount_usd: amount, status, person_id: match?.id ?? null }, `${name.trim()} added.`)) {
              setName("");
              setAmount("");
            }
          }}
        >
          Add
        </button>
      </div>
      {match ? <p className="sx-hint">Linked to {match.name} in your CRM.</p> : null}
    </section>
  );
}

function Notes({ spv, busy, onSave }: { spv: Spv; busy: boolean; onSave: (fields: Record<string, unknown>) => void }) {
  const [next, setNext] = useState(spv.next_action);
  const [notes, setNotes] = useState(spv.notes);
  return (
    <section className="sx-card spv-notes" aria-label="Notes">
      <h2 className="sx-h2">Next step and notes</h2>
      <label className="sx-field">
        <span className="lbl">Next step (leave blank to use the checklist)</span>
        <input value={next} onChange={(event) => setNext(event.target.value)} maxLength={300} placeholder="Send subscription docs to the last three investors" />
      </label>
      <label className="sx-field">
        <span className="lbl">Notes</span>
        <textarea className="sx-text" rows={5} value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={10000} placeholder="Platform, entity details, side letters, anything to remember" />
      </label>
      <div className="sx-actions">
        <button type="button" className="btn primary" disabled={busy || (next === spv.next_action && notes === spv.notes)} onClick={() => onSave({ next_action: next, notes })}>
          Save
        </button>
      </div>
    </section>
  );
}

/** A note to paste into an email to this SPV's investors. Nothing sends from here. */
function InvestorUpdate({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }
  return (
    <details className="sx-card spv-update">
      <summary>Update for investors</summary>
      <p className="sx-hint">Copy it into your own email. Nothing sends from here, and no names are included.</p>
      <textarea className="sx-text" readOnly rows={9} value={text} aria-label="Update for investors" />
      <div className="sx-actions">
        <button type="button" className="btn" onClick={copy}>
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
    </details>
  );
}
