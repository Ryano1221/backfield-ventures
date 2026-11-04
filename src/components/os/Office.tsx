"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { displayParty } from "@/lib/os/interactions";
import { botPaused } from "@/lib/os/overlays";
import { useOsActions } from "./OsShell";

export type OfficeBot = {
  name: string;
  director: string;
  status: string;
  failed: boolean;
  last: string;
  result: string;
  role: string;
  scope: string;
};

export type OfficeMove = {
  from: string;
  to: string;
  title: string;
  timestamp: string;
};

const FLOORS = [
  { key: "executive", label: "Exec" },
  { key: "investment", label: "Investment" },
  { key: "intelligence", label: "Intelligence" },
  { key: "network", label: "Network" },
  { key: "growth", label: "Growth" },
  { key: "firm_os", label: "Firm OS" },
] as const;

const CREAM = "#f0ede8";
const WHITE = "#ffffff";
const FOREST = "#000000";
const BLACK = "#000000";
const ALERT = "#000000";

type Point = { x: number; y: number; floor: number };
type Actor = {
  bot: OfficeBot;
  home: Point;
  pos: Point;
  seed: number;
  bob: number;
};

export function Office({ bots, moves }: { bots: OfficeBot[]; moves: OfficeMove[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [floor, setFloor] = useState<number | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [playing, setPlaying] = useState(true);
  const [speed, setSpeed] = useState(2);
  const [reduced, setReduced] = useState(false);
  const actors = useMemo(() => placeBots(bots), [bots]);
  const hits = useRef<{ name: string; x: number; y: number }[]>([]);
  const { actions, enqueue } = useOsActions();
  const pausedNames = useMemo(() => new Set(bots.filter((bot) => botPaused(bot.name, actions)).map((bot) => bot.name)), [bots, actions]);
  const pausedRef = useRef(pausedNames);
  const selectedBot = actors.find((actor) => actor.bot.name === selected)?.bot ?? null;
  const [ask, setAsk] = useState("");

  useEffect(() => {
    pausedRef.current = pausedNames;
  }, [pausedNames]);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReduced(media.matches);
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let frame = 0;
    let raf = 0;
    const runtime = actors.map((actor) => ({ ...actor, pos: { ...actor.home }, path: [] as Point[], pathAt: 0, carry: false }));
    let moveIndex = 0;
    let leg: "go" | "back" | "wait" = "wait";
    let wait = 0;

    const resize = () => {
      const width = wrap.clientWidth;
      const height = Math.max(640, Math.min(860, Math.round(width * 0.92)));
      const ratio = window.devicePixelRatio || 1;
      canvas.width = Math.floor(width * ratio);
      canvas.height = Math.floor(height * ratio);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(wrap);

    const tick = () => {
      frame += 1;
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      const focus = floor;
      const scale = focus == null ? Math.min(1, width / 860, (height - 48) / 620) : Math.min(1.7, width / 520);
      const origin = { x: width * 0.52, y: focus == null ? 36 : 120 };
      if (!reduced && playing && moves.length) stepMoves();
      hits.current = drawScene(ctx, width, height, origin, scale, focus, runtime, frame, reduced, pausedRef.current);
      raf = requestAnimationFrame(tick);
    };

    function stepMoves() {
      const active = runtime.find((actor) => actor.path.length);
      if (active) {
        active.pathAt += 0.04 * speed;
        const index = Math.min(active.path.length - 1, Math.floor(active.pathAt));
        const next = Math.min(active.path.length - 1, index + 1);
        const t = active.pathAt - index;
        active.pos = lerp(active.path[index], active.path[next], t);
        if (active.pathAt >= active.path.length - 1) {
          active.path = [];
          active.pos = { ...active.home };
          if (leg === "go") {
            leg = "back";
            wait = 18;
          } else {
            leg = "wait";
            active.carry = false;
            moveIndex = (moveIndex + 1) % moves.length;
          }
        }
        return;
      }
      if (wait > 0) {
        wait -= speed;
        return;
      }
      const move = moves[moveIndex % moves.length];
      const from = findActor(runtime, move.from);
      const to = findActor(runtime, move.to);
      if (!from || !to) {
        moveIndex = (moveIndex + 1) % moves.length;
        return;
      }
      if (leg === "back") {
        from.carry = false;
        from.path = pathBetween(to.home, from.home);
        from.pathAt = 0;
        return;
      }
      leg = "go";
      from.carry = true;
      from.path = pathBetween(from.home, to.home);
      from.pathAt = 0;
    }

    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
    };
  }, [actors, floor, moves, playing, reduced, speed]);

  function onPointer(event: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const robot = hits.current.find((item) => Math.hypot(item.x - x, item.y - y) < 28);
    if (robot) {
      setSelected(robot.name);
      return;
    }
    if (floor == null) {
      const band = Math.max(1, (canvas.clientHeight - 70) / FLOORS.length);
      setFloor(Math.max(0, Math.min(FLOORS.length - 1, Math.floor((y - 36) / band))));
    }
  }

  return (
    <div className="os-office">
      <div className="os-office-tools">
        <button type="button" className={floor == null ? "os-floor-btn is-on" : "os-floor-btn"} onClick={() => setFloor(null)}>
          All floors
        </button>
        {FLOORS.map((item, index) => (
          <button
            key={item.key}
            type="button"
            className={floor === index ? "os-floor-btn is-on" : "os-floor-btn"}
            onClick={() => setFloor(index)}
          >
            {item.label}
          </button>
        ))}
        <span className="os-office-play">
          <button type="button" className="os-floor-btn" onClick={() => setPlaying((value) => !value)} disabled={reduced || moves.length === 0}>
            {reduced ? "Motion off" : playing ? "Pause" : "Play"}
          </button>
          {[1, 2, 4].map((value) => (
            <button key={value} type="button" className={speed === value ? "os-floor-btn is-on" : "os-floor-btn"} onClick={() => setSpeed(value)}>
              {value}x
            </button>
          ))}
        </span>
      </div>
      <div className="os-office-stage" ref={wrapRef}>
        <canvas ref={canvasRef} onPointerDown={onPointer} role="img" aria-label="Bot office" />
        {bots.length === 0 ? <p className="os-office-empty">No bots in this snapshot.</p> : null}
        {bots.length > 0 && moves.length === 0 ? <p className="os-office-empty">No handoffs to replay.</p> : null}
      </div>
      {selectedBot ? (
        <aside className="os-robot-card">
          <button type="button" className="os-more" onClick={() => setSelected(null)}>
            Close
          </button>
          <p className="os-kicker">{selectedBot.director === "other" ? "Other" : labelFloor(selectedBot.director)}</p>
          <h3>{selectedBot.name}</h3>
          <p>{selectedBot.status}{selectedBot.role ? ` · ${selectedBot.role}` : ""}{pausedNames.has(selectedBot.name) ? " · Paused" : ""}</p>
          <p className="os-quiet">{selectedBot.scope || selectedBot.last || "No last activity."}</p>
          {selectedBot.result ? <p>{selectedBot.result}</p> : null}
          {selectedBot.failed ? <p className="os-sent">Failing</p> : null}
          <div className="os-choice-row">
            <button type="button" onClick={() => enqueue({ type: "bot_pause", target_id: selectedBot.name, payload: {}, label: `Paused ${selectedBot.name}.` })}>Pause</button>
            <button type="button" onClick={() => enqueue({ type: "bot_resume", target_id: selectedBot.name, payload: {}, label: `Resumed ${selectedBot.name}.` })}>Resume</button>
          </div>
          <label className="os-note-label">
            Ask this bot to
            <input value={ask} onChange={(event) => setAsk(event.target.value)} maxLength={500} />
          </label>
          <button
            type="button"
            disabled={!ask.trim()}
            onClick={() => {
              enqueue({ type: "bot_request", target_id: selectedBot.name, payload: { text: ask.trim() }, label: `Asked ${selectedBot.name}.`, singleton: false });
              setAsk("");
            }}
          >
            Queue request
          </button>
          <ul className="os-handoffs">
            {moves
              .filter((move) => sameName(move.from, selectedBot.name) || sameName(move.to, selectedBot.name))
              .slice(0, 6)
              .map((move) => (
                <li key={`${move.timestamp}-${move.title}`}>
                  <p className="os-handoff-title">{move.title}</p>
                  <p className="os-quiet">{displayParty(move.from)} to {displayParty(move.to)}</p>
                </li>
              ))}
          </ul>
          {moves.filter((move) => sameName(move.from, selectedBot.name) || sameName(move.to, selectedBot.name)).length === 0 ? (
            <p className="os-missing">No handoffs for this robot.</p>
          ) : null}
        </aside>
      ) : (
        <p className="os-quiet">Select a robot or a floor. Packets walk the recent handoffs.</p>
      )}
    </div>
  );
}

