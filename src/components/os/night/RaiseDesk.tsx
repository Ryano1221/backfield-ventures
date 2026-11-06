"use client";

import { Ring } from "./Charts";
import Link from "next/link";
import { useMemo, useState } from "react";
import type { FunnelStep } from "@/lib/os/command";
import type { Diagnosis } from "@/lib/os/funnel-history";
import { COMMIT_STATUSES, summarizeRaise, usd, type CommitStatus, type Commitment, type RaiseLedger } from "@/lib/os/raise-model";

const STATUS_LABEL: Record<CommitStatus, string> = { soft: "Soft circle", committed: "Committed", wired: "Wired" };

/**
 * Fund I: where the raise stands and who has said yes. Who to chase next lives
 * in the LP pipeline below it.
 * Everything here is Ryan's own ledger; bots never write to it.
 */
export function RaiseDesk({
  initial,
  funnel,
  deltas = null,
  diagnosis = null,
  lps,
  personRoot,
}: {
  initial: RaiseLedger;
  funnel: FunnelStep[];
  deltas?: Record<string, number> | null;
  diagnosis?: Diagnosis | null;
  lps: { id: string; name: string; firm: string | null }[];
  personRoot: string;
}) {
  const [ledger, setLedger] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);
  const summary = useMemo(() => summarizeRaise(ledger), [ledger]);
  const rows = useMemo(() => {
    const order: Record<CommitStatus, number> = { wired: 0, committed: 1, soft: 2 };
    return [...ledger.commitments].sort((a, b) => order[a.status] - order[b.status] || b.amount_usd - a.amount_usd);
  }, [ledger.commitments]);

  async function send(body: unknown): Promise<boolean> {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/os/raise", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = (await res.json().catch(() => ({}))) as { ledger?: RaiseLedger; error?: string };
      if (!res.ok || !data.ledger) {
        setError(data.error || "Could not save that. Try again.");
        return false;
      }
      setLedger(data.ledger);
      return true;
    } catch {
      setError("Could not reach the OS. Check your connection and try again.");
      return false;
    } finally {
      setSaving(false);
    }
  }

  const hardPct = summary.pctHard ?? 0;
  const softPct = Math.max(0, (summary.pctSoft ?? 0) - hardPct);

  return (
    <div className="raise">
      <header className="raise-hero">
        <div>
          <h1 className="d-xl">
            {usd(summary.hard)} <span className="dim">{summary.target ? `of ${usd(summary.target)}` : "committed"}</span>
          </h1>
          <p className="lede">
            {summary.fund}. {summary.lpCount} {summary.lpCount === 1 ? "LP" : "LPs"} committed
            {summary.soft ? `, ${usd(summary.soft)} more soft circled from ${summary.softCount}` : ""}
            {summary.wired ? `. ${usd(summary.wired)} wired` : ""}.
          </p>
          {summary.avgCheck || summary.topTwoShare != null ? (
            <p className="raise-checks">
              {summary.avgCheck ? `Average check ${usd(summary.avgCheck)}` : ""}
              {summary.avgCheck && summary.lpsNeeded != null ? ` · about ${summary.lpsNeeded} more ${summary.lpsNeeded === 1 ? "LP" : "LPs"} like that to close` : ""}
              {summary.topTwoShare != null && summary.topTwoShare >= 50 ? ` · ${summary.topTwoShare}% sits with ${summary.topTwo.join(" and ")}` : ""}
            </p>
          ) : null}
        </div>
        <Settings ledger={ledger} saving={saving} onSave={send} />
      </header>

      {summary.target ? (
        <section className="raise-bar-wrap has-ring" aria-label="Progress to target">
          <Ring
            dark
            size={132}
            stroke={13}
            total={summary.target}
            label={`${Math.round(hardPct)}% committed, ${Math.round(softPct)}% more soft circled`}
            parts={[
              { key: "wired", label: `Wired ${usd(summary.wired)}`, value: summary.wired, tone: "hard" },
              { key: "committed", label: `Committed ${usd(summary.hard - summary.wired)}`, value: Math.max(0, summary.hard - summary.wired), tone: "mid" },
              { key: "soft", label: `Soft circled ${usd(summary.soft)}`, value: summary.soft, tone: "hatch" },
            ]}
          >
            <b>{Math.round(hardPct)}%</b>
            <span>committed</span>
          </Ring>
          <div className="raise-bar-main">
          <div className="raise-bar" role="img" aria-label={`${Math.round(hardPct)}% committed, ${Math.round(softPct)}% more soft circled`}>
            <i className="hard" style={{ width: `${hardPct}%` }} />
            <i className="soft" style={{ width: `${softPct}%` }} />
          </div>
          <dl className="raise-stats">
            <div>
              <dt>Committed</dt>
              <dd>{Math.round(hardPct)}%</dd>
            </div>
            <div>
              <dt>Still to raise</dt>
              <dd>{usd(summary.remaining ?? 0)}</dd>
            </div>
            <div>
              <dt>Close</dt>
              <dd>{summary.closeLabel ? `${summary.closeLabel} · ${summary.daysLeft} days` : "Not set"}</dd>
            </div>
            <div>
              <dt>Pace needed</dt>
              <dd>{summary.perWeekNeeded != null && summary.daysLeft != null ? `${usd(summary.perWeekNeeded)} a week` : "Set a close date"}</dd>
            </div>
          </dl>
          </div>
        </section>
      ) : (
        <p className="raise-empty">Set a target and close date to see progress and the weekly pace you need.</p>
      )}

      <Funnel steps={funnel} deltas={deltas} diagnosis={diagnosis} />

      {error ? (
        <p className="os-error" role="alert">
          {error}
        </p>
      ) : null}

      <div className="raise-grid">
        <section className="stack" aria-label="Commitments">
          <h2>Commitments</h2>
          <AddForm lps={lps} saving={saving} onSave={send} />
          {rows.length ? (
            <ul className="raise-list">
              {rows.map((row) =>
                editing === row.id ? (
                  <li key={row.id}>
                    <EditRow row={row} saving={saving} onCancel={() => setEditing(null)} onSave={async (body) => (await send(body)) && setEditing(null)} />
                  </li>
                ) : (
                  <li key={row.id} className={`is-${row.status}`}>
                    <div className="raise-who">
                      <b>{row.person_id ? <Link href={`${personRoot}/${encodeURIComponent(row.person_id)}`}>{row.name}</Link> : row.name}</b>
                      {row.firm ? <span>{row.firm}</span> : null}
                      {row.note ? <span className="raise-note">{row.note}</span> : null}
                    </div>
                    <span className="raise-amt">{usd(row.amount_usd)}</span>
                    <span className={`raise-pill p-${row.status}`}>{STATUS_LABEL[row.status]}</span>
                    <div className="raise-row-actions">
                      <button type="button" className="btn quiet" onClick={() => setEditing(row.id)}>
                        Edit
                      </button>
                      {confirmRemove === row.id ? (
                        <>
                          <button type="button" className="btn primary" disabled={saving} onClick={async () => (await send({ op: "remove", id: row.id })) && setConfirmRemove(null)}>
                            Remove
                          </button>
                          <button type="button" className="btn quiet" onClick={() => setConfirmRemove(null)}>
                            Keep
                          </button>
                        </>
                      ) : (
                        <button type="button" className="btn quiet" onClick={() => setConfirmRemove(row.id)} aria-label={`Remove ${row.name}`}>
                          Remove
                        </button>
                      )}
                    </div>
                  </li>
                ),
              )}
            </ul>
          ) : (
            <p className="raise-empty">No commitments yet. Add the first one above when an LP says yes, even a soft yes.</p>
          )}
        </section>

      </div>
    </div>
  );
}

