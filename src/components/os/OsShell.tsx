"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { FinderItem } from "@/lib/os/finder";
import { snoozeUntil } from "@/lib/os/snooze";
import type { ActionPayload, ActionType, OsAction } from "@/lib/os/types";
import type { OsSection } from "@/lib/os/nav";
import { OsActions } from "./OsActions";

type Queued = {
  batch: string;
  idempotency_key: string;
  type: ActionType;
  target_id: string;
  payload: ActionPayload;
  created_at: string;
  label: string;
};

type Toast = { id: string; label: string; undo: boolean };

type Draft = {
  type: ActionType;
  target_id: string;
  payload: ActionPayload;
  label: string;
  singleton?: boolean;
};

type OsApi = {
  actions: OsAction[];
  paletteOpen: boolean;
  enqueue: (draft: Draft) => void;
  enqueueMany: (drafts: Draft[], label: string) => void;
};

const Ctx = createContext<OsApi | null>(null);

export function useOsActions(): OsApi {
  const value = useContext(Ctx);
  if (!value) throw new Error("Actions are only available inside the dashboard shell");
  return value;
}

const SINGLETON = new Set<ActionType>([
  "decide",
  "pitch_status",
  "crm_stage",
  "crm_hold",
  "crm_dnc",
  "bot_pause",
  "bot_resume",
  "snooze",
]);