function placeBots(bots: OfficeBot[]): Actor[] {
  const counts = new Map<number, number>();
  return bots.map((bot) => {
    const floor = floorIndex(bot.director);
    const slot = counts.get(floor) ?? 0;
    counts.set(floor, slot + 1);
    const col = slot % 4;
    const row = Math.floor(slot / 4);
    const home = { x: 1.2 + col * 2.15, y: 1.05 + row * 1.45, floor };
    return { bot, home, pos: home, seed: hash(bot.name), bob: (hash(bot.name) % 20) / 20 };
  });
}

function floorIndex(director: string): number {
  if (director === "ryan" || director === "executive") return 0;
  const index = FLOORS.findIndex((floor) => floor.key === director);
  return index === -1 ? 5 : index;
}

function labelFloor(director: string): string {
  return FLOORS.find((floor) => floor.key === director)?.label || "Other";
}

function hash(value: string): number {
  let h = 2166136261;
  for (let i = 0; i < value.length; i++) h = Math.imul(h ^ value.charCodeAt(i), 16777619);
  return h >>> 0;
}

function findActor(actors: { bot: OfficeBot; home: Point; pos: Point; path: Point[]; pathAt: number; carry: boolean }[], name: string) {
  const key = name.trim().toLowerCase();
  if (key === "ryan") return actors.find((actor) => actor.bot.director === "ryan") || actors.find((actor) => actor.home.floor === 0);
  if (key === "executive") return actors.find((actor) => actor.bot.role.toLowerCase() === "executive") || actors.find((actor) => actor.bot.director === "executive");
  return actors.find((actor) => actor.bot.name.toLowerCase() === key || actor.bot.director === key);
}

