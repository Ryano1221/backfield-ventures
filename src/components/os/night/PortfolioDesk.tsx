"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { DealPick } from "@/lib/os/deals";
import {
  bookMetrics,
  HOLDING_STATUS_LABEL,
  HOLDING_STATUSES,
  INSTRUMENT_LABEL,
  INSTRUMENTS,
  multiple,
  VEHICLE_LABEL,
  VEHICLES,
  viewHolding,
  type Holding,
  type HoldingBook,
  type HoldingStatus,
  type Instrument,
  type Vehicle,
} from "@/lib/os/holdings";
import { usd } from "@/lib/os/raise-model";
import { StackBar } from "./Charts";
import { Logo } from "./Logo";
import { CompanyPicker } from "./CompanyPicker";

/** A closed SPV that is not on the books yet, ready to record in one tap. */
export type Suggestion = { spvId: string; company: string; dealId: string | null; amount: number; date: string };

type Run = (op: Record<string, unknown>, ok: string) => Promise<boolean>;

const pctText = (n: number | null) => (n == null ? "None yet" : `${(n * 100).toFixed(1)}%`);

export function PortfolioDesk({ book: initial, today, deals, suggestions, dealBase, spvBase, startOpen = false }: { book: HoldingBook; today: string; deals: DealPick[]; suggestions: Suggestion[]; dealBase: string; spvBase: string; startOpen?: boolean }) {
  const router = useRouter();
  // The API answers with the whole updated book, so the page never waits on a reload.
  const [book, setBook] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [adding, setAdding] = useState(startOpen || (initial.holdings.length === 0 && suggestions.length === 0));
  const open = suggestions.filter((s) => !book.holdings.some((h) => h.spv_id === s.spvId));
  const all = bookMetrics(book.holdings, today);
  const byVehicle = VEHICLES.map((vehicle) => ({ vehicle, m: bookMetrics(book.holdings.filter((h) => h.vehicle === vehicle), today) })).filter((row) => row.m.count);
  const sorted = [...book.holdings].sort((a, b) => viewHolding(b).value + viewHolding(b).realized - (viewHolding(a).value + viewHolding(a).realized));

  const run: Run = async (op, ok) => {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/os/holdings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(op) });
      const data = (await res.json().catch(() => ({}))) as { error?: string; book?: HoldingBook };
      if (!res.ok || !data.book) {
        setMessage({ tone: "error", text: data.error || "Could not save that." });
        return false;
      }
      setBook(data.book);
      setMessage({ tone: "ok", text: ok });
      router.refresh();
      return true;
    } catch {
      setMessage({ tone: "error", text: "No connection. Nothing was saved." });
      return false;
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="port-page">
      <div className="lbl eyebrow">Investments</div>
      <div className="sx-head">
        <div>
          <h1 className="d-xl">Portfolio.</h1>
          <p className="lede">
            {all.count
              ? `${all.count} ${all.count === 1 ? "holding" : "holdings"}. ${usd(all.invested)} in, worth ${usd(all.value)} now, ${usd(all.realized)} returned.`
              : "Every check Backfield writes, what it owns, and what it is worth."}
          </p>
        </div>
        <button type="button" className={adding ? "btn" : "btn primary"} aria-expanded={adding} onClick={() => setAdding((value) => !value)}>
          {adding ? "Cancel" : "Add a holding"}
        </button>
      </div>

      {all.count ? (
        <section className="port-kpis" aria-label="Fund metrics">
          <Kpi label="Invested" value={usd(all.invested)} />
          <Kpi label="Value now" value={usd(all.value)} note={all.atCost ? `${all.atCost} still at cost` : "All marked"} />
          <Kpi label="Returned" value={usd(all.realized)} />
          <Kpi label="TVPI" value={multiple(all.tvpi)} note="Value plus returned, over invested" />
          <Kpi label="DPI" value={multiple(all.dpi)} note="Returned over invested" />
          <Kpi label="IRR" value={pctText(all.irr)} note={all.irr == null ? "Needs 90 days of history" : "Annual, on dated cash flows"} />
        </section>
      ) : null}

      {byVehicle.length > 1 ? (
        <section className="sx-card port-split" aria-label="By vehicle">
          <h2 className="sx-h2">By vehicle</h2>
          <table className="port-table">
            <thead>
              <tr>
                <th scope="col">Vehicle</th>
                <th scope="col">Holdings</th>
                <th scope="col">Invested</th>
                <th scope="col">Value</th>
                <th scope="col">TVPI</th>
              </tr>
            </thead>
            <tbody>
              {byVehicle.map(({ vehicle, m }) => (
                <tr key={vehicle}>
                  <th scope="row">{VEHICLE_LABEL[vehicle]}</th>
                  <td>{m.count}</td>
                  <td>{usd(m.invested)}</td>
                  <td>{usd(m.value)}</td>
                  <td>{multiple(m.tvpi)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : null}

      {all.value > 0 ? (
        <section className="sx-card" aria-label="Where the value is">
          <h2 className="sx-h2">Where the value is</h2>
          <StackBar
            label="Value by company"
            format={usd}
            parts={[
              ...sorted.slice(0, 3).map((h, i) => ({ key: h.id, label: h.company, value: viewHolding(h).value, tone: (["hard", "mid", "soft"] as const)[i] })),
              ...(sorted.length > 3 ? [{ key: "rest", label: `${sorted.length - 3} more`, value: sorted.slice(3).reduce((sum, h) => sum + viewHolding(h).value, 0), tone: "pale" as const }] : []),
            ]}
          />
        </section>
      ) : null}

      {message ? (
        <p className={message.tone === "error" ? "sx-error" : "sx-ok"} role={message.tone === "error" ? "alert" : "status"}>
          {message.text}
        </p>
      ) : null}

      {open.length ? (
        <section className="sx-card port-suggest" aria-label="Closed SPVs to record">
          <h2 className="sx-h2">Closed SPVs to put on the books</h2>
          <ul>
            {open.map((s) => (
              <li key={s.spvId}>
                <span>
                  <b>{s.company}</b> · {usd(s.amount)} wired
                </span>
                <button type="button" className="btn" disabled={busy} onClick={() => run({ op: "create", company: s.company, invested_usd: s.amount, date: s.date, vehicle: "spv", instrument: "safe", spv_id: s.spvId, deal_id: s.dealId }, `${s.company} is on the books. Add its valuation or ownership below.`)}>
                  Record
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {adding ? <AddHolding deals={deals} today={today} busy={busy} onAdd={async (op) => (await run(op, `${String(op.company)} is on the books.`)) && setAdding(false)} /> : null}

      {sorted.length ? (
        <ul className="port-list" aria-label="Holdings">
          {sorted.map((h) => (
            <HoldingCard key={h.id} h={h} pick={deals.find((d) => d.id === h.deal_id) ?? deals.find((d) => d.company.toLowerCase() === h.company.toLowerCase())} busy={busy} run={run} today={today} dealHref={h.deal_id ? `${dealBase}/${encodeURIComponent(h.deal_id)}` : null} spvHref={h.spv_id ? `${spvBase}/${encodeURIComponent(h.spv_id)}` : null} />
          ))}
        </ul>
      ) : !adding ? (
        <p className="sx-muted">No holdings yet. Add one, or record a closed SPV.</p>
      ) : null}
    </div>
  );
}

function Kpi({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="port-kpi">
      <span className="lbl">{label}</span>
      <b>{value}</b>
      {note ? <span className="port-kpi-note">{note}</span> : null}
    </div>
  );
}

function AddHolding({ deals, today, busy, onAdd }: { deals: DealPick[]; today: string; busy: boolean; onAdd: (op: Record<string, unknown>) => void }) {
  const [company, setCompany] = useState("");
  const [dealId, setDealId] = useState("");
  const [invested, setInvested] = useState("");
  const [date, setDate] = useState(today.slice(0, 10));
  const [valuation, setValuation] = useState("");
  const [ownership, setOwnership] = useState("");
  const [vehicle, setVehicle] = useState<Vehicle>("fund");
  const [instrument, setInstrument] = useState<Instrument>("safe");
  return (
    <form
      className="sx-card sx-new"
      aria-label="Add a holding"
      onSubmit={(event) => {
        event.preventDefault();
        onAdd({ op: "create", company, deal_id: dealId || null, invested_usd: invested, date, valuation_usd: valuation, ownership_pct: ownership, vehicle, instrument });
      }}
    >
      <CompanyPicker
        deals={deals}
        company={company}
        dealId={dealId}
        onType={(value) => {
          setCompany(value);
          setDealId("");
        }}
        onPick={(deal) => {
          setCompany(deal.company);
          setDealId(deal.id);
        }}
      />
      <div className="port-form-grid">
        <label className="sx-field">
          <span className="lbl">Check size</span>
          <input value={invested} onChange={(event) => setInvested(event.target.value)} placeholder="$100K" inputMode="decimal" required />
        </label>
        <label className="sx-field">
          <span className="lbl">Date invested</span>
          <input type="date" value={date} onChange={(event) => setDate(event.target.value)} required />
        </label>
        <label className="sx-field">
          <span className="lbl">Valuation or cap (optional)</span>
          <input value={valuation} onChange={(event) => setValuation(event.target.value)} placeholder="$10M" inputMode="decimal" />
        </label>
        <label className="sx-field">
          <span className="lbl">Ownership % (optional)</span>
          <input value={ownership} onChange={(event) => setOwnership(event.target.value)} placeholder="Worked out from the valuation" inputMode="decimal" />
        </label>
      </div>
      <div className="segment sx-wrap" role="group" aria-label="Vehicle">
        {VEHICLES.map((value) => (
          <button key={value} type="button" aria-pressed={vehicle === value} onClick={() => setVehicle(value)}>
            {VEHICLE_LABEL[value]}
          </button>
        ))}
      </div>
      <div className="segment sx-wrap" role="group" aria-label="Instrument">
        {INSTRUMENTS.map((value) => (
          <button key={value} type="button" aria-pressed={instrument === value} onClick={() => setInstrument(value)}>
            {INSTRUMENT_LABEL[value]}
          </button>
        ))}
      </div>
      <div className="sx-actions">
        <button type="submit" className="btn primary" disabled={busy || !company.trim() || !invested.trim()}>
          {busy ? "Saving…" : "Add holding"}
        </button>
      </div>
    </form>
  );
}

function HoldingCard({ h, pick, busy, run, today, dealHref, spvHref }: { h: Holding; pick?: DealPick; busy: boolean; run: Run; today: string; dealHref: string | null; spvHref: string | null }) {
  const v = viewHolding(h);
  const [markBy, setMarkBy] = useState<"round" | "value">("round");
  const [markAmount, setMarkAmount] = useState("");
  const [markDate, setMarkDate] = useState(today.slice(0, 10));
  const [markNote, setMarkNote] = useState("");
  const [back, setBack] = useState("");
  const [backDate, setBackDate] = useState(today.slice(0, 10));
  const tone = v.moic >= 1.5 ? "is-up" : v.moic < 1 ? "is-down" : "";
  return (
    <li className="sx-card port-card">
      <div className="port-card-top">
        <Logo name={h.company} domain={pick?.domain} logoUrl={pick?.logoUrl} />
        <div className="port-card-id">
          <b className="port-co">{h.company}</b>
          <span className="port-sub">
            {VEHICLE_LABEL[h.vehicle]} · {INSTRUMENT_LABEL[h.instrument]} · {h.date}
            {h.status !== "active" ? ` · ${HOLDING_STATUS_LABEL[h.status]}` : ""}
          </span>
        </div>
        <span className={`port-moic ${tone}`}>{multiple(v.moic)}</span>
      </div>
      <dl className="port-nums">
        <div>
          <dt>Invested</dt>
          <dd>{usd(h.invested_usd)}</dd>
        </div>
        <div>
          <dt>Value now</dt>
          <dd>
            {usd(v.value)}
            {v.atCost ? <small> at cost</small> : null}
          </dd>
        </div>
        <div>
          <dt>Returned</dt>
          <dd>{usd(v.realized)}</dd>
        </div>
        <div>
          <dt>Ownership</dt>
          <dd>{v.ownership == null ? "Add a valuation" : `${v.ownership.toFixed(v.ownership < 1 ? 2 : 1)}%`}</dd>
        </div>
      </dl>
      <details className="port-more">
        <summary>Update {h.company}</summary>
        <div className="port-more-body">
          <form
            aria-label={`Mark ${h.company}`}
            onSubmit={async (event) => {
              event.preventDefault();
              const ok = await run({ op: "mark", id: h.id, date: markDate, note: markNote, ...(markBy === "round" ? { round_valuation_usd: markAmount } : { value_usd: markAmount }) }, `${h.company} marked.`);
              if (ok) {
                setMarkAmount("");
                setMarkNote("");
              }
            }}
          >
            <h3 className="sx-h2">New mark</h3>
            <div className="segment sx-wrap" role="group" aria-label="Mark by">
              <button type="button" aria-pressed={markBy === "round"} onClick={() => setMarkBy("round")}>
                New round valuation
              </button>
              <button type="button" aria-pressed={markBy === "value"} onClick={() => setMarkBy("value")}>
                Value of our stake
              </button>
            </div>
            <div className="port-form-grid">
              <label className="sx-field">
                <span className="lbl">{markBy === "round" ? "Post-money" : "Stake value"}</span>
                <input value={markAmount} onChange={(event) => setMarkAmount(event.target.value)} placeholder={markBy === "round" ? "$40M" : "$400K"} inputMode="decimal" required />
              </label>
              <label className="sx-field">
                <span className="lbl">Date</span>
                <input type="date" value={markDate} onChange={(event) => setMarkDate(event.target.value)} required />
              </label>
              <label className="sx-field">
                <span className="lbl">Note (optional)</span>
                <input value={markNote} onChange={(event) => setMarkNote(event.target.value)} placeholder="Series A led by…" />
              </label>
            </div>
            <div className="sx-actions">
              <button type="submit" className="btn primary" disabled={busy || !markAmount.trim()}>
                Save mark
              </button>
            </div>
          </form>

          {h.marks.length ? (
            <ul className="port-marks" aria-label="Marks">
              {[...h.marks].reverse().map((m) => (
                <li key={m.id}>
                  <span>
                    {m.date} · {usd(m.value_usd)}
                    {m.note ? ` · ${m.note}` : ""}
                  </span>
                  <button type="button" className="text-btn" disabled={busy} onClick={() => run({ op: "remove_mark", id: h.id, mark_id: m.id }, "Mark removed.")}>
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          ) : null}

          <form
            aria-label={`Money back from ${h.company}`}
            onSubmit={async (event) => {
              event.preventDefault();
              if (await run({ op: "distribute", id: h.id, amount_usd: back, date: backDate }, "Distribution saved.")) setBack("");
            }}
          >
            <h3 className="sx-h2">Money back</h3>
            <div className="port-form-grid">
              <label className="sx-field">
                <span className="lbl">Amount</span>
                <input value={back} onChange={(event) => setBack(event.target.value)} placeholder="$50K" inputMode="decimal" required />
              </label>
              <label className="sx-field">
                <span className="lbl">Date</span>
                <input type="date" value={backDate} onChange={(event) => setBackDate(event.target.value)} required />
              </label>
            </div>
            <div className="sx-actions">
              <button type="submit" className="btn" disabled={busy || !back.trim()}>
                Save distribution
              </button>
            </div>
          </form>

          <div className="segment sx-wrap" role="group" aria-label={`Status of ${h.company}`}>
            {HOLDING_STATUSES.map((status: HoldingStatus) => (
              <button key={status} type="button" aria-pressed={h.status === status} disabled={busy} onClick={() => run({ op: "update", id: h.id, status }, `${h.company}: ${HOLDING_STATUS_LABEL[status].toLowerCase()}.`)}>
                {HOLDING_STATUS_LABEL[status]}
              </button>
            ))}
          </div>

          <div className="port-links">
            {dealHref ? <Link href={dealHref}>Open the deal</Link> : null}
            {spvHref ? <Link href={spvHref}>Open the SPV</Link> : null}
            <button
              type="button"
              className="text-btn"
              disabled={busy}
              onClick={() => {
                if (window.confirm(`Take ${h.company} off the books? Its marks and distributions go too.`)) void run({ op: "remove", id: h.id }, `${h.company} removed.`);
              }}
            >
              Remove holding
            </button>
          </div>
        </div>
      </details>
    </li>
  );
}
