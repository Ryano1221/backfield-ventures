import { getSupabase } from "@/lib/supabase";
import type { Env } from "./flags";
import { DB_FLAG, flagOn } from "./flags";
import { SAMPLE_SENDS, SAMPLE_SUBSCRIBERS, type SendRow, type Subscriber } from "./sample";

export async function loadSubscribers(): Promise<{ sample: boolean; rows: Subscriber[] }> {
  const client = getSupabase();
  if (!client) return { sample: true, rows: SAMPLE_SUBSCRIBERS };
  try {
    const { data, error } = await client
      .from("email_subscribers")
      .select("name, email, source, created_at")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error || !data || data.length === 0) return { sample: true, rows: SAMPLE_SUBSCRIBERS };
    return {
      sample: false,
      rows: data.map((row) => ({
        name: String(row.name ?? ""),
        email: String(row.email ?? ""),
        source: String(row.source ?? ""),
        tags: [],
        joined: String(row.created_at ?? "").slice(0, 10),
      })),
    };
  } catch {
    return { sample: true, rows: SAMPLE_SUBSCRIBERS };
  }
}

export async function loadSends(): Promise<{ sample: boolean; rows: SendRow[] }> {
  const client = getSupabase();
  if (!client) return { sample: true, rows: SAMPLE_SENDS };
  try {
    const { data, error } = await client
      .from("email_sends")
      .select("issue_label, state, recipient_count, sent_count")
      .order("created_at", { ascending: false })
      .limit(20);
    if (error || !data || data.length === 0) return { sample: true, rows: SAMPLE_SENDS };
    return {
      sample: false,
      rows: data.map((row) => ({
        name: String(row.issue_label ?? "Email"),
        list: "Handoff",
        state: String(row.state ?? "draft"),
        sentTo: String(row.sent_count ?? 0),
      })),
    };
  } catch {
    return { sample: true, rows: SAMPLE_SENDS };
  }
}

export async function recordSignup(
  input: {
    name: string;
    email: string;
    source: string;
    joined: string[];
    status: "active" | "pending";
  },
  env: Env = process.env,
): Promise<{ dryRun: boolean }> {
  if (!flagOn(env, DB_FLAG)) return { dryRun: true };
  const client = getSupabase();
  if (!client) return { dryRun: true };
  try {
    const now = new Date().toISOString();
    const existing = await client.from("email_subscribers").select("id").eq("email", input.email).maybeSingle();
    if (existing.error) return { dryRun: true };
    let subscriberId = existing.data?.id as string | undefined;
    if (!subscriberId) {
      const inserted = await client
        .from("email_subscribers")
        .insert({ name: input.name, email: input.email, source: input.source })
        .select("id")
        .single();
      if (inserted.error || !inserted.data) return { dryRun: true };
      subscriberId = inserted.data.id as string;
    }
    for (const slug of input.joined) {
      const list = await client.from("email_lists").select("id").eq("slug", slug).maybeSingle();
      if (list.error || !list.data) continue;
      await client.from("email_subscriptions").upsert(
        {
          subscriber_id: subscriberId,
          list_id: list.data.id,
          consent_source: input.source,
          consent_at: now,
          status: input.status,
        },
        { onConflict: "subscriber_id,list_id" },
      );
    }
    return { dryRun: false };
  } catch {
    return { dryRun: true };
  }
}

export async function persistUnsubscribe(token: string, env: Env = process.env): Promise<{ dryRun: boolean }> {
  if (!flagOn(env, DB_FLAG)) return { dryRun: true };
  const client = getSupabase();
  if (!client) return { dryRun: true };
  try {
    const found = await client
      .from("email_unsubscribe_tokens")
      .select("token, subscriber_id, list_id, used_at")
      .eq("token", token)
      .maybeSingle();
    if (found.error || !found.data || found.data.used_at) return { dryRun: false };
    const now = new Date().toISOString();
    await client.from("email_unsubscribe_tokens").update({ used_at: now }).eq("token", token);
    await client
      .from("email_subscriptions")
      .update({ status: "unsubscribed", updated_at: now })
      .eq("subscriber_id", found.data.subscriber_id)
      .eq("list_id", found.data.list_id);
    return { dryRun: false };
  } catch {
    return { dryRun: false };
  }
}
