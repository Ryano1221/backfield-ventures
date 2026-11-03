"use client";

import { useState } from "react";
import { snoozeUntil } from "@/lib/os/snooze";
import type { DeskDecision } from "@/lib/os/night";
import { Logo } from "./Logo";
import { useNightActions } from "./NightFrame";

export function DecisionPane({
  item,
  index,
  total,
  next,
  className = "",
}: {
  item: DeskDecision;
  index: number;
  total: number;
  next?: { href: string; label: string } | null;
  className?: string;
}) {
  const { actions, enqueue } = useNightActions();
  const pending = item.pending || actions.some((action) => action.type === "decide" && action.target_id === item.id && action.status !== "failed") || actions.some((action) => action.type === "snooze" && action.target_id === item.id && action.status !== "failed");
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(item.message || "");
  const crumbs = [
    total ? `${index + 1} of ${total}` : null,
    item.channel ? `Reply on ${item.channel}` : item.hold ? "On hold" : null,
  ].filter(Boolean);
  const meta = [item.waiting ? `Waiting ${item.waiting}` : null, item.drafted ? `Drafted ${item.drafted}` : null].filter(Boolean);

  function approve() {
    enqueue({
      type: "decide",
      target_id: item.id,
      payload: { choice: item.approveChoice },
      label: `Queued approval for ${item.name}. Nothing sends until the office acts.`,
    });
  }

  function notNow() {
    if (item.notNow.kind === "decide") {
      enqueue({
        type: "decide",
        target_id: item.id,
        payload: { choice: item.notNow.choice },
        label: `Not now for ${item.name}.`,
      });
      return;
    }
    enqueue({
      type: "snooze",
      target_id: item.id,
      payload: { until: snoozeUntil("tomorrow") },
      label: `Not now for ${item.name}.`,
    });
  }

  function saveEdit() {
    const text = draft.trim();
    if (!text || text === (item.message || "")) return;
    enqueue({
      type: "decide",
      target_id: item.id,
      payload: { choice: "edit", edited_message: text },
      label: `Queued an edited reply for ${item.name}.`,
    });
    setEditing(false);
  }

  return (
    <section className={`pane ${className}`.trim()}>
      <div className="crumbs lbl">
        <span>{crumbs.join(" · ")}</span>
        {meta.length ? <span>{meta.join(" · ")}</span> : null}
      </div>
      <div className="who">
        <Logo name={item.name} domain={item.domain} logoUrl={item.logoUrl} large />
        <div>
          <h2 className="d-l">{item.name}</h2>
          {item.org ? <div className="sub">{item.org}</div> : null}
        </div>
      </div>
      {item.happened ? (
        <div className="block">
          <div className="lbl">What happened</div>
          <p className="happened">{item.happened}</p>
        </div>
      ) : null}
      {item.message ? (
        <div className="block">
          <div className="lbl">If you approve, this goes out</div>
          {editing ? (
            <textarea className="editbox" value={draft} onChange={(event) => setDraft(event.target.value)} aria-label="Edited message" />
          ) : (
            <div className="msg">
              {item.toLine ? (
                <div className="hd">
                  <span className="lbl">To</span>
                  <span>{item.toLine}</span>
                </div>
              ) : null}
              <div className="bd">{item.message}</div>
            </div>
          )}
        </div>
      ) : null}
      <div className="actions">
        {editing ? (
          <>
            <button type="button" className="btn primary" onClick={saveEdit} disabled={!draft.trim() || draft.trim() === item.message}>
              Queue edit <span>→</span>
            </button>
            <button type="button" className="btn" onClick={() => setEditing(false)}>
              Cancel
            </button>
          </>
        ) : (
          <>
            <button type="button" className="btn primary" onClick={approve} disabled={pending}>
              {pending ? "Pending" : item.approveLabel} {!pending ? <span>→</span> : null}
            </button>
            {item.message ? (
              <button type="button" className="btn" onClick={() => setEditing(true)} disabled={pending}>
                Edit
              </button>
            ) : null}
            <button type="button" className="btn" onClick={notNow} disabled={pending}>
              Not now
            </button>
          </>
        )}
        <span className="note">{next ? <a href={next.href}>Next: {next.label} →</a> : "Nothing sends until you approve."}</span>
      </div>
    </section>
  );
}

export function DecisionRow({
  item,
  selected,
  onSelect,
}: {
  item: DeskDecision;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button type="button" className={`row${selected ? " sel" : ""}`} onClick={onSelect}>
      <Logo name={item.name} domain={item.domain} logoUrl={item.logoUrl} />
      <div>
        <div className="n clamp1">{item.name}</div>
        {item.org ? <div className="o clamp1">{item.org}</div> : null}
        {item.summary ? <div className="sm clamp2">{item.summary}</div> : null}
      </div>
      <div className="meta">
        {item.channel ? <span className="lbl ch">{item.channel}</span> : item.hold ? <span className="lbl ch">On hold</span> : null}
        {item.waiting ? <span className="lbl">{item.waiting}</span> : null}
      </div>
    </button>
  );
}
