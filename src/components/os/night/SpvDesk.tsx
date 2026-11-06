"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { DealPick } from "@/lib/os/deals";
import { CompanyPicker } from "./CompanyPicker";
import { usd } from "@/lib/os/raise-model";
import { Ring, StepDots } from "./Charts";
import {
  applySpvOp,
  spvNext,
  summarizeSpv,
  SPV_STATUS_LABEL,
  SPV_STEPS,
  type Spv,
  type SpvBook,
} from "@/lib/os/spv";

/** Every SPV at a glance: progress to target, days left, and what each needs next. */
export function SpvDesk({
  initial,
  root,
  now,
  prefill,
  deals = [],
}: {
  initial: SpvBook;
  root: string;
  now: number;
  prefill: { company: string; deal: string };
  deals?: DealPick[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(
    Boolean(prefill.company) || initial.spvs.length === 0,
  );
  const [company, setCompany] = useState(prefill.company);
  const [dealId, setDealId] = useState(prefill.deal);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const live = initial.spvs.filter(
    (spv) => spv.status !== "cancelled" && spv.status !== "closed",
  );
  const done = initial.spvs.filter(
    (spv) => spv.status === "closed" || spv.status === "cancelled",
  );
  const raising = live.reduce((sum, spv) => sum + (spv.target_usd ?? 0), 0);
  const hard = live.reduce((sum, spv) => sum + summarizeSpv(spv, now).hard, 0);

  async function create(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    // Validate here first so the message shows instantly; the server checks again.
    const local = applySpvOp(initial, { op: "create", company, name });
    if (!local.ok) {
      setError(local.error);
      setBusy(false);
      return;
    }
    try {
      const res = await fetch("/api/os/spvs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          op: "create",
          company,
          name,
          deal_id: dealId || null,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        id?: string;
        error?: string;
      };
      if (!res.ok || !data.id) {
        setError(data.error || "Could not save that.");
        setBusy(false);
        return;
      }
      router.push(`${root}/${encodeURIComponent(data.id)}`);
    } catch {
      setError("No connection. Nothing was saved.");
      setBusy(false);
    }
  }

  return (
    <div className="spv">
      <div className="sx-head">
        <div>
          <h1 className="d-xl">
            {live.length
              ? `${live.length} ${live.length === 1 ? "SPV" : "SPVs"} open.`
              : "SPVs."}
          </h1>
          <p className="lede">
            {live.length
              ? `${usd(hard)} committed of ${usd(raising)} across open SPVs.`
              : "One vehicle per deal. Terms, who is in, and every step to close."}
          </p>
        </div>
        {open && !initial.spvs.length ? null : (
          <button
            type="button"
            className={open ? "btn" : "btn primary"}
            aria-expanded={open}
            onClick={() => setOpen((value) => !value)}
          >
            {open ? "Cancel" : "New SPV"}
          </button>
        )}
      </div>

      {open ? (
        <form className="sx-card sx-new" onSubmit={create}>
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
          <label className="sx-field">
            <span className="lbl">SPV name (optional)</span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={160}
              placeholder={
                company ? `Backfield ${company} SPV` : "Backfield Company SPV"
              }
            />
          </label>
          {error ? (
            <p className="sx-error" role="alert">
              {error}
            </p>
          ) : null}
          <div className="sx-actions">
            <button
              type="submit"
              className="btn primary"
              disabled={busy || !company.trim()}
            >
              {busy ? "Saving…" : "Create SPV"}
            </button>
          </div>
        </form>
      ) : null}

      {live.length ? (
        <ul className="spv-list" aria-label="Open SPVs">
          {live.map((spv) => (
            <SpvCard
              key={spv.id}
              spv={spv}
              href={`${root}/${encodeURIComponent(spv.id)}`}
              now={now}
            />
          ))}
        </ul>
      ) : !open ? (
        <p className="sx-muted">
          No open SPVs. Start one from a deal page or with New SPV.
        </p>
      ) : null}

      {done.length ? (
        <details className="sx-revs">
          <summary>Closed and cancelled ({done.length})</summary>
          <ul className="spv-list">
            {done.map((spv) => (
              <SpvCard
                key={spv.id}
                spv={spv}
                href={`${root}/${encodeURIComponent(spv.id)}`}
                now={now}
              />
            ))}
          </ul>
        </details>
      ) : null}
    </div>
  );
}

function SpvCard({ spv, href, now }: { spv: Spv; href: string; now: number }) {
  const s = summarizeSpv(spv, now);
  const target = spv.target_usd ?? 0;
  const pct = target ? Math.round((s.hard / target) * 100) : null;
  return (
    <li>
      <Link className="spv-card" href={href}>
        <span className="spv-card-top">
          <b>{spv.name}</b>
          <span className={`sx-chip spv-status is-${spv.status}`}>
            {SPV_STATUS_LABEL[spv.status]}
          </span>
        </span>
        <span className="spv-card-body">
          <Ring
            size={76}
            stroke={9}
            total={target}
            label={
              target ? `${pct}% of target committed or wired` : "No target yet"
            }
            parts={[
              {
                key: "wired",
                label: `Wired ${usd(s.wired)}`,
                value: s.wired,
                tone: "hard",
              },
              {
                key: "committed",
                label: `Committed ${usd(s.committed)}`,
                value: s.committed,
                tone: "mid",
              },
              {
                key: "soft",
                label: `Soft ${usd(s.soft)}`,
                value: s.soft,
                tone: "hatch",
              },
            ]}
          >
            <b>{pct != null ? `${Math.min(pct, 999)}%` : "?"}</b>
          </Ring>
          <span className="spv-card-nums">
            <span className="spv-money">
              <b>{usd(s.hard)}</b>
              {spv.target_usd
                ? ` of ${usd(spv.target_usd)}`
                : " committed, no target yet"}
            </span>
            <span className="spv-meta">
              {s.soft ? `${usd(s.soft)} soft · ` : ""}
              {s.investors} {s.investors === 1 ? "investor" : "investors"}
              {s.daysLeft != null && spv.status !== "closed"
                ? ` · ${s.daysLeft} ${s.daysLeft === 1 ? "day" : "days"} left`
                : ""}
            </span>
            <span className="spv-steps">
              <StepDots
                steps={SPV_STEPS}
                done={spv.steps}
                label={`${s.stepsDone} of ${SPV_STEPS.length} steps done`}
              />
              <span>
                {s.stepsDone} of {SPV_STEPS.length} steps
              </span>
            </span>
          </span>
        </span>
        <span className="sx-next">{spvNext(spv, now)}</span>
      </Link>
    </li>
  );
}