function pathBetween(from: Point, to: Point): Point[] {
  const points: Point[] = [from];
  const liftFrom = { x: 10.2, y: 2.4, floor: from.floor };
  const liftTo = { x: 10.2, y: 2.4, floor: to.floor };
  points.push(liftFrom);
  if (from.floor !== to.floor) {
    const step = from.floor < to.floor ? 1 : -1;
    for (let floor = from.floor + step; floor !== to.floor + step; floor += step) {
      points.push({ x: 10.2, y: 2.4, floor });
    }
  }
  points.push(liftTo, to);
  return points;
}

function lerp(a: Point, b: Point, t: number): Point {
  const mix = Math.max(0, Math.min(1, t));
  return {
    x: a.x + (b.x - a.x) * mix,
    y: a.y + (b.y - a.y) * mix,
    floor: mix < 0.5 ? a.floor : b.floor,
  };
}

function project(x: number, y: number, floor: number, origin: { x: number; y: number }, scale: number) {
  return {
    x: origin.x + (x - y) * 22 * scale,
    y: origin.y + (x + y) * 11 * scale + floor * 68 * scale,
  };
}

function drawScene(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  origin: { x: number; y: number },
  scale: number,
  focus: number | null,
  actors: { bot: OfficeBot; pos: Point; home: Point; seed: number; bob: number; carry: boolean }[],
  frame: number,
  reduced: boolean,
  paused: Set<string>,
): { name: string; x: number; y: number }[] {
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = BLACK;
  ctx.fillRect(0, 0, width, height);
  for (let index = FLOORS.length - 1; index >= 0; index--) {
    if (focus != null && focus !== index) continue;
    drawFloor(ctx, index, origin, scale, focus == null);
  }
  const spots: { name: string; x: number; y: number }[] = [];
  const drawable = actors
    .filter((actor) => focus == null || actor.pos.floor === focus)
    .map((actor) => ({ actor, at: project(actor.pos.x, actor.pos.y, focus == null ? actor.pos.floor : 0, origin, scale) }))
    .sort((a, b) => a.at.y - b.at.y);
  for (const item of actors.filter((actor) => focus == null || actor.home.floor === focus)) {
    const desk = project(item.home.x, item.home.y, focus == null ? item.home.floor : 0, origin, scale);
    drawDesk(ctx, desk.x, desk.y);
  }
  for (const item of drawable) {
    const pausedBot = paused.has(item.actor.bot.name);
    const working = !pausedBot && item.actor.bot.status.toLowerCase() === "working";
    const asleep = pausedBot || item.actor.bot.status.toLowerCase() === "idle" || item.actor.bot.status.toLowerCase() === "paused";
    const bob = reduced ? 0 : working ? Math.sin(frame / 6 + item.actor.bob * 6) * 2 : 0;
    drawRobot(ctx, item.at.x, item.at.y + bob, item.actor.seed, Math.floor(frame / 8) % 2 === 0, asleep, item.actor.bot.failed);
    if (item.actor.carry) drawPacket(ctx, item.at.x + 10, item.at.y - 16);
    spots.push({ name: item.actor.bot.name, x: item.at.x, y: item.at.y });
    ctx.fillStyle = CREAM;
    ctx.font = "10px 'Space Mono', monospace";
    ctx.textAlign = "center";
    const tag = item.actor.bot.name.length > 18 ? `${item.actor.bot.name.slice(0, 16)}...` : item.actor.bot.name;
    if (focus != null || actors.length < 24) ctx.fillText(tag, item.at.x, item.at.y + 18);
  }
  return spots;
}

