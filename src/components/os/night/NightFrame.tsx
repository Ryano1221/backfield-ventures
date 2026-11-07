"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { FinderItem } from "@/lib/os/finder";
import { osHrefs } from "@/lib/os/nav";
import { isPitchRating, rateKey } from "@/lib/os/pitch-rate";
import type { ActionPayload, ActionType, OsAction } from "@/lib/os/types";
import { waitingActions } from "@/lib/os/waiting";
import { ChartDefs } from "./Charts";
import { AskBox, type AskContext } from "./AskBox";

type Queued = {
  batch: string;
  idempotency_key: string;
  type: ActionType;
  target_id: string;
  payload: ActionPayload;
  created_at: string;
  /** Set once the hold ends and the POST is in flight. */
  sending?: boolean;
};

type Draft = {
  type: ActionType;
  target_id: string;
  payload: ActionPayload;
  label: string;
  retry?: boolean;
};

type NightApi = {
  actions: OsAction[];
  enqueue: (draft: Draft) => void;
  submit: (draft: Draft) => void;
  retry: (targetId: string) => void;
  inflight: Record<string, boolean>;
  errors: Record<string, string>;
  reportToday: (count: number | null) => void;
  askContext: AskContext;
  setAskContext: (context: AskContext) => void;
};

const Ctx = createContext<NightApi | null>(null);

export function useNightActions(): NightApi {
  const value = useContext(Ctx);
  if (!value) throw new Error("Actions are only available inside the dashboard");
  return value;
}

const SINGLETON = new Set<ActionType>(["decide", "pitch_status", "crm_stage", "crm_hold", "crm_dnc", "bot_pause", "bot_resume", "snooze"]);

type Section = "today" | "raise" | "deals" | "people" | "bots" | "activity" | "email" | "waiting" | "review" | "leads";
type NavLink = { id: Section; label: string; short: string; href: string; count: number | null };

