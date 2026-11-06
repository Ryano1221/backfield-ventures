"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  calendar,
  CHANNEL_LABEL,
  CHANNELS,
  itemStatus,
  NEWSLETTER_TEMPLATES,
  nextAction,
  SOURCE_KINDS,
  SOURCE_LABEL,
  STATUS_LABEL,
  type Channel,
  type ContentItem,
  type DraftStatus,
  type NewsletterTemplate,
  type SourceKind,
  type Studio,
} from "@/lib/os/studio";
import { saveStudio } from "./save";

type Hrefs = { studio: string; email: string; compose: string; magnets: string; forms: string; bots: string };

const COLUMNS: { status: DraftStatus; title: string; empty: string }[] = [
  { status: "draft", title: "Being written", empty: "Nothing being written." },
  { status: "review", title: "Waiting on Ryan", empty: "Nothing waiting on you." },
  { status: "approved", title: "Approved, needs a date", empty: "Nothing approved without a date." },
  { status: "scheduled", title: "Scheduled", empty: "Nothing scheduled." },
  { status: "published", title: "Published", empty: "Nothing published yet. Publishing is off." },
];

export function StudioDesk({ initial, hrefs, now, engagement }: { initial: Studio; hrefs: Hrefs; now: number; engagement: number }) {
  const router = useRouter();
  const [studio] = useState(initial);
  const [open, setOpen] = useState(initial.items.length === 0);
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<SourceKind>("note");
  const [ref, setRef] = useState("");
  const [brief, setBrief] = useState("");
  const [channels, setChannels] = useState<Channel[]>(["newsletter", "linkedin", "x"]);
  const [template, setTemplate] = useState<NewsletterTemplate | "">("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const live = studio.items.filter((item) => !item.archived);
  // A failed post goes back to the first column so it is worked, not lost.
  const byStatus = (status: DraftStatus) => live.filter((item) => {
    const current = itemStatus(item);
    return current === status || (status === "draft" && current === "failed");
  });
  const days = calendar(studio, now);
  const scheduledCount = days.reduce((sum, day) => sum + day.entries.length, 0);

  async function create(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const result = await saveStudio({ op: "create", title, source_kind: kind, source_ref: ref, brief, channels, template: channels.includes("newsletter") ? template : "" });
    setBusy(false);
    if (result.error || !result.id) {
      setError(result.error || "Could not save that.");
      return;
    }
    router.push(itemHref(hrefs.studio, result.id));
  }

  function toggle(channel: Channel) {
    setChannels((current) => (current.includes(channel) ? current.filter((row) => row !== channel) : [...current, channel]));
  }

  return (
    <div className="sx">
      <div className="lbl eyebrow">Audience Growth</div>
      <div className="sx-head">
        <div>
          <h1 className="d-xl">Content studio.</h1>
          <p className="lede">One idea, a draft for each channel. Nothing posts or sends from here.</p>
        </div>
        <button type="button" className="btn primary" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
          {open ? "Close" : "New idea"}
        </button>
      </div>

      {open ? (
        <form className="sx-card sx-new" onSubmit={create}>
          <label className="sx-field">
            <span className="lbl">Idea</span>
            <input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={160} placeholder="What is this about, in a line" required />
          </label>
          <div className="sx-field">
            <span className="lbl" id="sx-source">Where it came from</span>
            <div className="segment sx-wrap" role="group" aria-labelledby="sx-source">
              {SOURCE_KINDS.map((row) => (
                <button key={row} type="button" aria-pressed={kind === row} onClick={() => setKind(row)}>
                  {SOURCE_LABEL[row]}
                </button>
              ))}
            </div>
          </div>
          <label className="sx-field">
            <span className="lbl">Source detail (optional)</span>
            <input value={ref} onChange={(event) => setRef(event.target.value)} maxLength={300} placeholder="Company, person, link, or event name" />
          </label>
          <label className="sx-field">
            <span className="lbl">Brief</span>
            <textarea value={brief} onChange={(event) => setBrief(event.target.value)} maxLength={4000} rows={4} placeholder="The point, who it is for, and anything it must say or avoid" />
          </label>
          <div className="sx-field">
            <span className="lbl" id="sx-channels">Channels</span>
            <div className="segment sx-wrap" role="group" aria-labelledby="sx-channels">
              {CHANNELS.map((channel) => (
                <button key={channel} type="button" aria-pressed={channels.includes(channel)} onClick={() => toggle(channel)}>
                  {CHANNEL_LABEL[channel]}
                </button>
              ))}
            </div>
          </div>
          {channels.includes("newsletter") ? (
            <div className="sx-field">
              <span className="lbl" id="sx-template">Newsletter starts from</span>
              <div className="segment sx-wrap" role="group" aria-labelledby="sx-template">
                <button type="button" aria-pressed={template === ""} onClick={() => setTemplate("")}>
                  Blank
                </button>
                {(Object.keys(NEWSLETTER_TEMPLATES) as NewsletterTemplate[]).map((key) => (
                  <button key={key} type="button" aria-pressed={template === key} onClick={() => setTemplate(key)}>
                    {NEWSLETTER_TEMPLATES[key].label}
                  </button>
                ))}
              </div>
              {template ? <p className="sx-hint">A new draft with the {NEWSLETTER_TEMPLATES[template].label} layout. Replace each [bracketed] prompt before approving.</p> : null}
            </div>
          ) : null}
          {error ? <p className="sx-error" role="alert">{error}</p> : null}
          <div className="sx-actions">
            <button type="submit" className="btn primary" disabled={busy || !title.trim() || !channels.length}>
              {busy ? "Saving…" : "Create drafts"}
            </button>
          </div>
        </form>
      ) : null}

      <section className="sx-board" aria-label="Content by status">
        {COLUMNS.map((column) => {
          const rows = byStatus(column.status);
          return (
            <div className="sx-col" key={column.status}>
              <h2>
                {column.title} <span>{rows.length}</span>
              </h2>
              {rows.length ? rows.map((item) => <ItemCard key={item.id} item={item} href={itemHref(hrefs.studio, item.id)} />) : <p className="sx-muted">{column.empty}</p>}
            </div>
          );
        })}
      </section>

      <section className="sx-card" aria-label="Next 14 days">
        <h2 className="sx-h2">Next 14 days</h2>
        {scheduledCount ? (
          <ol className="sx-cal">
            {days
              .filter((day) => day.entries.length)
              .map((day) => (
                <li key={day.day}>
                  <b>{day.label}</b>
                  <ul>
                    {day.entries.map((entry) => (
                      <li key={`${entry.id}-${entry.channel}`}>
                        <Link href={itemHref(hrefs.studio, entry.id)}>{entry.title}</Link> <span className="sx-chip">{CHANNEL_LABEL[entry.channel]}</span>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
          </ol>
        ) : (
          <p className="sx-muted">Nothing scheduled in the next two weeks. Approve a draft, then pick a date.</p>
        )}
      </section>

      <div className="sx-split">
        <section className="sx-card" aria-label="Email tools">
          <h2 className="sx-h2">Email tools</h2>
          <p className="sx-muted">Subscribers, templates, lead magnets and signup forms. Sending is off.</p>
          <div className="sx-links">
            <Link href={hrefs.email}>Email dashboard</Link>
            <Link href={hrefs.compose}>Compose</Link>
            <Link href={hrefs.magnets}>Lead magnets</Link>
            <Link href={hrefs.forms}>Signup forms</Link>
          </div>
        </section>
        <section className="sx-card" aria-label="Engagement">
          <h2 className="sx-h2">Engagement</h2>
          <p className="sx-muted">
            Likes, comments and warmups are not posts. The bots run them in Operations
            {engagement ? `, with ${engagement.toLocaleString("en-US")} ${engagement === 1 ? "warmup" : "warmups"} on today's list` : ""}.
          </p>
          <div className="sx-links">
            <Link href={hrefs.bots}>Open Operations</Link>
          </div>
        </section>
      </div>

      {studio.items.some((item) => item.archived) ? (
        <p className="sx-muted">{studio.items.filter((item) => item.archived).length.toLocaleString("en-US")} archived.</p>
      ) : null}
    </div>
  );
}

/** Built here, not passed in: functions cannot cross from the server page. */
function itemHref(studio: string, id: string): string {
  return `${studio}/${encodeURIComponent(id)}`;
}

function ItemCard({ item, href }: { item: ContentItem; href: string }) {
  return (
    <Link className="sx-item" href={href}>
      <b>{item.title}</b>
      <span className="sx-meta">
        {SOURCE_LABEL[item.source_kind]}
        {item.source_ref ? ` · ${item.source_ref}` : ""} · {item.owner}
      </span>
      <span className="sx-chips">
        {item.drafts.map((draft) => (
          <span key={draft.channel} className={`sx-chip is-${draft.status}`}>
            {CHANNEL_LABEL[draft.channel]}: {STATUS_LABEL[draft.status]}
          </span>
        ))}
      </span>
      <span className="sx-next">{nextAction(item)}</span>
    </Link>
  );
}
