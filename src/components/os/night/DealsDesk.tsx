import type { DeskDeal } from "@/lib/os/night";
import { DealTable } from "./TodayDesk";

export function DealsDesk({ deals, reviewing }: { deals: DeskDeal[]; reviewing: number }) {
  return (
    <>
      <div className="lbl eyebrow">Deals</div>
      <h1 className="d-xl">
        {reviewing.toLocaleString("en-US")} {reviewing === 1 ? "deal is" : "deals are"} in review.
      </h1>
      <p className="t-body muted" style={{ margin: "16px 0 32px" }}>
        {deals.length.toLocaleString("en-US")} pitches in this snapshot.
      </p>
      {deals.length ? <DealTable deals={deals} /> : <p className="t-body muted">No pitches in this snapshot.</p>}
    </>
  );
}
