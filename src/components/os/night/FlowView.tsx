"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { DeskBot } from "@/lib/os/bot-desk";
import {
  buildFlow,
  defaultFlowWindow,
  priorityBot,
  type FlowEdge,
  type FlowHandoff,
  type FlowModel,
  type FlowNode,
  type FlowWindow,
} from "@/lib/os/flow";
import type { Interaction } from "@/lib/os/types";

const SVG_NS = "http://www.w3.org/2000/svg";
const NEED = "#000";
const WORK = "#000";
const IDLE = "rgba(0,0,0,.35)";
const PAUSED = "rgba(0,0,0,.15)";

type Point = { x: number; y: number; r: number };
type Flyer = { el: SVGCircleElement; path: SVGPathElement; len: number; t: number; dur: number };
type Play = { playing: boolean; index: number; fired: number; reduced: boolean };

export function FlowView({
  interactions,
  bots,
  now,
  active,
  onOpenBot,
}: {
  interactions: Interaction[];
  bots: DeskBot[];
  now: number;
  active: boolean;
  onOpenBot: (id: string) => void;
}) {
  const [windowName, setWindowName] = useState<FlowWindow>(() => defaultFlowWindow(interactions, bots, now));
  const [speed, setSpeed] = useState<1 | 4 | 16>(1);
  const [playing, setPlaying] = useState(false);
  const [edgeKey, setEdgeKey] = useState<string | null>(null);
  const [teamKey, setTeamKey] = useState<string | null>(null);
  const [width, setWidth] = useState(360);
  const [reduced, setReduced] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);
  const packetRef = useRef<SVGGElement>(null);
  const pathRefs = useRef(new Map<string, SVGPathElement>());
  const rangeRef = useRef<HTMLInputElement>(null);
  const clockRef = useRef<HTMLSpanElement>(null);
  const tickerRef = useRef<HTMLParagraphElement>(null);
  const speedRef = useRef(1);
  const dragging = useRef(false);
  const packets = useRef<Flyer[]>([]);
  const playRef = useRef<Play>({ playing: false, index: 0, fired: 0, reduced: false });
  const markerId = useId().replace(/:/g, "");
  const model = useMemo(() => buildFlow(interactions, bots, windowName, now), [interactions, bots, windowName, now]);
  const modelRef = useRef(model);
  modelRef.current = model;
  speedRef.current = speed;

  const height = width < 560 ? 420 : 500;
  const points = useMemo(() => placeNodes(model.nodes, width, height), [model.nodes, width, height]);
  const selected = model.edges.find((edge) => edge.key === edgeKey) ?? null;
  const team = model.nodes.find((node) => node.key === teamKey) ?? null;
  const teamBots = useMemo(() => {
    if (!team) return [];
    const ids = new Set(team.botIds);
    return bots.filter((bot) => ids.has(bot.id)).sort((a, b) => rank(a.status) - rank(b.status) || a.name.localeCompare(b.name));
  }, [bots, team]);

  useEffect(() => {
    const node = stageRef.current;
    if (!node) return;
    const measure = () => setWidth(Math.max(280, Math.round(node.clientWidth)));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReduced(media.matches);
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    playRef.current.reduced = reduced;
    if (reduced && playRef.current.playing) {
      playRef.current.playing = false;
      setPlaying(false);
      clearPackets(packets.current);
    }
  }, [reduced]);

  useEffect(() => {
    if (!active) {
      playRef.current.playing = false;
      setPlaying(false);
      return;
    }
    const state = playRef.current;
    const reduceNow = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    state.reduced = reduceNow;
    state.index = 0;
    state.fired = 0;
    state.playing = !reduceNow && model.handoffs.length > 0;
    setPlaying(state.playing);
    const flying = packets.current;
    clearPackets(flying);
    if (tickerRef.current) {
      tickerRef.current.hidden = true;
      tickerRef.current.classList.remove("is-on");
    }
    paintClock(model.handoffs[0] ?? null, clockRef.current, rangeRef.current);
    if (rangeRef.current) rangeRef.current.value = "0";
    let last = performance.now();
    let frame = 0;
    const loop = (nowMs: number) => {
      const dt = Math.min(48, nowMs - last);
      last = nowMs;
      const current = modelRef.current.handoffs;
      if (state.playing && current.length) {
        state.index = Math.min(current.length - 1, state.index + dt / (900 / speedRef.current));
        while (state.fired < current.length && state.index + 1e-6 >= state.fired) {
          const handoff = current[state.fired];
          if (handoff) release(handoff);
          state.fired += 1;
        }
        if (state.fired >= current.length) {
          state.playing = false;
          state.index = current.length - 1;
          setPlaying(false);
        }
      }
      stepPackets(packets.current, dt);
      if (!dragging.current && rangeRef.current) rangeRef.current.value = String(state.index);
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(frame);
      clearPackets(flying);
    };
    function release(handoff: FlowHandoff) {
      if (clockRef.current) clockRef.current.textContent = handoff.ct;
      if (rangeRef.current) rangeRef.current.setAttribute("aria-valuetext", handoff.ct);
      showTicker(tickerRef.current, `${handoff.fromLabel} -> ${handoff.toLabel}: ${clip(handoff.title, 64)}`);
      if (playRef.current.reduced) return;
      const path = pathRefs.current.get(`${handoff.from}|${handoff.to}`);
      const layer = packetRef.current;
      if (!path || !layer) return;
      if (packets.current.length > 16) {
        const old = packets.current.shift();
        old?.el.remove();
        if (old && !packets.current.some((item) => item.path === old.path)) old.path.classList.remove("is-hot");
      }
      const el = document.createElementNS(SVG_NS, "circle");
      el.setAttribute("r", "5.5");
      el.setAttribute("fill", "#000");
      el.setAttribute("stroke", "#fff");
      el.setAttribute("stroke-width", "1.5");
      layer.appendChild(el);
      path.classList.add("is-hot");
      packets.current.push({ el, path, len: path.getTotalLength(), t: 0, dur: Math.max(170, 760 / speedRef.current) });
    }
  }, [active, model]);

  function scrub(value: number) {
    const state = playRef.current;
    const handoffs = model.handoffs;
    state.index = value;
    state.fired = Math.min(handoffs.length, Math.ceil(value - 1e-6));
    const handoff = handoffs[Math.min(handoffs.length - 1, Math.max(0, Math.floor(value)))] ?? null;
    paintClock(handoff, clockRef.current, rangeRef.current);
    clearPackets(packets.current);
  }

  function togglePlay() {
    const state = playRef.current;
    if (state.playing) {
      state.playing = false;
      setPlaying(false);
      return;
    }
    if (!model.handoffs.length || state.reduced) return;
    if (state.fired >= model.handoffs.length) {
      state.index = 0;
      state.fired = 0;
      if (rangeRef.current) rangeRef.current.value = "0";
      paintClock(model.handoffs[0] ?? null, clockRef.current, rangeRef.current);
      clearPackets(packets.current);
    }
    state.playing = true;
    setPlaying(true);
  }

  function chooseWindow(next: FlowWindow) {
    setEdgeKey(null);
    setWindowName(next);
  }

  function chooseNode(node: FlowNode) {
    setEdgeKey(null);
    setTeamKey(node.key);
    const chosen = priorityBot(teamBotsFor(bots, node));
    if (chosen) onOpenBot(chosen.id);
  }

  return (
    <div className={reduced ? "flow is-still" : "flow"} data-reduced={reduced ? "true" : "false"}>
      <div className="flow-controls">
        <div className="bots-toggle" role="group" aria-label="Time window">
          <WindowButton current={windowName} id="today" label="Today" onPick={chooseWindow} />
          <WindowButton current={windowName} id="week" label="7 days" onPick={chooseWindow} />
          <WindowButton current={windowName} id="all" label="All" onPick={chooseWindow} />
        </div>
        <div className="bots-toggle" role="group" aria-label="Replay">
          <button type="button" aria-pressed={playing} disabled={!model.handoffs.length || reduced} onClick={togglePlay}>
            {playing ? "Pause" : "Play"}
          </button>
          {([1, 4, 16] as const).map((value) => (
            <button key={value} type="button" aria-pressed={speed === value} onClick={() => setSpeed(value)}>
              {value}x
            </button>
          ))}
        </div>
      </div>
      <label className="flow-scrub">
        <span ref={clockRef}>{model.handoffs[0]?.ct ?? "No handoffs"}</span>
        <input
          ref={rangeRef}
          type="range"
          min={0}
          max={Math.max(0, model.handoffs.length - 1)}
          step={0.01}
          defaultValue={0}
          disabled={!model.handoffs.length}
          aria-label="Replay time"
          aria-valuetext={model.handoffs[0]?.ct ?? "No handoffs"}
          onPointerDown={() => {
            dragging.current = true;
          }}
          onPointerUp={() => {
            dragging.current = false;
          }}
          onChange={(event) => scrub(Number(event.target.value))}
        />
      </label>
      <div className="flow-stage" ref={stageRef}>
        <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} role="img" aria-label="Handoffs between teams">
          <defs>
            <marker id={markerId} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" markerUnits="userSpaceOnUse" orient="auto">
              <path d="M 0 1.2 L 9 5 L 0 8.8 z" fill="#000" />
            </marker>
          </defs>
          {model.edges.map((edge) => {
            const from = points.get(edge.from);
            const to = points.get(edge.to);
            if (!from || !to) return null;
            const reverse = model.edges.some((other) => other.from === edge.to && other.to === edge.from);
            const sign = edge.from < edge.to ? 1 : -1;
            const ryan = edge.from === "ryan" || edge.to === "ryan";
            const d = edgePath(from, to, ryan ? 64 * sign : reverse ? 16 * sign : 0);
            const widthPx = 1.4 + (edge.count / Math.max(1, model.maxCount)) * 7;
            return (
              <g key={edge.key}>
                <path
                  d={d}
                  className="flow-hit"
                  onClick={() => {
                    setTeamKey(null);
                    setEdgeKey((current) => (current === edge.key ? null : edge.key));
                  }}
                  onKeyDown={(event) => {
                    if (event.key !== "Enter" && event.key !== " ") return;
                    event.preventDefault();
                    setTeamKey(null);
                    setEdgeKey((current) => (current === edge.key ? null : edge.key));
                  }}
                  tabIndex={0}
                  role="button"
                  aria-label={`${edge.fromLabel} to ${edge.toLabel}, ${edge.count} handoffs`}
                  aria-pressed={edgeKey === edge.key}
                />
                <path
                  d={d}
                  className={edgeKey === edge.key ? "flow-edge is-selected" : "flow-edge"}
                  strokeWidth={widthPx}
                  markerEnd={`url(#${markerId})`}
                  ref={(node) => {
                    if (node) pathRefs.current.set(edge.key, node);
                    else pathRefs.current.delete(edge.key);
                  }}
                />
              </g>
            );
          })}
          <g ref={packetRef} className="flow-packets" />
          {model.nodes.map((node) => {
            const point = points.get(node.key);
            if (!point) return null;
            return (
              <NodeGlyph
                key={node.key}
                node={node}
                point={point}
                pressed={teamKey === node.key}
                onPick={() => chooseNode(node)}
              />
            );
          })}
        </svg>
      </div>
      <p className="flow-key">
        <i className="flow-key-work" /> Working
        <i className="flow-key-need" /> Needs you
      </p>
      {!model.handoffs.length ? <p className="bots-empty">No handoffs in this window.</p> : null}
      {selected ? <EdgeList edge={selected} /> : null}
      {team ? (
        <section className="flow-team" aria-label={`${team.label} bots`}>
          <h2 className="bots-h">{team.label}</h2>
          {teamBots.length ? (
            <ul className="flow-bots">
              {teamBots.map((bot) => (
                <li key={bot.id}>
                  <button type="button" onClick={() => onOpenBot(bot.id)}>
                    <span>{bot.name}</span>
                    <span className={bot.status === "Needs Ryan" ? "is-need" : ""}>{bot.statusLabel}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="bots-empty">No bots at this desk.</p>
          )}
        </section>
      ) : null}
      <WhoTalks model={model} />
      <p ref={tickerRef} className="flow-ticker" hidden />
    </div>
  );
}

function WindowButton({
  current,
  id,
  label,
  onPick,
}: {
  current: FlowWindow;
  id: FlowWindow;
  label: string;
  onPick: (windowName: FlowWindow) => void;
}) {
  return (
    <button type="button" aria-pressed={current === id} onClick={() => onPick(id)}>
      {label}
    </button>
  );
}

function NodeGlyph({ node, point, pressed, onPick }: { node: FlowNode; point: Point; pressed: boolean; onPick: () => void }) {
  const total = node.counts.working + node.counts.needs + node.counts.idle + node.counts.paused;
  const ring = point.r + 6;
  const circumference = 2 * Math.PI * ring;
  let offset = 0;
  const segments = [
    [node.counts.working, WORK],
    [node.counts.needs, NEED],
    [node.counts.idle, IDLE],
    [node.counts.paused, PAUSED],
  ] as const;
  const label = `${node.label}, ${node.count} ${node.count === 1 ? "bot" : "bots"}${node.counts.needs ? `, ${node.counts.needs} need you` : ""}`;
  return (
    <g
      className={node.counts.working ? "flow-node is-working" : "flow-node"}
      transform={`translate(${point.x} ${point.y})`}
      role="button"
      tabIndex={0}
      aria-label={label}
      aria-pressed={pressed}
      onClick={onPick}
      onKeyDown={(event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        onPick();
      }}
    >
      <circle className="flow-glow" r={point.r + 12} />
      <circle className="flow-hit-node" r={Math.max(point.r, 24)} />
      {total
        ? segments.map(([count, color], index) => {
            if (!count) return null;
            const len = (count / total) * circumference;
            const shown = Math.max(0, len - (total > 1 ? 2 : 0));
            const dash = `${shown} ${circumference - shown}`;
            const circle = (
              <circle
                key={`${index}-${color}`}
                r={ring}
                fill="none"
                stroke={color}
                strokeWidth={3}
                strokeDasharray={dash}
                strokeDashoffset={-offset}
                transform="rotate(-90)"
              />
            );
            offset += len;
            return circle;
          })
        : null}
      <circle className="flow-fill" r={point.r} />
      <text className="flow-count" y={1} dominantBaseline="middle">
        {node.count}
      </text>
      <text className="flow-name" y={point.r + 16}>
        {node.short}
      </text>
      {node.counts.needs ? <circle className="flow-need" cx={point.r * 0.62} cy={-point.r * 0.62} r={5} /> : null}
    </g>
  );
}

function EdgeList({ edge }: { edge: FlowEdge }) {
  return (
    <section className="flow-edge-list" aria-label={`${edge.fromLabel} to ${edge.toLabel}`}>
      <h2 className="bots-h">
        {edge.fromLabel} → {edge.toLabel}
        <span> {edge.count.toLocaleString("en-US")}</span>
      </h2>
      <ol>
        {edge.handoffs.map((handoff) => (
          <li key={handoff.id}>
            <p>{handoff.title}</p>
            <p className="flow-meta">
              <span>{handoff.kindLabel}</span>
              {handoff.status ? <span>{handoff.status}</span> : null}
              <span>{handoff.ct}</span>
            </p>
          </li>
        ))}
      </ol>
    </section>
  );
}

function WhoTalks({ model }: { model: FlowModel }) {
  if (!model.nodes.length) return null;
  const cells = new Map(model.edges.map((edge) => [edge.key, edge.count]));
  return (
    <section className="flow-who" aria-labelledby="flow-who-h">
      <h2 id="flow-who-h" className="bots-h">
        Who talks to whom
      </h2>
      <div className="flow-matrix-wrap">
        <table className="flow-matrix">
          <thead>
            <tr>
              <th />
              {model.nodes.map((node) => (
                <th key={node.key} scope="col" title={node.label}>
                  {matrixName(node.key)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {model.nodes.map((row) => (
              <tr key={row.key}>
                <th scope="row" title={row.label}>
                  {matrixName(row.key)}
                </th>
                {model.nodes.map((column) => {
                  const count = cells.get(`${row.key}|${column.key}`) ?? 0;
                  const strength = model.maxCount ? count / model.maxCount : 0;
                  return (
                    <td key={column.key} style={count ? { background: `rgba(0, 0, 0, ${(0.1 + strength * 0.8).toFixed(3)})`, color: strength > 0.55 ? "#fff" : "#000" } : undefined}>
                      {count ? count.toLocaleString("en-US") : ""}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {model.lines.length ? (
        <ol className="flow-lines">
          {model.lines.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ol>
      ) : (
        <p className="bots-empty">No handoffs in this window.</p>
      )}
    </section>
  );
}

function placeNodes(nodes: FlowNode[], width: number, height: number): Map<string, Point> {
  const ryan = nodes.some((node) => node.key === "ryan");
  const grid: Record<string, [number, number]> = {
    intelligence: [0, 0],
    executive: [1, 0],
    investment: [2, 0],
    network: [0, 1],
    growth: [1, 1],
    firm_os: [2, 1],
    ryan: [1, 2],
  };
  const rows = ryan ? 3 : 2;
  const top = 58;
  const bottom = 64;
  const gap = (height - top - bottom) / Math.max(1, rows - 1);
  const colW = width / 3;
  const max = Math.max(1, ...nodes.map((node) => node.count));
  const points = new Map<string, Point>();
  for (const node of nodes) {
    const slot = grid[node.key] ?? [1, 0];
    const share = Math.sqrt(Math.max(node.count, 1) / max);
    points.set(node.key, {
      x: colW * (slot[0] + 0.5),
      y: top + gap * slot[1],
      r: 16 + share * (width < 560 ? 14 : 20),
    });
  }
  return points;
}

function edgePath(from: Point, to: Point, bend: number): string {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const nx = -uy * bend;
  const ny = ux * bend;
  const start = { x: from.x + ux * (from.r + 10), y: from.y + uy * (from.r + 10) };
  const end = { x: to.x - ux * (to.r + 16), y: to.y - uy * (to.r + 16) };
  const mx = (start.x + end.x) / 2 + nx;
  const my = (start.y + end.y) / 2 + ny;
  return `M ${start.x.toFixed(1)} ${start.y.toFixed(1)} Q ${mx.toFixed(1)} ${my.toFixed(1)} ${end.x.toFixed(1)} ${end.y.toFixed(1)}`;
}

function teamBotsFor(bots: DeskBot[], node: FlowNode): DeskBot[] {
  const ids = new Set(node.botIds);
  return bots.filter((bot) => ids.has(bot.id));
}

function rank(status: DeskBot["status"]): number {
  if (status === "Needs Ryan") return 0;
  if (status === "Working") return 1;
  return 2;
}

function matrixName(key: string): string {
  if (key === "intelligence") return "Intel";
  if (key === "executive") return "Exec";
  if (key === "investment") return "Inv";
  if (key === "network") return "Net";
  if (key === "growth") return "Gro";
  if (key === "firm_os") return "Firm";
  return "Ryan";
}

function clip(value: string, max: number): string {
  if (value.length <= max) return value;
  const cut = value.slice(0, max - 1).replace(/\s\S*$/, "");
  return `${cut || value.slice(0, max - 1)}…`;
}

function paintClock(handoff: FlowHandoff | null, clock: HTMLSpanElement | null, range: HTMLInputElement | null) {
  const text = handoff?.ct ?? "No handoffs";
  if (clock) clock.textContent = text;
  if (range) range.setAttribute("aria-valuetext", text);
}

function showTicker(node: HTMLParagraphElement | null, text: string) {
  if (!node) return;
  node.hidden = false;
  node.textContent = text;
  node.classList.remove("is-on");
  void node.offsetWidth;
  node.classList.add("is-on");
}

function stepPackets(list: Flyer[], dt: number) {
  for (let index = list.length - 1; index >= 0; index--) {
    const flyer = list[index];
    if (!flyer) continue;
    flyer.t += dt / flyer.dur;
    const point = flyer.path.getPointAtLength(Math.max(0, Math.min(1, flyer.t)) * flyer.len);
    flyer.el.setAttribute("cx", point.x.toFixed(1));
    flyer.el.setAttribute("cy", point.y.toFixed(1));
    if (flyer.t < 1) continue;
    flyer.el.remove();
    list.splice(index, 1);
    if (!list.some((item) => item.path === flyer.path)) flyer.path.classList.remove("is-hot");
  }
}

function clearPackets(list: Flyer[]) {
  for (const flyer of list) {
    flyer.el.remove();
    flyer.path.classList.remove("is-hot");
  }
  list.length = 0;
}
