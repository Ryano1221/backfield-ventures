"use client";

import { useEffect, useState } from "react";
import { KIND_LABEL, LEAD_KINDS, type LeadBook, type LeadKind } from "@/lib/os/leads/types";
import { SEARCH_LIMITS, type FindySearch } from "@/lib/os/leads/findymail";

type List = { id: number; name: string };
type State = { ready: boolean; keyNote: string | null; lists: List[]; searches: FindySearch[]; map: Record<string, { kind: LeadKind; name: string }>; credits: { finder: number | null; verifier: number | null; capacity: boolean | null } | null };

/** Ryan's saved Findymail lists. Tagging one pulls its contacts into Leads now and on every daily run. */
export function FindymailPanel({ onBook }: { onBook: (book: LeadBook) => void }) {
  const [state, setState] = useState<State | null>(null);
  const [busy, setBusy] = useState<number | null>(null);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  useEffect(() => {
    let live = true;
    fetch("/api/os/findymail")
      .then(async (res) => {
        const data = (await res.json().catch(() => ({}))) as Partial<State> & { error?: string; key_note?: string | null };
        if (!live) return;
        if (!res.ok) setMessage({ tone: "error", text: [data.error || `Findymail answered ${res.status}.`, data.key_note].filter(Boolean).join(" ") });
        else setState({ ready: Boolean(data.ready), keyNote: data.key_note ?? null, lists: data.lists ?? [], searches: data.searches ?? [], map: data.map ?? {}, credits: data.credits ?? null });
      })
      .catch(() => live && setMessage({ tone: "error", text: "This page lost its connection to the OS before Findymail was checked. Reload to try again." }));
    return () => {
      live = false;
    };
  }, []);

  async function tag(list: List, kind: LeadKind | null) {
    setBusy(list.id);
    setMessage(null);
    try {
      const res = await fetch("/api/os/findymail", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ list_id: list.id, name: list.name, kind }) });
      const data = (await res.json().catch(() => ({}))) as { error?: string; map?: State["map"]; added?: number; book?: LeadBook };
      if (data.map) setState((current) => (current ? { ...current, map: data.map! } : current));
      if (data.book) onBook(data.book);
      if (!res.ok) setMessage({ tone: "error", text: data.error || "Could not save that." });
      else setMessage({ tone: "ok", text: kind ? `${list.name}: ${data.added ?? 0} new ${KIND_LABEL[kind].toLowerCase()} added. New contacts come in every day.` : `${list.name} no longer feeds Leads.` });
    } catch {
      setMessage({ tone: "error", text: "No connection. Nothing was saved." });
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="sx-card autopilot" aria-label="Findymail">
      <div>
        <h2 className="lead-name">Findymail</h2>
        <p className="sx-hint">
          {state?.ready
            ? `Finds emails for new leads and checks each address before autopilot's first email.${state.credits?.finder != null ? ` ${state.credits.finder} finder and ${state.credits.verifier ?? 0} verifier credits left.` : ""}`
            : state
              ? "Not connected. Add FINDYMAIL_API_KEY in Vercel to find and verify emails and pull in your lists."
              : "Loading…"}
        </p>
      </div>
      {state?.keyNote ? <p className="sx-hint">{state.keyNote}</p> : null}
      {message ? (
        <p className={message.tone === "error" ? "sx-error" : "sx-ok"} role={message.tone === "error" ? "alert" : "status"}>
          {message.text}
        </p>
      ) : null}
      {state?.ready && state.lists.length ? (
        <ul className="autopilot-list">
          {state.lists.map((list) => {
            const current = state.map[String(list.id)]?.kind ?? null;
            return (
              <li key={list.id}>
                <b>{list.name}</b>
                <div className="segment sx-wrap" role="group" aria-label={`Use ${list.name} as`}>
                  {LEAD_KINDS.map((kind) => (
                    <button key={kind} type="button" aria-pressed={current === kind} disabled={busy === list.id} onClick={() => tag(list, kind)}>
                      {KIND_LABEL[kind]}
                    </button>
                  ))}
                  <button type="button" aria-pressed={current === null} disabled={busy === list.id} onClick={() => tag(list, null)}>
                    Off
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      ) : state?.ready ? (
        <p className="sx-hint">No saved lists in Findymail yet.</p>
      ) : null}
      {state?.ready ? <Searches searches={state.searches} onSearches={(searches) => setState((current) => (current ? { ...current, searches } : current))} /> : null}
    </section>
  );
}

/** Saved plain-language searches. Each runs weekly; results arrive as leads with verified emails. */
function Searches({ searches, onSearches }: { searches: FindySearch[]; onSearches: (searches: FindySearch[]) => void }) {
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<LeadKind>("lp");
  const [titles, setTitles] = useState("");
  const [limit, setLimit] = useState<number>(25);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Findymail's prices: 1 credit per 10 companies, plus 1 per contact and 1 per email.
  const credits = Math.ceil(limit / 10) + limit * 2;

  async function post(body: Record<string, unknown>): Promise<boolean> {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/os/findymail", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = (await res.json().catch(() => ({}))) as { error?: string; searches?: FindySearch[] };
      if (!res.ok || !data.searches) {
        setError(data.error || "Could not save that.");
        return false;
      }
      onSearches(data.searches);
      return true;
    } catch {
      setError("No connection. Nothing was saved.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="lead-to">
      <span className="lbl">Saved searches</span>
      {searches.length ? (
        <ul className="autopilot-list">
          {searches.map((search) => (
            <li key={search.id}>
              <span>
                <b>{search.query}</b> · {KIND_LABEL[search.kind]} · up to {search.limit}
              </span>
              <span className="sx-hint">{search.note}</span>
              <button type="button" className="btn sm" disabled={busy} onClick={() => post({ op: "search_remove", id: search.id })}>
                Remove
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="sx-hint">Describe who you want in plain words. Findymail finds matching companies, the right person and a verified email, every week.</p>
      )}
      <form
        className="lead-edit"
        onSubmit={async (event) => {
          event.preventDefault();
          if (await post({ op: "search_add", query, kind, titles, limit })) {
            setQuery("");
            setTitles("");
          }
        }}
      >
        <label className="sx-field">
          <span className="lbl">Who to find</span>
          <input value={query} onChange={(event) => setQuery(event.target.value)} maxLength={300} placeholder="Single family offices in Texas" />
        </label>
        <label className="sx-field">
          <span className="lbl">Job titles (optional, comma separated)</span>
          <input value={titles} onChange={(event) => setTitles(event.target.value)} maxLength={300} placeholder="Principal, Founder, Chief Investment Officer" />
        </label>
        <div className="segment sx-wrap" role="group" aria-label="Search finds">
          {LEAD_KINDS.map((value) => (
            <button key={value} type="button" aria-pressed={kind === value} onClick={() => setKind(value)}>
              {KIND_LABEL[value]}
            </button>
          ))}
        </div>
        <div className="segment sx-wrap" role="group" aria-label="Companies per week">
          {SEARCH_LIMITS.map((value) => (
            <button key={value} type="button" aria-pressed={limit === value} onClick={() => setLimit(value)}>
              {value} a week
            </button>
          ))}
        </div>
        <p className="sx-hint">About {credits} Findymail credits a week for this search.</p>
        {error ? (
          <p className="sx-error" role="alert">
            {error}
          </p>
        ) : null}
        <div className="sx-actions">
          <button type="submit" className="btn primary" disabled={busy || query.trim().length < 8}>
            Save search
          </button>
        </div>
      </form>
    </div>
  );
}
