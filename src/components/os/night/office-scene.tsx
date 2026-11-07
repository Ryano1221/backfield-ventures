import type { ReactNode } from "react";
import { GRID, ZONES, type Desk, type OfficeLayout, type Pod } from "@/lib/os/office-space";

/** Isometric projection: one floor tile is TW wide and TH tall on screen. */
export const TW = 48;
export const TH = 24;
const WALL = 132;
const OX = GRID.h * (TW / 2) + 24;
const OY = WALL + 36;
export const SCENE = { w: (GRID.w + GRID.h) * (TW / 2) + 48, h: OY + (GRID.w + GRID.h) * (TH / 2) + 40 };

export function iso(x: number, y: number, z = 0): [number, number] {
  return [OX + (x - y) * (TW / 2), OY + (x + y) * (TH / 2) - z];
}

const pts = (list: [number, number, number][]) => list.map(([x, y, z]) => iso(x, y, z).map((n) => n.toFixed(1)).join(",")).join(" ");

export const NEON: Record<string, string> = {
  Executive: "#3DDC84",
  Network: "#4DA3FF",
  Investment: "#FFB547",
  Intelligence: "#B48CFF",
  Growth: "#FF7A45",
  "Firm OS": "#9FB3C8",
};
export const neonOf = (team: string) => NEON[team] ?? NEON["Firm OS"];

/** A box with top and the two faces the camera sees. */
function Box({ x, y, w, d, h, z = 0, top, left, right, stroke }: { x: number; y: number; w: number; d: number; h: number; z?: number; top: string; left: string; right: string; stroke?: string }) {
  const z1 = z + h;
  return (
    <g stroke={stroke ?? "none"} strokeWidth={stroke ? 0.8 : 0}>
      <polygon points={pts([[x, y + d, z], [x + w, y + d, z], [x + w, y + d, z1], [x, y + d, z1]])} fill={left} />
      <polygon points={pts([[x + w, y, z], [x + w, y + d, z], [x + w, y + d, z1], [x + w, y, z1]])} fill={right} />
      <polygon points={pts([[x, y, z1], [x + w, y, z1], [x + w, y + d, z1], [x, y + d, z1]])} fill={top} />
    </g>
  );
}

/** Something drawn flat on a wall or the floor, in local pixels (24 per tile). */
function OnRightWall({ x, z, children }: { x: number; z: number; children: ReactNode }) {
  const [sx, sy] = iso(x, 0, z);
  return <g transform={`matrix(1 0.5 0 1 ${sx.toFixed(1)} ${sy.toFixed(1)})`}>{children}</g>;
}
function OnLeftWall({ y, z, children }: { y: number; z: number; children: ReactNode }) {
  // Reads left to right from the front of the wall toward the back corner.
  const [sx, sy] = iso(0, y, z);
  return <g transform={`matrix(1 -0.5 0 1 ${sx.toFixed(1)} ${sy.toFixed(1)})`}>{children}</g>;
}
function OnFloor({ x, y, children }: { x: number; y: number; children: ReactNode }) {
  const [sx, sy] = iso(x, y);
  return <g transform={`matrix(1 0.5 -1 0.5 ${sx.toFixed(1)} ${sy.toFixed(1)})`}>{children}</g>;
}

function zone(key: string) {
  return ZONES.find((z) => z.key === key)!;
}

export type SceneCounts = { working: number; needs: number; doneToday: number; idle: number };

/**
 * The room itself: floor, walls, glass offices, lounge, break room and the
 * field, with Backfield branding and sports and CPG details. Desks and bots are
 * drawn on top, sorted by depth, by the live layer.
 */
