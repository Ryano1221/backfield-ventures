"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { type DeskDecision, type TodayModel, withLiveAnswers } from "@/lib/os/night";
import { snoozeUntil } from "@/lib/os/snooze";
import { osHrefs } from "@/lib/os/nav";
import { Logo } from "./Logo";
import { useNightActions } from "./NightFrame";

export function TodayDesk({ model, onOs }: { model: TodayModel; onOs: boolean }) {
  const hrefs = osHrefs(onOs);
  const { enqueue, inflight, reportToday, actions, setAskContext } = useNightActions();
  const view = useMemo(() => withLiveAnswers(model, actions), [actions, model]);
  const items = useMemo(() => [...view.ready, ...view.hold, ...view.open], [view]);
  const [current, setCurrent] = useState(0);
  const item = items[current] ?? null;
  const waiting = items.length + model.waiting.length;
  const outreach = view.kpis.find((kpi) => kpi.label === "Outreach today") ?? null;

  useEffect(() => {
    reportToday(waiting);
  }, [reportToday, waiting]);

  useEffect(() => {
    setAskContext({
      page: hrefs.today,
      about: item?.id ?? null,
      requestedBy: item?.requestedBy ?? null,
      botName: null,
    });
  }, [hrefs.today, item?.id, item?.requestedBy, setAskContext]);

  useEffect(() => {
    if (current > items.length - 1) setCurrent(Math.max(0, items.length - 1));
  }, [current, items.length]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.key === "j" || event.key === "ArrowDown") {
        event.preventDefault();
        setCurrent((index) => Math.min(items.length - 1, index + 1));
      } else if (event.key === "k" || event.key === "ArrowUp") {
        event.preventDefault();
        setCurrent((index) => Math.max(0, index - 1));
      } else if ((event.key === "e" || event.key === "Enter") && item && !inflight[item.id] && !item.outcome) {
        event.preventDefault();
        approve(item);
      }
    }
    function approve(decision: DeskDecision) {
      enqueue({
        type: "decide",
        target_id: decision.id,
        payload: { choice: decision.approveChoice },
        label: `${decision.approveLabel}.`,
      });
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [enqueue, inflight, item, items.length]);

  function approve(decision: DeskDecision) {
    enqueue({
      type: "decide",
      target_id: decision.id,
      payload: { choice: decision.approveChoice },
      label: `${decision.approveLabel}.`,
    });
  }

  function dismiss(decision: DeskDecision) {
    if (decision.notNow.kind === "decide") {
      enqueue({
        type: "decide",
        target_id: decision.id,
        payload: { choice: decision.notNow.choice },
        label: `Not now for ${decision.name}.`,
      });
      return;
    }
    enqueue({
      type: "snooze",
      target_id: decision.id,
        payload: { until: snoozeUntil("tomorrow") },
      label: `Not now for ${decision.name}.`,
    });
  }

  return (
    <div className="inbox-page">
      <p className="lbl eyebrow">{view.weekday || "Today"}</p>
      <h1 className="d-xl">{waiting ? `${waiting} waiting on you` : "Clear"}</h1>
      <p className="lede">{waiting ? "One action each. Undo is at the bottom of the screen." : "Nothing needs you right now."}</p>
      <p className="pointer-keys keys">J and K move. E approves. / searches.</p>

      {items.length ? (
        <ol className="inbox">
          {items.map((decision, index) => (
            <InboxCard
              key={decision.id}
              item={decision}
              selected={index === current}
              href={hrefs.decision(decision.id)}
              busy={Boolean(inflight[decision.id])}
              onApprove={() => approve(decision)}
              onDismiss={() => dismiss(decision)}
              onFocus={() => setCurrent(index)}
            />
          ))}
        </ol>
      ) : (
        <p className="empty-clear">Inbox clear.</p>
      )}

      {model.waiting.length ? (
        <section className="stack" aria-label="Bots waiting on you">
          <h2>Bots waiting</h2>
          {model.waiting.map((bot) => (
            <Link className="stack-row" href={hrefs.bots} prefetch key={bot.slug}>
              <b>{bot.name}</b>
              <span>{bot.ask}</span>
            </Link>
          ))}
        </section>
      ) : null}

      <section className="stack" aria-label="Firm status">
        <h2>Firm</h2>
        {outreach ? (
          <p className="stack-stat">
            <b className="num">{outreach.value}{outreach.small || ""}</b>
            <span>Outreach today{outreach.sub ? ` · ${outreach.sub}` : ""}</span>
          </p>
        ) : (
          <p className="stack-stat"><span>Outreach is not in this snapshot.</span></p>
        )}
        <Link className="stack-row" href={hrefs.email} prefetch>
          <b>Email</b>
          <span>Lists and drafts. Sends stay a request.</span>
        </Link>
        <Link className="stack-row" href={hrefs.deals} prefetch>
          <b>Deals</b>
          <span>{model.reviewingCount.toLocaleString("en-US")} in review</span>
        </Link>
      </section>

      {view.settled.length ? (
        <section className="stack" aria-label="Answered">
          <h2>Answered</h2>
          <ul className="settled">
            {view.settled.map((row) => (
              <li key={row.id}>
                <b>{row.label}</b>
                <span>{row.name}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function InboxCard({
  item,
  selected,
  href,
  busy,
  onApprove,
  onDismiss,
  onFocus,
}: {
  item: DeskDecision;
  selected: boolean;
  href: string;
  busy: boolean;
  onApprove: () => void;
  onDismiss: () => void;
  onFocus: () => void;
}) {
  const start = useRef<{ x: number; y: number; drag: boolean } | null>(null);
  const [dx, setDx] = useState(0);

  function onTouchStart(event: React.TouchEvent) {
    const touch = event.changedTouches[0];
    if (!touch) return;
    start.current = { x: touch.clientX, y: touch.clientY, drag: false };
  }

  function onTouchMove(event: React.TouchEvent) {
    const origin = start.current;
    const touch = event.changedTouches[0];
    if (!origin || !touch) return;
    const x = touch.clientX - origin.x;
    const y = touch.clientY - origin.y;
    if (!origin.drag) {
      if (Math.abs(y) > Math.abs(x) + 6) {
        start.current = null;
        return;
      }
      if (Math.abs(x) > 10) origin.drag = true;
    }
    if (origin.drag) setDx(Math.max(-140, Math.min(140, x)));
  }

  function onTouchEnd() {
    if (dx > 80) onApprove();
    else if (dx < -80) onDismiss();
    setDx(0);
    start.current = null;
  }

  const line = item.message || item.summary || item.happened;

  return (
    <li className={`swipe${selected ? " is-sel" : ""}`} style={{ ["--dx" as string]: `${dx}px` }} onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
      <span className="swipe-yes">Approve</span>
      <span className="swipe-no">Not now</span>
      <article className="inbox-card" onClick={onFocus}>
        <div className="inbox-who">
          <Logo name={item.name} domain={item.domain} logoUrl={item.logoUrl} />
          <div>
            <h2>{item.name}</h2>
            {item.org ? <p>{item.org}</p> : null}
          </div>
          {item.channel ? <span className="chip">{item.channel}</span> : null}
        </div>
        {line ? <p className="inbox-line">{line}</p> : null}
        <div className="inbox-actions">
          <button type="button" className="btn primary" disabled={busy} onClick={onApprove}>
            {item.approveLabel}
          </button>
          <button type="button" className="btn" disabled={busy} onClick={onDismiss}>
            Not now
          </button>
          <Link href={href} prefetch>
            Read
          </Link>
        </div>
      </article>
    </li>
  );
}