export function NightFrame({
  active,
  onOs,
  counts,
  stamp,
  stale = false,
  initialActions,
  finder,
  askAbout = null,
  askOwner = null,
  children,
}: {
  active: Section;
  onOs: boolean;
  counts: { today: number | null; deals: number | null; people: number | null; bots?: number | null };
  stamp: string | null;
  stale?: boolean;
  initialActions: OsAction[];
  finder: FinderItem[];
  askAbout?: string | null;
  askOwner?: string | null;
  children: ReactNode;
}) {
  const [actions, setActions] = useState(initialActions);
  const [actionSource, setActionSource] = useState(initialActions);
  if (actionSource !== initialActions) {
    setActionSource(initialActions);
    setActions(initialActions);
  }
  const [queued, setQueued] = useState<Queued[]>([]);
  const [toasts, setToasts] = useState<{ id: string; label: string; undo: boolean }[]>([]);
  const [open, setOpen] = useState(false);
  const [askOpen, setAskOpen] = useState(false);
  const [menu, setMenu] = useState(false);
  const [compact, setCompact] = useState(false);
  const pathname = usePathname() || "/os";
  const [askContext, setAskContext] = useState<AskContext>({ page: pathname, about: askAbout, requestedBy: askOwner, botName: null });
  const askKey = `${pathname}|${askAbout ?? ""}|${askOwner ?? ""}`;
  const [seenAskKey, setSeenAskKey] = useState(askKey);
  if (seenAskKey !== askKey) {
    setSeenAskKey(askKey);
    setAskContext((current) => ({ ...current, page: pathname, about: askAbout ?? current.about, requestedBy: askOwner ?? current.requestedBy }));
  }
  const [inflight, setInflight] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [liveToday, setLiveToday] = useState<number | null>(null);
  const drafts = useRef(new Map<string, Draft & { key: string }>());
  const inflightRef = useRef<Record<string, boolean>>({});
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);
  const queuedRef = useRef<Queued[]>([]);
  const timers = useRef(new Map<string, number>());
  const chain = useRef(Promise.resolve());

  useEffect(() => {
    let stop = false;
    async function pull() {
      if (document.visibilityState !== "visible") return;
      const res = await fetch("/api/os/actions/mine");
      if (!res.ok) return;
      const body = (await res.json()) as { actions?: OsAction[] };
      if (stop || !Array.isArray(body.actions)) return;
      setActions((current) => {
        const ids = new Set(body.actions!.map((action) => action.action_id));
        const local = current.filter((action) => !ids.has(action.action_id));
        return [...body.actions!, ...local];
      });
    }
    const timer = window.setInterval(pull, 30000);
    document.addEventListener("visibilitychange", pull);
    return () => {
      stop = true;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", pull);
    };
  }, []);

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

  // The card stays dismissed (shown as pending) while the POST runs, and only
  // leaves the queue once the server answers. A failed save brings the card
  // back with an error toast instead of silently dropping the approval.
  const commitBatch = useCallback((batch: string) => {
    const timer = timers.current.get(batch);
    if (timer) window.clearTimeout(timer);
    timers.current.delete(batch);
    const items = queuedRef.current.filter((item) => item.batch === batch && !item.sending);
    if (!items.length) return;
    queuedRef.current = queuedRef.current.map((item) => (item.batch === batch ? { ...item, sending: true } : item));
    setQueued(queuedRef.current);
    setToasts((current) => current.filter((toast) => toast.id !== batch));
    chain.current = chain.current.then(async () => {
      for (const item of items) {
        const ok = await postAction(item);
        queuedRef.current = queuedRef.current.filter((queuedItem) => queuedItem.idempotency_key !== item.idempotency_key);
        setQueued(queuedRef.current);
        if (ok.action) setActions((current) => (current.some((action) => action.action_id === ok.action?.action_id) ? current : [...current, ok.action!]));
        else setToasts((current) => [...current.filter((toast) => toast.undo), { id: item.idempotency_key, label: ok.error || "Could not save that.", undo: false }]);
      }
    });
  }, []);

  // Leaving the page or hiding the tab ends every hold early. Each queued item
  // is still on screen as pending, so the user already saw it go through.
  // keepalive lets the POST outlive the page.
  const flushAll = useCallback(() => {
    const pending = queuedRef.current.filter((item) => !item.sending);
    if (!pending.length) return;
    for (const timer of timers.current.values()) window.clearTimeout(timer);
    timers.current.clear();
    queuedRef.current = queuedRef.current.map((item) => ({ ...item, sending: true }));
    setToasts((current) => current.filter((toast) => !toast.undo));
    for (const item of pending) {
      void postAction(item, { keepalive: true }).then((ok) => {
        queuedRef.current = queuedRef.current.filter((queuedItem) => queuedItem.idempotency_key !== item.idempotency_key);
        setQueued(queuedRef.current);
        if (ok.action) setActions((current) => (current.some((action) => action.action_id === ok.action?.action_id) ? current : [...current, ok.action!]));
        else setToasts((current) => [...current, { id: item.idempotency_key, label: ok.error || "Could not save that.", undo: false }]);
      });
    }
  }, []);

  useEffect(() => {
    const timerMap = timers.current;
    const onHide = () => {
      if (document.visibilityState === "hidden") flushAll();
    };
    window.addEventListener("pagehide", flushAll);
    document.addEventListener("visibilitychange", onHide);
    return () => {
      window.removeEventListener("pagehide", flushAll);
      document.removeEventListener("visibilitychange", onHide);
      flushAll();
      for (const timer of timerMap.values()) window.clearTimeout(timer);
      timerMap.clear();
    };
  }, [flushAll]);

  const undo = useCallback((batch: string) => {
    if (queuedRef.current.some((item) => item.batch === batch && item.sending)) return;
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
    const key = actionKey(draft);
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
        setToasts((current) => [...current.filter((toast) => toast.undo), { id: key, label: saved.label, undo: false }]);
        window.setTimeout(() => setToasts((current) => current.filter((toast) => toast.id !== key)), 10_000);
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

  const HOLD_MS = 10_000;
  const ends = useRef(new Map<string, number>());
  const arm = useCallback(
    (batch: string, ms: number) => {
      const timer = timers.current.get(batch);
      if (timer) window.clearTimeout(timer);
      ends.current.set(batch, Date.now() + ms);
      timers.current.set(batch, window.setTimeout(() => commitBatch(batch), ms));
    },
    [commitBatch],
  );
  const pauseBatch = useCallback((batch: string) => {
    const end = ends.current.get(batch);
    const timer = timers.current.get(batch);
    if (timer) window.clearTimeout(timer);
    timers.current.delete(batch);
    if (end) ends.current.set(batch, Math.max(1000, end - Date.now()));
  }, []);
  const resumeBatch = useCallback(
    (batch: string) => {
      if (timers.current.has(batch)) return;
      if (!queuedRef.current.some((item) => item.batch === batch)) return;
      const left = ends.current.get(batch) ?? HOLD_MS;
      arm(batch, left > 60_000 ? HOLD_MS : left);
    },
    [arm],
  );

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
      setToasts((current) => [...current.filter((toast) => toast.undo && toast.id !== batch), { id: batch, label: draft.label, undo: true }]);
      arm(batch, HOLD_MS);
    },
    [arm],
  );

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const typing = Boolean(target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable));
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((value) => !value);
      } else if (!typing && event.key === "/") {
        event.preventDefault();
        setOpen(true);
      } else if (event.key === "Escape") {
        setOpen(false);
        setMenu(false);
        setAskOpen(false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    const onScroll = () => setCompact(window.scrollY > 28);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
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

  // Replies to outreach waiting on Ryan. Fetched after load so no page waits on it.
  const [leadReplies, setLeadReplies] = useState(0);
  useEffect(() => {
    let live = true;
    fetch("/api/os/outreach/count")
      .then((res) => (res.ok ? (res.json() as Promise<{ replies?: number }>) : null))
      .then((data) => {
        if (live && typeof data?.replies === "number") setLeadReplies(data.replies);
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, []);

  const hrefs = osHrefs(onOs);
  const waitingCount = waitingActions(actions.filter((action) => !action.action_id.startsWith("local:"))).length;
  // How Ryan runs the firm: five working areas, then the machinery under
  // Operations. `short` is the phone tab label for the same section.
  const links: NavLink[] = [
    { id: "today", label: "Today", short: "Today", href: hrefs.today, count: liveToday ?? counts.today },
    { id: "raise", label: "Fundraising", short: "Raise", href: hrefs.raise, count: null },
    { id: "deals", label: "Investments", short: "Deals", href: hrefs.deals, count: counts.deals },
    { id: "people", label: "Relationships", short: "People", href: hrefs.people, count: counts.people },
    { id: "email", label: "Audience Growth", short: "Growth", href: hrefs.studio, count: null },
  ];
  const ops: NavLink[] = [
    { id: "review", label: "Weekly review", short: "Review", href: hrefs.review, count: null },
    { id: "leads", label: "Leads", short: "Leads", href: hrefs.leads, count: leadReplies || null },
    { id: "bots", label: "Bots", short: "Bots", href: hrefs.bots, count: counts.bots ?? null },
    { id: "activity", label: "Activity", short: "Activity", href: hrefs.activity, count: null },
    { id: "waiting", label: "Waiting", short: "Waiting", href: hrefs.waiting, count: waitingCount },
  ];
  const pageLabel = [...links, ...ops].find((link) => link.id === active)?.label ?? "Activity";

  useEffect(() => {
    document.body.classList.toggle("os-cover", menu || open || askOpen);
    return () => document.body.classList.remove("os-cover");
  }, [menu, open, askOpen]);

  const q = query.trim().toLowerCase();
  const matches = finder
    .filter((item) => (q ? `${item.title} ${item.hint}`.toLowerCase().includes(q) : item.kind !== "page" || item.id !== "today"))
    .slice(0, 12);
  // Things to do, not just places to go. Shown first; they filter with the query too.
  const commands: { id: string; title: string; hint: string; href?: string; run?: () => void }[] = [
    { id: "replies", title: "Answer replies", hint: leadReplies ? `${leadReplies} waiting` : "Leads", href: `${hrefs.leads}#leads-replies` },
    { id: "review", title: "Review new leads", hint: "Leads", href: `${hrefs.leads}#leads-list` },
    { id: "find", title: "Find new leads", hint: "Reads the latest SEC filings", href: `${hrefs.leads}?do=find` },
    { id: "ask", title: "Ask the firm", hint: "Question about deals, LPs, the fund", run: () => setAskOpen(true) },
  ].filter((c) => !q || `${c.title} ${c.hint}`.toLowerCase().includes(q));
  const choices = commands.length + matches.length;
  const pick = Math.min(cursor, Math.max(0, choices - 1));

  async function signOut() {
    await fetch("/api/os/logout", { method: "POST" });
    window.location.assign(hrefs.login);
  }

  return (
    <Ctx.Provider value={{ actions: visible, enqueue, submit, retry, inflight, errors, reportToday, askContext, setAskContext }}>
      <header className={`appbar${compact ? " is-compact" : ""}`}>
        <Link href={hrefs.today} className="wordmark" prefetch>
          <img src="/logo-text.png" alt="Backfield Ventures" />
        </Link>
        <p className="appbar-title">{pageLabel}</p>
        <span className="appbar-tools">
          <button type="button" className="icon-btn" aria-label="Menu" aria-expanded={menu} aria-controls="os-menu" onClick={() => setMenu(true)}>
            <MenuIcon />
          </button>
          <button type="button" className="icon-btn" aria-label="Search" onClick={() => setOpen(true)}>
            <SearchIcon />
          </button>
        </span>
      </header>
      <div className="shell">
        <aside className="rail">
          <a className="brand wordmark" href={hrefs.today}>
            <img src="/logo-text.png" alt="Backfield Ventures" />
          </a>
          <nav>
            {links.map((link) => (
              <Link key={link.id} href={link.href} prefetch className={active === link.id ? "on" : ""} aria-current={active === link.id ? "page" : undefined}>
                {link.label}
                {link.count != null ? <span className="c">{link.count.toLocaleString("en-US")}</span> : null}
              </Link>
            ))}
            <span className="rail-group" aria-hidden="true">Operations</span>
            {ops.map((link) => (
              <Link key={link.id} href={link.href} prefetch className={`rail-sub${active === link.id ? " on" : ""}`} aria-current={active === link.id ? "page" : undefined}>
                {link.label}
                {link.count != null ? <span className="c">{link.count.toLocaleString("en-US")}</span> : null}
              </Link>
            ))}
          </nav>
          <button type="button" className="rail-ask" onClick={() => setAskOpen(true)}>
            Ask
          </button>
          <div className="rail-foot lbl">
            <button type="button" onClick={signOut}>
              Sign out
            </button>
          </div>
        </aside>
        <div className="os-col">
          <header className="crumb lbl">
            <span>{pageLabel}</span>
            <span className="r">
              <button type="button" className="search" onClick={() => setOpen(true)}>
                <SearchIcon />
                <span>Search</span>
                <kbd className="pointer-keys">⌘K</kbd>
              </button>
              <span className={stale ? "quiet-line is-stale" : "quiet-line"}>
                {stamp ? `Updated ${stamp.replace(/,\s*\d{4}/, "")}` : "Waiting on the first ingest"}
                {" · Private to Ryan"}
              </span>
            </span>
          </header>
          <main className="main">
            <ChartDefs />
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
            <img src="/logo-text.png" alt="Backfield Ventures" />
            <button type="button" className="icon-btn" aria-label="Close menu" onClick={() => setMenu(false)}>
              <span aria-hidden="true">×</span>
            </button>
          </div>
          <div className="lbl mpanel-kicker">OS</div>
          <nav>
            {links.map((link) => (
              <Link key={link.id} href={link.href} prefetch className={active === link.id ? "on" : ""} aria-current={active === link.id ? "page" : undefined} onClick={() => setMenu(false)}>
                {link.label}
                {link.count != null ? <span className="c">{link.count.toLocaleString("en-US")}</span> : null}
              </Link>
            ))}
            <span className="lbl mpanel-group">Operations</span>
            {ops.map((link) => (
              <Link key={link.id} href={link.href} prefetch className={active === link.id ? "on" : ""} aria-current={active === link.id ? "page" : undefined} onClick={() => setMenu(false)}>
                {link.label}
                {link.count != null ? <span className="c">{link.count.toLocaleString("en-US")}</span> : null}
              </Link>
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
      {askOpen ? (
        <div className="ask-sheet" role="dialog" aria-modal="true" aria-label="Ask the firm">
          <button type="button" className="sheet-scrim" aria-label="Close ask" onClick={() => setAskOpen(false)} />
          <div className="ask-sheet-card">
            <div className="ask-sheet-head">
              <div className="sheet-handle" aria-hidden />
              <p className="ask-note">This files a request. Nothing sends until you approve the exact text.</p>
              <button type="button" className="icon-btn sheet-close" aria-label="Close" onClick={() => setAskOpen(false)}>
                <span aria-hidden="true">×</span>
              </button>
            </div>
            <AskBox variant="sheet" actions={actions} context={askContext} onSubmit={submit} bots={finder.filter((item) => item.kind === "bot").map((item) => item.title)} />
          </div>
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
            <button type="button" className="icon-btn" aria-label="Close search" onClick={() => setOpen(false)}>
              <span aria-hidden="true">×</span>
            </button>
            <input
              autoFocus
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setCursor(0);
              }}
              onKeyDown={(event) => {
                if (event.key === "ArrowDown" || event.key === "ArrowUp") {
                  event.preventDefault();
                  if (!choices) return;
                  setCursor((pick + (event.key === "ArrowDown" ? 1 : choices - 1)) % choices);
                } else if (event.key === "Enter" && choices) {
                  event.preventDefault();
                  document.querySelector<HTMLElement>(`.palette-card [data-choice="${pick}"]`)?.click();
                }
              }}
              placeholder="Search people, deals, bots, or type a command"
              aria-label="Search people, deals, bots"
              role="combobox"
              aria-expanded="true"
              aria-controls="palette-list"
              aria-activedescendant={choices ? `palette-${pick}` : undefined}
            />
            <ul id="palette-list" role="listbox" aria-label="Results">
              {commands.length ? <li className="palette-head" role="presentation">Do</li> : null}
              {commands.map((c, i) => (
                <li key={`cmd-${c.id}`} id={`palette-${i}`} role="option" aria-selected={pick === i} className={pick === i ? "is-active" : ""} onMouseEnter={() => setCursor(i)}>
                  {c.href ? (
                    <Link href={c.href} data-choice={i} prefetch onClick={() => setOpen(false)}>
                      <span>{c.title}</span>
                      <span className="muted">{c.hint}</span>
                    </Link>
                  ) : (
                    <button
                      type="button"
                      data-choice={i}
                      onClick={() => {
                        setOpen(false);
                        c.run?.();
                      }}
                    >
                      <span>{c.title}</span>
                      <span className="muted">{c.hint}</span>
                    </button>
                  )}
                </li>
              ))}
              {commands.length && matches.length ? <li className="palette-head" role="presentation">Go to</li> : null}
              {matches.map((item, j) => {
                const i = commands.length + j;
                return (
                  <li key={`${item.kind}-${item.id}`} id={`palette-${i}`} role="option" aria-selected={pick === i} className={pick === i ? "is-active" : ""} onMouseEnter={() => setCursor(i)}>
                    <Link href={finderHref(item, hrefs)} data-choice={i} prefetch onClick={() => setOpen(false)}>
                      <span>{item.title}</span>
                      <span className="muted">{item.hint || item.kind}</span>
                    </Link>
                  </li>
                );
              })}
              {choices === 0 ? <li className="muted" style={{ padding: 16 }}>No matches.</li> : null}
            </ul>
            <p className="palette-keys pointer-keys" aria-hidden="true">
              <kbd>↑</kbd> <kbd>↓</kbd> move · <kbd>Enter</kbd> open · <kbd>Esc</kbd> close
            </p>
          </div>
        </div>
      ) : null}
      <nav className="tabbar" aria-label="Sections">
        {links
          .map((link) => (
            <Link key={link.id} href={link.href} prefetch className={active === link.id ? "on" : ""} aria-current={active === link.id ? "page" : undefined} aria-label={link.label}>
              <TabIcon id={link.id} on={active === link.id} />
              <span>{link.short}</span>
              {link.id === "today" && link.count ? <span className="tab-badge">{link.count > 99 ? "99+" : link.count}</span> : null}
            </Link>
          ))}
        <button type="button" className={askOpen ? "on" : ""} onClick={() => setAskOpen(true)}>
          <TabIcon id="ask" on={askOpen} />
          <span>Ask</span>
        </button>
      </nav>
      <div className="toasts" aria-live="polite">
        {toasts.map((toast) => (
          <div
            className="toast"
            key={toast.id}
            role="status"
            onMouseEnter={() => toast.undo && pauseBatch(toast.id)}
            onMouseLeave={() => toast.undo && resumeBatch(toast.id)}
            onFocus={() => toast.undo && pauseBatch(toast.id)}
            onBlur={() => toast.undo && resumeBatch(toast.id)}
          >
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

function actionKey(draft: Draft): string {
  if (draft.retry) return `retry:${crypto.randomUUID()}`;
  if (draft.type === "rate" && isPitchRating(draft.payload.rating)) return rateKey(draft.target_id, draft.payload.rating);
  if (draft.type === "decide") return `decide:${draft.target_id}`;
  if (draft.type === "free_text" || draft.type === "bot_request" || draft.type === "crm_note" || draft.type === "draft_followup") {
    return `ask:${crypto.randomUUID()}`;
  }
  return crypto.randomUUID();
}

function finderHref(item: FinderItem, hrefs: ReturnType<typeof osHrefs>): string {
  if (item.kind === "page") return (hrefs as unknown as Record<string, string>)[item.id] ?? hrefs.today;
  if (item.kind === "person") return hrefs.person(item.id);
  if (item.kind === "decision") return hrefs.decision(item.id);
  if (item.kind === "company") return hrefs.deal(item.id);
  return hrefs.bots;
}

function TabIcon({ id, on }: { id: string; on: boolean }) {
  const common = { width: 22, height: 22, viewBox: "0 0 24 24", fill: on ? "currentColor" : "none", stroke: "currentColor", strokeWidth: on ? 1.2 : 1.7, "aria-hidden": true as const };
  if (id === "deals") return <svg {...common}><rect x="4" y="4" width="16" height="16" rx="3" /><path d="M8 9h8M8 13h5" stroke={on ? "#f0ede8" : "currentColor"} /></svg>;
  if (id === "people") return <svg {...common}><circle cx="12" cy="8" r="3" /><path d="M5 19c1.4-3 3.8-4.5 7-4.5S17.6 16 19 19" /></svg>;
  if (id === "bots") return <svg {...common}><rect x="6" y="7" width="12" height="10" rx="2" /><path d="M12 7V4M9 12h.01M15 12h.01" stroke={on ? "#f0ede8" : "currentColor"} /></svg>;
  if (id === "ask") return <svg {...common}><path d="M5 6h14v9H8l-3 3V6z" /></svg>;
  if (id === "email") return <svg {...common} fill="none"><path d="M4 7h16v10H4z" /><path d="M4 7l8 6 8-6" /></svg>;
  if (id === "raise") return <svg {...common} fill="none"><path d="M4 19h16" /><path d="M7 16v-4M12 16V9M17 16V5" strokeWidth={on ? 2.6 : 1.7} strokeLinecap="round" /></svg>;
  return <svg {...common}><path d="M4 6h16M4 12h16M4 18h10" stroke={on ? "#f0ede8" : "currentColor"} /></svg>;
}

function MenuIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <path d="M2 4h12M2 8h12M2 12h12" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <circle cx="7" cy="7" r="5" />
      <path d="M11 11l3.5 3.5" />
    </svg>
  );
}

async function postAction(item: Queued, init: { keepalive?: boolean } = {}): Promise<{ action?: OsAction; error?: string }> {
  try {
    const res = await fetch("/api/os/action", {
      method: "POST",
      keepalive: init.keepalive === true,
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