export function OfficeScene({ layout, counts, failedRoutine }: { layout: OfficeLayout; counts: SceneCounts; failedRoutine: string | null }) {
  const exec = zone("exec");
  const lab = zone("lab");
  const lounge = zone("lounge");
  const brk = zone("break");
  const field = zone("lobby");
  const W = GRID.w;
  const H = GRID.h;
  return (
    <svg className="lo-scene" viewBox={`0 0 ${SCENE.w} ${SCENE.h}`} width={SCENE.w} height={SCENE.h} aria-hidden="true">
      <defs>
        <linearGradient id="lo-wall-r" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#141b24" />
          <stop offset="1" stopColor="#0c1118" />
        </linearGradient>
        <linearGradient id="lo-wall-l" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#111821" />
          <stop offset="1" stopColor="#0a0f15" />
        </linearGradient>
        <radialGradient id="lo-glow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#3DDC84" stopOpacity="0.35" />
          <stop offset="1" stopColor="#3DDC84" stopOpacity="0" />
        </radialGradient>
        <filter id="lo-neon" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2.4" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <pattern id="lo-turf" width="12" height="12" patternUnits="userSpaceOnUse">
          <rect width="12" height="12" fill="#0f3b24" />
          <path d="M0 12 L12 0" stroke="#124a2c" strokeWidth="3" />
        </pattern>
      </defs>

      {/* Floor */}
      <polygon points={pts([[0, 0, 0], [W, 0, 0], [W, H, 0], [0, H, 0]])} fill="#0d131b" />
      <g stroke="#17202b" strokeWidth="0.7">
        {Array.from({ length: W + 1 }, (_, i) => (
          <line key={`gx${i}`} x1={iso(i, 0)[0]} y1={iso(i, 0)[1]} x2={iso(i, H)[0]} y2={iso(i, H)[1]} />
        ))}
        {Array.from({ length: H + 1 }, (_, i) => (
          <line key={`gy${i}`} x1={iso(0, i)[0]} y1={iso(0, i)[1]} x2={iso(W, i)[0]} y2={iso(W, i)[1]} />
        ))}
      </g>

      {/* Back walls */}
      <polygon points={pts([[0, 0, 0], [W, 0, 0], [W, 0, WALL], [0, 0, WALL]])} fill="url(#lo-wall-r)" />
      <polygon points={pts([[0, 0, 0], [0, H, 0], [0, H, WALL], [0, 0, WALL]])} fill="url(#lo-wall-l)" />
      <polyline points={pts([[0, H, WALL], [0, 0, WALL], [W, 0, WALL]])} fill="none" stroke="#3DDC84" strokeOpacity="0.5" strokeWidth="1.5" filter="url(#lo-neon)" />
      <polyline points={pts([[0, H, 6], [0, 0, 6], [W, 0, 6]])} fill="none" stroke="#1f2a36" strokeWidth="2" />

      {/* The field: turf, yard lines, the Backfield medallion at midfield */}
      <polygon points={pts([[field.x, field.y, 0], [field.x + field.w, field.y, 0], [field.x + field.w, field.y + field.h, 0], [field.x, field.y + field.h, 0]])} fill="url(#lo-turf)" />
      <g stroke="#e8f5ec" strokeOpacity="0.55" strokeWidth="1.2">
        {Array.from({ length: 7 }, (_, i) => {
          const x = field.x + 0.5 + i * 2;
          return <line key={`yd${i}`} x1={iso(x, field.y + 0.3)[0]} y1={iso(x, field.y + 0.3)[1]} x2={iso(x, field.y + field.h - 0.3)[0]} y2={iso(x, field.y + field.h - 0.3)[1]} />;
        })}
      </g>
      {["10", "20", "30", "40", "30", "20", "10"].map((n, i) => (
        <OnFloor key={`num${i}`} x={field.x + 0.2 + i * 2} y={field.y + field.h - 1.1}>
          <text x="0" y="0" fill="#e8f5ec" fillOpacity="0.5" fontSize="13" fontWeight="800" fontFamily="var(--text, sans-serif)">
            {n}
          </text>
        </OnFloor>
      ))}
      <OnFloor x={field.x + field.w / 2 - 2.3} y={field.y + field.h / 2 - 2.3}>
        <circle cx="55" cy="55" r="58" fill="none" stroke="#3DDC84" strokeOpacity="0.75" strokeWidth="2.5" />
        <image href="/brand/bv-mark.png" x="0" y="0" width="110" height="110" />
      </OnFloor>
      <ellipse cx={iso(field.x + field.w / 2, field.y + field.h / 2)[0]} cy={iso(field.x + field.w / 2, field.y + field.h / 2)[1]} rx="120" ry="60" fill="url(#lo-glow)" />

      {/* Right wall: the Backfield stadium logo over the team pods, the lab sign */}
      <OnRightWall x={11.2} z={WALL - 14}>
        <rect x="-10" y="-8" width="330" height="112" rx="8" fill="#070b10" stroke="#3DDC84" strokeOpacity="0.45" />
        <image href="/brand/bv-mark.png" x="0" y="0" width="96" height="96" />
        <image href="/brand/backfield-wordmark.png" x="104" y="10" width="208" height="45" preserveAspectRatio="xMidYMid meet" />
        <text x="106" y="76" fill="#3DDC84" fontSize="9" fontWeight="800" letterSpacing="2.2">AUSTIN, TEXAS</text>
        <text x="106" y="90" fill="#9fb3c8" fontSize="7.5" letterSpacing="1.2">SPORTS · CONSUMER BRANDS · CPG</text>
      </OnRightWall>
      <OnRightWall x={25.4} z={WALL - 16}>
        <text x="0" y="0" fill="#4DD8FF" fontSize="14" fontWeight="800" letterSpacing="2" filter="url(#lo-neon)">SPORTS DATA LAB</text>
      </OnRightWall>
      <OnRightWall x={1.6} z={WALL - 22}>
        <rect x="0" y="0" width="150" height="54" rx="4" fill="#0f1720" stroke="#3DDC84" strokeOpacity="0.4" />
        <text x="10" y="20" fill="#e8f0f7" fontSize="9.5" fontWeight="700">Behind the next generation</text>
        <text x="10" y="34" fill="#e8f0f7" fontSize="9.5" fontWeight="700">of sports and consumer brands.</text>
        <text x="10" y="47" fill="#3DDC84" fontSize="7.5" letterSpacing="1">BACKFIELD VENTURES</text>
      </OnRightWall>

      {/* Left wall: the scoreboard with live office numbers, pennants, the film-study screen */}
      <OnLeftWall y={16.2} z={WALL - 12}>
        <rect x="0" y="0" width="186" height="82" rx="5" fill="#05080c" stroke="#2a3644" strokeWidth="2" />
        <image href="/brand/bv-mark.png" x="160" y="4" width="20" height="20" />
        <text x="12" y="17" fill="#FFB547" fontSize="9" fontWeight="800" letterSpacing="2">HOME · TODAY</text>
        {[
          ["WORKING", counts.working, "#36D17A"],
          ["NEED YOU", counts.needs, "#F5B83D"],
          ["DONE", counts.doneToday, "#4DA3FF"],
        ].map(([label, n, color], i) => (
          <g key={String(label)} transform={`translate(${12 + i * 60} 26)`}>
            <rect width="52" height="34" rx="3" fill="#0d141c" />
            <text x="26" y="25" textAnchor="middle" fill={String(color)} fontSize="22" fontWeight="800" fontFamily="ui-monospace, monospace" className="lo-led">
              {String(n).padStart(2, "0")}
            </text>
            <text x="26" y="47" textAnchor="middle" fill="#9fb3c8" fontSize="7" letterSpacing="1">{String(label)}</text>
          </g>
        ))}
      </OnLeftWall>
      <OnLeftWall y={24.4} z={WALL - 16}>
        <rect x="0" y="0" width="170" height="96" rx="4" fill="#060a0f" stroke="#4DA3FF" strokeOpacity="0.5" />
        <text x="10" y="15" fill="#4DA3FF" fontSize="8" fontWeight="800" letterSpacing="2">FILM STUDY</text>
        <g className="lo-play" stroke="#e8f0f7" strokeWidth="1.4" fill="none">
          {[30, 60, 90, 120].map((x) => (
            <circle key={x} cx={x} cy="62" r="5" />
          ))}
          {[40, 80, 115].map((x) => (
            <g key={x}>
              <line x1={x - 4} y1="40" x2={x + 4} y2="48" />
              <line x1={x + 4} y1="40" x2={x - 4} y2="48" />
            </g>
          ))}
          <path className="lo-route" d="M60 62 Q 75 30 130 28" stroke="#FFB547" strokeDasharray="4 3" />
          <path className="lo-route" d="M30 62 Q 20 40 45 26" stroke="#3DDC84" strokeDasharray="4 3" />
        </g>
        <text x="10" y="88" fill="#9fb3c8" fontSize="7">Review the tape</text>
        <image href="/brand/bv-mark.png" x="146" y="72" width="18" height="18" opacity="0.9" />
      </OnLeftWall>
      <OnLeftWall y={8.6} z={WALL - 18}>
        {["#3DDC84", "#4DA3FF", "#FF7A45"].map((c, i) => (
          <g key={c} transform={`translate(${i * 34} 0)`}>
            <polygon points="0,0 28,8 0,16" fill={c} fillOpacity="0.85" />
            <line x1="0" y1="-4" x2="0" y2="22" stroke="#9fb3c8" />
          </g>
        ))}
        <text x="0" y="40" fill="#9fb3c8" fontSize="7.5" letterSpacing="1">ATHLETE VENTURES · FAN ENGAGEMENT · WELLNESS</text>
      </OnLeftWall>

      {/* Executive office floor and furniture (glass walls come later, in front) */}
      <polygon points={pts([[exec.x, exec.y, 0.5], [exec.x + exec.w, exec.y, 0.5], [exec.x + exec.w, exec.y + exec.h, 0.5], [exec.x, exec.y + exec.h, 0.5]])} fill="#14211a" />
      <Box x={layout.ryan.x - 0.6} y={layout.ryan.y - 0.9} w={1.2} d={0.5} h={22} top="#2a6b45" left="#1b4a30" right="#16402a" stroke="#3DDC84" />
      <OnFloor x={layout.ryan.x - 0.8} y={layout.ryan.y + 0.2}>
        <text x="0" y="0" fill="#3DDC84" fontSize="10" fontWeight="800" letterSpacing="1.5">RYAN</text>
      </OnFloor>
      <Box x={exec.x + 0.4} y={exec.y + 0.3} w={2.2} d={0.5} h={58} top="#23303d" left="#1a242f" right="#141c25" />
      {[0, 1, 2].map((i) => (
        <Box key={`book${i}`} x={exec.x + 0.55 + i * 0.6} y={exec.y + 0.35} w={0.35} d={0.4} h={10} z={20 + (i % 2) * 18} top={["#FFB547", "#4DA3FF", "#FF7A45"][i]} left="#0f1720" right="#0f1720" />
      ))}

      {/* Lab: racks with blinking lights, and the failed-routine screen */}
      <polygon points={pts([[lab.x, lab.y, 0.5], [lab.x + lab.w, lab.y, 0.5], [lab.x + lab.w, lab.y + lab.h, 0.5], [lab.x, lab.y + lab.h, 0.5]])} fill="#0f1a24" />
      {[0, 1, 2, 3].map((i) => (
        <g key={`rack${i}`}>
          <Box x={lab.x + 0.6 + i * 1.8} y={lab.y + 0.4} w={1.2} d={0.9} h={86} top="#1b2633" left="#121a24" right="#0e151d" stroke="#4DD8FF" />
          {Array.from({ length: 6 }, (_, j) => {
            const [lx, ly] = iso(lab.x + 0.9 + i * 1.8 + (j % 2) * 0.5, lab.y + 1.3, 14 + Math.floor(j / 2) * 22);
            return <circle key={j} cx={lx} cy={ly} r="1.6" className={`lo-led-dot d${(i + j) % 4}`} fill={j % 3 ? "#36D17A" : "#4DD8FF"} />;
          })}
        </g>
      ))}
      <Box x={lab.x + 2.2} y={lab.y + 2.8} w={2.6} d={0.6} h={20} top="#202c39" left="#16202a" right="#121a23" />
      {failedRoutine ? (
        <g>
          <Box x={lab.x + 2.6} y={lab.y + 2.9} w={1.8} d={0.12} h={26} z={20} top="#3a0d14" left="#5c1520" right="#4a111a" />
          <text x={iso(lab.x + 3.5, lab.y + 3.0, 34)[0]} y={iso(lab.x + 3.5, lab.y + 3.0, 34)[1]} textAnchor="middle" fill="#FF4D5E" fontSize="7" fontWeight="800" className="lo-alert-text">
            ROUTINE FAILED
          </text>
        </g>
      ) : null}

      {/* Lounge: rug, sofas, a football on the table */}
      <polygon points={pts([[lounge.x + 1.2, lounge.y + 1.2, 0], [lounge.x + 7.6, lounge.y + 1.2, 0], [lounge.x + 7.6, lounge.y + 7.2, 0], [lounge.x + 1.2, lounge.y + 7.2, 0]])} fill="#1a1530" stroke="#B48CFF" strokeOpacity="0.4" />
      <Box x={lounge.x + 1.4} y={lounge.y + 1.4} w={5.8} d={0.9} h={12} top="#2b2547" left="#221d39" right="#1c1830" />
      <Box x={lounge.x + 1.4} y={lounge.y + 2.3} w={0.9} d={4.6} h={12} top="#2b2547" left="#221d39" right="#1c1830" />
      <Box x={lounge.x + 3.6} y={lounge.y + 3.6} w={1.6} d={1.2} h={8} top="#3a3354" left="#2a2440" right="#241f37" />
      <ellipse cx={iso(lounge.x + 4.4, lounge.y + 4.2, 10)[0]} cy={iso(lounge.x + 4.4, lounge.y + 4.2, 10)[1]} rx="7" ry="4.2" fill="#8a4b22" stroke="#f3e6d8" strokeWidth="0.8" />

      {/* Break room: highlight-reel TV, drinks fridge, a shelf of CPG brands, coffee bar */}
      <polygon points={pts([[brk.x, brk.y, 0.4], [brk.x + brk.w, brk.y, 0.4], [brk.x + brk.w, brk.y + brk.h, 0.4], [brk.x, brk.y + brk.h, 0.4]])} fill="#161a14" />
      <Box x={brk.x + 0.4} y={brk.y + 0.3} w={3.2} d={0.3} h={8} top="#252b33" left="#1b2128" right="#161b21" />
      <Box x={brk.x + 0.7} y={brk.y + 0.38} w={2.6} d={0.12} h={46} z={8} top="#0a0e13" left="#06090d" right="#06090d" />
      <OnRightWall x={brk.x + 0.75} z={58}>
        <g transform="translate(0 0)">
          <rect x="0" y="0" width="58" height="34" fill="#071019" />
          <text x="4" y="9" fill="#FF4D5E" fontSize="5.5" fontWeight="800" letterSpacing="0.8">● HIGHLIGHT REEL</text>
          <path className="lo-arc" d="M6 30 Q 28 2 52 26" stroke="#FFB547" strokeWidth="1.4" fill="none" strokeDasharray="60" />
          <ellipse className="lo-ball" cx="6" cy="30" rx="2.2" ry="1.5" fill="#c46a2c" />
          <image href="/brand/bv-mark.png" x="47" y="2" width="9" height="9" />
        </g>
      </OnRightWall>
      <Box x={brk.x + 6.6} y={brk.y + 0.4} w={1.0} d={0.9} h={52} top="#26303b" left="#1c242d" right="#171e26" stroke="#4DA3FF" />
      {Array.from({ length: 8 }, (_, i) => {
        const [cx, cy] = iso(brk.x + 7.6, brk.y + 0.55 + (i % 4) * 0.2, 12 + Math.floor(i / 4) * 16);
        return <rect key={`can${i}`} x={cx - 1} y={cy - 6} width="3" height="6" rx="1" fill={["#FF7A45", "#3DDC84", "#4DA3FF", "#FFB547"][i % 4]} />;
      })}
      <Box x={brk.x + 4.2} y={brk.y + 0.3} w={2.0} d={0.5} h={40} top="#2a2219" left="#1f1912" right="#19140e" />
      {Array.from({ length: 9 }, (_, i) => (
        <Box key={`cpg${i}`} x={brk.x + 4.3 + (i % 3) * 0.62} y={brk.y + 0.4} w={0.45} d={0.3} h={7} z={8 + Math.floor(i / 3) * 11} top={["#FFB547", "#FF7A45", "#3DDC84", "#B48CFF", "#4DA3FF"][i % 5]} left="#0f1720" right="#0f1720" />
      ))}
      {[[2, 3], [5, 3], [2, 6], [5, 6]].map(([tx, ty]) => (
        <g key={`t${tx}${ty}`}>
          <ellipse cx={iso(brk.x + tx, brk.y + ty, 14)[0]} cy={iso(brk.x + tx, brk.y + ty, 14)[1]} rx="16" ry="8" fill="#2a3340" stroke="#4a5868" />
          <line x1={iso(brk.x + tx, brk.y + ty, 14)[0]} y1={iso(brk.x + tx, brk.y + ty, 14)[1]} x2={iso(brk.x + tx, brk.y + ty, 0)[0]} y2={iso(brk.x + tx, brk.y + ty, 0)[1]} stroke="#4a5868" strokeWidth="2" />
        </g>
      ))}

      {/* Trophy case on the field's edge: a football and two mini helmets */}
      <Box x={field.x + field.w - 1.8} y={field.y + 0.2} w={1.4} d={0.6} h={30} top="#1b2a36" left="#14202b" right="#101a23" stroke="#FFB547" />
      <ellipse cx={iso(field.x + field.w - 1.1, field.y + 0.5, 34)[0]} cy={iso(field.x + field.w - 1.1, field.y + 0.5, 34)[1]} rx="5" ry="3" fill="#8a4b22" />

      <SportsSet />

      {/* Team pods: a floor mat and a neon name plate per team */}
      {layout.pods.map((pod) => (
        <PodFloor key={pod.team} pod={pod} />
      ))}

      {/* Zone labels */}
      {ZONES.filter((z) => z.key !== "pods" && z.key !== "skate").map((z) => (
        <OnFloor key={`lbl${z.key}`} x={z.x + 0.3} y={z.y + z.h - 0.5}>
          <text x="0" y="0" fill="#9fb3c8" fillOpacity="0.7" fontSize="9" fontWeight="700" letterSpacing="1.5">
            {z.label.toUpperCase()}
          </text>
        </OnFloor>
      ))}
    </svg>
  );
}

