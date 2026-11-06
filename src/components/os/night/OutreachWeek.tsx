import type { TrackWeek } from "@/lib/os/outreach-history";

/**
 * Seven days of outreach per track, one small chart each. Bars are sent;
 * the short rule across each bar is that day's target. A bar that met its
 * target is solid; a miss is tinted, and the totals say so in words.
 */
export function OutreachWeek({ weeks, compact = false }: { weeks: TrackWeek[]; compact?: boolean }) {
  if (!weeks.length) return null;
  return (
    <section className={`ow${compact ? " is-compact" : ""}`} aria-label="Outreach this week">
      <h2>Outreach, last 7 days</h2>
      <div className="ow-grid">
        {weeks.map((week) => (
          <TrackChart key={week.track} week={week} />
        ))}
      </div>
    </section>
  );
}

function TrackChart({ week }: { week: TrackWeek }) {
  const max = Math.max(1, ...week.days.map((day) => Math.max(day.sent ?? 0, day.floor ?? 0)));
  const W = 210;
  const H = 64;
  const slot = W / 7;
  const bar = Math.min(18, slot - 8);
  const y = (value: number) => H - (value / max) * (H - 4);
  const delta = week.lastWeekSent != null ? week.sentTotal - week.lastWeekSent : null;
  return (
    <figure className="ow-track">
      <figcaption>
        <b>{week.label}</b>
        <span>
          {week.sentTotal.toLocaleString("en-US")} of {week.floorTotal.toLocaleString("en-US")} sent · hit {week.hitDays} of {week.reportedDays} {week.reportedDays === 1 ? "day" : "days"}
          {delta != null ? ` · ${delta >= 0 ? "+" : ""}${delta.toLocaleString("en-US")} vs last week` : ""}
        </span>
      </figcaption>
      <svg viewBox={`0 0 ${W} ${H + 16}`} role="img" aria-label={`${week.label}: ${week.days.map((day) => `${day.weekday} ${day.sent ?? "no report"}${day.floor ? ` of ${day.floor}` : ""}`).join(", ")}`}>
        <line className="ow-base" x1="0" x2={W} y1={H} y2={H} />
        {week.days.map((day, index) => {
          const x = index * slot + (slot - bar) / 2;
          const sent = day.sent ?? 0;
          const hit = day.sent != null && (day.floor ?? 0) > 0 && sent >= (day.floor ?? 0);
          const top = y(sent);
          return (
            <g key={day.date}>
              <title>{`${day.weekday}: ${day.sent == null ? "no report" : `${sent} sent`}${day.floor ? `, target ${day.floor}` : ""}`}</title>
              <rect className="ow-hit" x={index * slot} y="0" width={slot} height={H + 16} fill="transparent" />
              {day.sent != null && sent > 0 ? <path className={hit ? "ow-bar" : "ow-bar is-miss"} d={roundedTop(x, top, bar, H - top)} /> : null}
              {day.sent == null ? <text className="ow-na" x={x + bar / 2} y={H - 4} textAnchor="middle">–</text> : null}
              {day.floor ? <line className="ow-floor" x1={x - 3} x2={x + bar + 3} y1={y(day.floor)} y2={y(day.floor)} /> : null}
              <text className="ow-day" x={x + bar / 2} y={H + 13} textAnchor="middle">
                {day.weekday.slice(0, 1)}
              </text>
            </g>
          );
        })}
      </svg>
    </figure>
  );
}

function roundedTop(x: number, y: number, w: number, h: number): string {
  const r = Math.min(4, w / 2, h);
  return `M${x},${y + h} V${y + r} Q${x},${y} ${x + r},${y} H${x + w - r} Q${x + w},${y} ${x + w},${y + r} V${y + h} Z`;
}
