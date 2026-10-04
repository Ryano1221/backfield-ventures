const PAGE_LEAD =
  "Welcome to The Handoff. Standout early sports and consumer brands, sent to people who want them.";
const SIGNUP_LINE = "One email a month about early sports and consumer brands.";
const LOCKED_LINE = "Brands we think are impressive. Not an investment offer.";
const HANDOFF_URL = "https://backfieldventures.com/handoff";

export const HANDOFF_CONFIRMATION_SUBJECT = "You're on The Handoff";

const DISPLAY = "'Bebas Neue', 'Arial Narrow', Impact, 'Haettenschweiler', sans-serif";
const MONO = "'Space Mono', 'IBM Plex Mono', 'Courier New', Courier, monospace";
const BODY = "'Switzer', 'Helvetica Neue', Helvetica, Arial, sans-serif";

export function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function cleanLine(value: string) {
  return value.replace(/[\r\n]+/g, " ").replace(/\s+/g, " ").trim();
}

function shell(opts: { preheader: string; kicker: string; headline: string; body: string }) {
  // headline is trusted markup from this file. Subscriber text is escaped before it reaches body.
  const preheader = escapeHtml(opts.preheader);
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="dark">
  <meta name="supported-color-schemes" content="dark">
  <title>The Handoff</title>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bebas+Neue&amp;family=Space+Mono:wght@400;700&amp;display=swap">
  <style>
    :root { color-scheme: dark; supported-color-schemes: dark; }
    body { margin: 0; padding: 0; background: #000000; -webkit-text-size-adjust: 100%; }
    @media only screen and (max-width: 600px) {
      .handoff-pad { padding-left: 22px !important; padding-right: 22px !important; }
      .handoff-headline { font-size: 52px !important; }
    }
  </style>
</head>
<body bgcolor="#000000" style="margin:0;padding:0;background:#000000;">
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:#000000;opacity:0;">
    ${preheader}${"&nbsp;&zwnj;".repeat(12)}
  </div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#000000" style="background:#000000;border-collapse:collapse;">
    <tr>
      <td align="center" style="padding:48px 16px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" bgcolor="#0a0a0a" style="width:100%;max-width:600px;background:#0a0a0a;border:1px solid #222222;border-collapse:collapse;">
          <tr>
            <td width="3" bgcolor="#f0ede8" rowspan="2" style="width:3px;background:#f0ede8;font-size:0;line-height:0;">&nbsp;</td>
            <td class="handoff-pad" bgcolor="#0a0a0a" style="padding:48px 40px 28px;background:#0a0a0a;">
              <p style="margin:0 0 18px;font-family:${MONO};font-size:11px;line-height:1.4;letter-spacing:0.18em;text-transform:uppercase;color:#f0ede8;">${escapeHtml(opts.kicker)}</p>
              <h1 class="handoff-headline" style="margin:0 0 28px;font-family:${DISPLAY};font-size:68px;font-weight:400;line-height:0.88;letter-spacing:0.01em;color:#ffffff;">${opts.headline}</h1>
              ${opts.body}
            </td>
          </tr>
          <tr>
            <td class="handoff-pad" bgcolor="#0a0a0a" style="padding:22px 40px 36px;background:#0a0a0a;border-top:1px solid #1f1f1f;">
              <p style="margin:0 0 18px;font-family:${MONO};font-size:10px;line-height:1.6;letter-spacing:0.1em;text-transform:uppercase;color:#6e6a64;">${LOCKED_LINE}</p>
              <a href="${HANDOFF_URL}" style="font-family:${MONO};font-size:11px;line-height:1.4;letter-spacing:0.16em;text-transform:uppercase;color:#f0ede8;text-decoration:none;">Backfield Ventures</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function prose(text: string, margin: string) {
  return `<p style="margin:${margin};font-family:${BODY};font-size:17px;font-weight:400;line-height:1.7;color:#c8c4bc;">${text}</p>`;
}

export function renderHandoffConfirmation(name: string) {
  const safeName = escapeHtml(cleanLine(name));
  return shell({
    preheader: SIGNUP_LINE,
    kicker: "The Handoff",
    headline: "You're on<br>the list.",
    body: [
      `<p style="margin:0 0 18px;font-family:${BODY};font-size:20px;font-weight:400;line-height:1.4;color:#f0ede8;">${safeName}.</p>`,
      prose(PAGE_LEAD, "0 0 14px"),
      prose(SIGNUP_LINE, "0"),
    ].join(""),
  });
}

export function handoffConfirmationText(name: string) {
  return [
    `${cleanLine(name)}.`,
    "",
    PAGE_LEAD,
    "",
    SIGNUP_LINE,
    "",
    LOCKED_LINE,
    "",
    "Backfield Ventures",
    HANDOFF_URL,
  ].join("\n");
}

function noticeField(label: string, value: string, last = false) {
  const gap = last ? "0" : "0 0 22px";
  return `<p style="margin:0 0 6px;font-family:${MONO};font-size:10px;line-height:1.4;letter-spacing:0.16em;text-transform:uppercase;color:#8a8680;">${escapeHtml(label)}</p>
<p style="margin:${gap};font-family:${BODY};font-size:18px;line-height:1.4;color:#f0ede8;">${value}</p>`;
}

export function renderHandoffNotice(d: { name: string; email: string; source: string }) {
  const email = cleanLine(d.email);
  const emailHtml = `<a href="mailto:${encodeURIComponent(email)}" style="color:#f0ede8;text-decoration:none;">${escapeHtml(email)}</a>`;
  return shell({
    preheader: `${cleanLine(d.name)} · ${email}`,
    kicker: "Internal",
    headline: "New subscriber",
    body: [
      noticeField("Name", escapeHtml(cleanLine(d.name))),
      noticeField("Email", emailHtml),
      noticeField("Source", escapeHtml(cleanLine(d.source)), true),
    ].join(""),
  });
}

export function handoffNoticeText(d: { name: string; email: string; source: string }) {
  return [
    "New subscriber",
    "",
    "Name",
    cleanLine(d.name),
    "",
    "Email",
    cleanLine(d.email),
    "",
    "Source",
    cleanLine(d.source),
    "",
    LOCKED_LINE,
    "",
    "Backfield Ventures",
    HANDOFF_URL,
  ].join("\n");
}
