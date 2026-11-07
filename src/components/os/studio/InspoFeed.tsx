"use client";

import { useState } from "react";
import { KIND_LABEL, type InspoBook, type InspoKind, type InspoPost } from "@/lib/os/inspo/types";

type Filter = "all" | InspoKind;
const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "feed", label: "Newsletters & podcasts" },
  { key: "linkedin", label: "LinkedIn" },
  { key: "x", label: "X" },
];

function ago(at: string): string {
  const days = Math.floor((Date.now() - Date.parse(at)) / 86_400_000);
  if (!Number.isFinite(days) || days < 1) return "today";
  if (days === 1) return "yesterday";
  if (days < 14) return `${days}d ago`;
  return new Date(at).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function compact(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(n >= 10_000 ? 0 : 1)}k` : String(n);
}

/** What top VCs are posting, with one tap to start a draft from any of it. */
export function InspoFeed({ initial, onUse }: { initial: InspoBook; onUse: (post: InspoPost) => void }) {
  const [book, setBook] = useState(initial);
  const [filter, setFilter] = useState<Filter>("all");
  const [who, setWho] = useState<string>("");
  const [shown, setShown] = useState(8);
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [name, setName] = useState("");
  const [link, setLink] = useState("");

  async function post(body: Record<string, unknown>, label: string): Promise<boolean> {
    setBusy(label);
    setNote(null);
    try {
      const res = await fetch("/api/os/inspo", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = (await res.json().catch(() => ({}))) as { error?: string; book?: InspoBook; added?: number; failed?: number };
      if (!res.ok || !data.book) {
        setNote({ tone: "error", text: data.error || "Could not do that." });
        return false;
      }
      setBook(data.book);
      if (body.op === "refresh") setNote({ tone: "ok", text: `${data.added ? `${data.added} new ${data.added === 1 ? "post" : "posts"}` : "Nothing new"}.${data.failed ? ` ${data.failed} ${data.failed === 1 ? "source" : "sources"} couldn't be read; see Who you follow.` : ""}` });
      return true;
    } catch {
      setNote({ tone: "error", text: "No connection. Try again." });
      return false;
    } finally {
      setBusy(null);
    }
  }

  const posts = book.posts.filter((p) => (filter === "all" || p.kind === filter) && (!who || p.source_id === who));
  const waitingOnKey = book.sources.some((s) => s.kind !== "feed" && /APIFY_TOKEN/.test(book.status[s.id]?.note ?? ""));
  const failing = book.sources.filter((s) => book.status[s.id] && !book.status[s.id].ok).length;
  const whoName = book.sources.find((s) => s.id === who)?.name;

  return (
    <section className="sx-card inspo" aria-label="What top VCs are posting">
      <div className="inspo-head">
        <div>
          <h2 className="sx-h2">What top VCs are posting</h2>
          <p className="sx-hint">
            Their newsletters, podcasts, LinkedIn and X, read every morning. Tap <b>Use as an idea</b> to start a draft from any post.
          </p>
        </div>
        <button type="button" className="btn sm" disabled={busy === "refresh"} onClick={() => post({ op: "refresh" }, "refresh")}>
          {busy === "refresh" ? `Reading ${book.sources.length} sources…` : "Refresh now"}
        </button>
      </div>
      {note ? (
        <p className={note.tone === "error" ? "sx-error" : "sx-ok"} role={note.tone === "error" ? "alert" : "status"}>
          {note.text}
        </p>
      ) : null}
      {waitingOnKey ? <p className="sx-hint inspo-key">LinkedIn and X posts start once an Apify key (APIFY_TOKEN) is added in Vercel. Newsletters and podcasts work now.</p> : null}

      <div className="segment sx-wrap inspo-filter" role="group" aria-label="Show posts from">
        {FILTERS.map((row) => (
          <button key={row.key} type="button" aria-pressed={filter === row.key} onClick={() => { setFilter(row.key); setShown(8); }}>
            {row.label}
          </button>
        ))}
      </div>
      {whoName ? (
        <p className="sx-hint">
          Only {whoName}.{" "}
          <button type="button" className="inspo-link" onClick={() => setWho("")}>
            Show everyone
          </button>
        </p>
      ) : null}

      {posts.length ? (
        <ul className="inspo-list">
          {posts.slice(0, shown).map((p, i) => (
            <li key={p.id} className="inspo-post" style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}>
              <p className="inspo-meta">
                <button type="button" className="inspo-who" onClick={() => setWho(p.source_id)} title={`Only ${p.author}`}>
                  {p.author}
                </button>
                <span className={`lead-chip inspo-kind is-${p.kind}`}>{KIND_LABEL[p.kind]}</span>
                <span className="sx-hint">{ago(p.at)}</span>
                {p.likes != null ? <span className="sx-hint">{compact(p.likes)} likes{p.comments != null ? ` · ${compact(p.comments)} comments` : ""}</span> : null}
              </p>
              <b className="inspo-title">{p.title}</b>
              {p.text && p.text !== p.title ? <p className="inspo-text">{p.text}</p> : null}
              <div className="sx-actions">
                <button type="button" className="btn primary sm" onClick={() => onUse(p)}>
                  Use as an idea
                </button>
                {p.url ? (
                  <a className="btn sm" href={p.url} target="_blank" rel="noopener noreferrer">
                    Read it
                  </a>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="sx-muted">{book.last_run ? "No posts here yet." : "Nothing read yet. Tap Refresh now, or wait for the morning read."}</p>
      )}
      {posts.length > shown ? (
        <button type="button" className="btn sm" onClick={() => setShown((n) => n + 12)}>
          Show more ({posts.length - shown})
        </button>
      ) : null}

      <details className="lead-why inspo-who-list">
        <summary>
          Who you follow ({book.sources.length}){failing ? ` · ${failing} not reading` : ""}
        </summary>
        <ul className="inspo-sources">
          {book.sources.map((s) => {
            const st = book.status[s.id];
            return (
              <li key={s.id}>
                <span className={`inspo-dot${st ? (st.ok ? " is-ok" : " is-bad") : ""}`} aria-hidden="true" />
                <span className="inspo-src">
                  <b>{s.name}</b> <span className="sx-hint">{KIND_LABEL[s.kind]}</span>
                  <span className="sx-hint">{st ? st.note : "Not read yet."}</span>
                </span>
                <button type="button" className="btn sm" disabled={busy === `rm:${s.id}`} onClick={() => post({ op: "remove_source", id: s.id }, `rm:${s.id}`)} aria-label={`Remove ${s.name}`}>
                  Remove
                </button>
              </li>
            );
          })}
        </ul>
        <form
          className="inspo-add"
          onSubmit={async (event) => {
            event.preventDefault();
            if (await post({ op: "add_source", name, url: link }, "add")) {
              setName("");
              setLink("");
              setNote({ tone: "ok", text: "Added. They're read on the next refresh." });
            }
          }}
        >
          <label className="sx-field">
            <span className="lbl">Add someone: feed link, LinkedIn profile, or X @handle</span>
            <input value={link} onChange={(event) => setLink(event.target.value)} maxLength={500} placeholder="@HarryStebbings or linkedin.com/in/... or a newsletter's /feed link" />
          </label>
          <label className="sx-field">
            <span className="lbl">Name (optional)</span>
            <input value={name} onChange={(event) => setName(event.target.value)} maxLength={80} placeholder="How it shows in the feed" />
          </label>
          <div className="sx-actions">
            <button type="submit" className="btn sm" disabled={busy === "add" || !link.trim()}>
              Add
            </button>
          </div>
        </form>
      </details>
    </section>
  );
}
