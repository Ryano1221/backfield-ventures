import Link from "next/link";
import { AREA_LABEL, type ReviewArea, type ReviewItem } from "@/lib/os/review";
import { Ring } from "./Charts";

const AREAS: ReviewArea[] = ["money", "portfolio", "people", "deals", "office"];

/** One checklist across the firm. Clear checks stay visible so you can trust the page. */
export function ReviewDesk({ items, hrefs, weekOf }: { items: ReviewItem[]; hrefs: Record<string, string>; weekOf: string }) {
  const open = items.filter((item) => item.count > 0);
  const clear = items.length - open.length;
  return (
    <div className="review">
      <div className="lbl eyebrow">Week of {weekOf}</div>
      <div className="people-head">
        <div>
          <h1 className="d-xl">{open.length ? `${open.length} ${open.length === 1 ? "thing needs" : "things need"} you.` : "All clear."}</h1>
          <p className="lede">
            {clear} of {items.length} checks clear. Work top to bottom; each opens where you fix it.
          </p>
        </div>
        <Ring size={96} stroke={10} total={items.length} label={`${clear} of ${items.length} checks clear`} parts={[{ key: "clear", label: `${clear} clear`, value: clear, tone: "hard" }]}>
          <b>
            {clear}/{items.length}
          </b>
          <span>clear</span>
        </Ring>
      </div>
      {AREAS.map((area) => {
        const rows = items.filter((item) => item.area === area);
        if (!rows.length) return null;
        return (
          <section key={area} className="sx-card review-area" aria-label={AREA_LABEL[area]}>
            <h2 className="sx-h2">{AREA_LABEL[area]}</h2>
            <ul>
              {rows.map((item) => (
                <li key={item.key} className={item.count ? "is-open" : "is-clear"}>
                  <span className="review-mark" aria-hidden="true">
                    {item.count ? item.count : "✓"}
                  </span>
                  <span className="review-text">
                    <b>{item.title}</b>
                    <span>{item.detail}</span>
                  </span>
                  {item.count ? (
                    <Link className="btn sm" href={hrefs[item.href] ?? hrefs.today} prefetch>
                      Open
                    </Link>
                  ) : (
                    <span className="review-clear">{item.key === "fund" ? "On track" : "Clear"}</span>
                  )}
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