function PodFloor({ pod }: { pod: Pod }) {
  const c = neonOf(pod.team);
  return (
    <g>
      <polygon points={pts([[pod.x, pod.y, 0], [pod.x + pod.w, pod.y, 0], [pod.x + pod.w, pod.y + pod.h, 0], [pod.x, pod.y + pod.h, 0]])} fill={c} fillOpacity="0.07" stroke={c} strokeOpacity="0.45" strokeWidth="1" />
      <OnFloor x={pod.x + 0.2} y={pod.y + pod.h / 2 + 0.25}>
        <text x="0" y="0" fill={c} fontSize="8.5" fontWeight="800" letterSpacing="1.4" filter="url(#lo-neon)">
          {pod.team.toUpperCase()}
        </text>
      </OnFloor>
    </g>
  );
}

/** Glass fronts of the executive office and the lab, drawn over the bots inside them. */
export function GlassWalls() {
  const exec = zone("exec");
  const lab = zone("lab");
  const wall = (x1: number, y1: number, x2: number, y2: number, color: string, key: string) => (
    <g key={key}>
      <polygon points={pts([[x1, y1, 0], [x2, y2, 0], [x2, y2, 64], [x1, y1, 64]])} fill={color} fillOpacity="0.07" />
      <polyline points={pts([[x1, y1, 64], [x2, y2, 64]])} stroke={color} strokeOpacity="0.85" strokeWidth="1.6" filter="url(#lo-neon)" fill="none" />
      <polyline points={pts([[x1, y1, 0], [x2, y2, 0]])} stroke={color} strokeOpacity="0.5" strokeWidth="1" fill="none" />
    </g>
  );
  return (
    <svg className="lo-glass" viewBox={`0 0 ${SCENE.w} ${SCENE.h}`} width={SCENE.w} height={SCENE.h} aria-hidden="true">
      <defs>
        <filter id="lo-neon2" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2" />
        </filter>
      </defs>
      {/* Executive office: front walls with a door gap on the right side. */}
      {wall(exec.x, exec.y + exec.h, exec.x + exec.w, exec.y + exec.h, "#3DDC84", "e1")}
      {wall(exec.x + exec.w, exec.y, exec.x + exec.w, exec.y + exec.h - 2, "#3DDC84", "e2")}
      {/* Lab: door gap on the left side. */}
      {wall(lab.x, lab.y + lab.h, lab.x + lab.w, lab.y + lab.h, "#4DD8FF", "l1")}
      {wall(lab.x, lab.y, lab.x, lab.y + lab.h - 2, "#4DD8FF", "l2")}
      {/* Frosted plaque on the executive office glass, with the official black wordmark. */}
      {(() => {
        const [px, py] = iso(exec.x + 1.2, exec.y + exec.h, 58);
        return (
          <g transform={`matrix(1 0.5 0 1 ${px.toFixed(1)} ${py.toFixed(1)})`}>
            <rect x="0" y="0" width="118" height="34" rx="4" fill="#eef3f6" fillOpacity="0.88" stroke="#3DDC84" strokeWidth="1" />
            <image href="/brand/backfield-wordmark-outline.png" x="7" y="4" width="104" height="22" preserveAspectRatio="xMidYMid meet" />
            <text x="59" y="31" textAnchor="middle" fill="#123D22" fontSize="5.5" fontWeight="800" letterSpacing="1.4">EXECUTIVE OFFICE</text>
          </g>
        );
      })()}
    </svg>
  );
}

