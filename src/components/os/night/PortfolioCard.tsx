import Link from "next/link";
import { StackBar } from "./Charts";
import type { Portfolio } from "@/lib/os/portfolio";
import { usd } from "@/lib/os/raise-model";

/** The companies Backfield is in or has decided to back, above the pitch list. */
export function PortfolioCard({ portfolio, spvHref, dealHref, portfolioHref }: { portfolio: Portfolio; spvHref: (id: string) => string; dealHref: (id: string) => string; portfolioHref: string }) {
  if (!portfolio.rows.length) return <p className="port-link-empty"><Link href={portfolioHref} prefetch>Open the portfolio</Link> to record holdings, marks and returns.</p>;
  const { invested, deployed, decided } = portfolio;
  return (
    <section className="sx-card inv-hist port" aria-label="Portfolio">
      <div className="port-card-head">
        <h2 className="sx-h2">Portfolio</h2>
        <Link href={portfolioHref} prefetch>Holdings, marks and returns</Link>
      </div>
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
      {portfolio.rows.some((row) => row.amount) ? (
        <StackBar
          label="Money by company"
          format={usd}
          parts={portfolio.rows
            .filter((row) => row.amount)
            .slice(0, 4)
            .map((row, i) => ({ key: row.key, label: row.company, value: row.amount ?? 0, tone: (["hard", "mid", "soft", "pale"] as const)[i] }))}
        />
      ) : null}
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
