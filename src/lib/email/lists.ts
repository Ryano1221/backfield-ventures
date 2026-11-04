export type ListKind = "newsletter" | "partner" | "lead-magnet";

export type EmailList = {
  id: string;
  name: string;
  kind: ListKind;
};

export const LISTS: Record<string, EmailList> = {
  handoff: { id: "handoff", name: "The Handoff", kind: "newsletter" },
  "best-3": { id: "best-3", name: "Best 3", kind: "partner" },
  "sample-list": { id: "sample-list", name: "Sample List", kind: "lead-magnet" },
};

export function knownList(id: string): EmailList | null {
  return LISTS[id] ?? null;
}

export function listsToJoin(input: { list: string; optInHandoff: boolean }): string[] {
  const list = knownList(input.list);
  if (!list) return [];
  if (list.kind === "lead-magnet") {
    return input.optInHandoff ? [list.id, "handoff"] : [list.id];
  }
  return [list.id];
}
