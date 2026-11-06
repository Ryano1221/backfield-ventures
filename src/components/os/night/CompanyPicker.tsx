"use client";

import { useId, useState } from "react";
import { matchDeals, type DealPick } from "@/lib/os/deals";

/** Type a company; matching deals drop down. Picking one links the SPV to that deal. */
export function CompanyPicker({
  deals,
  company,
  dealId,
  onType,
  onPick,
}: {
  deals: DealPick[];
  company: string;
  dealId: string;
  onType: (value: string) => void;
  onPick: (deal: DealPick) => void;
}) {
  const listId = useId();
  const [focused, setFocused] = useState(false);
  const [active, setActive] = useState(0);
  const matches = dealId ? [] : matchDeals(deals, company);
  const show = focused && matches.length > 0;
  const linked = dealId ? deals.find((deal) => deal.id === dealId) : undefined;

  function pick(deal: DealPick) {
    onPick(deal);
    setActive(0);
  }

  return (
    <div className="spv-pick-wrap">
      <div className="spv-pick">
        <label className="sx-field">
          <span className="lbl">Company</span>
          <input
            value={company}
            onChange={(event) => {
              onType(event.target.value);
              setActive(0);
            }}
            onFocus={() => setFocused(true)}
            onBlur={() => window.setTimeout(() => setFocused(false), 120)}
            onKeyDown={(event) => {
              if (!show) return;
              if (event.key === "ArrowDown") {
                event.preventDefault();
                setActive((i) => (i + 1) % matches.length);
              } else if (event.key === "ArrowUp") {
                event.preventDefault();
                setActive((i) => (i - 1 + matches.length) % matches.length);
              } else if (event.key === "Enter") {
                event.preventDefault();
                pick(matches[active] ?? matches[0]);
              } else if (event.key === "Escape") {
                setFocused(false);
              }
            }}
            maxLength={160}
            placeholder={
              deals.length
                ? "Start typing a company from your deals"
                : "Who the SPV invests in"
            }
            autoComplete="off"
            role="combobox"
            aria-expanded={show}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={show ? `${listId}-${active}` : undefined}
            required
          />
        </label>
        {show ? (
          <ul
            className="spv-pick-list"
            id={listId}
            role="listbox"
            aria-label="Matching deals"
          >
            {matches.map((deal, i) => (
              <li
                key={deal.id}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={i === active}
                onMouseDown={(event) => {
                  event.preventDefault();
                  pick(deal);
                }}
                onMouseEnter={() => setActive(i)}
              >
                <b>{deal.company}</b>
                {deal.detail ? <span>{deal.detail}</span> : null}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
      {dealId ? (
        <p className="sx-hint spv-pick-linked">
          {linked
            ? `Linked to the ${linked.company} deal.`
            : "Linked to the deal you came from."}
        </p>
      ) : company.trim() && deals.length && !show ? (
        <p className="sx-hint">
          Not in your deals. The SPV will stand on its own.
        </p>
      ) : null}
    </div>
  );
}
