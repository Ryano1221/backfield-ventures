"use client";

import { useState } from "react";
import { textToHtml } from "@/lib/email/format";
import { LIMITS, type Draft } from "@/lib/os/studio";

/**
 * How a draft will look where it lands. Each channel has its own shape, limit
 * and fold, so Ryan reviews the real thing, not a block of text.
 */
export function ChannelPreview({ draft }: { draft: Draft }) {
  if (draft.channel === "newsletter") return <NewsletterPreview draft={draft} />;
  if (draft.channel === "x") return <PostPreview draft={draft} name="Backfield Ventures" fold={null} />;
  if (draft.channel === "linkedin") return <PostPreview draft={draft} name="Ryan Arnold · Backfield Ventures" fold={210} />;
  return <InstagramPreview draft={draft} />;
}

function Count({ draft }: { draft: Draft }) {
  const used = draft.body.trim().length;
  const limit = LIMITS[draft.channel];
  return (
    <p className={`sx-count${used > limit ? " is-over" : ""}`}>
      {used.toLocaleString("en-US")} / {limit.toLocaleString("en-US")} characters
    </p>
  );
}

function NewsletterPreview({ draft }: { draft: Draft }) {
  const [width, setWidth] = useState<"desktop" | "mobile">("desktop");
  return (
    <div className="sx-preview">
      <div className="sx-inbox" aria-label="Inbox row">
        <b>Ryan Arnold</b>
        <span className="sx-inbox-subject">{draft.subject.trim() || "No subject yet"}</span>
        <span className="sx-inbox-pre">{draft.preview.trim() || draft.body.trim().split("\n")[0] || ""}</span>
      </div>
      <div className="segment sx-width" role="group" aria-label="Preview width">
        <button type="button" aria-pressed={width === "desktop"} onClick={() => setWidth("desktop")}>Desktop</button>
        <button type="button" aria-pressed={width === "mobile"} onClick={() => setWidth("mobile")}>Mobile</button>
      </div>
      <div className={`sx-frame-wrap is-${width}`}>
        <iframe className="sx-frame" title="Newsletter preview" sandbox="" srcDoc={textToHtml(draft.body || " ", draft.preview)} />
      </div>
    </div>
  );
}

function PostPreview({ draft, name, fold }: { draft: Draft; name: string; fold: number | null }) {
  const [open, setOpen] = useState(false);
  const body = draft.body.trim();
  const folded = fold != null && body.length > fold && !open;
  return (
    <div className="sx-preview">
      <article className={`sx-post is-${draft.channel}`}>
        <header>
          <span className="sx-avatar" aria-hidden="true">BV</span>
          <b>{name}</b>
        </header>
        <p className="sx-body">
          {body ? (folded ? `${body.slice(0, fold!).trimEnd()}…` : body) : <span className="sx-empty">Nothing written yet.</span>}
          {folded ? (
            <button type="button" className="sx-more" onClick={() => setOpen(true)}>
              see more
            </button>
          ) : null}
        </p>
        {draft.image_url.startsWith("https://") ? <img className="sx-img" src={draft.image_url} alt="" /> : null}
      </article>
      <Count draft={draft} />
      {fold != null ? <p className="sx-hint">LinkedIn folds after about {fold} characters. Put the point before the fold.</p> : null}
    </div>
  );
}

function InstagramPreview({ draft }: { draft: Draft }) {
  const body = draft.body.trim();
  return (
    <div className="sx-preview">
      <article className="sx-post is-instagram">
        <header>
          <span className="sx-avatar" aria-hidden="true">BV</span>
          <b>Backfield Ventures</b>
        </header>
        <div className="sx-square">
          {draft.image_url.startsWith("https://") ? <img src={draft.image_url} alt="" /> : <span>No image yet. Instagram needs one.</span>}
        </div>
        <p className="sx-body">
          {body ? (body.length > 125 ? `${body.slice(0, 125).trimEnd()}… more` : body) : <span className="sx-empty">No caption yet.</span>}
        </p>
      </article>
      <Count draft={draft} />
      <p className="sx-hint">The feed shows about 125 characters before “more”.</p>
    </div>
  );
}
