"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import type { BotDesk, DeskBot, RoutineView } from "@/lib/os/bot-desk";
import { buildLayout, handoffSpot, huddleSpots, isChief, officeCounts, officeEvents, placeBots, route, type OfficeEvent, type Point } from "@/lib/os/office-space";
import type { Interaction } from "@/lib/os/types";
import { DeskSprite, GlassWalls, iso, neonOf, OfficeScene, SCENE } from "./office-scene";

/** Real Backfield OS states, and the colors the whole office uses for them. */
export const STATE: { key: DeskBot["status"] | "Free"; label: string; color: string }[] = [
  { key: "Needs Ryan", label: "Waiting on you", color: "#F5B83D" },
  { key: "Working", label: "Working", color: "#36D17A" },
  { key: "Idle", label: "Idle", color: "#7C93B5" },
  { key: "Paused", label: "Paused", color: "#9AA0A6" },
  { key: "Failed", label: "Failed", color: "#FF4D5E" },
];
const COLOR: Record<DeskBot["status"], string> = { "Needs Ryan": "#F5B83D", Working: "#36D17A", Idle: "#7C93B5", Paused: "#9AA0A6", Failed: "#FF4D5E", Degraded: "#FF8A5B" };

const SPEED = 6.5; // floor tiles a second
const HOLD_MS = 5200; // how long a sync or handoff lasts once both are there
const LIVE_MS = 45 * 60_000; // interactions this recent play when the page opens
const REFRESH_MS = 30_000;

type Active = { ev: OfficeEvent; replay: boolean; spots: Record<string, Point>; arrive: number; ends: number };

const reduced = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const dist = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);

/** A bot as a little figure: a jersey in its team's neon, a visor face, and its team's gear. */
function Figure({ bot, number, selected }: { bot: DeskBot; number: number; selected: boolean }) {
  const team = neonOf(bot.team);
  const ring = COLOR[bot.status];
  const gear = bot.team;
  return (
    <g className={`lo-fig s-${bot.status.replace(/\s+/g, "-").toLowerCase()}${selected ? " is-selected" : ""}`} transform="scale(1.25)">
      <ellipse cx="0" cy="0" rx="11" ry="5.2" fill={ring} opacity="0.28" />
      <ellipse cx="0" cy="0" rx="11" ry="5.2" fill="none" stroke={ring} strokeWidth={selected ? 2.4 : 1.3} className="lo-ring" />
      <g className="lo-body">
        <rect x="-5" y="-9" width="4" height="8" rx="2" fill="#1d2630" />
        <rect x="1" y="-9" width="4" height="8" rx="2" fill="#1d2630" />
        <rect x="-8" y="-25" width="16" height="18" rx="7" fill={team} />
        <rect x="-8" y="-25" width="16" height="18" rx="7" fill="url(#lo-fig-shade)" />
        <image href="/brand/bv-mark.png" x="-4.5" y="-24" width="9" height="9" />
        <text x="0" y="-9.5" textAnchor="middle" fontSize="5.5" fontWeight="800" fill="#0b1220" fontFamily="ui-monospace, monospace">
          {number}
        </text>
        {gear === "Executive" ? <path d="M0 -15 l1.4 2 -1.4 4 -1.4 -4 z" fill="#0b1220" /> : null}
        {bot.isLead ? (
          <g>
            <rect x="5" y="-21" width="5" height="6" rx="1" fill="#F5B83D" />
            <text x="7.5" y="-16.5" textAnchor="middle" fontSize="5" fontWeight="900" fill="#0b1220">C</text>
          </g>
        ) : null}
        <circle cx="0" cy="-33" r="9" fill="#e9eef4" />
        <rect x="-6.5" y="-37" width="13" height="6.5" rx="3.2" fill="#0b1220" />
        <circle cx="-2.8" cy="-33.8" r="1.4" fill={ring} className="lo-eye" />
        <circle cx="2.8" cy="-33.8" r="1.4" fill={ring} className="lo-eye" />
        {gear === "Network" ? <path d="M-9 -33 a9 9 0 0 1 18 0" stroke="#0b1220" strokeWidth="1.8" fill="none" /> : null}
        {gear === "Network" ? <circle cx="-9" cy="-31" r="2.2" fill={team} /> : null}
        {gear === "Investment" ? <g stroke="#0b1220" strokeWidth="1.1" fill="none"><circle cx="-3" cy="-29" r="2" /><circle cx="3" cy="-29" r="2" /></g> : null}
        {gear === "Intelligence" ? <g><line x1="0" y1="-42" x2="0" y2="-48" stroke="#0b1220" strokeWidth="1.4" /><circle cx="0" cy="-49" r="2.4" fill={team} className="lo-bulb" /></g> : null}
        {gear === "Growth" ? <path d="M-9 -38 q9 -9 18 0 l4 1 h-22 z" fill={team} stroke="#0b1220" strokeWidth="0.8" /> : null}
        {gear === "Firm OS" ? <path d="M-9.5 -36 q9.5 -11 19 0 z" fill="#F5B83D" stroke="#0b1220" strokeWidth="0.8" /> : null}
      </g>
      {bot.status === "Paused" ? (
        <g transform="translate(9 -44)">
          <circle r="5.5" fill="#2a3340" />
          <rect x="-2.4" y="-2.6" width="1.6" height="5.2" fill="#d6dde5" />
          <rect x="0.8" y="-2.6" width="1.6" height="5.2" fill="#d6dde5" />
        </g>
      ) : null}
      {bot.status === "Needs Ryan" || bot.status === "Failed" ? (
        <g transform="translate(9 -45)" className="lo-badge">
          <circle r="5.5" fill={ring} />
          <text y="2.6" textAnchor="middle" fontSize="8" fontWeight="900" fill="#0b1220">!</text>
        </g>
      ) : null}
    </g>
  );
}

