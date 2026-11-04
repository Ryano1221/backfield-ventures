"use client";

import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { FinderItem } from "@/lib/os/finder";
import { osHrefs } from "@/lib/os/nav";
import { isPitchRating, rateKey } from "@/lib/os/pitch-rate";
import type { ActionPayload, ActionType, OsAction } from "@/lib/os/types";
import { waitingActions } from "@/lib/os/waiting";

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
  submit: (draft: Draft) => void;
  retry: (targetId: string) => void;
  inflight: Record<string, boolean>;
  errors: Record<string, string>;
  reportToday: (count: number | null) => void;
};

const Ctx = createContext<NightApi | null>(null);

export function useNightActions(): NightApi {
  const value = useContext(Ctx);
  if (!value) throw new Error("Actions are only available inside the dashboard");
  return value;
}

const SINGLETON = new Set<ActionType>(["decide", "pitch_status", "crm_stage", "crm_hold", "crm_dnc", "bot_pause", "bot_resume", "snooze"]);

type Section = "today" | "deals" | "people" | "bots" | "activity" | "email" | "waiting";

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
  counts: { today: number | null; deals: number | null; people: number | null; bots?: number | null };
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
  const [menu, setMenu] = useState(false);
  const [inflight, setInflight] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [liveToday, setLiveToday] = useState<number | null>(null);
  const drafts = useRef(new Map<string, Draft & { key: string }>());
  const inflightRef = useRef<Record<string, boolean>>({});
  const router = useRouter();
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

  const submit = useCallback((draft: Draft) => {
    const id = draft.target_id;
    if (inflightRef.current[id]) return;
    const key = actionKey(draft, drafts.current.get(id)?.key);
    const saved = { ...draft, key };
    drafts.current.set(id, saved);
    inflightRef.current = { ...inflightRef.current, [id]: true };
    setInflight(inflightRef.current);
    setErrors((current) => {
      if (!current[id]) return current;
      const next = { ...current };
      delete next[id];
      return next;
    });
    const item: Queued = {
      batch: id,
      idempotency_key: key,
      type: saved.type,
      target_id: id,
      payload: saved.payload,
      created_at: new Date().toISOString(),
    };
    void postAction(item).then((ok) => {
      const next = { ...inflightRef.current };
      delete next[id];
      inflightRef.current = next;
      setInflight(next);
      if (ok.action) {
        setActions((current) => (current.some((action) => action.action_id === ok.action?.action_id) ? current : [...current, ok.action!]));
        setErrors((current) => {
          if (!current[id]) return current;
          const copy = { ...current };
          delete copy[id];
          return copy;
        });
        router.refresh();
        return;
      }
      setErrors((current) => ({ ...current, [id]: ok.error || "Could not save that." }));
    });
  }, [router]);

  const retry = useCallback(
    (targetId: string) => {
      const draft = drafts.current.get(targetId);
      if (draft) submit(draft);
    },
    [submit],
  );

  const reportToday = useCallback((count: number | null) => {
    setLiveToday(count);
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
      } else if (event.key === "Escape") {
        setOpen(false);
        setMenu(false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!menu) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [menu]);

  useEffect(() => {
    const root = document.documentElement;
    const vv = window.visualViewport;
    if (!vv) return;
    const sync = () => {
      const overlap = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      root.style.setProperty("--keyboard", overlap > 80 ? `${Math.round(overlap)}px` : "0px");
    };
    sync();
    vv.addEventListener("resize", sync);
    vv.addEventListener("scroll", sync);
    return () => {
      vv.removeEventListener("resize", sync);
      vv.removeEventListener("scroll", sync);
      root.style.removeProperty("--keyboard");
    };
  }, []);

  const hrefs = osHrefs(onOs);
  const waitingCount = waitingActions(actions).length;
  const links: { id: Section; label: string; href: string; count: number | null }[] = [
    { id: "today", label: "Today", href: hrefs.today, count: liveToday ?? counts.today },
    { id: "waiting", label: "Waiting", href: hrefs.waiting, count: waitingCount },
    { id: "deals", label: "Deals", href: hrefs.deals, count: counts.deals },
    { id: "people", label: "People", href: hrefs.people, count: counts.people },
    { id: "bots", label: "Bots", href: hrefs.bots, count: counts.bots ?? null },
    { id: "email", label: "Email", href: hrefs.email, count: null },
  ];
  const pageLabel = links.find((link) => link.id === active)?.label ?? "Activity";

  useEffect(() => {
    document.body.classList.toggle("os-cover", menu || open);
    return () => document.body.classList.remove("os-cover");
  }, [menu, open]);

  const q = query.trim().toLowerCase();
  const matches = finder
    .filter((item) => !q || `${item.title} ${item.hint}`.toLowerCase().includes(q))
    .slice(0, 12);

  async function signOut() {
    await fetch("/api/os/logout", { method: "POST" });
    window.location.assign(hrefs.login);
  }

  return (
    <Ctx.Provider value={{ actions: visible, enqueue, submit, retry, inflight, errors, reportToday }}>
      <header className="mbar">
        <a href={hrefs.today}>
          <img src="/brand/logo-cream.png" alt="Backfield Ventures" />
        </a>
        <div className="mbar-actions">
          <button type="button" className="search-icon" aria-label="Search" onClick={() => setOpen(true)}>
            <SearchIcon />
          </button>
          <button type="button" className="menu-btn" aria-expanded={menu} aria-controls="os-menu" onClick={() => setMenu(true)}>
            <i />
            Menu
          </button>
        </div>
      </header>
      <div className="shell">
        <aside className="rail">
          <a className="brand" href={hrefs.today}>
            <img src="/brand/logo-cream.png" alt="Backfield Ventures" />
          </a>
          <div className="sub lbl">OS · {pageLabel}</div>
          <nav>
            {links.map((link) => (
              <a key={link.id} href={link.href} className={active === link.id ? "on" : ""} aria-current={active === link.id ? "page" : undefined}>
                {link.label}
                {link.count != null ? <span className="c">{link.count.toLocaleString("en-US")}</span> : null}
              </a>
            ))}
          </nav>
          <div className="rail-foot lbl">
            <button type="button" onClick={signOut}>
              Sign out
            </button>
            <span>Private to Ryan</span>
          </div>
        </aside>
        <div className="os-col">
          <header className="crumb lbl">
            <span>
              Backfield OS <span className="sep">/</span> {pageLabel}
            </span>
            <span className="r">
              <button type="button" className="search" onClick={() => setOpen(true)}>
                <SearchIcon />
                <span>Search</span>
                <kbd className="pointer-keys">⌘K</kbd>
              </button>
              {stamp ? (
                <span className="stamp">
                  <i className={`dot${stale ? " wait" : ""}`} />
                  Updated {stamp.replace(/,\s*\d{4}/, "")}
                </span>
              ) : (
                <span className="stamp">Waiting on the first ingest</span>
              )}
              <span className="private">Private to Ryan</span>
            </span>
          </header>
          <main className="main">
            {children}
            <div className="foot lbl">
              <span>Backfield OS · private to Ryan</span>
              <span>{stamp ? `Snapshot ${stamp}` : "No snapshot yet"}</span>
            </div>
          </main>
        </div>
      </div>
      {menu ? (
        <div className="mpanel" id="os-menu" role="dialog" aria-modal="true" aria-label="Menu">
          <div className="mpanel-bar">
            <img src="/brand/logo-cream.png" alt="" />
            <button type="button" className="menu-btn" onClick={() => setMenu(false)}>
              <span aria-hidden="true">×</span> Close
            </button>
          </div>
          <div className="lbl mpanel-kicker">OS</div>
          <nav>
            {links.map((link) => (
              <a key={link.id} href={link.href} className={active === link.id ? "on" : ""} aria-current={active === link.id ? "page" : undefined} onClick={() => setMenu(false)}>
                {link.label}
                {link.count != null ? <span className="c">{link.count.toLocaleString("en-US")}</span> : null}
              </a>
            ))}
          </nav>
          <button type="button" className="mpanel-row" onClick={() => { setMenu(false); setOpen(true); }}>
            Search
          </button>
          <button type="button" className="mpanel-row" onClick={signOut}>
            Sign out
          </button>
          <a className="mpanel-back" href={hrefs.today} onClick={() => setMenu(false)}>
            ← Back to today
          </a>
        </div>
      ) : null}
      {open ? (
        <div
          className="palette"
          role="dialog"
          aria-modal="true"
          aria-label="Search"
          onClick={(event) => {
            if (event.target === event.currentTarget) setOpen(false);
          }}
        >
          <div className="palette-card">
            <button type="button" className="palette-close" onClick={() => setOpen(false)}>
              Close
            </button>
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

function actionKey(draft: Draft, previous?: string): string {
  if (draft.type === "rate" && isPitchRating(draft.payload.rating)) return rateKey(draft.target_id, draft.payload.rating);
  if (draft.type === "decide") return `decide:${draft.target_id}`;
  return previous || crypto.randomUUID();
}

function finderHref(item: FinderItem, hrefs: ReturnType<typeof osHrefs>): string {
  if (item.kind === "person") return hrefs.person(item.id);
  if (item.kind === "decision") return hrefs.decision(item.id);
  if (item.kind === "company") return hrefs.deal(item.id);
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
    const body = (await res.json().catch(() => ({}))) as { action?: OsAction; error?: string };
    if (body.action && (res.ok || res.status === 409)) return { action: body.action };
    if (!res.ok) return { error: body.error || "Could not save that." };
    return { error: "Could not save that." };
  } catch {
    return { error: "Could not save that." };
  }
}
