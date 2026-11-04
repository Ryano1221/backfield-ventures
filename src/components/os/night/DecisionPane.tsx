"use client";

import { useLayoutEffect, useRef, useState } from "react";
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
    item.channelCrumb || (item.hold ? "On hold" : null),
  ].filter(Boolean);
  const meta = [item.waiting ? `Waiting ${item.waiting}` : null, item.drafted ? `Drafted ${item.drafted}` : null].filter(Boolean);
  const saved = (item.message || "").trim();

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
    if (!text || text === saved) return;
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
      {item.why ? (
        <div className="why">
          <span className="lbl">Why this is in front of you</span>
          {item.why}
        </div>
      ) : null}
      {item.happened ? (
        <div className="block">
          <div className="lbl">What happened</div>
          <p className="happened">{item.happened}</p>
        </div>
      ) : null}
      {item.quote ? (
        <div className="block">
          <div className="lbl">{item.quote.summary ? "What they asked" : "What they said"}</div>
          <div className={`quote${item.quote.summary ? " sum" : ""}`}>
            <q>{item.quote.text}</q>
            {item.quote.at ? <div className="at lbl">{item.quote.at}</div> : null}
          </div>
        </div>
      ) : null}
      {item.timeline.length ? (
        <div className="block">
          <div className="lbl">Timeline · CT</div>
          <div className="tl">
            {item.timeline.map((row, rowIndex) => (
              <div className={`r ${row.tone}`} key={`${row.at || "row"}-${rowIndex}`}>
                <span className="t">{row.at || ""}</span>
                <i />
                <span className="e">{row.event}</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}
      {item.message ? (
        <div className="block">
          <div className="lbl">{editing ? "Edit the reply" : "If you approve, this goes out"}</div>
          {editing ? (
            <>
              <div className="msg flat">
                <MessageHead item={item} />
              </div>
              <FitTextarea value={draft} onChange={setDraft} />
              <p className="hint">Edit the reply the way it goes out. Blank lines and line breaks are kept when you queue the edit. The box grows with the text.</p>
            </>
          ) : (
            <div className="msg">
              <MessageHead item={item} />
              <div className="bd">{item.message}</div>
            </div>
          )}
        </div>
      ) : null}
      <div className="actions">
        {editing ? (
          <>
            <button type="button" className="btn primary" onClick={saveEdit} disabled={!draft.trim() || draft.trim() === saved}>
              Queue edit <span>→</span>
            </button>
            <button type="button" className="btn" onClick={() => setEditing(false)}>
              Cancel
            </button>
            <span className="note">Queued edits wait for the office. Nothing sends until you approve.</span>
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
            <span className="note">{next ? <a href={next.href}>Next: {next.label} →</a> : "Nothing sends until you approve."}</span>
          </>
        )}
      </div>
    </section>
  );
}

function MessageHead({ item }: { item: DeskDecision }) {
  const to = item.toName || item.toEmail || item.toDetail;
  if (!to && !item.cc && !item.subject && !item.fromLine) return null;
  return (
    <div className="hd">
      {to ? (
        <>
          <span className="lbl">To</span>
          <span className="to">
            {item.toName ? <b>{item.toName}</b> : null}
            {item.toEmail ? <span>{`${item.toName ? " " : ""}<${item.toEmail}>`}</span> : null}
            {item.toDetail ? <span>{`${item.toName ? " " : ""}${item.toDetail}`}</span> : null}
          </span>
        </>
      ) : null}
      {item.cc ? (
        <>
          <span className="lbl">Cc</span>
          <span>{item.cc}</span>
        </>
      ) : null}
      {item.subject ? (
        <>
          <span className="lbl">Subject</span>
          <span>{item.subject}</span>
        </>
      ) : null}
      {item.fromLine ? (
        <>
          <span className="lbl">From</span>
          <span>{item.fromLine}</span>
        </>
      ) : null}
    </div>
  );
}

function FitTextarea({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    const node = ref.current;
    if (!node) return;
    node.style.height = "auto";
    node.style.height = `${node.scrollHeight}px`;
  }, [value]);
  return (
    <textarea
      ref={ref}
      className="editbox"
      value={value}
      rows={1}
      aria-label="Edited message"
      onChange={(event) => onChange(event.target.value)}
    />
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
