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
