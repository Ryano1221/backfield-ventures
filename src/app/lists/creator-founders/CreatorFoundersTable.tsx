"use client";

import { useMemo, useState } from "react";
import data from "@/data/lists/creator-founders.json";
import styles from "./list.module.css";

type Row = (typeof data.rows)[number];
type SortKey =
  | "brand"
  | "category"
  | "creators"
  | "role"
  | "involvement"
  | "value"
  | "whats_public"
  | "source";
type SortDir = "asc" | "desc";

const COLUMNS: { key: SortKey; label: string }[] = [
  { key: "brand", label: "Brand" },
  { key: "category", label: "Category" },
  { key: "creators", label: "Creators" },
  { key: "role", label: "Role" },
  { key: "involvement", label: "How they're involved" },
  { key: "value", label: "Reported value, stake or round" },
  { key: "whats_public", label: "Details" },
  { key: "source", label: "Source" },
];

function valueTag(basis: string): string | null {
  if (basis === "reported") return "reported";
  if (basis === "source estimate") return "source est.";
  if (basis === "round") return "round";
  return null;
}

function sourceLabel(url: string, date: string): string {
  let host = url;
  try {
    host = new URL(url).hostname.replace(/^www\./i, "");
  } catch {
    host = url;
  }
  return date ? `${host}, ${date}` : host;
}

function textValue(row: Row, key: SortKey): string {
  if (key === "source") return sourceLabel(row.source_url, row.source_date);
  if (key === "value") return row.value_display;
  if (key === "involvement") return row.involvement;
  return row[key];
}

function compareRows(a: Row, b: Row, key: SortKey, dir: SortDir): number {
  const direction = dir === "asc" ? 1 : -1;
  if (key === "value") {
    const aHas = a.value_display.trim() ? 1 : 0;
    const bHas = b.value_display.trim() ? 1 : 0;
    if (aHas !== bHas) return (aHas - bHas) * direction;
    return (
      a.brand.localeCompare(b.brand, "en", { sensitivity: "base", numeric: true }) *
      direction
    );
  }
  return (
    textValue(a, key).localeCompare(textValue(b, key), "en", {
      sensitivity: "base",
      numeric: true,
    }) * direction
  );
}

function rowText(row: Row): string {
  return [
    row.brand,
    row.category,
    row.creators,
    row.creator_basis,
    row.role,
    row.involvement,
    row.value_display,
    row.whats_public,
    sourceLabel(row.source_url, row.source_date),
  ]
    .join("\n")
    .toLowerCase();
}

function QuietLink({ url, date }: { url: string; date: string }) {
  if (!url) return null;
  return (
    <a
      className={styles.source}
      href={url}
      target="_blank"
      rel="noopener noreferrer nofollow"
      title={date || undefined}
    >
      {sourceLabel(url, date)}
    </a>
  );
}

function InvolvementValue({ row }: { row: Row }) {
  const separateSource =
    row.involvement_source_url !== "" &&
    row.involvement_source_url !== row.source_url;
  if (!row.involvement && !separateSource) return null;
  return (
    <>
      {row.involvement}
      {separateSource ? (
        <span className={styles.extraSource}>
          <QuietLink
            url={row.involvement_source_url}
            date={row.involvement_source_date}
          />
        </span>
      ) : null}
    </>
  );
}

function ValueCell({ row }: { row: Row }) {
  if (!row.value_display.trim()) return null;
  const tag = valueTag(row.value_basis);
  return (
    <>
      {row.value_display}
      {tag && row.value_source_url ? (
        <>
          {" "}
          <a
            className={styles.source}
            href={row.value_source_url}
            target="_blank"
            rel="noopener noreferrer nofollow"
            title={row.value_source_date || undefined}
          >
            {tag}
          </a>
        </>
      ) : null}
    </>
  );
}

export default function CreatorFoundersTable() {
  const [sortKey, setSortKey] = useState<SortKey>("brand");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [query, setQuery] = useState("");

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const filtered = needle
      ? data.rows.filter((row) => rowText(row).includes(needle))
      : data.rows;
    return [...filtered].sort((a, b) => compareRows(a, b, sortKey, sortDir));
  }, [query, sortKey, sortDir]);

  function onSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((dir) => (dir === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(key);
    setSortDir("asc");
  }

  return (
    <div>
      <div className={styles.filter}>
        <label htmlFor="creator-founder-filter">Filter</label>
        <input
          id="creator-founder-filter"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          autoComplete="off"
        />
      </div>
      {rows.length === 0 ? (
        <p className={styles.empty} role="status">
          No brands match.
        </p>
      ) : (
        <>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <caption className={styles.caption}>{data.title}</caption>
              <thead>
                <tr>
                  {COLUMNS.map((column) => {
                    const active = sortKey === column.key;
                    const ariaSort = active
                      ? sortDir === "asc"
                        ? "ascending"
                        : "descending"
                      : "none";
                    return (
                      <th key={column.key} scope="col" aria-sort={ariaSort}>
                        <button
                          type="button"
                          className={
                            active ? styles.sortBtnActive : styles.sortBtn
                          }
                          onClick={() => onSort(column.key)}
                        >
                          {column.label}
                          {active ? (sortDir === "asc" ? " ↑" : " ↓") : ""}
                        </button>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.brand}>
                    <th scope="row" className={styles.brand}>
                      {row.brand}
                    </th>
                    <td>{row.category}</td>
                    <td>
                      {row.creators}
                      {row.creator_basis ? (
                        <span className={styles.extraSource}>
                          Audience: {row.creator_basis}
                        </span>
                      ) : null}
                    </td>
                    <td>{row.role}</td>
                    <td>
                      <InvolvementValue row={row} />
                    </td>
                    <td>
                      <ValueCell row={row} />
                    </td>
                    <td>{row.whats_public}</td>
                    <td>
                      <QuietLink url={row.source_url} date={row.source_date} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className={styles.cards}>
            {rows.map((row) => (
              <article key={row.brand} className={styles.card}>
                <h2 className={styles.cardBrand}>{row.brand}</h2>
                <dl>
                  <dt>Category</dt>
                  <dd>{row.category}</dd>
                  <dt>Creators</dt>
                  <dd>{row.creators}</dd>
                  <dt>Audience</dt>
                  <dd>{row.creator_basis}</dd>
                  <dt>Role</dt>
                  <dd>{row.role}</dd>
                  <dt>How they&apos;re involved</dt>
                  <dd>
                    <InvolvementValue row={row} />
                  </dd>
                  <dt>Reported value, stake or round</dt>
                  <dd>
                    <ValueCell row={row} />
                  </dd>
                  <dt>Details</dt>
                  <dd>{row.whats_public}</dd>
                  <dt>Source</dt>
                  <dd>
                    <QuietLink url={row.source_url} date={row.source_date} />
                  </dd>
                </dl>
              </article>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
