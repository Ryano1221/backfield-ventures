"use client";

import Link from "next/link";
import { useState } from "react";
import {
  canApprove,
  CHANNEL_LABEL,
  CHANNELS,
  checkDraft,
  itemStatus,
  nextAction,
  SOURCE_LABEL,
  STATUS_LABEL,
  type Channel,
  type ContentItem,
  type Draft,
  type Studio,
} from "@/lib/os/studio";
import { ChannelPreview } from "./ChannelPreview";
import { saveStudio } from "./save";

export function StudioItem({ initial, id, backHref }: { initial: Studio; id: string; backHref: string }) {
  const [studio, setStudio] = useState(initial);
  const item = studio.items.find((row) => row.id === id) ?? null;
  const [channel, setChannel] = useState<Channel | null>(item?.drafts[0]?.channel ?? null);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  if (!item) {
    return (
      <div className="sx">
        <div className="lbl eyebrow">
          <Link href={backHref}>Audience Growth</Link>
        </div>
        <h1 className="d-l">This item is gone.</h1>
        <p className="lede">It may have been archived or removed. Go back to the studio.</p>
      </div>
    );
  }

  async function run(op: Record<string, unknown>, done: string) {
    setBusy(true);
    setMessage(null);
    const result = await saveStudio({ ...op, id });
    setBusy(false);
    if (result.error || !result.studio) {
      setMessage({ tone: "error", text: result.error || "Could not save that." });
      return false;
    }
    setStudio(result.studio);
    setMessage({ tone: "ok", text: done });
    return true;
  }

  const draft = item.drafts.find((row) => row.channel === channel) ?? item.drafts[0] ?? null;
  const missing = CHANNELS.filter((row) => !item.drafts.some((d) => d.channel === row));

  return (
    <div className="sx">
      <div className="lbl eyebrow">
        <Link href={backHref}>Audience Growth</Link> / {item.title}
      </div>
      <div className="sx-head">
        <div>
          <h1 className="d-l">{item.title}</h1>
          <p className="sx-meta">
            {SOURCE_LABEL[item.source_kind]}
            {item.source_ref ? ` · ${item.source_ref}` : ""} · Owner {item.owner} · {STATUS_LABEL[itemStatus(item)]}
          </p>
          <p className="sx-next-big">
            <span className="lbl">Next</span> {nextAction(item)}
          </p>
        </div>
        <button type="button" className="btn" disabled={busy} onClick={() => run({ op: "archive", archived: !item.archived }, item.archived ? "Restored." : "Archived.")}>
          {item.archived ? "Restore" : "Archive"}
        </button>
      </div>

      {message ? (
        <p className={message.tone === "error" ? "sx-error" : "sx-ok"} role={message.tone === "error" ? "alert" : "status"}>
          {message.text}
        </p>
      ) : null}

      <div className="sx-split">
        <Brief item={item} busy={busy} onSave={(brief) => run({ op: "update_item", brief }, "Brief saved.")} />
        <Sources
          item={item}
          busy={busy}
          onAdd={(url, note) => run({ op: "add_source", url, note }, "Source added.")}
          onRemove={(url) => run({ op: "remove_source", url }, "Source removed.")}
        />
      </div>

      <div className="sx-tabs" role="tablist" aria-label="Channels">
        {item.drafts.map((row) => (
          <button key={row.channel} type="button" role="tab" aria-selected={draft?.channel === row.channel} onClick={() => setChannel(row.channel)}>
            {CHANNEL_LABEL[row.channel]} <span className={`sx-chip is-${row.status}`}>{STATUS_LABEL[row.status]}</span>
          </button>
        ))}
        {missing.map((row) => (
          <button key={row} type="button" className="sx-add" disabled={busy} onClick={async () => { if (await run({ op: "add_channel", channel: row }, `${CHANNEL_LABEL[row]} draft added.`)) setChannel(row); }}>
            + {CHANNEL_LABEL[row]}
          </button>
        ))}
      </div>

      {draft ? <DraftPanel key={draft.channel + draft.updated_at} item={item} draft={draft} busy={busy} run={run} /> : null}
    </div>
  );
}

