/**
 * The few Gmail API calls outreach needs: refresh a token, send a plain-text
 * email (in an existing thread when it's a follow-up), read a thread to see
 * whether they replied, and find bounce notices.
 * Scopes: gmail.send to send, gmail.readonly to see replies and bounces.
 */

export const GMAIL_SCOPES = ["https://www.googleapis.com/auth/gmail.send", "https://www.googleapis.com/auth/gmail.readonly", "openid", "email"];

export type Fetch = (url: string, init?: RequestInit) => Promise<Response>;

export type GoogleApp = { clientId: string; clientSecret: string };

export function googleApp(env: Record<string, string | undefined> = process.env): GoogleApp | null {
  const clientId = env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = env.GOOGLE_CLIENT_SECRET?.trim();
  return clientId && clientSecret ? { clientId, clientSecret } : null;
}

export function consentUrl(app: GoogleApp, redirectUri: string, state: string): string {
  const params = new URLSearchParams({
    client_id: app.clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: GMAIL_SCOPES.join(" "),
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

async function tokenCall(fetcher: Fetch, body: Record<string, string>): Promise<Record<string, unknown>> {
  const res = await fetcher("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(body).toString(),
  });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) throw new GmailError(`Google sign-in failed (${String(data.error ?? res.status)})`, res.status === 400 || res.status === 401);
  return data;
}

export class GmailError extends Error {
  /** True when the connection itself is broken (revoked, expired) and Ryan must reconnect. */
  readonly reconnect: boolean;
  constructor(message: string, reconnect = false) {
    super(message);
    this.reconnect = reconnect;
  }
}

/** Swaps the one-time code from Google's consent page for a lasting refresh token. */
export async function exchangeCode(fetcher: Fetch, app: GoogleApp, code: string, redirectUri: string): Promise<{ refreshToken: string; email: string }> {
  const data = await tokenCall(fetcher, { code, client_id: app.clientId, client_secret: app.clientSecret, redirect_uri: redirectUri, grant_type: "authorization_code" });
  const refreshToken = typeof data.refresh_token === "string" ? data.refresh_token : "";
  const access = typeof data.access_token === "string" ? data.access_token : "";
  if (!refreshToken || !access) throw new GmailError("Google did not return a lasting connection. Remove the app's access in your Google account and connect again.");
  const profile = await api(fetcher, access, "GET", "/profile");
  return { refreshToken, email: String((profile as { emailAddress?: string }).emailAddress ?? "") };
}

export async function accessToken(fetcher: Fetch, app: GoogleApp, refreshToken: string): Promise<string> {
  const data = await tokenCall(fetcher, { refresh_token: refreshToken, client_id: app.clientId, client_secret: app.clientSecret, grant_type: "refresh_token" });
  if (typeof data.access_token !== "string") throw new GmailError("Google did not return an access token", true);
  return data.access_token;
}

async function api(fetcher: Fetch, token: string, method: "GET" | "POST", path: string, body?: unknown): Promise<unknown> {
  const res = await fetcher(`https://gmail.googleapis.com/gmail/v1/users/me${path}`, {
    method,
    headers: { authorization: `Bearer ${token}`, ...(body ? { "content-type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
  if (!res.ok) throw new GmailError(`Gmail ${res.status}: ${data.error?.message ?? "request failed"}`, res.status === 401 || res.status === 403);
  return data;
}

/** Headers can't hold raw non-ASCII; encode them the standard way. */
function header(value: string): string {
  const clean = value.replace(/[\r\n]+/g, " ").trim();
  return /^[\x20-\x7e]*$/.test(clean) ? clean : `=?UTF-8?B?${Buffer.from(clean, "utf8").toString("base64")}?=`;
}

export type Outgoing = { from: string; fromName: string; to: string; toName: string | null; subject: string; body: string; inReplyTo: string | null };

/** A plain-text RFC 2822 message, base64url as the Gmail API wants it. */
export function rawMessage(mail: Outgoing): string {
  const lines = [
    `From: ${header(mail.fromName)} <${mail.from}>`,
    `To: ${mail.toName ? `${header(mail.toName)} ` : ""}<${mail.to}>`,
    `Subject: ${header(mail.subject)}`,
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: 8bit",
  ];
  if (mail.inReplyTo) lines.push(`In-Reply-To: ${mail.inReplyTo}`, `References: ${mail.inReplyTo}`);
  const text = `${lines.join("\r\n")}\r\n\r\n${mail.body.replace(/\r?\n/g, "\r\n")}\r\n`;
  return Buffer.from(text, "utf8").toString("base64url");
}

type GmailMessage = { id: string; threadId: string; snippet?: string; labelIds?: string[]; payload?: { headers?: { name: string; value: string }[] } };

const headerOf = (message: GmailMessage, name: string) => message.payload?.headers?.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value ?? null;

/** Sends one email. Returns the ids a follow-up needs to stay in the same thread. */
export async function sendMail(fetcher: Fetch, token: string, mail: Outgoing, threadId: string | null): Promise<{ gmailId: string; threadId: string; messageId: string | null }> {
  const sent = (await api(fetcher, token, "POST", "/messages/send", { raw: rawMessage(mail), ...(threadId ? { threadId } : {}) })) as GmailMessage;
  let messageId: string | null = null;
  try {
    const meta = (await api(fetcher, token, "GET", `/messages/${sent.id}?format=metadata&metadataHeaders=Message-ID`)) as GmailMessage;
    messageId = headerOf(meta, "Message-ID");
  } catch {
    messageId = null;
  }
  return { gmailId: sent.id, threadId: sent.threadId, messageId };
}

/** Whether someone other than Ryan wrote in the thread, and what they said first. */
export async function threadReply(fetcher: Fetch, token: string, threadId: string, me: string): Promise<{ replied: boolean; snippet: string }> {
  const thread = (await api(fetcher, token, "GET", `/threads/${threadId}?format=metadata&metadataHeaders=From`)) as { messages?: GmailMessage[] };
  const mine = me.toLowerCase();
  const theirs = (thread.messages ?? []).filter((message) => {
    const from = (headerOf(message, "From") ?? "").toLowerCase();
    return from && !from.includes(mine) && !/mailer-daemon|postmaster/.test(from);
  });
  return { replied: theirs.length > 0, snippet: theirs[0]?.snippet ?? "" };
}

/** Addresses that bounced in the last few days, from Gmail's delivery-failure notices. */
export async function bouncedAddresses(fetcher: Fetch, token: string): Promise<string[]> {
  const list = (await api(fetcher, token, "GET", `/messages?maxResults=50&q=${encodeURIComponent("from:(mailer-daemon OR postmaster) newer_than:4d")}`)) as { messages?: { id: string }[] };
  const out = new Set<string>();
  for (const item of list.messages ?? []) {
    const message = (await api(fetcher, token, "GET", `/messages/${item.id}?format=metadata&metadataHeaders=X-Failed-Recipients`)) as GmailMessage;
    for (const address of (headerOf(message, "X-Failed-Recipients") ?? "").split(/[,\s]+/)) if (address.includes("@")) out.add(address.toLowerCase());
    for (const match of (message.snippet ?? "").matchAll(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi)) out.add(match[0].toLowerCase());
  }
  return [...out];
}
