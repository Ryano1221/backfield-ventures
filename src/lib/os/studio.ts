/**
 * Content Studio: one item per idea, with a draft per channel.
 *
 * Idea or source -> brief -> channel drafts -> review -> approval -> schedule.
 * Publishing is not wired. Nothing here sends email or posts to social. An
 * approval is for the exact text approved: editing a draft clears it.
 */

export const CHANNELS = ["newsletter", "linkedin", "x", "instagram"] as const;
export type Channel = (typeof CHANNELS)[number];

export const CHANNEL_LABEL: Record<Channel, string> = {
  newsletter: "Newsletter",
  linkedin: "LinkedIn",
  x: "X",
  instagram: "Instagram",
};

export const SOURCE_KINDS = ["note", "deal", "conversation", "portfolio", "research", "event"] as const;
export type SourceKind = (typeof SOURCE_KINDS)[number];

export const SOURCE_LABEL: Record<SourceKind, string> = {
  note: "Ryan's note",
  deal: "Deal",
  conversation: "Founder conversation",
  portfolio: "Portfolio update",
  research: "Research",
  event: "Event",
};

/** Statuses Ryan can set here. Published and failed come from the office once publishing exists. */
export const DRAFT_STATUSES = ["draft", "review", "approved", "scheduled", "published", "failed"] as const;
export type DraftStatus = (typeof DRAFT_STATUSES)[number];
const SETTABLE: readonly DraftStatus[] = ["draft", "review", "approved", "scheduled"];

export const STATUS_LABEL: Record<DraftStatus, string> = {
  draft: "Draft",
  review: "In review",
  approved: "Approved",
  scheduled: "Scheduled",
  published: "Published",
  failed: "Failed",
};

/** Character limits each platform enforces. */
export const LIMITS: Record<Channel, number> = {
  newsletter: 20000,
  linkedin: 3000,
  x: 280,
  instagram: 2200,
};

export type Revision = { at: string; by: string; subject?: string; body: string };
export type Source = { url: string; note: string };

export type Draft = {
  channel: Channel;
  status: DraftStatus;
  subject: string;
  preview: string;
  body: string;
  image_url: string;
  scheduled_for: string | null;
  approved_at: string | null;
  updated_at: string;
  revisions: Revision[];
};

export type ContentItem = {
  id: string;
  title: string;
  source_kind: SourceKind;
  source_ref: string;
  brief: string;
  owner: string;
  sources: Source[];
  archived: boolean;
  created_at: string;
  updated_at: string;
  drafts: Draft[];
};

export type Studio = { version: 1; items: ContentItem[] };

export const EMPTY_STUDIO: Studio = { version: 1, items: [] };

const MAX_ITEMS = 500;
const MAX_REVISIONS = 20;

export type Check = { level: "block" | "warn"; text: string };

