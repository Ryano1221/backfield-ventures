"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { type DeskDecision, type TodayModel, withLiveAnswers } from "@/lib/os/night";
import { snoozeUntil } from "@/lib/os/snooze";
import { osHrefs } from "@/lib/os/nav";
import { monogram } from "@/lib/os/logo-mark";
import { useNightActions } from "./NightFrame";

export function TodayDesk({ model, onOs }: { model: TodayModel; onOs: boolean }) {
  const hrefs = osHrefs(onOs);
  const { enqueue, inflight, reportToday, actions, setAskContext } = useNightActions();
  const view = useMemo(() => withLiveAnswers(model, actions), [actions, model]);
  const items = useMemo(() => [...view.ready, ...view.hold, ...view.open], [view]);
  const [current, setCurrent] = useState(0);
  const selected = Math.min(current, Math.max(0, items.length - 1));
  const item = items[selected] ?? null;
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
        label: "Approved.",
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
      label: "Approved.",
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
      <p className="greet">{view.weekday || "Today"}</p>
      <h1 className="d-xl">{waiting ? `${waiting} waiting on you` : "You're clear"}</h1>
      <p className="lede">
        {waiting
          ? `${items.length.toLocaleString("en-US")} ${items.length === 1 ? "decision" : "decisions"}, ${model.waiting.length.toLocaleString("en-US")} ${model.waiting.length === 1 ? "bot" : "bots"}.`
          : "Nothing needs you right now."}
      </p>
      <p className="pointer-keys keys">J and K move. E approves. / searches.</p>

      {items.length ? (
        <ol className="inbox">
          {items.map((decision, index) => (
            <InboxCard
              key={decision.id}
              item={decision}
              selected={index === selected}
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
          {model.waiting.map((bot) => {
            const decision = items.find((row) => (row.requestedBy || "").toLowerCase() === bot.name.toLowerCase());
            return (
              <div className="stack-row has-action" key={bot.slug}>
                <div>
                  <b>{bot.name}</b>
                  <span>{bot.ask}</span>
                </div>
                {decision ? (
                  <button type="button" className="btn primary" disabled={Boolean(inflight[decision.id])} onClick={() => approve(decision)}>
                    Approve
                  </button>
                ) : (
                  <Link className="btn" href={hrefs.bots} prefetch>
                    Open
                  </Link>
                )}
              </div>
            );
          })}
        </section>
      ) : null}

      <section className="stack" aria-label="Firm status">
        <h2>Firm</h2>
        <Link className="stack-row" href={hrefs.email} prefetch>
          <b>Email</b>
          <span>
            {outreach
              ? `Outreach today ${outreach.value}${outreach.small || ""}${outreach.sub ? ` · ${outreach.sub}` : ""}`
              : "No send counts in this snapshot."}
          </span>
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
  const dxRef = useRef(0);
  const [dx, setDx] = useState(0);
  function move(next: number) {
    dxRef.current = next;
    setDx(next);
  }

  function onPointerDown(event: React.PointerEvent) {
    const target = event.target as HTMLElement | null;
    if (target?.closest("button, a, input, textarea, select")) return;
    if (event.pointerType === "mouse" && event.button !== 0) return;
    start.current = { x: event.clientX, y: event.clientY, drag: false };
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      /* Synthetic events cannot capture the pointer. */
    }
  }

  function onPointerMove(event: React.PointerEvent) {
    const origin = start.current;
    if (!origin) return;
    const x = event.clientX - origin.x;
    const y = event.clientY - origin.y;
    if (!origin.drag) {
      if (Math.abs(y) > Math.abs(x) + 6) {
        start.current = null;
        return;
      }
      if (Math.abs(x) > 10) origin.drag = true;
    }
    if (origin.drag) move(Math.max(-140, Math.min(140, x)));
  }

  function onPointerUp() {
    const dragged = dxRef.current;
    if (dragged > 80) onApprove();
    else if (dragged < -80) onDismiss();
    move(0);
    start.current = null;
  }

  const line = item.message || item.summary || item.happened;
  const [open, setOpen] = useState(false);
  const kind = item.channel || (item.hold ? "Hold" : "Decision");

  return (
    <li className={`swipe${selected ? " is-sel" : ""}`} style={{ ["--dx" as string]: `${dx}px` }} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}>
      <span className="swipe-yes">Approve</span>
      <span className="swipe-no">Not now</span>
      <article className={`inbox-card${open ? " is-open" : ""}`} onClick={onFocus}>
        <div className="inbox-who">
          <span className="logo fb" aria-hidden="true">{monogram(item.name)}</span>
          <div>
            <h2>
              <Link href={href} prefetch>{item.name}</Link>
            </h2>
            {item.org ? <p>{item.org}</p> : null}
          </div>
          <span className="chip inbox-type">{kind}</span>
        </div>
        {line ? <p className="inbox-line">{line}</p> : null}
        <div className="inbox-actions">
          <button type="button" className="btn primary" disabled={busy} onClick={onApprove}>
            Approve
          </button>
          <button type="button" className="btn" disabled={busy} onClick={onDismiss}>
            Not now
          </button>
          {line ? (
            <button type="button" className="btn" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
              {open ? "Show less" : "Read"}
            </button>
          ) : (
            <Link href={href} prefetch>Read</Link>
          )}
        </div>
      </article>
    </li>
  );
}