function Funnel({ steps, deltas, diagnosis }: { steps: FunnelStep[]; deltas: Record<string, number> | null; diagnosis: Diagnosis | null }) {
  const top = steps[0]?.count ?? 0;
  if (!top) return null;
  return (
    <section className="stack" aria-label="LP funnel">
      <h2>LP funnel</h2>
      <ol className="funnel-bars">
        {steps.map((step, index) => {
          const prev = index ? steps[index - 1]!.count : null;
          const rate = prev ? Math.round((step.count / prev) * 100) : null;
          return (
            <li key={step.key}>
              <span className="fb-label">{step.label}</span>
              <span className="fb-track" aria-hidden="true">
                <i style={{ width: `${Math.max(2, (step.count / top) * 100)}%` }} />
              </span>
              <b className="fb-n">{step.count.toLocaleString("en-US")}</b>
              {deltas && deltas[step.key] ? <span className={`fb-delta${deltas[step.key]! > 0 ? " is-up" : ""}`}>{deltas[step.key]! > 0 ? "+" : ""}{deltas[step.key]} this week</span> : null}
              <span className="fb-rate">{index === 0 ? "LPs" : rate != null ? `${rate}% of ${steps[index - 1]!.label.toLowerCase()}` : ""}</span>
            </li>
          );
        })}
      </ol>
      {diagnosis ? (
        <p className="fb-diagnosis">
          <b>
            Biggest drop: {diagnosis.from.toLowerCase()} to {diagnosis.to.toLowerCase()}, {diagnosis.rate}%.
          </b>{" "}
          {diagnosis.advice}
        </p>
      ) : null}
    </section>
  );
}

