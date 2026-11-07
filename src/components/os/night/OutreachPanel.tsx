"use client";

import { useState } from "react";
import { outreachStats, statsByKind, subjectTest } from "@/lib/os/outreach/plan";
import type { Enrollment, OutreachBook } from "@/lib/os/outreach/types";
import { KIND_LABEL, LEAD_KINDS } from "@/lib/os/leads/types";

export type OutreachSetup = { gmail: string | null; googleReady: boolean };

const STATUS: Record<Enrollment["status"], string> = { active: "Running", replied: "Replied", bounced: "Bounced", opted_out: "Opted out", finished: "Finished", stopped: "Stopped" };
const THRESHOLDS = [70, 75, 80, 85, 90];

export function sequenceLine(enrollment: Enrollment): string {
  const sent = enrollment.steps.filter((s) => s.sent_at).length;
  const progress = sent ? `email ${sent} of ${enrollment.steps.length} sent` : "first email queued";
  return `${STATUS[enrollment.status]} · ${progress}`;
}

/** Autopilot: the switch, its rules, and what it is doing. Every change saves; the hourly run sends. */
export function OutreachPanel({ book, setup, capToday, sentToday, now, onBook }: { book: OutreachBook; setup: OutreachSetup; capToday: number; sentToday: number; now: number; onBook: (book: OutreachBook, setup?: OutreachSetup) => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const s = book.settings;

  async function send(body: Record<string, unknown>, url = "/api/os/outreach") {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = (await res.json().catch(() => ({}))) as { error?: string; book?: OutreachBook; setup?: OutreachSetup };
      if (!res.ok) {
        setError(data.error || "Could not save that.");
        return;
      }
      if (data.book) onBook(data.book, data.setup);
      else if (url.endsWith("/disconnect")) onBook(book, { ...setup, gmail: null });
    } catch {
      setError("No connection. Nothing was saved.");
    } finally {
      setBusy(false);
    }
  }

  const live = book.enrollments.filter((e) => e.status === "active");
  const stats = outreachStats(book, new Date(now));
  const byKind = statsByKind(book, new Date(now));
  const recent = [...book.enrollments].sort((a, b) => b.updated_at.localeCompare(a.updated_at)).slice(0, 12);

  return (
    <section className="sx-card autopilot" aria-label="Outreach autopilot">
      <div className="lead-head">
        <div>
          <h2 className="lead-name">Autopilot {s.enabled ? "on" : "off"}</h2>
          <p className="sx-hint">
            {s.enabled
              ? `Starts sequences for leads scoring ${s.threshold}+ and sends Tuesday to Thursday mornings, their time. ${sentToday} of ${capToday} new people today. ${live.length} running.`
              : "Nothing sends while autopilot is off. Replies are still checked."}
          </p>
        </div>
        <button type="button" className={s.enabled ? "btn" : "btn primary"} disabled={busy} onClick={() => send({ op: "settings", enabled: !s.enabled })}>
          {s.enabled ? "Turn off" : "Turn on"}
        </button>
      </div>
      {stats.emailed ? (
        <ul className="ap-stats" aria-label="Last 30 days">
          <li>
            <b>{stats.emailed}</b>
            <span className="lbl">Emailed, 30 days</span>
          </li>
          <li>
            <b>{stats.replyRate != null ? `${stats.replyRate}%` : stats.replied}</b>
            <span className="lbl">{stats.replyRate != null ? `Replied (${stats.replied}), aim 8 to 12%` : "Replied"}</span>
          </li>
          <li>
            <b>{stats.bounced}</b>
            <span className="lbl">Bounced</span>
          </li>
          <li>
            <b>{stats.optedOut}</b>
            <span className="lbl">Opted out</span>
          </li>
        </ul>
      ) : null}
      {byKind.length > 1 ? (
        <p className="sx-hint">
          By type:{" "}
          {byKind.map((row) => `${KIND_LABEL[row.kind]} ${row.rate != null ? `${row.rate}%` : `${row.replied} of ${row.emailed}`}`).join(" · ")}
        </p>
      ) : null}
      {s.subject_test
        ? LEAD_KINDS.map((kind) => {
            const t = subjectTest(book, kind);
            if (!t.A.delivered && !t.B.delivered) return null;
            const arm = (label: string, a: { delivered: number; rate: number | null }) => `${label} ${a.rate != null ? `${a.rate}%` : "–"} (${a.delivered})`;
            const winner = s.subject_winner[kind];
            return (
              <p key={kind} className="sx-hint">
                Subject test, {KIND_LABEL[kind].toLowerCase()}: {arm("your draft's subject", t.A)} · {arm("playbook subject", t.B)}
                {winner ? ` · ${winner === "A" ? "your draft's" : "the playbook"} subject won` : " · decides at 20 each, 5+ points apart"}
              </p>
            );
          })
        : null}
      {s.paused_reason ? (
        <p className="sx-error" role="alert">
          {s.paused_reason}
        </p>
      ) : null}
      {error ? (
        <p className="sx-error" role="alert">
          {error}
        </p>
      ) : null}

      <details className="lead-why ap-settings" open={!setup.gmail}>
        <summary>Settings{setup.gmail ? ` · sending from ${setup.gmail} · score ${s.threshold}+` : " · connect Gmail to start"}</summary>
        <div className="ap-settings-body">
          <div className="lead-to">
            <span className="lbl">Gmail</span>
            {setup.gmail ? (
              <div className="sx-actions">
                <span className="t-body">Sending from {setup.gmail}</span>
                <button type="button" className="btn" disabled={busy} onClick={() => send({}, "/api/os/gmail/disconnect")}>
                  Disconnect
                </button>
              </div>
            ) : setup.googleReady ? (
              <a className="btn primary" href="/api/os/gmail/connect">
                Connect Gmail
              </a>
            ) : (
              <p className="sx-hint">Not connected. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in Vercel, then connect here.</p>
            )}
          </div>

          <div className="lead-to">
            <span className="lbl">Start automatically at score</span>
            <div className="segment sx-wrap" role="group" aria-label="Score bar">
              {THRESHOLDS.map((value) => (
                <button key={value} type="button" aria-pressed={s.threshold === value} disabled={busy} onClick={() => send({ op: "settings", threshold: value })}>
                  {value}+
                </button>
              ))}
            </div>
            <div className="segment sx-wrap" role="group" aria-label="Who autopilot emails">
              {LEAD_KINDS.map((kind) => (
                <button key={kind} type="button" aria-pressed={s.kinds[kind]} disabled={busy} onClick={() => send({ op: "settings", kinds: { [kind]: !s.kinds[kind] } })}>
                  {KIND_LABEL[kind]}
                </button>
              ))}
            </div>
            <div className="segment sx-wrap" role="group" aria-label="Subject test">
          <button type="button" aria-pressed={s.subject_test} disabled={busy} onClick={() => send({ op: "settings", subject_test: !s.subject_test })}>
            Subject A/B test {s.subject_test ? "on" : "off"}
          </button>
        </div>
        <div className="segment sx-wrap" role="group" aria-label="Morning summary email">
          <button type="button" aria-pressed={s.digest} disabled={busy} onClick={() => send({ op: "settings", digest: !s.digest })}>
            Morning summary email {s.digest ? "on" : "off"}
          </button>
        </div>
        <p className="sx-hint">Five emails each: first, 3 days, a week, a week, then 3 months. Stops on any reply. Never emails a guessed address. LP emails only cover The Handoff and startups, never the fund. Daily limit starts at {s.start_cap} and rises {s.ramp_per_week} a week to {s.max_cap}.</p>
          </div>

        </div>
      </details>
      {recent.length ? (
        <details className="lead-why">
          <summary>Sequences ({book.enrollments.length})</summary>
          <ul className="autopilot-list">
            {recent.map((enrollment) => (
              <li key={enrollment.lead_id}>
                <span>
                  <b>{enrollment.company}</b> · {enrollment.email}
                </span>
                <span className="sx-hint">{sequenceLine(enrollment)}</span>
                {enrollment.status === "active" ? (
                  <button type="button" className="btn sm" disabled={busy} onClick={() => send({ op: "stop", lead_id: enrollment.lead_id })}>
                    Stop
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        </details>
      ) : null}
      {book.suppress.length ? (
        <details className="lead-why">
          <summary>Do not contact ({book.suppress.length})</summary>
          <p className="sx-hint">Opt-outs, bounces, clear no&apos;s and anyone you stopped. Autopilot never emails these. Remove one only if it was a mistake.</p>
          <ul className="autopilot-list">
            {book.suppress.slice(-50).reverse().map((email) => (
              <li key={email}>
                <span>{email}</span>
                <button type="button" className="btn sm" disabled={busy} onClick={() => send({ op: "unsuppress", email })}>
                  Remove
                </button>
              </li>
            ))}
          </ul>
        </details>
      ) : null}
      {book.log.length ? (
        <details className="lead-why">
          <summary>Activity</summary>
          <ul>
            {book.log
              .slice(-10)
              .reverse()
              .map((event) => (
                <li key={`${event.at}-${event.text}`}>
                  {new Date(event.at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}: {event.text}
                </li>
              ))}
          </ul>
        </details>
      ) : null}
    </section>
  );
}
