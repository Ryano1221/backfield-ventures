"use client";

import { useEffect, useState } from "react";
import { KIND_LABEL, LEAD_KINDS, type LeadBook, type LeadKind } from "@/lib/os/leads/types";

type List = { id: number; name: string };
type State = { ready: boolean; lists: List[]; map: Record<string, { kind: LeadKind; name: string }>; credits: { finder: number | null; verifier: number | null; capacity: boolean | null } | null };

/** Ryan's saved Findymail lists. Tagging one pulls its contacts into Leads now and on every daily run. */
export function FindymailPanel({ onBook }: { onBook: (book: LeadBook) => void }) {
  const [state, setState] = useState<State | null>(null);
  const [busy, setBusy] = useState<number | null>(null);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  useEffect(() => {
    let live = true;
    fetch("/api/os/findymail")
      .then(async (res) => {
        const data = (await res.json().catch(() => ({}))) as Partial<State> & { error?: string };
        if (!live) return;
        if (!res.ok) setMessage({ tone: "error", text: data.error || "Findymail could not be reached." });
        else setState({ ready: Boolean(data.ready), lists: data.lists ?? [], map: data.map ?? {}, credits: data.credits ?? null });
      })
      .catch(() => live && setMessage({ tone: "error", text: "Findymail could not be reached." }));
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
    </section>
  );
}
