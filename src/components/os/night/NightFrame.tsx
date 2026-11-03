"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { FinderItem } from "@/lib/os/finder";
import { osHrefs } from "@/lib/os/nav";
import type { ActionPayload, ActionType, OsAction } from "@/lib/os/types";

type Queued = {
  batch: string;
  idempotency_key: string;
  type: ActionType;
  target_id: string;
  payload: ActionPayload;
  created_at: string;
};

type Draft = {
  type: ActionType;
  target_id: string;
  payload: ActionPayload;
  label: string;
};

type NightApi = {
  actions: OsAction[];
  enqueue: (draft: Draft) => void;
};

const Ctx = createContext<NightApi | null>(null);

export function useNightActions(): NightApi {
  const value = useContext(Ctx);
  if (!value) throw new Error("Actions are only available inside the dashboard");
  return value;
}

const SINGLETON = new Set<ActionType>(["decide", "pitch_status", "crm_stage", "crm_hold", "crm_dnc", "bot_pause", "bot_resume", "snooze"]);

type Section = "today" | "deals" | "people" | "bots" | "activity";

export function NightFrame({
  active,
  onOs,
  counts,
  stamp,
  stale = false,
  initialActions,
  finder,
  children,
}: {
  active: Section;
  onOs: boolean;
  counts: { today: number | null; deals: number | null; people: number | null };
  stamp: string | null;
  stale?: boolean;
  initialActions: OsAction[];
  finder: FinderItem[];
  children: ReactNode;
}) {
  const [actions, setActions] = useState(initialActions);
  const [queued, setQueued] = useState<Queued[]>([]);
  const [toasts, setToasts] = useState<{ id: string; label: string; undo: boolean }[]>([]);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const queuedRef = useRef<Queued[]>([]);
  const timers = useRef(new Map<string, number>());
  const chain = useRef(Promise.resolve());

  useEffect(() => setActions(initialActions), [initialActions]);

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
        if (ok.action) setActions((current) => (current.some((action) => action.action_id === ok.action?.action_id) ? current : [...current, ok.action!]));
        else if (ok.error) setToasts((current) => [...current, { id: item.idempotency_key, label: ok.error || "Could not save that.", undo: false }]);
      }
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

  const enqueue = useCallback(
    (draft: Draft) => {
      if (SINGLETON.has(draft.type) && queuedRef.current.some((item) => item.type === draft.type && item.target_id === draft.target_id)) return;
      const batch = crypto.randomUUID();
      const item: Queued = {
        batch,
        idempotency_key: crypto.randomUUID(),
        type: draft.type,
        target_id: draft.target_id,
        payload: draft.payload,
        created_at: new Date().toISOString(),
      };
      queuedRef.current = [...queuedRef.current, item];
      setQueued(queuedRef.current);
      setToasts((current) => [...current, { id: batch, label: draft.label, undo: true }]);
      timers.current.set(batch, window.setTimeout(() => commitBatch(batch), 10_000));
    },
    [commitBatch],
  );

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((value) => !value);
      } else if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const hrefs = osHrefs(onOs);
  const links: { id: Section; label: string; href: string; count: number | null; hot?: boolean }[] = [
    { id: "today", label: "Today", href: hrefs.today, count: counts.today, hot: true },
    { id: "deals", label: "Deals", href: hrefs.deals, count: counts.deals },
    { id: "people", label: "People", href: hrefs.people, count: counts.people },
    { id: "bots", label: "Bots", href: hrefs.bots, count: null },
  ];

  const q = query.trim().toLowerCase();
  const matches = finder
    .filter((item) => !q || `${item.title} ${item.hint}`.toLowerCase().includes(q))
    .slice(0, 12);

  async function signOut() {
    await fetch("/api/os/logout", { method: "POST" });
    window.location.assign(hrefs.login);
  }

  return (
    <Ctx.Provider value={{ actions: visible, enqueue }}>
      <div className="shell">
        <aside className="rail">
          <div className="v">Backfield Ventures · OS · Private</div>
        </aside>
        <div>
          <header className="top">
            <a className="brand" href={hrefs.today}>
              <img src="/brand/logo-cream.png" alt="Backfield Ventures" />
            </a>
            <nav>
              {links.map((link) => (
                <a key={link.id} href={link.href} className={active === link.id ? "on" : ""}>
                  {link.label}
                  {link.count != null ? <span className={`c${link.hot && link.count > 0 ? " hot" : ""}`}>{link.count.toLocaleString("en-US")}</span> : null}
                </a>
              ))}
            </nav>
            <div className="right">
              <button type="button" className="search" onClick={() => setOpen(true)}>
                <SearchIcon />
                <span>Search people, deals, bots</span>
                <kbd>⌘K</kbd>
              </button>
              {stamp ? (
                <span className="lbl stamp">
                  <i className={`dot${stale ? " wait" : ""}`} />
                  Updated {stamp.replace(/,\s*\d{4}/, "")}
                </span>
              ) : (
                <span className="lbl stamp">Waiting on the first ingest</span>
              )}
            </div>
          </header>
          <main className="main">
            {children}
            <div className="foot lbl">
              <span>
                Backfield OS · private to Ryan ·{" "}
                <button type="button" onClick={signOut}>
                  Sign out
                </button>
              </span>
              <span>{stamp ? `Snapshot ${stamp}` : "No snapshot yet"}</span>
            </div>
          </main>
        </div>
      </div>
      <nav className="mnav">
        {links.map((link) => (
          <a key={link.id} href={link.href} className={active === link.id ? "on" : ""}>
            {link.label}
            {link.hot && link.count ? <span className="b">{link.count}</span> : null}
          </a>
        ))}
      </nav>
      {open ? (
        <div className="palette" role="dialog" aria-modal="true" aria-label="Search">
          <div className="palette-card">
            <input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search people, deals, bots"
              aria-label="Search people, deals, bots"
            />
            <ul>
              {matches.map((item) => (
                <li key={`${item.kind}-${item.id}`}>
                  <a href={finderHref(item, hrefs)} onClick={() => setOpen(false)}>
                    <span>{item.title}</span>
                    <span className="muted">{item.hint || item.kind}</span>
                  </a>
                </li>
              ))}
              {matches.length === 0 ? <li className="muted" style={{ padding: 16 }}>No matches.</li> : null}
            </ul>
          </div>
        </div>
      ) : null}
      <div className="toasts" aria-live="polite">
        {toasts.map((toast) => (
          <div className="toast" key={toast.id} role="status">
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
}

function finderHref(item: FinderItem, hrefs: ReturnType<typeof osHrefs>): string {
  if (item.kind === "person") return hrefs.person(item.id);
  if (item.kind === "decision") return hrefs.decision(item.id);
  if (item.kind === "company") return `${hrefs.deals}#${encodeURIComponent(item.id)}`;
  return hrefs.bots;
}

function SearchIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <circle cx="7" cy="7" r="5" />
      <path d="M11 11l3.5 3.5" />
    </svg>
  );
}

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
