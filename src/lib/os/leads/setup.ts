/** The setup checklist on Leads: what's wired up and what's missing, never showing a secret. */
import { findymailKey, keyNote } from "./findymail";

export type SetupItem = { key: string; label: string; ok: boolean; detail: string };

const ago = (iso: string, now: number) => {
  const hours = Math.round((now - Date.parse(iso)) / 3_600_000);
  return hours < 1 ? "under an hour ago" : hours < 48 ? `${hours} hours ago` : `${Math.round(hours / 24)} days ago`;
};

/** What's wired up for Leads and Outreach, and what's missing with where to fix it. Never shows a secret. */
export function setupChecklist(input: { lastAutoRun: string | null; lastCronAt: string | null; gmail: string | null; googleReady: boolean; aiReady: boolean; now: number }, env: Record<string, string | undefined> = process.env): SetupItem[] {
  const fresh = (iso: string | null, hours: number) => Boolean(iso && input.now - Date.parse(iso) < hours * 3_600_000);
  const findy = findymailKey(env);
  return [
    {
      key: "daily",
      label: "Daily lead search",
      ok: fresh(input.lastAutoRun, 36),
      detail: input.lastAutoRun ? `Last ran by itself ${ago(input.lastAutoRun, input.now)}.${fresh(input.lastAutoRun, 36) ? "" : " It should run every morning: check CRON_SECRET in Vercel."}` : "Hasn't run by itself yet. It runs at 11:17 UTC each day once CRON_SECRET is set in Vercel.",
    },
    {
      key: "hourly",
      label: "Hourly outreach runs",
      // Weekday mornings only, so allow a long weekend between pings.
      ok: fresh(input.lastCronAt, 80),
      detail: input.lastCronAt ? `Last reached the OS ${ago(input.lastCronAt, input.now)}.${fresh(input.lastCronAt, 80) ? "" : " Check the CRON_SECRET and OUTREACH_CRON_URL secrets in GitHub."}` : "Hasn't reached the OS yet. Add CRON_SECRET and OUTREACH_CRON_URL as GitHub repository secrets; it runs weekday mornings.",
    },
    { key: "ai", label: "AI drafts, research and reply triage", ok: input.aiReady, detail: input.aiReady ? "ANTHROPIC_API_KEY is set." : "Add ANTHROPIC_API_KEY in Vercel. Until then drafts use templates and there's no research." },
    { key: "google", label: "Google app for Gmail", ok: input.googleReady, detail: input.googleReady ? "GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are set." : "Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in Vercel." },
    { key: "gmail", label: "Gmail connected", ok: Boolean(input.gmail), detail: input.gmail ? `Sending from ${input.gmail}.` : "Connect Gmail in the Autopilot panel's Settings." },
    { key: "findymail", label: "Findymail", ok: Boolean(findy), detail: findy ? keyNote(env) ?? "FINDYMAIL_API_KEY is set. The Findymail panel shows credits and lists." : "Add FINDYMAIL_API_KEY in Vercel to find and verify emails." },
  ];
}
