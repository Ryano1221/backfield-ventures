"use client";

import { useState } from "react";
import { displayParty } from "@/lib/os/interactions";

export type HandoffMove = {
  from: string;
  to: string;
  title: string;
  timestamp: string;
};

export function HandoffFeed({ moves }: { moves: HandoffMove[] }) {
  const [open, setOpen] = useState<number | null>(null);
  if (moves.length === 0) return <p className="os-missing">No handoffs in this snapshot.</p>;
  return (
    <ol className="os-handoffs">
      {moves.slice(0, 16).map((move, index) => (
        <li
          key={`${move.timestamp}-${move.title}`}
          onMouseEnter={() => setOpen(index)}
          onMouseLeave={() => setOpen(null)}
          onFocus={() => setOpen(index)}
          onBlur={() => setOpen(null)}
          tabIndex={0}
        >
          <p className="os-handoff-title">{move.title}</p>
          <p className="os-quiet">
            {displayParty(move.from)} to {displayParty(move.to)}
          </p>
          {open === index ? (
            <p className="os-tip">
              {displayParty(move.from)} handed {move.title} to {displayParty(move.to)} at {move.timestamp.slice(0, 16).replace("T", " ")}.
            </p>
          ) : null}
        </li>
      ))}
    </ol>
  );
}
