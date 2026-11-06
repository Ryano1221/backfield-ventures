import Link from "next/link";
import type { HistoryRow } from "@/lib/os/investor-history";
import { usd } from "@/lib/os/raise-model";

/** One person's money with Backfield, across Fund I and every SPV. */
export function InvestorHistory({ rows, committed, soft, valueNow, fundHref, spvHref }: { rows: HistoryRow[]; committed: number; soft: number; valueNow?: number | null; fundHref: string; spvHref: (id: string) => string }) {
  if (!rows.length) return null;
  return (
    <section className="sx-card inv-hist" aria-label="With Backfield">
      <h2 className="sx-h2">With Backfield</h2>
      <p className="inv-total">
        <b>{usd(committed)}</b> committed or wired{soft ? <> · {usd(soft)} soft</> : null}
        {valueNow != null ? <> · SPV stakes marked at {usd(valueNow)}</> : null}
      </p>
      <ul className="inv-rows">
        {rows.map((row) => (
          <li key={`${row.kind}-${row.spvId ?? row.label}`}>
            <Link href={row.kind === "spv" && row.spvId ? spvHref(row.spvId) : fundHref} prefetch>
              <b>{row.label}</b>
              <span>{row.detail}</span>
            </Link>
            <span className="inv-amt">
              {row.amount != null ? `${usd(row.amount)}${row.kind === "pipeline" ? " expected" : ""}` : "No amount yet"}
              {row.value != null && row.moic != null ? <small className="inv-mark"> now {usd(row.value)} · {row.moic.toFixed(2)}x</small> : null}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