export function OsShell({
  active,
  links,
  loginPath,
  updated,
  updatedDetail,
  initialActions,
  finder,
  children,
}: {
  active: OsSection;
  links: { id: OsSection; label: string; href: string }[];
  loginPath: string;
  updated: string;
  updatedDetail: string;
  initialActions: OsAction[];
  finder: FinderItem[];
  children: ReactNode;
}) {
  const [actions, setActions] = useState(initialActions);
  const [queued, setQueued] = useState<Queued[]>([]);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState<FinderItem | null>(null);
  const [tell, setTell] = useState("");
  const [ask, setAsk] = useState("");
  const [stage, setStage] = useState("");
  const queuedRef = useRef<Queued[]>([]);
  const timers = useRef(new Map<string, number>());
  const chain = useRef(Promise.resolve());

  useEffect(() => {
    setActions(initialActions);
  }, [initialActions]);

  const visible = useMemo<OsAction[]>(
    () => [
      ...actions,
      ...queued.map((item) => ({
        action_id: `local:${item.idempotency_key}`,
        type: item.type,
        target_id: item.target_id,
        payload: item.payload,
        created_at: item.created_at,
        idempotency_key: item.idempotency_key,
        acked_at: null,
        result: null,
        status: "pending" as const,
      })),
    ],
    [actions, queued],
  );

  const commitBatch = useCallback((batch: string) => {
    const timer = timers.current.get(batch);
    if (timer) window.clearTimeout(timer);
    timers.current.delete(batch);
    const items = queuedRef.current.filter((item) => item.batch === batch);
    queuedRef.current = queuedRef.current.filter((item) => item.batch !== batch);
    setQueued(queuedRef.current);
    setToasts((current) => current.filter((toast) => toast.id !== batch));
    if (!items.length) return;
    chain.current = chain.current.then(async () => {
      for (const item of items) {
        const ok = await postAction(item);
        if (ok.action) {
          setActions((current) => (current.some((action) => action.action_id === ok.action?.action_id) ? current : [...current, ok.action!]));
        } else if (ok.error) {
          setToasts((current) => [...current, { id: item.idempotency_key, label: ok.error || "Could not save that.", undo: false }]);
        }
      }
      setToasts((current) => [...current, { id: `${batch}-done`, label: "Pending.", undo: false }]);
      window.setTimeout(() => setToasts((current) => current.filter((toast) => toast.id !== `${batch}-done`)), 2000);
    });
  }, []);

  const undo = useCallback((batch: string) => {
    const timer = timers.current.get(batch);
    if (timer) window.clearTimeout(timer);
    timers.current.delete(batch);
    queuedRef.current = queuedRef.current.filter((item) => item.batch !== batch);
    setQueued(queuedRef.current);
    setToasts((current) => current.filter((toast) => toast.id !== batch));
  }, []);

  const queue = useCallback(
    (drafts: Draft[], label: string) => {
      const rows = drafts.filter((draft) => {
        const singleton = draft.singleton ?? SINGLETON.has(draft.type);
        if (!singleton) return true;
        return !queuedRef.current.some((item) => item.type === draft.type && item.target_id === draft.target_id);
      });
      if (!rows.length) return;
      const batch = crypto.randomUUID();
      const items: Queued[] = rows.map((draft) => ({
        batch,
        idempotency_key: crypto.randomUUID(),
        type: draft.type,
        target_id: draft.target_id,
        payload: draft.payload,
        created_at: new Date().toISOString(),
        label,
      }));
      queuedRef.current = [...queuedRef.current, ...items];
      setQueued(queuedRef.current);
      setToasts((current) => [...current, { id: batch, label, undo: true }]);
      timers.current.set(batch, window.setTimeout(() => commitBatch(batch), 10_000));
    },
    [commitBatch],
  );

  useEffect(() => {
    const flush = () => commitBatchAll();
    window.addEventListener("pagehide", flush);
    return () => {
      window.removeEventListener("pagehide", flush);
      flush();
    };
    function commitBatchAll() {
      const batches = [...new Set(queuedRef.current.map((item) => item.batch))];
      batches.forEach((batch) => commitBatch(batch));
    }
  }, [commitBatch]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPaletteOpen((open) => !open);
        setPicked(null);
      } else if (event.key === "Escape") {
        setPaletteOpen(false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const matches = finder
    .filter((item) => {
      const q = query.trim().toLowerCase();
      if (!q) return true;
      return `${item.title} ${item.hint}`.toLowerCase().includes(q);
    })
    .slice(0, 12);

  function run(draft: Draft) {
    queue([draft], draft.label);
    setPaletteOpen(false);
  }

  return (
    <Ctx.Provider value={{ actions: visible, paletteOpen, enqueue: (draft) => queue([draft], draft.label), enqueueMany: queue }}>
      <header className="os-bar">
        <div className="os-bar-inner">
          <a className="os-mark" href={links.find((link) => link.id === "today")?.href || "/os"}>
            <img src="/brand/backfield-ventures-logo-black.png" alt="Backfield Ventures" className="os-wordmark" />
          </a>
          <nav className="os-nav" aria-label="Dashboard">
            {links.map((link) => (
              <a key={link.id} href={link.href} aria-current={active === link.id ? "page" : undefined}>
                {link.label}
              </a>
            ))}
          </nav>
          <button type="button" className="os-cmd" onClick={() => setPaletteOpen(true)}>
            Search
          </button>
          <div className="os-bar-meta">
            <p className="os-kicker">Updated</p>
            <strong>{updated}</strong>
            <span>{updatedDetail}</span>
          </div>
          <OsActions loginPath={loginPath} />
        </div>
      </header>
      <main className="os-page">
        {children}
        <form
          className="os-tell"
          onSubmit={(event) => {
            event.preventDefault();
            const text = tell.trim();
            if (!text) return;
            queue([{ type: "free_text", target_id: "executive", payload: { text }, label: "Told BV Executive." }], "Told BV Executive.");
            setTell("");
          }}
        >
          <label htmlFor="tell-exec">Tell BV Executive</label>
          <input id="tell-exec" value={tell} onChange={(event) => setTell(event.target.value)} maxLength={2000} placeholder="A request for the office" />
          <button type="submit" disabled={!tell.trim()}>
            Queue
          </button>
          <p className="os-fine">This queues a request. Nothing sends from this site.</p>
        </form>
      </main>
      {paletteOpen ? (
        <div className="os-palette" role="dialog" aria-modal="true" aria-label="Command bar">
          <button type="button" className="os-drawer-back" aria-label="Close search" onClick={() => setPaletteOpen(false)} />
          <div className="os-palette-card">
            <input
              autoFocus
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setPicked(null);
              }}
              placeholder="People, companies, bots, decisions"
              aria-label="Search the office"
            />
            {picked ? (
              <div className="os-palette-actions">
                <p className="os-need-title">{picked.title}</p>
                <p className="os-quiet">{picked.hint}</p>
                {picked.kind === "decision" ? (
                  <div className="os-choice-row">
                    <button type="button" onClick={() => run({ type: "decide", target_id: picked.id, payload: { choice: "approve" }, label: `Approved ${picked.title}.` })}>
                      Approve
                    </button>
                    <button type="button" onClick={() => run({ type: "decide", target_id: picked.id, payload: { choice: "skip" }, label: `Skipped ${picked.title}.` })}>
                      Skip
                    </button>
                  </div>
                ) : null}
                {picked.kind === "company" ? (
                  <div className="os-choice-row">
                    <button type="button" onClick={() => run({ type: "pitch_status", target_id: picked.id, payload: { intent: "take_call", status: "advanced" }, label: `Take a call with ${picked.title}.` })}>Take a call</button>
                    <button type="button" onClick={() => run({ type: "pitch_status", target_id: picked.id, payload: { intent: "watch", status: "reviewing" }, label: `Watching ${picked.title}.` })}>Watch</button>
                    <button type="button" onClick={() => run({ type: "pitch_status", target_id: picked.id, payload: { intent: "pass", status: "passed" }, label: `Passed on ${picked.title}.` })}>Pass</button>
                    <button type="button" onClick={() => run({ type: "pitch_status", target_id: picked.id, payload: { intent: "ask_memo" }, label: `Asked for a memo on ${picked.title}.` })}>Ask for memo</button>
                  </div>
                ) : null}
                {picked.kind === "person" ? (
                  <div className="os-stack">
                    <div className="os-choice-row">
                      <input value={stage} onChange={(event) => setStage(event.target.value)} placeholder="Stage" aria-label="Stage" />
                      <button type="button" disabled={!stage.trim()} onClick={() => run({ type: "crm_stage", target_id: picked.id, payload: { stage: stage.trim() }, label: `Stage set for ${picked.title}.` })}>Set stage</button>
                      <button type="button" onClick={() => run({ type: "crm_hold", target_id: picked.id, payload: { hold: true }, label: `Holding ${picked.title}.` })}>Hold contact</button>
                    </div>
                  </div>
                ) : null}
                {picked.kind === "bot" ? (
                  <div className="os-stack">
                    <div className="os-choice-row">
                      <button type="button" onClick={() => run({ type: "bot_pause", target_id: picked.id, payload: {}, label: `Paused ${picked.title}.` })}>Pause</button>
                      <button type="button" onClick={() => run({ type: "bot_resume", target_id: picked.id, payload: {}, label: `Resumed ${picked.title}.` })}>Resume</button>
                    </div>
                    <div className="os-choice-row">
                      <input value={ask} onChange={(event) => setAsk(event.target.value)} placeholder="Ask this bot to..." aria-label="Ask this bot" />
                      <button type="button" disabled={!ask.trim()} onClick={() => run({ type: "bot_request", target_id: picked.id, payload: { text: ask.trim() }, label: `Asked ${picked.title}.`, singleton: false })}>Ask</button>
                    </div>
                  </div>
                ) : null}
                <button type="button" className="os-floor-btn" onClick={() => run({ type: "snooze", target_id: picked.id, payload: { until: snoozeUntil("tomorrow") }, label: `Snoozed ${picked.title} until tomorrow.` })}>
                  Snooze until tomorrow
                </button>
              </div>
            ) : (
              <ul className="os-palette-list">
                {matches.map((item) => (
                  <li key={`${item.kind}-${item.id}`}>
                    <button type="button" onClick={() => setPicked(item)}>
                      <span>{item.title}</span>
                      <span className="os-quiet">{item.hint || item.kind}</span>
                    </button>
                  </li>
                ))}
                {matches.length === 0 ? <li className="os-quiet">No matches.</li> : null}
              </ul>
            )}
          </div>
        </div>
      ) : null}
      <div className="os-toasts" aria-live="polite">
        {toasts.map((toast) => (
          <div className="os-toast" key={toast.id} role="status">
            <span>{toast.label}</span>
            {toast.undo ? (
              <button type="button" onClick={() => undo(toast.id)}>
                Undo
              </button>
            ) : null}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );

  async function postAction(item: Queued): Promise<{ action?: OsAction; error?: string }> {
    try {
      const res = await fetch("/api/os/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: item.type,
          target_id: item.target_id,
          payload: item.payload,
          idempotency_key: item.idempotency_key,
        }),
      });
      if (res.status === 409) return { error: "Already answered." };
      if (!res.ok) return { error: "Could not save that." };
      const body = (await res.json()) as { action?: OsAction };
      return { action: body.action };
    } catch {
      return { error: "Could not save that." };
    }
  }
}
