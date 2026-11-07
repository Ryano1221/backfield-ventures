"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
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
import type { InspoBook, InspoPost } from "@/lib/os/inspo/types";
import { InspoFeed } from "./InspoFeed";
import { saveStudio } from "./save";

type Hrefs = { studio: string; email: string; compose: string; magnets: string; forms: string; bots: string };

const COLUMNS: { status: DraftStatus; title: string; empty: string }[] = [
  { status: "draft", title: "Being written", empty: "Nothing being written." },
  { status: "review", title: "Waiting on Ryan", empty: "Nothing waiting on you." },
  { status: "approved", title: "Approved, needs a date", empty: "Nothing approved without a date." },
  { status: "scheduled", title: "Scheduled", empty: "Nothing scheduled." },
  { status: "published", title: "Published", empty: "Nothing published yet. Publishing is off." },
];

export function StudioDesk({ initial, hrefs, now, engagement, inspo }: { initial: Studio; hrefs: Hrefs; now: number; engagement: number; inspo: InspoBook }) {
  const router = useRouter();
  const [studio] = useState(initial);
  const [more, setMore] = useState(false);
  const ideaRef = useRef<HTMLTextAreaElement>(null);
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

  // "Use as an idea" on a VC post: start a draft from it, with the link kept as the source.
  function useAsIdea(post: InspoPost) {
    setTitle(`${post.title}`.slice(0, 160));
    setKind("research");
    setRef(post.url || post.author);
    setBrief(`Inspired by ${post.author}: "${post.text.slice(0, 400)}${post.text.length > 400 ? "..." : ""}"\n\nOur angle (sports and consumer brands): `);
    setMore(true);
    requestAnimationFrame(() => {
      const box = ideaRef.current;
      box?.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "center" });
      box?.focus({ preventScroll: true });
    });
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
          <p className="lede">Write one idea and get a draft for your newsletter, LinkedIn and X. You edit and approve every word. Nothing posts by itself.</p>
        </div>
      </div>
      <ol className="sx-steps" aria-label="How it works">
        <li><b>1</b> Write the idea</li>
        <li><b>2</b> Edit each draft</li>
        <li><b>3</b> Approve and pick a date</li>
      </ol>

      <form className="sx-card sx-new" onSubmit={create}>
        <label className="sx-field">
          <span className="lbl">Idea</span>
          <textarea ref={ideaRef} className="sx-idea" value={title} onChange={(event) => setTitle(event.target.value.replace(/\n/g, " "))} maxLength={160} rows={2} placeholder="One line is enough. Example: why athletes make great angel investors" required />
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
        <details className="sx-more" open={more} onToggle={(event) => setMore((event.target as HTMLDetailsElement).open)}>
          <summary>More options: source, notes for the writer, newsletter layout</summary>
          <div className="sx-more-body">
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
              <span className="lbl">Link or name (optional)</span>
              <input value={ref} onChange={(event) => setRef(event.target.value)} maxLength={300} placeholder="Company, person, link, or event" />
            </label>
            <label className="sx-field">
              <span className="lbl">Notes for the writer (optional)</span>
              <textarea value={brief} onChange={(event) => setBrief(event.target.value)} maxLength={4000} rows={4} placeholder="The point, who it's for, and anything it must say or avoid" />
            </label>
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
          </div>
        </details>
        {error ? <p className="sx-error" role="alert">{error}</p> : null}
        <div className="sx-actions">
          <button type="submit" className="btn primary" disabled={busy || !title.trim() || !channels.length}>
            {busy ? "Saving…" : "Create drafts"}
          </button>
          {!channels.length ? <span className="sx-hint">Pick at least one channel.</span> : null}
        </div>
      </form>

      <InspoFeed initial={inspo} onUse={useAsIdea} />

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
        <ol className="sx-strip" aria-label="Two-week calendar">
          {days.map((day, i) => {
            const date = new Date(`${day.day}T12:00:00Z`);
            return (
              <li key={day.day} className={`${day.entries.length ? "has" : ""}${i === 0 ? " is-today" : ""}`}>
                <span className="sx-strip-wd">{date.toLocaleDateString("en-US", { weekday: "narrow", timeZone: "UTC" })}</span>
                <b>{date.getUTCDate()}</b>
                <span className="sx-strip-marks">
                  {day.entries.slice(0, 3).map((entry) => (
                    <i key={`${entry.id}-${entry.channel}`} className={`ch-${entry.channel}`} title={`${entry.title}: ${CHANNEL_LABEL[entry.channel]}`} />
                  ))}
                </span>
                <span className="sr-only">
                  {day.label}: {day.entries.length ? day.entries.map((entry) => `${entry.title} on ${CHANNEL_LABEL[entry.channel]}`).join(", ") : "nothing scheduled"}
                </span>
              </li>
            );
          })}
        </ol>
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
