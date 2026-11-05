import { approvedText, decisionVersions, latestVersion } from "./drive";
import { decisionKey } from "./decision-id";
import { sha256 } from "./sha256";
import type { ActionPayload, Decision, DriveBrief } from "./types";

export function normalizeDriveApprove(
  decision: Decision,
  raw: unknown,
): { ok: true; payload: ActionPayload } | { ok: false; error: string } {
  const version = readVersion(raw);
  const versions = decisionVersions(decision);
  const latest = latestVersion(versions);
  if (!latest) return { ok: false, error: "Nothing to approve" };
  if (version !== latest.version) return { ok: false, error: "Only the latest version can be approved" };
  const text = approvedText(latest.subject, latest.body);
  if (!text) return { ok: false, error: "Nothing to approve" };
  if (text.length > 8000) return { ok: false, error: "That draft is too long" };
  return {
    ok: true,
    payload: {
      decision_id: decisionKey(decision),
      version: latest.version,
      subject: latest.subject || null,
      body: latest.body,
      text,
      sha256: sha256(text),
    },
  };
}

export function normalizeDriveEdit(
  decision: Decision,
  raw: unknown,
): { ok: true; payload: ActionPayload } | { ok: false; error: string } {
  const record = isRecord(raw) ? raw : {};
  const base = readVersion(record);
  const note = typeof record.note === "string" ? record.note.trim() : "";
  const versions = decisionVersions(decision);
  const latest = latestVersion(versions);
  if (!latest) return { ok: false, error: "Nothing to edit" };
  if (base !== latest.version) return { ok: false, error: "That note is on an older version" };
  if (!note) return { ok: false, error: "Say what should change" };
  if (note.length > 2000) return { ok: false, error: "That note is too long" };
  return {
    ok: true,
    payload: {
      decision_id: decisionKey(decision),
      base_version: latest.version,
      note,
    },
  };
}

export function normalizeBriefApprove(
  brief: DriveBrief,
  raw: unknown,
): { ok: true; payload: ActionPayload } | { ok: false; error: string } {
  const record = isRecord(raw) ? raw : {};
  const choice = typeof record.choice === "string" ? record.choice.trim() : "";
  const option = brief.options?.find((item) => item.value === choice);
  const body = option?.label || brief.body || "";
  if (!body) return { ok: false, error: "Nothing to approve" };
  const text = approvedText(brief.title, body);
  return {
    ok: true,
    payload: {
      decision_id: brief.id,
      version: 1,
      subject: brief.title,
      body,
      text,
      sha256: sha256(text),
    },
  };
}

export function normalizeDriveSkip(raw: unknown, target: string): { ok: true; payload: ActionPayload } | { ok: false; error: string } {
  const record = isRecord(raw) ? raw : {};
  const kind = typeof record.kind === "string" ? record.kind : "";
  if (kind !== "draft" && kind !== "yesno" && kind !== "rate" && kind !== "question") {
    return { ok: false, error: "Unknown drive item" };
  }
  return { ok: true, payload: { item_id: target, kind } };
}

function readVersion(raw: unknown): number {
  if (!isRecord(raw)) return 0;
  return typeof raw.version === "number" ? raw.version : typeof raw.base_version === "number" ? raw.base_version : 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