/** One desk with its monitor, lit in the team's neon while its owner works. */
export function DeskSprite({ desk, lit, alert }: { desk: Desk; lit: boolean; alert: boolean }) {
  const c = desk.exec ? NEON.Executive : neonOf(desk.team);
  const x = desk.x - 0.5;
  const y = desk.y - 0.3;
  const screenY = desk.facing === 1 ? y + 0.42 : y + 0.06;
  return (
    <g>
      <Box x={x} y={y} w={1} d={0.6} h={13} top={desk.exec ? "#2c3a2f" : "#26303b"} left="#1a222b" right="#151c24" />
      <Box x={x + 0.2} y={screenY} w={0.6} d={0.08} h={13} z={13} top="#05080c" left={lit ? c : "#0b1118"} right="#0b1118" />
      {lit ? <ellipse cx={iso(desk.x, desk.y, 14)[0]} cy={iso(desk.x, desk.y, 14)[1]} rx="16" ry="9" fill={c} opacity="0.22" className="lo-screen-glow" /> : null}
      {alert ? <circle cx={iso(desk.x, desk.y, 32)[0]} cy={iso(desk.x, desk.y, 32)[1]} r="3.5" fill="#FF4D5E" className="lo-alert-dot" /> : null}
    </g>
  );
}

/**
 * The sports and CPG set pieces: a skate halfpipe with a hoop, a locker room with
 * jerseys and a cold plunge, goalposts, cones and an agility ladder on the turf,
 * the wordmark in the end zone, a sideline cooler and a pallet of brand samples.
 * Only the official Backfield files are used for branding.
 */