/** What stands between a draft and approval. Blocking checks stop the Approve button. */
export function checkDraft(draft: Pick<Draft, "channel" | "subject" | "preview" | "body" | "image_url">, item?: Pick<ContentItem, "sources">): Check[] {
  const out: Check[] = [];
  const body = draft.body.trim();
  if (!body) out.push({ level: "block", text: "The draft is empty." });
  if (body.length > LIMITS[draft.channel]) out.push({ level: "block", text: `${body.length.toLocaleString("en-US")} characters. ${CHANNEL_LABEL[draft.channel]} allows ${LIMITS[draft.channel].toLocaleString("en-US")}.` });
  if (draft.channel === "newsletter") {
    if (!draft.subject.trim()) out.push({ level: "block", text: "Add a subject line." });
    else if (draft.subject.trim().length > 60) out.push({ level: "warn", text: "Subject is over 60 characters. Inboxes cut it off." });
    if (!draft.preview.trim()) out.push({ level: "warn", text: "No preview text. The inbox will show the first line instead." });
  }
  if (draft.channel === "instagram" && !draft.image_url.trim()) out.push({ level: "block", text: "Instagram needs an image." });
  if (draft.image_url.trim() && !/^https:\/\//i.test(draft.image_url.trim())) out.push({ level: "block", text: "Image link must start with https://." });
  if (/(\$\s?\d|\d\s?%|\b\d{2,}[kKmMbB]?\b)/.test(body) && item && item.sources.length === 0) {
    out.push({ level: "warn", text: "This draft uses numbers but the item has no sources. Add where each number came from." });
  }
  return out;
}

export function canApprove(draft: Draft, item?: ContentItem): boolean {
  return !checkDraft(draft, item).some((check) => check.level === "block");
}

/** The overall state of an item: the least-finished draft wins, so nothing looks done early. */
export function itemStatus(item: ContentItem): DraftStatus {
  if (!item.drafts.length) return "draft";
  const order: DraftStatus[] = ["failed", "draft", "review", "approved", "scheduled", "published"];
  return item.drafts.map((draft) => draft.status).sort((a, b) => order.indexOf(a) - order.indexOf(b))[0];
}

/** One plain sentence: what has to happen next on this item, and who does it. */
export function nextAction(item: ContentItem): string {
  const drafts = item.drafts;
  if (!drafts.length) return "Pick the channels for this idea.";
  const failed = drafts.find((draft) => draft.status === "failed");
  if (failed) return `${CHANNEL_LABEL[failed.channel]} failed to post. Check it in Operations.`;
  const empty = drafts.find((draft) => !draft.body.trim());
  if (empty) return `Write the ${CHANNEL_LABEL[empty.channel]} draft.`;
  const draft = drafts.find((row) => row.status === "draft");
  if (draft) return `Send the ${CHANNEL_LABEL[draft.channel]} draft to review.`;
  const review = drafts.find((row) => row.status === "review");
  if (review) return `Ryan: review and approve the ${CHANNEL_LABEL[review.channel]} draft.`;
  const approved = drafts.find((row) => row.status === "approved");
  if (approved) return `Pick a date for the ${CHANNEL_LABEL[approved.channel]} post.`;
  if (drafts.every((row) => row.status === "published")) return "Done. Check how it did.";
  return "Scheduled. Publishing is off, so the office posts it once Ryan turns publishing on.";
}

export type StudioOp =
  | { op: "create"; title: string; source_kind: string; source_ref?: string; brief?: string; channels: string[]; owner?: string }
  | { op: "update_item"; id: string; title?: string; brief?: string; source_kind?: string; source_ref?: string; owner?: string }
  | { op: "add_source"; id: string; url: string; note?: string }
  | { op: "remove_source"; id: string; url: string }
  | { op: "add_channel"; id: string; channel: string }
  | { op: "edit_draft"; id: string; channel: string; subject?: string; preview?: string; body?: string; image_url?: string }
  | { op: "set_status"; id: string; channel: string; status: string; scheduled_for?: string | null }
  | { op: "archive"; id: string; archived: boolean };

export type OpResult = { ok: true; studio: Studio; id: string } | { ok: false; error: string };

/** Apply one change. Pure: returns a new studio or an error Ryan can read. */
export function applyStudioOp(studio: Studio, raw: unknown, now = new Date().toISOString(), newId = () => `c_${Math.random().toString(36).slice(2, 10)}`): OpResult {
  if (!raw || typeof raw !== "object") return { ok: false, error: "Nothing to change." };
  const op = raw as Record<string, unknown>;
  const text = (value: unknown, max: number) => (typeof value === "string" ? value.slice(0, max) : "");
  const items = studio.items.map((item) => ({ ...item, drafts: item.drafts.map((draft) => ({ ...draft })) }));

  if (op.op === "create") {
    const title = text(op.title, 160).trim();
    if (!title) return { ok: false, error: "Give the idea a title." };
    if (items.length >= MAX_ITEMS) return { ok: false, error: "The studio is full. Archive old items first." };
    const kind = SOURCE_KINDS.includes(op.source_kind as SourceKind) ? (op.source_kind as SourceKind) : "note";
    const channels = Array.isArray(op.channels) ? CHANNELS.filter((channel) => (op.channels as unknown[]).includes(channel)) : [];
    if (!channels.length) return { ok: false, error: "Pick at least one channel." };
    const id = newId();
    items.unshift({
      id,
      title,
      source_kind: kind,
      source_ref: text(op.source_ref, 300).trim(),
      brief: text(op.brief, 4000).trim(),
      owner: text(op.owner, 80).trim() || "Ryan",
      sources: [],
      archived: false,
      created_at: now,
      updated_at: now,
      drafts: channels.map((channel) => emptyDraft(channel, now)),
    });
    return { ok: true, studio: { version: 1, items }, id };
  }

  const id = typeof op.id === "string" ? op.id : "";
  const item = items.find((row) => row.id === id);
  if (!item) return { ok: false, error: "That item is gone. Reload the page." };
  item.updated_at = now;

  if (op.op === "update_item") {
    if (typeof op.title === "string") {
      const title = text(op.title, 160).trim();
      if (!title) return { ok: false, error: "The title cannot be empty." };
      item.title = title;
    }
    if (typeof op.brief === "string") item.brief = text(op.brief, 4000);
    if (typeof op.source_ref === "string") item.source_ref = text(op.source_ref, 300);
    if (typeof op.owner === "string" && op.owner.trim()) item.owner = text(op.owner, 80).trim();
    if (SOURCE_KINDS.includes(op.source_kind as SourceKind)) item.source_kind = op.source_kind as SourceKind;
    return { ok: true, studio: { version: 1, items }, id };
  }

  if (op.op === "add_source") {
    const url = text(op.url, 500).trim();
    if (!/^https?:\/\/\S+$/i.test(url)) return { ok: false, error: "A source needs a full link, starting with https://." };
    if (item.sources.length >= 30) return { ok: false, error: "Thirty sources is the limit." };
    if (!item.sources.some((row) => row.url === url)) item.sources.push({ url, note: text(op.note, 200).trim() });
    return { ok: true, studio: { version: 1, items }, id };
  }

  if (op.op === "remove_source") {
    item.sources = item.sources.filter((row) => row.url !== op.url);
    return { ok: true, studio: { version: 1, items }, id };
  }

  if (op.op === "archive") {
    item.archived = op.archived === true;
    return { ok: true, studio: { version: 1, items }, id };
  }

  if (op.op === "add_channel") {
    if (!CHANNELS.includes(op.channel as Channel)) return { ok: false, error: "Unknown channel." };
    if (!item.drafts.some((draft) => draft.channel === op.channel)) item.drafts.push(emptyDraft(op.channel as Channel, now));
    return { ok: true, studio: { version: 1, items }, id };
  }

  const draft = item.drafts.find((row) => row.channel === op.channel);
  if (!draft) return { ok: false, error: "That channel is not on this item." };

  if (op.op === "edit_draft") {
    if (draft.status === "published") return { ok: false, error: "This one is already published. Start a new item to change it." };
    const next = {
      subject: typeof op.subject === "string" ? text(op.subject, 200) : draft.subject,
      preview: typeof op.preview === "string" ? text(op.preview, 200) : draft.preview,
      body: typeof op.body === "string" ? text(op.body, LIMITS[draft.channel] + 2000) : draft.body,
      image_url: typeof op.image_url === "string" ? text(op.image_url, 500).trim() : draft.image_url,
    };
    const changed = next.subject !== draft.subject || next.preview !== draft.preview || next.body !== draft.body || next.image_url !== draft.image_url;
    if (!changed) return { ok: true, studio: { version: 1, items }, id };
    if (draft.body.trim() || draft.subject.trim()) {
      draft.revisions = [{ at: draft.updated_at, by: "Ryan", subject: draft.subject || undefined, body: draft.body }, ...draft.revisions].slice(0, MAX_REVISIONS);
    }
    Object.assign(draft, next);
    draft.updated_at = now;
    // An approval covers the exact words approved. New words need a new look.
    if (draft.status === "approved" || draft.status === "scheduled") {
      draft.status = "review";
      draft.approved_at = null;
      draft.scheduled_for = null;
    }
    return { ok: true, studio: { version: 1, items }, id };
  }

  if (op.op === "set_status") {
    const status = op.status as DraftStatus;
    if (!SETTABLE.includes(status)) return { ok: false, error: "Published and failed come from the office, not from here." };
    if (draft.status === "published") return { ok: false, error: "This one is already published." };
    if (status === "approved" && !canApprove(draft, item)) return { ok: false, error: "Fix the blocking checks before approving." };
    if (status === "scheduled") {
      if (draft.status !== "approved") return { ok: false, error: "Approve the draft before scheduling it." };
      const when = typeof op.scheduled_for === "string" ? op.scheduled_for : "";
      if (!/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2})?$/.test(when)) return { ok: false, error: "Pick a date to schedule it." };
      draft.scheduled_for = when;
    } else {
      draft.scheduled_for = null;
    }
    draft.approved_at = status === "approved" ? now : status === "scheduled" ? draft.approved_at : null;
    draft.status = status;
    draft.updated_at = now;
    return { ok: true, studio: { version: 1, items }, id };
  }

  return { ok: false, error: "Unknown change." };
}