function Settings({ ledger, saving, onSave }: { ledger: RaiseLedger; saving: boolean; onSave: (body: unknown) => Promise<boolean> }) {
  const [open, setOpen] = useState(!ledger.target_usd);
  const [target, setTarget] = useState(ledger.target_usd ? String(ledger.target_usd) : "");
  const [close, setClose] = useState(ledger.close_date ?? "");
  if (!open) {
    return (
      <button type="button" className="btn quiet raise-settings-btn" onClick={() => setOpen(true)}>
        Target and close date
      </button>
    );
  }
  return (
    <form
      className="raise-settings"
      onSubmit={async (event) => {
        event.preventDefault();
        if (await onSave({ op: "settings", target_usd: target, close_date: close })) setOpen(false);
      }}
    >
      <label>
        <span>Target</span>
        <input id="raise-target" className="pill" inputMode="decimal" placeholder="$10M" value={target} onChange={(event) => setTarget(event.target.value)} />
      </label>
      <label>
        <span>Final close</span>
        <input id="raise-close" className="pill" type="date" value={close} onChange={(event) => setClose(event.target.value)} />
      </label>
      <button type="submit" className="btn primary" disabled={saving}>
        Save
      </button>
    </form>
  );
}

function AddForm({ lps, saving, onSave }: { lps: { id: string; name: string; firm: string | null }[]; saving: boolean; onSave: (body: unknown) => Promise<boolean> }) {
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [status, setStatus] = useState<CommitStatus>("soft");
  const match = lps.find((lp) => lp.name.toLowerCase() === name.trim().toLowerCase()) ?? null;
  return (
    <form
      className="raise-add"
      onSubmit={async (event) => {
        event.preventDefault();
        const ok = await onSave({ op: "upsert", commitment: { name, amount_usd: amount, status, person_id: match?.id ?? null, firm: match?.firm ?? null } });
        if (ok) {
          setName("");
          setAmount("");
          setStatus("soft");
        }
      }}
    >
      <label className="raise-add-name">
        <span>LP</span>
        <input id="raise-add-name" className="pill" list="raise-lps" placeholder="Name" value={name} onChange={(event) => setName(event.target.value)} />
        <datalist id="raise-lps">
          {lps.map((lp) => (
            <option key={lp.id} value={lp.name}>
              {lp.firm ?? ""}
            </option>
          ))}
        </datalist>
      </label>
      <label>
        <span>Amount</span>
        <input id="raise-add-amount" className="pill" inputMode="decimal" placeholder="$250K" value={amount} onChange={(event) => setAmount(event.target.value)} />
      </label>
      <div className="segment" role="group" aria-label="Status">
        {COMMIT_STATUSES.map((value) => (
          <button key={value} type="button" aria-pressed={status === value} onClick={() => setStatus(value)}>
            {STATUS_LABEL[value]}
          </button>
        ))}
      </div>
      <button type="submit" className="btn primary" disabled={saving || !name.trim() || !amount.trim()}>
        Add
      </button>
    </form>
  );
}

function EditRow({ row, saving, onCancel, onSave }: { row: Commitment; saving: boolean; onCancel: () => void; onSave: (body: unknown) => Promise<unknown> }) {
  const [amount, setAmount] = useState(String(row.amount_usd));
  const [status, setStatus] = useState<CommitStatus>(row.status);
  const [note, setNote] = useState(row.note ?? "");
  return (
    <form
      className="raise-add raise-edit"
      onSubmit={async (event) => {
        event.preventDefault();
        await onSave({ op: "upsert", commitment: { ...row, amount_usd: amount, status, note } });
      }}
    >
      <b className="raise-edit-name">{row.name}</b>
      <label>
        <span>Amount</span>
        <input id={`raise-amt-${row.id}`} className="pill" inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} />
      </label>
      <div className="segment" role="group" aria-label="Status">
        {COMMIT_STATUSES.map((value) => (
          <button key={value} type="button" aria-pressed={status === value} onClick={() => setStatus(value)}>
            {STATUS_LABEL[value]}
          </button>
        ))}
      </div>
      <label className="raise-add-name">
        <span>Note</span>
        <input id={`raise-note-${row.id}`} className="pill" placeholder="Side letter, wire date, anything" value={note} onChange={(event) => setNote(event.target.value)} />
      </label>
      <button type="submit" className="btn primary" disabled={saving}>
        Save
      </button>
      <button type="button" className="btn quiet" onClick={onCancel}>
        Cancel
      </button>
    </form>
  );
}