function SportsSet() {
  const field = zone("lobby");
  const skate = zone("skate");
  const lock = zone("locker");
  // Halfpipe: the U runs along x, the ramp is `depth` tiles wide along y.
  const x0 = skate.x + 0.9;
  const x1 = skate.x + skate.w - 0.9;
  const y0 = skate.y + 1.2;
  const y1 = skate.y + 4.4;
  const H = 44;
  const mid = (x0 + x1) / 2;
  const half = (x1 - x0) / 2;
  const h = (x: number) => H * Math.max(0, (Math.abs(x - mid) - 0.9) / (half - 0.9)) ** 2;
  const steps = 28;
  const xs = Array.from({ length: steps + 1 }, (_, i) => x0 + ((x1 - x0) * i) / steps);
  const side = [...xs.map((x) => [x, y1, 0] as [number, number, number]), ...[...xs].reverse().map((x) => [x, y1, h(x)] as [number, number, number])];
  const goal = (x: number) => {
    const y = field.y + field.h / 2;
    const yellow = "#F5D33D";
    const [bx, by] = iso(x, y, 0);
    const [cx, cy] = iso(x, y, 30);
    const [l0x, l0y] = iso(x, y - 1.3, 30);
    const [l1x, l1y] = iso(x, y + 1.3, 30);
    const [u0x, u0y] = iso(x, y - 1.3, 78);
    const [u1x, u1y] = iso(x, y + 1.3, 78);
    return (
      <g key={`goal${x}`} stroke={yellow} strokeWidth="2.4" strokeLinecap="round" filter="url(#lo-neon)">
        <line x1={bx} y1={by} x2={cx} y2={cy} />
        <line x1={l0x} y1={l0y} x2={l1x} y2={l1y} />
        <line x1={l0x} y1={l0y} x2={u0x} y2={u0y} />
        <line x1={l1x} y1={l1y} x2={u1x} y2={u1y} />
      </g>
    );
  };
  return (
    <g>
      {/* Skate deck: concrete pad, the halfpipe, coping, the BV mark on the ramp's side */}
      <polygon points={pts([[skate.x, skate.y, 0], [skate.x + skate.w, skate.y, 0], [skate.x + skate.w, skate.y + skate.h, 0], [skate.x, skate.y + skate.h, 0]])} fill="#151a20" stroke="#FF7A45" strokeOpacity="0.35" />
      <Box x={x0 - 0.8} y={y0} w={0.8} d={y1 - y0} h={H} top="#3b2f25" left="#2a2119" right="#231b14" />
      {xs.slice(0, -1).map((x, i) => {
        const xn = xs[i + 1];
        const slope = (h(xn) - h(x)) / ((x1 - x0) / steps);
        const light = slope < 0 ? "#c9a273" : slope > 0 ? "#a07c55" : "#b48d63";
        return <polygon key={`hp${i}`} points={pts([[x, y0, h(x)], [xn, y0, h(xn)], [xn, y1, h(xn)], [x, y1, h(x)]])} fill={light} stroke="#8a6a46" strokeWidth="0.3" />;
      })}
      <polygon points={pts(side)} fill="#2d241b" />
      <Box x={x1} y={y0} w={0.8} d={y1 - y0} h={H} top="#3b2f25" left="#2a2119" right="#231b14" />
      <polyline points={pts([[x0, y0, H], [x0, y1, H]])} stroke="#FF7A45" strokeWidth="2.2" filter="url(#lo-neon)" fill="none" />
      <polyline points={pts([[x1, y0, H], [x1, y1, H]])} stroke="#FF7A45" strokeWidth="2.2" filter="url(#lo-neon)" fill="none" />
      {(() => {
        const [sx, sy] = iso(mid - 0.6, y1, 26);
        return (
          <g transform={`matrix(1 0.5 0 1 ${sx.toFixed(1)} ${sy.toFixed(1)})`}>
            <image href="/brand/bv-mark.png" x="0" y="-2" width="22" height="22" />
          </g>
        );
      })()}
      {/* A board leaning on the deck */}
      <Box x={x1 + 0.1} y={y1 + 0.2} w={0.9} d={0.25} h={2} top="#FF7A45" left="#c45a2f" right="#a84b26" />
      {/* Basketball hoop beside the deck */}
      {(() => {
        const px = skate.x + skate.w - 0.2;
        const py = skate.y + skate.h - 0.6;
        const [ax, ay] = iso(px, py, 0);
        const [bx, by] = iso(px, py, 74);
        const [rx, ry] = iso(px - 0.55, py, 62);
        return (
          <g>
            <line x1={ax} y1={ay} x2={bx} y2={by} stroke="#9fb3c8" strokeWidth="2.4" />
            <polygon points={pts([[px, py - 0.7, 58], [px, py + 0.7, 58], [px, py + 0.7, 84], [px, py - 0.7, 84]])} fill="#f4f7fa" fillOpacity="0.9" stroke="#0b1220" strokeWidth="0.8" />
            <ellipse cx={rx} cy={ry} rx="7" ry="3.2" fill="none" stroke="#FF7A45" strokeWidth="2" />
            <ellipse cx={iso(px - 1.2, py + 0.6, 4)[0]} cy={iso(px - 1.2, py + 0.6, 4)[1]} rx="4" ry="4" fill="#d9692b" stroke="#0b1220" strokeWidth="0.6" />
          </g>
        );
      })()}
      <OnFloor x={skate.x + 0.3} y={skate.y + skate.h - 0.4}>
        <text x="0" y="0" fill="#FF7A45" fillOpacity="0.85" fontSize="9" fontWeight="800" letterSpacing="1.5">SKATE DECK</text>
      </OnFloor>

      {/* Locker room: lockers on the wall, a couple open with jerseys, a bench, a cold plunge */}
      {Array.from({ length: 8 }, (_, i) => {
        const y = lock.y + 0.4 + i * 0.8;
        const open = i === 2 || i === 5;
        const jersey = ["#3DDC84", "#4DA3FF", "#FFB547", "#B48CFF", "#FF7A45", "#9FB3C8", "#3DDC84", "#4DA3FF"][i];
        return (
          <g key={`locker${i}`}>
            <Box x={lock.x} y={y} w={0.7} d={0.72} h={76} top="#2a3644" left="#1d2732" right={open ? "#0a0f15" : "#243140"} stroke="#3a4a5c" />
            {open ? (
              <g>
                <polygon points={pts([[0.72, y + 0.14, 58], [0.72, y + 0.58, 58], [0.72, y + 0.62, 30], [0.72, y + 0.1, 30]])} fill={jersey} />
                {(() => {
                  const [jx, jy] = iso(0.72, y + 0.25, 52);
                  return (
                    <g transform={`matrix(1 -0.5 0 1 ${jx.toFixed(1)} ${jy.toFixed(1)})`}>
                      <image href="/brand/bv-mark.png" x="0" y="0" width="9" height="9" />
                    </g>
                  );
                })()}
              </g>
            ) : (
              <g stroke="#0f151c" strokeWidth="0.8">
                {[50, 46, 42].map((z) => (
                  <line key={z} x1={iso(0.72, y + 0.2, z)[0]} y1={iso(0.72, y + 0.2, z)[1]} x2={iso(0.72, y + 0.52, z)[0]} y2={iso(0.72, y + 0.52, z)[1]} />
                ))}
              </g>
            )}
          </g>
        );
      })}
      <Box x={lock.x + 1.6} y={lock.y + 0.8} w={0.55} d={5.4} h={9} top="#5a4532" left="#3f3023" right="#36291e" />
      <Box x={lock.x + 4.6} y={lock.y + 1.6} w={2.2} d={1.4} h={14} top="#cfe6f5" left="#7f9fb5" right="#6c8ba0" stroke="#4DD8FF" />
      <polygon points={pts([[lock.x + 4.75, lock.y + 1.72, 14.2], [lock.x + 6.65, lock.y + 1.72, 14.2], [lock.x + 6.65, lock.y + 2.88, 14.2], [lock.x + 4.75, lock.y + 2.88, 14.2]])} fill="#4DD8FF" fillOpacity="0.55" className="lo-water" />
      <OnFloor x={lock.x + 4.5} y={lock.y + 3.6}>
        <text x="0" y="0" fill="#4DD8FF" fontSize="7.5" fontWeight="800" letterSpacing="1.2">COLD PLUNGE</text>
      </OnFloor>
      {/* Brand samples: a pallet of shipping boxes from portfolio-style CPG brands */}
      <Box x={lock.x + 6.6} y={lock.y + 4.6} w={1.4} d={1.2} h={3} top="#6b5236" left="#523f2a" right="#463624" />
      {[[0, 0, "#d8b98a"], [0.7, 0, "#c9a877"], [0, 0.6, "#d2b282"], [0.35, 0.3, "#e0c495"]].map(([dx, dy, c], i) => (
        <Box key={`box${i}`} x={lock.x + 6.65 + (dx as number)} y={lock.y + 4.65 + (dy as number)} w={0.62} d={0.52} h={11} z={3 + (i === 3 ? 11 : 0)} top={c as string} left="#a88a5c" right="#957a51" />
      ))}

      {/* The turf: goalposts, the official wordmark in the end zone, cones, an agility ladder, a sideline cooler */}
      {goal(field.x + 0.2)}
      {goal(field.x + field.w - 0.2)}
      {(() => {
        const [ex, ey] = iso(field.x + 0.45, field.y + field.h - 0.5);
        return (
          <g transform={`matrix(1 -0.5 1 0.5 ${ex.toFixed(1)} ${ey.toFixed(1)})`} opacity="0.85">
            <image href="/brand/backfield-wordmark.png" x="0" y="-8" width="140" height="30" preserveAspectRatio="xMidYMid meet" />
          </g>
        );
      })()}
      <g stroke="#FFB547" strokeOpacity="0.85" strokeWidth="1">
        {Array.from({ length: 6 }, (_, i) => (
          <polygon key={`lad${i}`} points={pts([[field.x + 3 + i * 0.5, field.y + 0.6, 0], [field.x + 3.5 + i * 0.5, field.y + 0.6, 0], [field.x + 3.5 + i * 0.5, field.y + 1.3, 0], [field.x + 3 + i * 0.5, field.y + 1.3, 0]])} fill="none" />
        ))}
      </g>
      {[[7, 1.0], [8.2, 1.6], [9.4, 1.0], [10.6, 1.6]].map(([dx, dy]) => {
        const [cx, cy] = iso(field.x + dx, field.y + dy, 0);
        return <polygon key={`cone${dx}`} points={`${cx - 4},${cy} ${cx + 4},${cy} ${cx},${cy - 11}`} fill="#FF7A45" stroke="#fff" strokeWidth="0.6" />;
      })}
      <Box x={field.x + field.w + 0.4} y={field.y + 0.6} w={0.7} d={0.7} h={18} top="#f4f7fa" left="#e5641f" right="#c9531a" />
    </g>
  );
}
