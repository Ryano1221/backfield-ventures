"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { snoozeUntil } from "@/lib/os/snooze";
import type { DeskDecision } from "@/lib/os/night";
import type { ActionPayload, DecisionSwap } from "@/lib/os/types";
import { officeStatus, whoLabel } from "@/lib/os/ask";
import { decisionNeedsPickup } from "@/lib/os/waiting";
import { DecisionDetailView } from "./DecisionDetail";
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
  const { enqueue, submit, retry, inflight, errors, actions } = useNightActions();
  const pickup = decisionNeedsPickup(actions, item.id);
  const savedAction = [...actions].reverse().find((action) => action.type === "decide" && action.target_id === item.id) ?? null;
  const pickupStatus = savedAction ? officeStatus(savedAction, whoLabel(item.requestedBy || "the office")) : null;
  const pending = Boolean(inflight[item.id]);
  const error = errors[item.id] || "";
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(item.message || "");
  const [reply, setReply] = useState("");
  const crumbs = [
    total ? `${index + 1} of ${total}` : null,
    item.channelCrumb || (item.hold ? "On hold" : null),
  ].filter(Boolean);
  const meta = [item.waiting ? `Waiting ${item.waiting}` : null, item.drafted ? `Drafted ${item.drafted}` : null].filter(Boolean);
  const saved = (item.message || "").trim();

  function answerPayload(choice: string, noteText: string, swaps?: DecisionSwap[]): ActionPayload {
    const payload: ActionPayload = { choice };
    const trimmed = noteText.trim();
    if (trimmed) payload.note = trimmed;
    if (item.detail?.preview?.hash) payload.exact_message_hash = item.detail.preview.hash;
    if (swaps?.length) payload.swaps = swaps;
    return payload;
  }

  function choose(choice: string, label: string) {
    enqueue({
      type: "decide",
      target_id: item.id,
      payload: answerPayload(choice, ""),
      label,
    });
  }

  function approve() {
    choose(item.approveChoice, `${item.approveLabel} for ${item.name}.`);
  }

  function notNow() {
    if (item.notNow.kind === "decide") {
      choose(item.notNow.choice, `Not now for ${item.name}.`);
      return;
    }
    enqueue({
      type: "snooze",
      target_id: item.id,
      payload: { until: snoozeUntil("tomorrow") },
      label: `Not now for ${item.name}.`,
    });
  }

  function sendReply() {
    const text = reply.trim();
    if (!text) return;
    submit({
      type: "decide",
      target_id: item.id,
      payload: answerPayload("reply", text),
      label: `Reply on ${item.name}.`,
    });
  }

  function sendSwap(swaps: DecisionSwap[], swapNote: string) {
    submit({
      type: "decide",
      target_id: item.id,
      payload: answerPayload("swap", swapNote, swaps),
      label: `Swap suggested for ${item.name}.`,
    });
  }

  function saveEdit() {
    const text = draft.trim();
    if (!text || text === saved) return;
    enqueue({
      type: "decide",
      target_id: item.id,
      payload: { choice: "edit", edited_message: text },
      label: `Edited the reply for ${item.name}.`,
    });
    setEditing(false);
  }

  return (
    <section className={`pane ${className}`.trim()}>
      <div className="crumbs lbl">
        <span>{crumbs.join(" · ")}</span>
        {meta.length ? <span>{meta.join(" · ")}</span> : null}
      </div>
      <div className="who inbox-who">
        <div>
          <h1 className="d-l">{item.name}</h1>
          {item.org ? <div className="sub">{item.org}</div> : null}
        </div>
        <span className="chip inbox-type">{item.channel || (item.hold ? "Hold" : "Decision")}</span>
      </div>
      {!item.outcome && !editing ? (
        <div className="inbox-actions">
          <button type="button" className="btn primary" onClick={approve} disabled={pending}>
            {pending ? "Pending" : "Approve"}
          </button>
          <button type="button" className="btn" onClick={notNow} disabled={pending}>
            Not now
          </button>
          {item.message && !item.detail?.preview ? (
            <button type="button" className="btn" onClick={() => setEditing(true)} disabled={pending}>
              Edit
            </button>
          ) : null}
        </div>
      ) : null}
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
      {item.detail ? <DecisionDetailView detail={item.detail} pending={pending} onSwap={sendSwap} /> : null}
      {item.message && !item.detail?.preview ? (
        <div className="block">
          <div className="lbl">{editing ? "Edit the reply" : "Draft"}</div>
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
        {item.outcome && !pending ? (
          <>
            <p className="outcome">
              <b>{item.outcome.label}</b>
              {item.outcome.at ? <span className="lbl"> · {item.outcome.at}</span> : null}
            </p>
            {pickupStatus && (pickup || savedAction?.acked_at || savedAction?.status === "failed") ? (
              <p className="pickup">
                {pickupStatus.line}
                {pickupStatus.note ? ` ${pickupStatus.note}` : ""}
                {pickupStatus.retry ? (
                  <button
                    type="button"
                    className="btn"
                    onClick={() =>
                      submit({
                        type: "decide",
                        target_id: item.id,
                        payload: { choice: String(savedAction?.payload.choice || item.approveChoice) },
                        label: `Retry for ${item.name}.`,
                        retry: true,
                      })
                    }
                  >
                    Retry
                  </button>
                ) : null}
              </p>
            ) : null}
          </>
        ) : editing ? (
          <>
            <button type="button" className="btn primary" onClick={saveEdit} disabled={!draft.trim() || draft.trim() === saved}>
              Save edit <span>→</span>
            </button>
            <button type="button" className="btn" onClick={() => setEditing(false)}>
              Cancel
            </button>
            <span className="note">Queued edits wait for the office. Nothing sends until you approve.</span>
          </>
        ) : (
          <>
            <span className="note">{next ? <a href={next.href}>Next: {next.label}</a> : "Nothing sends until you approve."}</span>
            <label className="replybox">
              <span className="lbl">Reply</span>
              <textarea
                value={reply}
                maxLength={2000}
                aria-label="Reply"
                placeholder="Write a reply. Nothing sends."
                onChange={(event) => setReply(event.target.value)}
              />
              <button type="button" className="btn" onClick={sendReply} disabled={pending || !reply.trim()}>
                Reply
              </button>
            </label>
          </>
        )}
        {error ? (
          <p className="os-error" role="alert">
            {error}{" "}
            <button type="button" className="btn" onClick={() => retry(item.id)}>
              Retry
            </button>
          </p>
        ) : null}
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
  useEffect(() => {
    const node = ref.current;
    const vv = window.visualViewport;
    if (!node || !vv) return;
    const keepVisible = () => {
      if (document.activeElement !== node) return;
      node.scrollIntoView({ block: "center" });
    };
    vv.addEventListener("resize", keepVisible);
    vv.addEventListener("scroll", keepVisible);
    return () => {
      vv.removeEventListener("resize", keepVisible);
      vv.removeEventListener("scroll", keepVisible);
    };
  }, []);
  return (
    <textarea
      ref={ref}
      className="editbox"
      value={value}
      rows={1}
      aria-label="Edited message"
      onChange={(event) => onChange(event.target.value)}
      onFocus={() => {
        requestAnimationFrame(() => ref.current?.scrollIntoView({ block: "center" }));
      }}
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
