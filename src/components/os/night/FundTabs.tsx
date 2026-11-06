import Link from "next/link";

/** Fundraising has two sides: the fund and deal-by-deal SPVs. */
export function FundTabs({ active, fundHref, spvHref, spvCount }: { active: "fund" | "spv"; fundHref: string; spvHref: string; spvCount: number }) {
  return (
    <nav className="fund-tabs" aria-label="Fundraising">
      <Link href={fundHref} className={active === "fund" ? "on" : ""} aria-current={active === "fund" ? "page" : undefined}>
        Fund I
      </Link>
      <Link href={spvHref} className={active === "spv" ? "on" : ""} aria-current={active === "spv" ? "page" : undefined}>
        SPVs{spvCount ? <span>{spvCount}</span> : null}
      </Link>
    </nav>
  );
}
