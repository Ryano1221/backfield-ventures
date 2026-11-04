const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function formatJoined(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!match) return iso;
  const month = MONTHS[Number(match[2]) - 1];
  const day = Number(match[3]);
  if (!month || !day) return iso;
  return `${month} ${day}`;
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function textToHtml(text: string, preheader = ""): string {
  const hidden = preheader
    ? `<div style="display:none;max-height:0;overflow:hidden;color:#f0ede8">${escapeHtml(preheader)}</div>`
    : "";
  const blocks = text
    .split(/\n{2,}/)
    .map((block) => {
      const body = escapeHtml(block).replace(/\n/g, "<br>");
      return `<p style="margin:0 0 16px;font-size:16px;line-height:1.5;color:#000">${body}</p>`;
    })
    .join("");
  return `<!doctype html><html><body style="margin:0;background:#f0ede8;color:#000"><div style="max-width:600px;margin:0 auto;background:#fff;padding:32px 28px">${hidden}${blocks}</div></body></html>`;
}