function Brief({ item, busy, onSave }: { item: ContentItem; busy: boolean; onSave: (brief: string) => void }) {
  const [text, setText] = useState(item.brief);
  return (
    <section className="sx-card" aria-label="Brief">
      <h2 className="sx-h2">Brief</h2>
      <textarea className="sx-text" rows={5} value={text} maxLength={4000} onChange={(event) => setText(event.target.value)} placeholder="The point, who it is for, and what it must say or avoid" />
      <div className="sx-actions">
        <button type="button" className="btn" disabled={busy || text === item.brief} onClick={() => onSave(text)}>
          Save brief
        </button>
      </div>
    </section>
  );
}

function Sources({ item, busy, onAdd, onRemove }: { item: ContentItem; busy: boolean; onAdd: (url: string, note: string) => Promise<boolean>; onRemove: (url: string) => void }) {
  const [url, setUrl] = useState("");
  const [note, setNote] = useState("");
  return (
    <section className="sx-card" aria-label="Sources">
      <h2 className="sx-h2">Sources</h2>
      <p className="sx-muted">Where each fact or number in the drafts comes from.</p>
      {item.sources.length ? (
        <ul className="sx-sources">
          {item.sources.map((row) => (
            <li key={row.url}>
              <a href={row.url} target="_blank" rel="noopener noreferrer">{row.note || row.url}</a>
              <button type="button" className="btn sm" disabled={busy} onClick={() => onRemove(row.url)}>
                Remove
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <div className="sx-row">
        <input value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://" aria-label="Source link" />
        <input value={note} onChange={(event) => setNote(event.target.value)} placeholder="What it supports" aria-label="What the source supports" />
        <button
          type="button"
          className="btn"
          disabled={busy || !url.trim()}
          onClick={async () => {
            if (await onAdd(url.trim(), note.trim())) {
              setUrl("");
              setNote("");
            }
          }}
        >
          Add
        </button>
      </div>
    </section>
  );
}

function DraftPanel({ item, draft, busy, run }: { item: ContentItem; draft: Draft; busy: boolean; run: (op: Record<string, unknown>, done: string) => Promise<boolean> }) {
  const [subject, setSubject] = useState(draft.subject);
  const [preview, setPreview] = useState(draft.preview);
  const [body, setBody] = useState(draft.body);
  const [image, setImage] = useState(draft.image_url);
  const [when, setWhen] = useState(draft.scheduled_for ?? "");
  const live: Draft = { ...draft, subject, preview, body, image_url: image };
  const dirty = subject !== draft.subject || preview !== draft.preview || body !== draft.body || image !== draft.image_url;
  const checks = checkDraft(live, item);
  const label = CHANNEL_LABEL[draft.channel];
  const locked = draft.status === "published";

  return (
    <section className="sx-draft" aria-label={`${label} draft`}>
      <div className="sx-editor">
        {draft.channel === "newsletter" ? (
          <>
            <label className="sx-field">
              <span className="lbl">Subject</span>
              <input value={subject} onChange={(event) => setSubject(event.target.value)} maxLength={200} disabled={locked} />
            </label>
            <label className="sx-field">
              <span className="lbl">Preview text</span>
              <input value={preview} onChange={(event) => setPreview(event.target.value)} maxLength={200} disabled={locked} placeholder="The line the inbox shows after the subject" />
            </label>
          </>
        ) : null}
        <label className="sx-field">
          <span className="lbl">{draft.channel === "newsletter" ? "Body" : draft.channel === "instagram" ? "Caption" : "Post"}</span>
          <textarea className="sx-text" rows={draft.channel === "newsletter" ? 16 : 8} value={body} onChange={(event) => setBody(event.target.value)} disabled={locked} />
        </label>
        <label className="sx-field">
          <span className="lbl">Image link{draft.channel === "instagram" ? "" : " (optional)"}</span>
          <input value={image} onChange={(event) => setImage(event.target.value)} maxLength={500} disabled={locked} placeholder="https://" />
        </label>
        <div className="sx-actions">
          <button type="button" className="btn primary" disabled={busy || !dirty || locked} onClick={() => run({ op: "edit_draft", channel: draft.channel, subject, preview, body, image_url: image }, `${label} draft saved.`)}>
            Save draft
          </button>
          {dirty ? <span className="sx-muted">Unsaved changes.{draft.status === "approved" || draft.status === "scheduled" ? " Saving sends it back to review." : ""}</span> : null}
        </div>

        {checks.length ? (
          <ul className="sx-checks" aria-label="Checks">
            {checks.map((check) => (
              <li key={check.text} className={`is-${check.level}`}>
                {check.level === "block" ? "Must fix: " : "Check: "}
                {check.text}
              </li>
            ))}
          </ul>
        ) : (
          <p className="sx-ok">Checks pass.</p>
        )}

        <div className="sx-approve">
          <p className="sx-muted">
            Status: <b>{STATUS_LABEL[draft.status]}</b>
            {draft.approved_at ? ` · approved ${new Date(draft.approved_at).toLocaleString("en-US", { timeZone: "America/Chicago", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })} CT` : ""}
            {draft.scheduled_for ? ` · scheduled for ${draft.scheduled_for}` : ""}
          </p>
          {draft.status === "draft" ? (
            <button type="button" className="btn" disabled={busy || dirty || !body.trim()} onClick={() => run({ op: "set_status", channel: draft.channel, status: "review" }, "Sent to review.")}>
              Send to review
            </button>
          ) : null}
          {draft.status === "draft" || draft.status === "review" ? (
            <button
              type="button"
              className="btn primary"
              disabled={busy || dirty || !canApprove(draft, item)}
              onClick={() => run({ op: "set_status", channel: draft.channel, status: "approved" }, "Approved. Nothing was posted or sent.")}
            >
              Approve this exact text
            </button>
          ) : null}
          {draft.status === "approved" ? (
            <span className="sx-row">
              <input type="date" value={when.slice(0, 10)} onChange={(event) => setWhen(event.target.value)} aria-label="Schedule date" />
              <button type="button" className="btn primary" disabled={busy || !when} onClick={() => run({ op: "set_status", channel: draft.channel, status: "scheduled", scheduled_for: when.slice(0, 10) }, "Scheduled. Publishing is off, so nothing posts yet.")}>
                Schedule
              </button>
            </span>
          ) : null}
          {draft.status !== "draft" && !locked ? (
            <button type="button" className="btn quiet" disabled={busy} onClick={() => run({ op: "set_status", channel: draft.channel, status: "draft" }, "Back to draft.")}>
              Back to draft
            </button>
          ) : null}
          <p className="sx-hint">Approving records your yes on these exact words. It does not post or send anything. Publishing is off.</p>
        </div>

        {draft.revisions.length ? (
          <details className="sx-revs">
            <summary>Earlier versions ({draft.revisions.length})</summary>
            <ol>
              {draft.revisions.map((rev) => (
                <li key={rev.at + rev.body.slice(0, 20)}>
                  <span className="sx-muted">{new Date(rev.at).toLocaleString("en-US", { timeZone: "America/Chicago", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })} CT · {rev.by}</span>
                  {rev.subject ? <b>{rev.subject}</b> : null}
                  <p>{rev.body}</p>
                </li>
              ))}
            </ol>
          </details>
        ) : null}
      </div>
      <div className="sx-preview-col">
        <h2 className="sx-h2">{label} preview</h2>
        <ChannelPreview draft={live} />
      </div>
    </section>
  );
}
