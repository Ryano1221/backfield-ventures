import Link from "next/link";
import type { HistoryRow } from "@/lib/os/investor-history";
import { usd } from "@/lib/os/raise-model";

/** One person's money with Backfield, across Fund I and every SPV. */
export function InvestorHistory({ rows, committed, soft, fundHref, spvHref }: { rows: HistoryRow[]; committed: number; soft: number; fundHref: string; spvHref: (id: string) => string }) {
  if (!rows.length) return null;
  return (
    <section className="sx-card inv-hist" aria-label="With Backfield">
      <h2 className="sx-h2">With Backfield</h2>
      <p className="inv-total">
        <b>{usd(committed)}</b> committed or wired{soft ? <> · {usd(soft)} soft</> : null}
      </p>
      <ul className="inv-rows">
        {rows.map((row) => (
          <li key={`${row.kind}-${row.spvId ?? row.label}`}>
            <Link href={row.kind === "spv" && row.spvId ? spvHref(row.spvId) : fundHref} prefetch>
              <b>{row.label}</b>
              <span>{row.detail}</span>
            </Link>
            <span className="inv-amt">{row.amount != null ? `${usd(row.amount)}${row.kind === "pipeline" ? " expected" : ""}` : "No amount yet"}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