function emptyDraft(channel: Channel, now: string): Draft {
  return { channel, status: "draft", subject: "", preview: "", body: "", image_url: "", scheduled_for: null, approved_at: null, updated_at: now, revisions: [] };
}

/** Read the stored studio. Anything malformed is dropped, never thrown. */
export function parseStudio(raw: string | null): Studio {
  if (!raw) return { ...EMPTY_STUDIO, items: [] };
  try {
    const data = JSON.parse(raw) as { items?: unknown };
    if (!Array.isArray(data.items)) return { ...EMPTY_STUDIO, items: [] };
    const items = data.items.filter((item): item is ContentItem => Boolean(item && typeof item === "object" && typeof (item as ContentItem).id === "string" && Array.isArray((item as ContentItem).drafts)));
    return { version: 1, items };
  } catch {
    return { ...EMPTY_STUDIO, items: [] };
  }
}

/** Scheduled drafts in the next `days` days, by Chicago calendar day. */
export function calendar(studio: Studio, now: number, days = 14): { day: string; label: string; entries: { id: string; title: string; channel: Channel; status: DraftStatus }[] }[] {
  const fmtDay = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Chicago", year: "numeric", month: "2-digit", day: "2-digit" });
  const fmtLabel = new Intl.DateTimeFormat("en-US", { timeZone: "America/Chicago", weekday: "short", month: "short", day: "numeric" });
  const out = [] as ReturnType<typeof calendar>;
  for (let i = 0; i < days; i += 1) {
    const at = new Date(now + i * 86_400_000);
    out.push({ day: fmtDay.format(at), label: fmtLabel.format(at), entries: [] });
  }
  for (const item of studio.items) {
    if (item.archived) continue;
    for (const draft of item.drafts) {
      if (!draft.scheduled_for) continue;
      const slot = out.find((row) => row.day === draft.scheduled_for!.slice(0, 10));
      if (slot) slot.entries.push({ id: item.id, title: item.title, channel: draft.channel, status: draft.status });
    }
  }
  return out;
}

export type ContentWaiting = { id: string; title: string; channels: string };

/** Drafts sitting in review: the content that is waiting on Ryan's yes. */
export function contentWaiting(studio: Studio): ContentWaiting[] {
  return studio.items
    .filter((item) => !item.archived)
    .map((item) => ({ item, review: item.drafts.filter((draft) => draft.status === "review") }))
    .filter((row) => row.review.length > 0)
    .map(({ item, review }) => ({ id: item.id, title: item.title, channels: review.map((draft) => CHANNEL_LABEL[draft.channel]).join(", ") }));
}
