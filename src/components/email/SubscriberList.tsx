"use client";

import { useMemo, useState } from "react";
import { SampleTag } from "./ui";

export type SubscriberCard = {
  name: string;
  email: string;
  source: string;
  tags: string[];
  joinedLabel: string;
};

export function SubscriberList({
  rows,
  sample,
  exportHref,
}: {
  rows: SubscriberCard[];
  sample: boolean;
  exportHref?: string;
}) {
  const [query, setQuery] = useState("");
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) => `${row.name} ${row.email}`.toLowerCase().includes(q));
  }, [query, rows]);

  return (
    <section className="card">
      <div className="h">
        <span className="lbl">
          Subscribers {sample ? <SampleTag /> : null}
        </span>
        {exportHref ? (
          <a className="export-link" href={exportHref}>
            Export CSV
          </a>
        ) : null}
      </div>
      <div className="find">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search name or email"
          aria-label="Search name or email"
          type="search"
        />
      </div>
      <div className="desk-only">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Source</th>
              <th>Tags</th>
              <th>Joined</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((row) => (
              <tr key={row.email}>
                <td>
                  <div className="n">{row.name}</div>
                  <div className="e">{row.email}</div>
                </td>
                <td>{row.source}</td>
                <td>
                  {row.tags.map((tag) => (
                    <span className="chip" key={tag}>
                      {tag}
                    </span>
                  ))}
                </td>
                <td className="mono">{row.joinedLabel}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {shown.length === 0 ? <p className="block">{rows.length ? "No one matches that search." : "No subscribers on this snapshot."}</p> : null}
      </div>
      <div className="mob-only">
        {shown.map((row) => (
          <div className="row" key={row.email}>
            <div className="n">
              {row.name}
              <span>{row.joinedLabel}</span>
            </div>
            <div className="e">{row.email}</div>
            <div className="m">
              <span>{row.source}</span>
              {row.tags.map((tag) => (
                <span className="chip" key={tag}>
                  {tag}
                </span>
              ))}
            </div>
          </div>
        ))}
        {shown.length === 0 ? <p className="block">{rows.length ? "No one matches that search." : "No subscribers on this snapshot."}</p> : null}
      </div>
    </section>
  );
}