function drawFloor(ctx: CanvasRenderingContext2D, index: number, origin: { x: number; y: number }, scale: number, stacked: boolean) {
  const z = stacked ? index : 0;
  const corners = [project(0, 0, z, origin, scale), project(12, 0, z, origin, scale), project(12, 5, z, origin, scale), project(0, 5, z, origin, scale)];
  ctx.beginPath();
  ctx.moveTo(corners[0].x, corners[0].y);
  corners.slice(1).forEach((point) => ctx.lineTo(point.x, point.y));
  ctx.closePath();
  ctx.fillStyle = index % 2 ? "#000000" : FOREST;
  ctx.fill();
  ctx.strokeStyle = CREAM;
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = CREAM;
  ctx.font = "11px 'Space Mono', monospace";
  ctx.textAlign = "left";
  ctx.fillText(FLOORS[index].label, corners[0].x + 8, corners[0].y + 16);
  const shaft = project(10.2, 2.4, z, origin, scale);
  ctx.strokeStyle = WHITE;
  ctx.strokeRect(shaft.x - 8, shaft.y - 18, 16, 28);
}

function drawDesk(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));
  ctx.fillStyle = "#000000";
  ctx.fillRect(-8, 2, 16, 6);
  ctx.strokeStyle = CREAM;
  ctx.strokeRect(-8, 2, 16, 6);
  ctx.fillStyle = CREAM;
  ctx.fillRect(-5, -2, 10, 4);
  ctx.restore();
}

function drawRobot(ctx: CanvasRenderingContext2D, x: number, y: number, seed: number, step: boolean, asleep: boolean, failed: boolean) {
  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));
  ctx.globalAlpha = asleep ? 0.38 : 1;
  ctx.fillStyle = BLACK;
  ctx.fillRect(-7, 6, 14, 3);
  ctx.fillStyle = seed % 2 ? CREAM : WHITE;
  const shape = seed % 4;
  if (shape === 0) ctx.fillRect(-6, -12, 12, 12);
  if (shape === 1) {
    ctx.beginPath();
    ctx.arc(0, -6, 7, 0, Math.PI * 2);
    ctx.fill();
  }
  if (shape === 2) ctx.fillRect(-4, -16, 8, 16);
  if (shape === 3) ctx.fillRect(-8, -8, 16, 8);
  ctx.fillStyle = FOREST;
  if (!asleep) {
    const h = step ? 1 : 2;
    ctx.fillRect(-4, -8, 2, h);
    ctx.fillRect(2, -8, 2, h);
  }
  if (seed % 3 === 0) ctx.fillRect(-1, -18, 2, 5);
  if (seed % 3 === 1) ctx.fillRect(-6, -11, 12, 2);
  if (seed % 3 === 2) ctx.fillRect(-5, -15, 10, 3);
  ctx.fillStyle = BLACK;
  const stride = step ? 2 : -2;
  ctx.fillRect(-4 + stride, 1, 2, 6);
  ctx.fillRect(2 - stride, 1, 2, 6);
  if (failed) {
    ctx.fillStyle = ALERT;
    ctx.beginPath();
    ctx.moveTo(9, -16);
    ctx.lineTo(14, -7);
    ctx.lineTo(4, -7);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

function drawPacket(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.fillStyle = CREAM;
  ctx.fillRect(x, y, 10, 7);
  ctx.strokeStyle = FOREST;
  ctx.strokeRect(x, y, 10, 7);
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + 5, y + 4);
  ctx.lineTo(x + 10, y);
  ctx.stroke();
}

function sameName(value: string, name: string): boolean {
  return value.trim().toLowerCase() === name.trim().toLowerCase();
}
