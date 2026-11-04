import type { Subscriber } from "./sample";

function cell(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

export function subscribersToCsv(rows: Subscriber[]): string {
  const lines = [["name", "email", "source", "tags", "joined"].map(cell).join(",")];
  for (const row of rows) {
    lines.push([row.name, row.email, row.source, row.tags.join("; "), row.joined].map(cell).join(","));
  }
  return `${lines.join("\n")}\n`;
}