function short(text: string, n: number) {
  return text.length > n ? `${text.slice(0, n - 1).trimEnd()}…` : text;
}

/**
 * The live Backfield Ventures office. Every bot stands where its real status
 * puts it, walks when that status changes, and meets others in the lounge or the
 * glass office when the snapshot shows them working together.
 */
export function LiveOffice({ desk, interactions, now, builtCt, stale, onOpenBot }: { desk: BotDesk; interactions: Interaction[]; now: number; builtCt: string | null; stale: boolean; onOpenBot: (id: string) => void }) {
  const router = useRouter();
  const bots = desk.bots;
  const layout = useMemo(() => buildLayout(bots), [bots]);
  const places = useMemo(() => placeBots(bots, layout), [bots, layout]);
  const counts = useMemo(() => officeCounts(bots, layout, places), [bots, layout, places]);
  const events = useMemo(() => officeEvents(interactions, bots), [interactions, bots]);
  const numbers = useMemo(() => new Map([...bots].sort((a, b) => a.id.localeCompare(b.id)).map((b, i) => [b.id, ((i * 7) % 89) + 10])), [bots]);
  const chief = bots.find(isChief)?.id ?? null;
  const failedRoutines = desk.routines.filter((r) => r.failed);
  const routineOwner = (r: RoutineView) => bots.find((b) => b.routines.some((x) => x.name === r.name))?.id ?? null;
  const alertDesks = new Set(failedRoutines.map(routineOwner).filter(Boolean).map((id) => places.get(id!)?.desk).filter(Boolean) as string[]);

  // Positions live outside React so 50+ walking bots don't re-render the page every frame.
  const pos = useRef(new Map<string, Point>());
  const paths = useRef(new Map<string, Point[]>());
  const figs = useRef(new Map<string, SVGGElement>());
  const hits = useRef(new Map<string, HTMLButtonElement>());
  const [frame, setFrame] = useState(0);
  const [overrides, setOverrides] = useState<Map<string, Point>>(new Map());
  const [active, setActive] = useState<Active[]>([]);
  const queue = useRef<{ ev: OfficeEvent; replay: boolean }[]>([]);
  const seen = useRef<Set<string> | null>(null);
  const [feedLive, setFeedLive] = useState<{ key: string; line: string; at: string; kind: OfficeEvent["kind"]; replay: boolean }[]>([]);
  const [replaying, setReplaying] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [hover, setHover] = useState<string | null>(null);
  const [names, setNames] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [fit, setFit] = useState(0.6);
  const stage = useRef<HTMLDivElement>(null);

  // Fit the floor to the panel's width; zoom multiplies that.
  useEffect(() => {
    const el = stage.current;
    if (!el) return;
    const measure = () => setFit(Math.max(window.innerWidth < 720 ? 0.42 : 0.3, Math.min(1, (el.clientWidth - 4) / SCENE.w)));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const scale = fit * zoom;

  // Live: pull the latest snapshot every 30 seconds while the page is in view.
  useEffect(() => {
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, REFRESH_MS);
    return () => window.clearInterval(id);
  }, [router]);

  const paint = useCallback((id: string) => {
    const p = pos.current.get(id);
    if (!p) return;
    const [sx, sy] = iso(p.x, p.y);
    figs.current.get(id)?.setAttribute("transform", `translate(${sx.toFixed(1)} ${sy.toFixed(1)})`);
    const hit = hits.current.get(id);
    if (hit) hit.style.transform = `translate(${(sx - 22).toFixed(1)}px, ${(sy - 58).toFixed(1)}px)`;
  }, []);

  // One animation loop moves everyone who has somewhere to be.
  const raf = useRef(0);
  const loop = useCallback(() => {
    let last = performance.now();
    const step = (t: number) => {
      const dt = Math.min(0.05, (t - last) / 1000);
      last = t;
      let arrived = false;
      for (const [id, path] of paths.current) {
        const p = pos.current.get(id);
        if (!p || !path.length) {
          paths.current.delete(id);
          continue;
        }
        const next = path[0];
        const d = dist(p, next);
        const move = SPEED * dt;
        const fig = figs.current.get(id);
        if (fig) {
          const [ax] = iso(p.x, p.y);
          const [bx] = iso(next.x, next.y);
          fig.querySelector(".lo-body")?.setAttribute("data-face", bx < ax ? "left" : "right");
          fig.classList.add("is-walking");
        }
        if (d <= move) {
          pos.current.set(id, { ...next });
          path.shift();
          if (!path.length) {
            paths.current.delete(id);
            fig?.classList.remove("is-walking");
            arrived = true;
          }
        } else pos.current.set(id, { x: p.x + ((next.x - p.x) / d) * move, y: p.y + ((next.y - p.y) / d) * move });
        paint(id);
      }
      if (arrived) setFrame((f) => f + 1);
      raf.current = paths.current.size ? requestAnimationFrame(step) : 0;
    };
    if (!raf.current) raf.current = requestAnimationFrame(step);
  }, [paint]);
  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  // Send each bot to where it should be: its event spot if it's in one, else its real-status place.
  const targets = useMemo(() => {
    const out = new Map<string, Point>();
    for (const [id, place] of places) out.set(id, overrides.get(id) ?? { x: place.x, y: place.y });
    return out;
  }, [places, overrides]);
  const goals = useRef(new Map<string, Point>());
  useEffect(() => {
    const first = pos.current.size === 0;
    for (const [id, target] of targets) {
      const goal = goals.current.get(id);
      if (goal && dist(goal, target) < 0.05) continue;
      goals.current.set(id, target);
      const here = pos.current.get(id);
      if (first || !here || reduced()) {
        pos.current.set(id, { ...target });
        paths.current.delete(id);
        paint(id);
        continue;
      }
      const near = dist(here, target) < 4;
      paths.current.set(id, near ? [target] : route(here, target));
    }
    for (const id of [...pos.current.keys()]) if (!targets.has(id)) pos.current.delete(id);
    if (paths.current.size) loop();
    setFrame((f) => f + 1);
  }, [targets, paint, loop]);

  // Interactions: new ones play as they arrive; on open, play only the last 45 minutes.
  useEffect(() => {
    if (!seen.current) {
      seen.current = new Set(events.map((e) => e.key));
      const recent = events.filter((e) => now - Date.parse(e.at) < LIVE_MS).reverse();
      for (const ev of recent) queue.current.push({ ev, replay: false });
    } else {
      const fresh = events.filter((e) => !seen.current!.has(e.key)).reverse();
      for (const ev of fresh) {
        seen.current.add(ev.key);
        queue.current.push({ ev, replay: false });
      }
    }
    pump();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events]);

  const busy = (id: string, list: Active[]) => list.some((a) => a.ev.from === id || a.ev.to === id);
  function pump() {
    setActive((current) => {
      const running = [...current];
      const still: typeof queue.current = [];
      for (const item of queue.current) {
        const { ev } = item;
        if (running.length >= 3 || busy(ev.from, running) || (ev.to !== "ryan" && busy(ev.to, running)) || !places.has(ev.from)) {
          if (places.has(ev.from)) still.push(item);
          continue;
        }
        const spots: Record<string, Point> = {};
        if (ev.kind === "sync" && places.has(ev.to)) {
          const [a, b] = huddleSpots(running.filter((r) => r.ev.kind === "sync").length);
          spots[ev.from] = a;
          spots[ev.to] = b;
        } else spots[ev.from] = handoffSpot(ev.to, layout, chief);
        // Time to walk the actual route (out the door, along the aisle), for whoever is farthest.
        const length = (from: Point, to: Point) => {
          const path = dist(from, to) < 4 ? [to] : route(from, to);
          let total = 0;
          let at = from;
          for (const step of path) {
            total += dist(at, step);
            at = step;
          }
          return total;
        };
        const travel = Math.max(...Object.entries(spots).map(([id, p]) => length(pos.current.get(id) ?? p, p))) / SPEED;
        const arrive = Date.now() + (reduced() ? 0 : travel * 1000);
        running.push({ ev, replay: item.replay, spots, arrive, ends: arrive + HOLD_MS });
        setFeedLive((f) => [{ key: `${ev.key}-${Date.now()}`, line: ev.line, at: ev.at, kind: ev.kind, replay: item.replay }, ...f].slice(0, 40));
      }
      queue.current = still;
      return running;
    });
  }

  // Event spots override real-status places while an event runs; then everyone goes back.
  useEffect(() => {
    const next = new Map<string, Point>();
    for (const a of active) for (const [id, p] of Object.entries(a.spots)) next.set(id, p);
    setOverrides(next);
    if (!active.length) {
      setReplaying(false);
      return;
    }
    const soonest = Math.min(...active.map((a) => a.ends));
    const t = window.setTimeout(() => {
      setActive((list) => list.filter((a) => a.ends > Date.now() + 50));
      window.setTimeout(pump, 400);
    }, Math.max(0, soonest - Date.now()));
    const arrive = Math.min(...active.map((a) => (a.arrive > Date.now() ? a.arrive : Infinity)));
    const t2 = Number.isFinite(arrive) ? window.setTimeout(() => setFrame((f) => f + 1), arrive - Date.now() + 60) : 0;
    return () => {
      window.clearTimeout(t);
      window.clearTimeout(t2);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  function replay() {
    const latest = events.slice(0, 10).reverse();
    if (!latest.length) return;
    setReplaying(true);
    for (const ev of latest) queue.current.push({ ev, replay: true });
    pump();
  }

  function focus(id: string) {
    setSelected(id);
    const p = pos.current.get(id);
    const el = stage.current;
    if (p && el) {
      const [sx, sy] = iso(p.x, p.y);
      el.scrollTo({ left: sx * scale - el.clientWidth / 2, top: sy * scale - el.clientHeight / 2, behavior: reduced() ? "auto" : "smooth" });
    }
  }

  // Drag to pan with a mouse; touch scrolls natively.
  const drag = useRef<{ x: number; y: number; left: number; top: number } | null>(null);

  // Depth: farther things first. Desks and bots share one layer so a bot behind a desk is behind it.
  void frame;
  const sprites: { depth: number; key: string; node: React.ReactNode }[] = [];
  for (const d of layout.desks) {
    const owner = d.owner ? bots.find((b) => b.id === d.owner) : null;
    const seat = owner ? places.get(owner.id) : null;
    const lit = Boolean(owner && owner.status === "Working" && seat?.atDesk && !overrides.has(owner.id));
    sprites.push({ depth: d.x + d.y, key: `desk-${d.id}`, node: <DeskSprite desk={d} lit={lit} alert={alertDesks.has(d.id)} /> });
  }
  for (const bot of bots) {
    const p = pos.current.get(bot.id) ?? targets.get(bot.id);
    if (!p) continue;
    const [sx, sy] = iso(p.x, p.y);
    sprites.push({
      depth: p.x + p.y,
      key: `bot-${bot.id}`,
      node: (
        <g
          ref={(el) => {
            if (el) figs.current.set(bot.id, el);
            else figs.current.delete(bot.id);
          }}
          transform={`translate(${sx.toFixed(1)} ${sy.toFixed(1)})`}
        >
          <Figure bot={bot} number={numbers.get(bot.id) ?? 0} selected={selected === bot.id} />
        </g>
      ),
    });
  }
  sprites.sort((a, b) => a.depth - b.depth);

  // Tethers between two bots in a sync, once both have arrived.
  const tethers = active
    .filter((a) => a.ev.kind === "sync" && Object.keys(a.spots).length === 2 && Date.now() >= a.arrive)
    .map((a) => {
      const [p, q] = Object.values(a.spots);
      return { key: a.ev.key, a: iso(p.x, p.y, 30), b: iso(q.x, q.y, 30) };
    });

  const bubbleOf = (bot: DeskBot): { text: string; tone: string } | null => {
    const ev = active.find((a) => a.ev.from === bot.id || a.ev.to === bot.id);
    if (ev && Date.now() >= ev.arrive - 200) {
      const mover = ev.ev.from === bot.id;
      if (ev.ev.kind === "handoff") return { text: mover ? `Handing off: ${short(ev.ev.title, 40)}` : "Got it.", tone: "handoff" };
      return { text: mover ? `Sync: ${short(ev.ev.title, 40)}` : "On it.", tone: "sync" };
    }
    const place = places.get(bot.id);
    if (!place?.bubble) return null;
    // The handoff line shares one sign; each bot's own ask shows on hover or tap. The chief always says it.
    if ((bot.status === "Needs Ryan" && isChief(bot)) || bot.status === "Failed" || bot.status === "Degraded") return { text: short(place.bubble, 46), tone: bot.status === "Needs Ryan" ? "needs" : "failed" };
    if (bot.status === "Needs Ryan" && (hover === bot.id || selected === bot.id)) return { text: short(place.bubble, 56), tone: "needs" };
    if (hover === bot.id || selected === bot.id) return { text: short(place.bubble, 56), tone: bot.status === "Working" ? "working" : "plain" };
    return null;
  };

  const order = ["Needs Ryan", "Failed", "Degraded", "Working", "Paused", "Idle"];
  const roster = [...bots].sort((a, b) => order.indexOf(a.status) - order.indexOf(b.status) || a.name.localeCompare(b.name));
  const feed = [
    ...feedLive.map((f) => ({ key: f.key, text: f.line, when: f.replay ? "replay" : "now", tone: f.kind, live: true })),
    ...events.slice(0, 20).map((e) => ({ key: `ev-${e.key}`, text: e.line, when: new Date(e.at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }), tone: e.kind, live: false })),
    ...desk.feed.slice(0, 12).map((f) => ({ key: `fd-${f.key}`, text: `${f.name}: ${f.sentence}`, when: f.relative ?? f.ct, tone: "feed", live: false })),
  ].slice(0, 50);

  const chips: { label: string; n: number; color: string }[] = [
    { label: "working", n: counts.working, color: COLOR.Working },
    { label: "waiting on you", n: counts.needs, color: COLOR["Needs Ryan"] },
    { label: "idle", n: counts.idle, color: COLOR.Idle },
    { label: "paused", n: counts.paused, color: COLOR.Paused },
    { label: "failed", n: counts.failed + failedRoutines.length, color: COLOR.Failed },
    { label: "free desks", n: counts.freeDesks, color: "#4DD8FF" },
  ];

  return (
    <section className="lo" aria-label="Backfield Ventures office, live">
      <div className="lo-main">
        <div className="lo-hud">
          <div className="lo-brand">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="lo-mark" src="/brand/bv-mark.png" alt="" width={34} height={34} />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="lo-wordmark" src="/brand/backfield-wordmark.png" alt="Backfield Ventures" width={150} height={33} />
            <span className="lo-place">The office · Austin</span>
            <span className={`lo-live${stale ? " is-stale" : ""}`}>{stale ? `Last update ${builtCt ?? "unknown"}` : `Live${builtCt ? ` · ${builtCt}` : ""}`}</span>
          </div>
          <ul className="lo-chips" aria-label="Office right now">
            {chips.map((c) => (
              <li key={c.label}>
                <span className="lo-dot" style={{ background: c.color }} />
                <b>{c.n}</b> {c.label}
              </li>
            ))}
          </ul>
          <div className="lo-tools">
            <button type="button" className="lo-tool" onClick={replay} disabled={!events.length || replaying} title="Plays the latest real interactions from the snapshot">
              {replaying ? "Replaying…" : "Replay latest"}
            </button>
            <button type="button" className="lo-tool" aria-pressed={names} onClick={() => setNames((v) => !v)}>
              Names
            </button>
            <button type="button" className="lo-tool" aria-label="Zoom out" onClick={() => setZoom((z) => Math.max(0.6, +(z - 0.2).toFixed(2)))}>
              −
            </button>
            <button type="button" className="lo-tool" aria-label="Fit the office" onClick={() => setZoom(1)}>
              Fit
            </button>
            <button type="button" className="lo-tool" aria-label="Zoom in" onClick={() => setZoom((z) => Math.min(2.6, +(z + 0.3).toFixed(2)))}>
              +
            </button>
          </div>
        </div>
        {replaying ? <p className="lo-banner" role="status">Replaying the latest real interactions from the office.</p> : null}
        <div
          className="lo-stage"
          ref={stage}
          onPointerDown={(e) => {
            if (e.pointerType !== "mouse" || (e.target as HTMLElement).closest("button")) return;
            drag.current = { x: e.clientX, y: e.clientY, left: stage.current!.scrollLeft, top: stage.current!.scrollTop };
          }}
          onPointerMove={(e) => {
            if (!drag.current || !stage.current) return;
            stage.current.scrollLeft = drag.current.left - (e.clientX - drag.current.x);
            stage.current.scrollTop = drag.current.top - (e.clientY - drag.current.y);
          }}
          onPointerUp={() => (drag.current = null)}
          onPointerLeave={() => (drag.current = null)}
        >
          <div className="lo-size" style={{ width: SCENE.w * scale, height: SCENE.h * scale }}>
            <div className="lo-world" style={{ transform: `scale(${scale})`, width: SCENE.w, height: SCENE.h } as CSSProperties}>
              <OfficeScene layout={layout} counts={{ working: counts.working, needs: counts.needs, doneToday: desk.summary.doneToday, idle: counts.idle }} failedRoutine={failedRoutines[0]?.name ?? null} />
              <svg className="lo-sprites" viewBox={`0 0 ${SCENE.w} ${SCENE.h}`} width={SCENE.w} height={SCENE.h} aria-hidden="true">
                <defs>
                  <linearGradient id="lo-fig-shade" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0" stopColor="#fff" stopOpacity="0.28" />
                    <stop offset="1" stopColor="#000" stopOpacity="0.3" />
                  </linearGradient>
                </defs>
                {tethers.map((t) => (
                  <line key={t.key} x1={t.a[0]} y1={t.a[1]} x2={t.b[0]} y2={t.b[1]} className="lo-tether" />
                ))}
                {sprites.map((s) => (
                  <g key={s.key}>{s.node}</g>
                ))}
              </svg>
              <GlassWalls />
              {counts.needs ? (
                <span className="lo-sign" style={{ left: iso(6.2, 6.6, 84)[0], top: iso(6.2, 6.6, 84)[1] }}>
                  {counts.needs} waiting on you
                </span>
              ) : null}
              <div className="lo-hits">
                {bots.map((bot) => {
                  const p = pos.current.get(bot.id) ?? targets.get(bot.id)!;
                  const [sx, sy] = iso(p.x, p.y);
                  const bubble = bubbleOf(bot);
                  const showName = names || hover === bot.id || selected === bot.id || isChief(bot) || active.some((a) => a.ev.from === bot.id || a.ev.to === bot.id);
                  return (
                    <button
                      key={bot.id}
                      type="button"
                      className={`lo-hit${selected === bot.id ? " is-selected" : ""}`}
                      ref={(el) => {
                        if (el) hits.current.set(bot.id, el);
                        else hits.current.delete(bot.id);
                      }}
                      style={{ transform: `translate(${(sx - 22).toFixed(1)}px, ${(sy - 58).toFixed(1)}px)`, zIndex: Math.round((p.x + p.y) * 10) }}
                      aria-label={`${bot.name}${bot.role ? `, ${bot.role}` : ""}, ${bot.team}. ${bot.statusLabel}. Open.`}
                      onMouseEnter={() => setHover(bot.id)}
                      onMouseLeave={() => setHover((h) => (h === bot.id ? null : h))}
                      onFocus={() => setHover(bot.id)}
                      onBlur={() => setHover((h) => (h === bot.id ? null : h))}
                      onClick={() => {
                        setSelected(bot.id);
                        onOpenBot(bot.id);
                      }}
                    >
                      {bubble ? <span className={`lo-bubble is-${bubble.tone}`}>{bubble.text}</span> : null}
                      {showName ? <span className="lo-name">{bot.name}</span> : null}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
        <ul className="lo-legend" aria-label="What the colors mean">
          {STATE.map((s) => (
            <li key={s.key}>
              <span className="lo-dot" style={{ background: s.color }} /> {s.label}
            </li>
          ))}
          <li>
            <span className="lo-dot" style={{ background: "#4DD8FF" }} /> Free desk
          </li>
        </ul>
      </div>

      <aside className="lo-side" aria-label="Who's in and what's happening">
        {failedRoutines.length ? (
          <section className="lo-card is-failed" aria-label="Failed routines">
            <h3>
              {failedRoutines.length === 1 ? "1 routine failed" : `${failedRoutines.length} routines failed`}
            </h3>
            {failedRoutines.map((r) => {
              const owner = routineOwner(r);
              const ownerBot = owner ? bots.find((b) => b.id === owner) : null;
              return (
                <div key={`${r.name}-${r.last}`} className="lo-fail">
                  <b>{r.name ?? "A routine"}</b>
                  <span>
                    {[r.status ? `Status: ${r.status}` : null, r.last ? `last ran ${r.last}` : null, r.next ? `next ${r.next}` : null].filter(Boolean).join(" · ")}
                  </span>
                  {r.note ? <span className="lo-note">{r.note}</span> : null}
                  {ownerBot ? (
                    <button type="button" className="lo-link" onClick={() => { focus(ownerBot.id); onOpenBot(ownerBot.id); }}>
                      {ownerBot.name} owns it. Open
                    </button>
                  ) : null}
                </div>
              );
            })}
          </section>
        ) : null}

        <section className="lo-card" aria-label="Roster">
          <h3>
            Roster <span>{bots.length}</span>
          </h3>
          <ul className="lo-roster">
            {roster.map((bot) => (
              <li key={bot.id}>
                <button
                  type="button"
                  className={selected === bot.id ? "is-selected" : ""}
                  onMouseEnter={() => setHover(bot.id)}
                  onMouseLeave={() => setHover((h) => (h === bot.id ? null : h))}
                  onClick={() => {
                    focus(bot.id);
                    onOpenBot(bot.id);
                  }}
                >
                  <span className="lo-dot" style={{ background: COLOR[bot.status] }} />
                  <span className="lo-who">
                    <b>{bot.name}</b>
                    <span>{[bot.role, bot.team].filter(Boolean).join(" · ")}</span>
                  </span>
                  <span className="lo-state" style={{ color: COLOR[bot.status] }}>
                    {bot.statusLabel}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>

        <section className="lo-card" aria-label="Activity">
          <h3>Activity</h3>
          {feed.length ? (
            <ol className="lo-feed">
              {feed.map((f) => (
                <li key={f.key} className={`is-${f.tone}${f.live ? " is-live" : ""}`}>
                  <span className="lo-when">{f.when}</span>
                  <span>{f.text}</span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="lo-muted">No activity in this snapshot yet.</p>
          )}
        </section>
      </aside>
    </section>
  );
}
