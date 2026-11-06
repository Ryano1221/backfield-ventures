import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { answersFromActions, readActions } from "./actions";
import { isOsAuthed } from "./current";
import { buildFinder } from "./finder";
import { isOsHost } from "./host";
import { buildDashboard } from "./metrics";
import { osHrefs } from "./nav";
import { readSnapshot } from "./store";
import { readDoc } from "./doc-store";
import { parseHistory, recordOutreach, weekByTrack, type TrackWeek } from "./outreach-history";
import type { Snapshot } from "./types";

/** One snapshot read per request, shared by layouts and pages. */
export const readSnapshotOnce = cache(() => readSnapshot());

export async function loadOsPage() {
  const headerList = await headers();
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host") ?? "";
  const hrefs = osHrefs(isOsHost(host));
  if (!(await isOsAuthed())) redirect(hrefs.login);
  const [snapshot, actions] = await Promise.all([readSnapshotOnce(), readActions()]);
  const model = buildDashboard(snapshot);
  return { hrefs, snapshot, model, answers: answersFromActions(actions), actions, finder: buildFinder(snapshot) };
}

/** Seven days of outreach by track: the stored history plus the current snapshot. */
export async function loadOutreachWeeks(snapshot: Snapshot | null, now: number): Promise<TrackWeek[]> {
  let history = parseHistory(await readDoc("outreach-history").catch(() => null));
  if (snapshot) history = recordOutreach(history, snapshot);
  return weekByTrack(history, now);
}
