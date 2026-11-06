import Link from "next/link";
import type { Portfolio } from "@/lib/os/portfolio";
import { usd } from "@/lib/os/raise-model";

/** The companies Backfield is in or has decided to back, above the pitch list. */
export function PortfolioCard({ portfolio, spvHref, dealHref }: { portfolio: Portfolio; spvHref: (id: string) => string; dealHref: (id: string) => string }) {
  if (!portfolio.rows.length) return null;
  const { invested, deployed, decided } = portfolio;
  return (
    <section className="sx-card inv-hist port" aria-label="Portfolio">
      <h2 className="sx-h2">Portfolio</h2>
      <p className="inv-total">
        {invested ? (
          <>
            <b>{usd(deployed)}</b> in {invested} {invested === 1 ? "company" : "companies"}
          </>
        ) : (
          <b>No closed investments yet</b>
        )}
        {decided ? <> · {decided} more on the way</> : null}
      </p>
      <ul className="inv-rows">
        {portfolio.rows.map((row) => (
          <li key={row.key}>
            <Link href={row.spvId ? spvHref(row.spvId) : dealHref(row.dealId ?? "")} prefetch>
              <b>{row.company}</b>
              <span>
                {row.label}
                {row.vehicle ? ` · ${row.vehicle}` : ""}
                {row.investors ? ` · ${row.investors} ${row.investors === 1 ? "investor" : "investors"}` : ""}
              </span>
            </Link>
            <span className="inv-amt">{row.amount ? usd(row.amount) : row.spvId ? "$0 so far" : "Set up the SPV"}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
