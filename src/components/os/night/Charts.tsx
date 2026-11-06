/**
 * Small, quiet charts for the OS. One green, light to dark: darker means
 * further along (wired, committed, closed). Soft money is a hatched light
 * green so it never reads as real. Every chart carries its own text label.
 */

export type Part = { key: string; label: string; value: number; tone: "hard" | "mid" | "soft" | "pale" | "hatch" };

/** On the dark green panels the same steps run in white. */
const DARK_TONE: Record<Part["tone"], string> = {
  hard: "#FFFFFF",
  mid: "rgba(255, 255, 255, 0.62)",
  soft: "rgba(255, 255, 255, 0.45)",
  pale: "rgba(255, 255, 255, 0.3)",
  hatch: "rgba(255, 255, 255, 0.3)",
};

const TONE: Record<Part["tone"], string> = {
  hard: "#123D22",
  mid: "#3E7A52",
  soft: "#7FB08D",
  pale: "#BFD9C6",
  hatch: "url(#os-hatch)",
};

/** Rendered once by the frame so every chart can point at the same hatch. */
export function ChartDefs() {
  return (
    <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true" focusable="false">
      <defs>
      <pattern id="os-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
        <rect width="6" height="6" fill="#DCEBE0" />
        <line x1="0" y1="0" x2="0" y2="6" stroke="#7FB08D" strokeWidth="2.5" />
      </pattern>
      </defs>
    </svg>
  );
}

/** A ring that fills toward a total. Center text is the headline number. */
export function Ring({ parts, total, size = 120, stroke = 12, label, children, dark = false }: { parts: Part[]; total: number; size?: number; stroke?: number; label: string; children?: React.ReactNode; dark?: boolean }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const gap = 2;
  const shown = parts.filter((part) => part.value > 0);
  const sum = shown.reduce((acc, part) => acc + part.value, 0);
  const scale = total > 0 ? Math.max(total, sum) : sum || 1;
  const lens = shown.map((part) => (part.value / scale) * c);
  const starts = lens.map((_, i) => lens.slice(0, i).reduce((acc, len) => acc + len, 0));
  return (
    <span className={`os-ring${dark ? " is-dark" : ""}`} style={{ width: size, height: size }} role="img" aria-label={label}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" className="os-ring-track" strokeWidth={stroke} />
        {shown.map((part, i) => {
          const len = lens[i];
          const offset = starts[i];
          const dash = Math.max(0, len - (shown.length > 1 || len < c ? gap : 0));
          const el = (
            <circle
              key={part.key}
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={dark ? DARK_TONE[part.tone] : TONE[part.tone]}
              strokeWidth={stroke}
              strokeLinecap="butt"
              strokeDasharray={`${dash} ${c - dash}`}
              strokeDashoffset={-offset}
              className="os-ring-seg"
              style={{ ["--d" as string]: `${dash}px`, ["--g" as string]: `${c - dash}px`, ["--c" as string]: `${c}px`, animationDelay: `${120 + i * 140}ms` }}
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
            >
              <title>{`${part.label}`}</title>
            </circle>
          );
          return el;
        })}
      </svg>
      {children ? <span className="os-ring-c">{children}</span> : null}
    </span>
  );
}

/** One horizontal bar split into parts, with a legend under it. */
export function StackBar({ parts, total, label, legend = true, format = (n: number) => String(n) }: { parts: Part[]; total?: number; label: string; legend?: boolean; format?: (n: number) => string }) {
  const shown = parts.filter((part) => part.value > 0);
  const sum = shown.reduce((acc, part) => acc + part.value, 0);
  const scale = Math.max(total ?? 0, sum) || 1;
  return (
    <div className="os-stack">
      <span className="os-stack-bar" role="img" aria-label={label}>
        {shown.map((part, index) => (
          <i key={part.key} className={`is-${part.tone}`} style={{ width: `${(part.value / scale) * 100}%`, animationDelay: `${index * 110}ms` }} title={`${part.label}: ${format(part.value)}`} />
        ))}
      </span>
      {legend && shown.length ? (
        <ul className="os-legend">
          {shown.map((part) => (
            <li key={part.key}>
              <i className={`os-swatch is-${part.tone}`} aria-hidden="true" />
              <span>{part.label}</span>
              <b>{format(part.value)}</b>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

/** A row of dots, one per checklist step: filled when done. */
export function StepDots({ steps, done, label }: { steps: readonly string[]; done: readonly string[]; label: string }) {
  const next = steps.find((step) => !done.includes(step));
  return (
    <span className="os-dots" role="img" aria-label={label}>
      {steps.map((step) => (
        <i key={step} className={done.includes(step) ? "is-done" : step === next ? "is-next" : ""} title={step} />
      ))}
    </span>
  );
}

/** Columns over time, e.g. pitches per day. Peak and latest are labeled; every column has a tooltip. */
export function Columns({ rows, label, unit }: { rows: { day: string; label: string; count: number }[]; label: string; unit: [string, string] }) {
  const max = Math.max(1, ...rows.map((row) => row.count));
  const total = rows.reduce((sum, row) => sum + row.count, 0);
  const peak = rows.reduce((best, row, i) => (row.count > rows[best].count ? i : best), 0);
  const word = (n: number) => (n === 1 ? unit[0] : unit[1]);
  return (
    <figure className="os-cols" aria-label={`${label}: ${total} ${word(total)}`}>
      <div className="os-cols-plot">
        {rows.map((row, i) => (
          <span key={row.day} className="os-col" title={`${row.label}: ${row.count} ${word(row.count)}`}>
            <i className={row.count ? "" : "is-zero"} style={{ height: `${row.count ? Math.max(6, (row.count / max) * 100) : 2}%`, animationDelay: `${i * 35}ms` }}>
              {(i === peak && row.count > 0) || (i === rows.length - 1 && row.count > 0) ? <em>{row.count}</em> : null}
            </i>
          </span>
        ))}
      </div>
      <figcaption className="os-cols-axis" aria-hidden="true">
        <span>{rows[0]?.label}</span>
        <span>{rows[rows.length - 1]?.label}</span>
      </figcaption>
      <table className="sr-only">
        <caption>{label}</caption>
        <tbody>
          {rows.map((row) => (
            <tr key={row.day}>
              <th scope="row">{row.label}</th>
              <td>{row.count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
