"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  buildDrive,
  canApprove,
  highlightAdded,
  isApproved,
  isSkipped,
  pendingApproval,
  pendingEdit,
  versionWhen,
  type DriveCard,
  type DriveVersion,
} from "@/lib/os/drive";
import type { PitchRating, Snapshot } from "@/lib/os/types";
import { useNightActions } from "./NightFrame";

const CHIPS = ["Shorter", "Warmer", "Add a time"];

export function DriveDesk({ snapshot }: { snapshot: Snapshot | null }) {
  const { actions, submit, inflight } = useNightActions();
  const queue = useMemo(() => buildDrive(snapshot, actions), [actions, snapshot]);
  const [reopened, setReopened] = useState<string[]>([]);
  const skipped = queue.cards.filter((card) => isSkipped(actions, card.id) && !reopened.includes(card.id) && !isApproved(actions, card.id));
  const [hold, setHold] = useState<string | null>(null);
  const [pile, setPile] = useState(false);
  const [index, setIndex] = useState(0);
  const [dir, setDir] = useState<"next" | "prev">("next");
  const skippedIds = new Set(skipped.map((card) => card.id));
  const active = queue.cards.filter((card) => !skippedIds.has(card.id) && (!isApproved(actions, card.id) || card.id === hold));
  const safeIndex = active.length ? Math.min(index, active.length - 1) : 0;
  const card = active[safeIndex] ?? null;
  const done = summarize(actions, skipped);

  function go(next: number) {
    setDir(next > safeIndex ? "next" : "prev");
    setHold(null);
    setPile(false);
    setIndex(Math.max(0, Math.min(active.length - 1, next)));
  }

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (!card || pile) {
        if (event.key === "Escape") setPile(false);
        return;
      }
      if (event.key === "j") go(safeIndex + 1);
      else if (event.key === "k") go(safeIndex - 1);
      else if (event.key === "e") {
        const node = document.querySelector<HTMLButtonElement>("[data-drive-edit]");
        node?.click();
      } else if (event.key === "s") {
        document.querySelector<HTMLButtonElement>("[data-drive-skip]")?.click();
      } else if (event.key === "a") {
        document.querySelector<HTMLButtonElement>("[data-drive-approve]")?.click();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (!snapshot) return <p className="lede">Waiting on the first ingest.</p>;

  if (pile) {
    return (
      <SkippedPile
        cards={skipped}
        onClose={() => setPile(false)}
        onOpen={(id) => {
          setReopened((current) => (current.includes(id) ? current : [...current, id]));
          setPile(false);
          setIndex(0);
        }}
      />
    );
  }

  if (!card) {
    return <AllClear done={done} skipped={skipped.length} onReview={() => setPile(true)} />;
  }

  const position = safeIndex + 1;
  const total = active.length + skipped.length;
  return (
    <div className="drive">
      <header className="drive-top">
        <div>
          <p className="kicker">Today · end-of-day queue</p>
          <h1>Drive</h1>
        </div>
        <div className="drive-nav">
          <button type="button" className="icon-btn drive-ib" aria-label="Previous" onClick={() => go(safeIndex - 1)} disabled={safeIndex === 0}>
            ‹
          </button>
          <button type="button" className="icon-btn drive-ib" aria-label="Next" onClick={() => go(safeIndex + 1)} disabled={safeIndex >= active.length - 1}>
            ›
          </button>
        </div>
      </header>
      <div className="drive-prog">
        <span className="num">{position} of {total}</span>
        <span className="drive-bar" aria-hidden="true"><i style={{ width: `${total ? (position / total) * 100 : 0}%` }} /></span>
        <button type="button" className="drive-skipped" onClick={() => setPile(true)}>Skipped ({skipped.length})</button>
      </div>
      <div className="drive-grid">
        <DriveSlide key={card.id} dir={dir} card={card} onSkip={() => skip(card)} onDone={(id) => setHold(id)} />
        <aside className="drive-side">
          <p className="kicker">Up next</p>
          <ul className="drive-side-list">
            {active.slice(safeIndex + 1, safeIndex + 4).map((item) => (
              <li key={item.id}>
                <b>{labelOf(item)}</b>
                <span>{item.title}</span>
              </li>
            ))}
          </ul>
          <p className="kicker">Skipped ({skipped.length})</p>
          <ul className="drive-side-list">
            {skipped.slice(0, 4).map((item) => (
              <li key={item.id}>
                <b>{labelOf(item)}</b>
                <span>{item.title}</span>
              </li>
            ))}
          </ul>
        </aside>
      </div>
      <p className="drive-kb"><kbd>j</kbd> next · <kbd>k</kbd> previous · <kbd>a</kbd> approve · <kbd>e</kbd> edit · <kbd>s</kbd> skip</p>
    </div>
  );

  function skip(item: DriveCard) {
    submit({
      type: "drive_skip",
      target_id: item.id,
      payload: { kind: item.kind },
      label: "Skipped.",
    });
    setHold(null);
  }
}

function DriveSlide({ card, dir, onSkip, onDone }: { card: DriveCard; dir: "next" | "prev"; onSkip: () => void; onDone: (id: string) => void }) {
  const start = useStatePointer();
  return (
    <article
      className={`drive-card is-${dir}`}
      data-kind={card.kind}
      data-drive={card.id}
      onPointerDown={start.down}
      onPointerUp={(event) => {
        const dx = start.up(event);
        if (dx > 70) document.querySelector<HTMLButtonElement>(".drive-ib[aria-label='Previous']")?.click();
        else if (dx < -70) document.querySelector<HTMLButtonElement>(".drive-ib[aria-label='Next']")?.click();
      }}
    >
      {card.kind === "draft" ? <DraftCard card={card} onSkip={onSkip} onDone={onDone} /> : null}
      {card.kind === "yesno" ? <YesNoCard card={card} onSkip={onSkip} /> : null}
      {card.kind === "rate" ? <RateCard card={card} onSkip={onSkip} /> : null}
      {card.kind === "question" ? <QuestionCard card={card} onSkip={onSkip} /> : null}
    </article>
  );
}

function DraftCard({ card, onSkip, onDone }: { card: DriveCard; onSkip: () => void; onDone: (id: string) => void }) {
  const { actions, submit, inflight } = useNightActions();
  const latest = card.versions[card.versions.length - 1] ?? null;
  const [view, setView] = useState(latest?.version ?? 1);
  const [editing, setEditing] = useState(false);
  const [note, setNote] = useState("");
  const shown = card.versions.find((item) => item.version === view) || latest;
  const previous = card.versions.filter((item) => shown && item.version < shown.version).at(-1) || null;
  const approval = pendingApproval(actions, card.id);
  const edit = latest ? pendingEdit(actions, card.id, latest.version) : null;
  const busy = Boolean(inflight[card.id]);
  const approvable = Boolean(shown && canApprove(card.versions, shown.version) && !approval);

  if (edit && latest && !card.versions.some((item) => item.version === latest.version + 1)) {
    return (
      <div>
        <TypeLine channel={card.channel} />
        <div className="drive-pending" role="status">
          <span className="drive-spin" aria-hidden="true" />
          Working on v{latest.version + 1}
          {typeof edit.payload.note === "string" ? ` · “${edit.payload.note}”` : ""}
        </div>
        <button type="button" className="btn" data-drive-skip onClick={onSkip}>Skip</button>
      </div>
    );
  }

  return (
    <div>
      <TypeLine channel={card.channel} />
      <dl className="drive-meta">
        <dt>To</dt>
        <dd>{card.toName ? <><b>{card.toName}</b>{card.toEmail ? ` · ${card.toEmail}` : ""}</> : card.toEmail || "No recipient on this card"}</dd>
        <dt>Drafted by</dt>
        <dd>{shown?.by || card.from || "The office"}</dd>
      </dl>
      {card.why ? <p className="drive-why">Why now: {card.why}</p> : null}
      {shown && !canApprove(card.versions, shown.version) ? (
        <p className="drive-status">Viewing v{shown.version}. Only v{latest?.version}, the latest, can be approved.</p>
      ) : null}
      {shown && previous ? (
        <p className="drive-status">v{shown.version} is ready. Changed words are highlighted.</p>
      ) : null}
      {approval ? (
        <p className="drive-status">Approved v{String(approval.payload.version ?? shown?.version)}, waiting for the bot to send.</p>
      ) : null}
      {shown?.sentAt ? <p className="drive-status is-sent">Sent by bot {versionWhen(shown.sentAt)}{shown.sentVia ? ` · ${shown.sentVia}` : ""}</p> : null}
      {shown ? <DraftBody version={shown} previous={previous} /> : null}
      <div className="drive-versions" role="group" aria-label="Versions">
        {card.versions.map((item) => (
          <button key={item.version} type="button" className="vchip" aria-pressed={item.version === shown?.version} onClick={() => { setView(item.version); setEditing(false); }}>
            v{item.version}
          </button>
        ))}
      </div>
      {editing ? (
        <form
          className="drive-edit"
          onSubmit={(event) => {
            event.preventDefault();
            if (!latest || !note.trim()) return;
            submit({
              type: "drive_edit",
              target_id: card.id,
              payload: { base_version: latest.version, note: note.trim() },
              label: `Working on v${latest.version + 1}.`,
            });
            setEditing(false);
            setNote("");
          }}
        >
          <p className="kicker">What should change?</p>
          <textarea aria-label="What should change" value={note} maxLength={2000} onChange={(event) => setNote(event.target.value)} />
          <div className="drive-chips">
            {CHIPS.map((chip) => (
              <button key={chip} type="button" onClick={() => setNote((current) => (current ? `${current.trim()} ${chip}.` : `${chip}.`))}>
                {chip}
              </button>
            ))}
          </div>
          <button type="submit" className="btn primary" disabled={!note.trim() || busy}>Make v{(latest?.version || 1) + 1}</button>
          <button type="button" className="btn" onClick={() => setEditing(false)}>Cancel</button>
        </form>
      ) : (
        <div className="drive-acts">
          <button
            type="button"
            className="btn primary"
            data-drive-approve
            disabled={!approvable || busy}
            onClick={() => {
              if (!shown) return;
              submit({
                type: "drive_approve",
                target_id: card.id,
                payload: { version: shown.version },
                label: `Approved v${shown.version}, waiting for the bot to send.`,
              });
              onDone(card.id);
            }}
          >
            Approve as written
          </button>
          <p className="drive-cap">{approvable ? "Approves this exact text. The bot sends it." : `Switch to v${latest?.version} to approve.`}</p>
          <div className="drive-row2">
            <button type="button" className="btn" data-drive-edit disabled={Boolean(approval)} onClick={() => { setView(latest?.version || view); setEditing(true); }}>
              Edit
            </button>
            <button type="button" className="btn" data-drive-skip onClick={onSkip}>Skip</button>
          </div>
        </div>
      )}
      {card.versions.length ? <History versions={card.versions} current={shown?.version || 0} onPick={setView} /> : null}
    </div>
  );
}

function DraftBody({ version, previous }: { version: DriveVersion; previous: DriveVersion | null }) {
  const parts = previous ? highlightAdded(previous.body, version.body) : [{ text: version.body, added: false }];
  return (
    <div className="drive-draft">
      {version.subject ? (
        <p className="drive-subject">
          {previous ? <DiffText parts={highlightAdded(previous.subject, version.subject)} /> : version.subject}
        </p>
      ) : null}
      <p>
        {parts.map((part, index) =>
          part.text.includes("\n") ? <br key={index} /> : part.added ? <mark key={index}>{part.text}</mark> : <span key={index}>{part.text}</span>,
        )}
      </p>
    </div>
  );
}

function DiffText({ parts }: { parts: { text: string; added: boolean }[] }) {
  return (
    <>
      {parts.map((part, index) => part.added ? <mark key={index}>{part.text}</mark> : <span key={index}>{part.text}</span>)}
    </>
  );
}

function History({ versions, current, onPick }: { versions: DriveVersion[]; current: number; onPick: (version: number) => void }) {
  const latest = versions[versions.length - 1]?.version;
  return (
    <div className="drive-history">
      <p className="kicker">Versions · tap to view</p>
      {[...versions].reverse().map((item) => (
        <button key={item.version} type="button" className={item.version === current ? "on" : ""} onClick={() => onPick(item.version)}>
          <span>
            <b>v{item.version}{item.at ? ` · ${versionWhen(item.at)}` : ""}</b>
            <small>{item.by}{item.note ? `: “${item.note}”` : ""}</small>
          </span>
          <em>{item.version === latest ? "Latest, can approve" : "View only"}</em>
        </button>
      ))}
    </div>
  );
}

function YesNoCard({ card, onSkip }: { card: DriveCard; onSkip: () => void }) {
  const { submit, inflight } = useNightActions();
  const busy = Boolean(inflight[card.id]);
  function answer(choice: "yes" | "no") {
    submit({ type: "decide", target_id: card.id, payload: { choice }, label: choice === "yes" ? "Yes." : "No." });
  }
  return (
    <div data-kind="yesno">
      <p className="drive-type">Yes or no{card.from ? ` · ${card.from}` : ""}</p>
      <h2 className="drive-big">{card.title}</h2>
      {card.why ? <p className="drive-why">{card.why}</p> : null}
      <div className="drive-row2">
        <button type="button" className="btn primary drive-tall" disabled={busy} onClick={() => answer("yes")}>Yes</button>
        <button type="button" className="btn drive-tall" disabled={busy} onClick={() => answer("no")}>No</button>
      </div>
      <div className="drive-row2">
        <button type="button" className="btn" data-drive-skip onClick={onSkip}>Skip</button>
      </div>
      <p className="drive-cap">Your answer is recorded. Nothing is signed from here.</p>
    </div>
  );
}

function RateCard({ card, onSkip }: { card: DriveCard; onSkip: () => void }) {
  const { submit, inflight } = useNightActions();
  const busy = Boolean(inflight[card.id]);
  const ratings: PitchRating[] = ["great", "good", "maybe", "no"];
  return (
    <div data-kind="rate">
      <p className="drive-type">Rate a deal</p>
      <h2 className="drive-big">{card.title}</h2>
      <p className="drive-why">{[card.sector, card.stage].filter(Boolean).join(" · ") || card.why}</p>
      <div className="drive-rates">
        {ratings.map((rating) => (
          <button
            key={rating}
            type="button"
            disabled={busy}
            onClick={() => submit({ type: "rate", target_id: card.id, payload: { rating }, label: `Rated ${card.title} ${rating}.` })}
          >
            {rating}
          </button>
        ))}
      </div>
      <button type="button" className="btn" data-drive-skip onClick={onSkip}>Skip</button>
    </div>
  );
}

function QuestionCard({ card, onSkip }: { card: DriveCard; onSkip: () => void }) {
  const { submit, inflight } = useNightActions();
  const busy = Boolean(inflight[card.id]);
  return (
    <div data-kind="question">
      <p className="drive-type">Bot question{card.from ? ` · ${card.from}` : ""}</p>
      <h2 className="drive-big">{card.title}</h2>
      {card.choices.length ? (
        <div className="drive-row2">
          {card.choices.map((choice) => (
            <button
              key={choice.value}
              type="button"
              className="btn"
              disabled={busy}
              onClick={() =>
                submit({
                  type: "drive_approve",
                  target_id: card.id,
                  payload: { version: 1, choice: choice.value },
                  label: choice.label,
                })
              }
            >
              {choice.label}
            </button>
          ))}
        </div>
      ) : (
        <p className="drive-cap">No choices are on this snapshot. Skip it, or answer the draft if it is also in Drive.</p>
      )}
      <button type="button" className="btn" data-drive-skip onClick={onSkip}>Skip</button>
    </div>
  );
}

function SkippedPile({ cards, onClose, onOpen }: { cards: DriveCard[]; onClose: () => void; onOpen: (id: string) => void }) {
  return (
    <div className="drive">
      <header className="drive-top">
        <div>
          <p className="kicker">Drive</p>
          <h1>Skipped ({cards.length})</h1>
        </div>
      </header>
      <p className="lede">You passed on these. Open one to finish it now, or leave it for tomorrow.</p>
      <ul className="drive-side-list">
        {cards.map((card) => (
          <li key={card.id}>
            <span><b>{labelOf(card)}</b><span>{card.title}</span></span>
            <button type="button" className="btn" onClick={() => onOpen(card.id)}>Open</button>
          </li>
        ))}
      </ul>
      <button type="button" className="btn" onClick={onClose}>Leave for tomorrow</button>
    </div>
  );
}

function AllClear({ done, skipped, onReview }: { done: { approved: number; edited: number; skipped: number; lines: { title: string; detail: string }[] }; skipped: number; onReview: () => void }) {
  const when = new Intl.DateTimeFormat("en-US", { timeZone: "America/Chicago", hour: "numeric", minute: "2-digit", timeZoneName: "short" }).format(new Date());
  return (
    <div className="drive-clear">
      <div className="drive-check" aria-hidden="true">✓</div>
      <h1>All clear</h1>
      <p className="kicker">Drive is done for today, {when}.</p>
      <div className="drive-sum">
        <div><b className="num">{done.approved}</b><span>Approved</span></div>
        <div><b className="num">{done.edited}</b><span>Edited</span></div>
        <div><b className="num">{done.skipped}</b><span>Skipped</span></div>
      </div>
      <ul className="drive-side-list">
        {done.lines.map((line) => (
          <li key={line.title}><b>{line.title}</b><span>{line.detail}</span></li>
        ))}
      </ul>
      {skipped ? <button type="button" className="btn" onClick={onReview}>Review skipped ({skipped})</button> : null}
    </div>
  );
}

function TypeLine({ channel }: { channel: string | null }) {
  return <p className="drive-type">Email draft{channel ? ` · ${channel}` : ""}</p>;
}

function labelOf(card: DriveCard): string {
  if (card.kind === "draft") return "Email draft";
  if (card.kind === "yesno") return "Yes or no";
  if (card.kind === "rate") return "Rate a deal";
  return "Bot question";
}

function summarize(actions: Parameters<typeof isApproved>[0], skipped: DriveCard[]) {
  const approved = actions.filter((action) => {
    if (action.status === "failed") return false;
    if (action.type === "drive_approve" || action.type === "rate") return true;
    return action.type === "decide" && (action.payload.choice === "yes" || action.payload.choice === "no");
  }).length;
  const edited = actions.filter((action) => action.type === "drive_edit" && action.status !== "failed").length;
  return {
    approved,
    edited,
    skipped: skipped.length,
    lines: [
      { title: "Approved", detail: approved ? `${approved} recorded` : "None yet" },
      { title: "Edited, then approved", detail: edited ? `${edited} change ${edited === 1 ? "note" : "notes"}` : "None yet" },
      { title: "Skipped", detail: skipped.map((card) => card.title).slice(0, 3).join(", ") || "None" },
    ],
  };
}

function useStatePointer() {
  const point = useRef({ x: 0, y: 0, id: -1 });
  return {
    down(event: React.PointerEvent) {
      const target = event.target as HTMLElement | null;
      if (target?.closest("button, a, textarea, input")) return;
      point.current = { x: event.clientX, y: event.clientY, id: event.pointerId };
    },
    up(event: React.PointerEvent) {
      if (event.pointerId !== point.current.id) return 0;
      point.current.id = -1;
      return event.clientX - point.current.x;
    },
  };
}
