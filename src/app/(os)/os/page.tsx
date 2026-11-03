import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Dashboard } from "@/components/os/Dashboard";
import { isOsAuthed } from "@/lib/os/current";
import { isOsHost } from "@/lib/os/host";
import { buildDashboard } from "@/lib/os/metrics";
import { readSnapshot } from "@/lib/os/store";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Today | Backfield OS",
  robots: { index: false, follow: false },
};

export default async function OsPage() {
  const headerList = await headers();
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host") ?? "";
  const onOs = isOsHost(host);
  if (!(await isOsAuthed())) redirect(onOs ? "/login" : "/os/login");
  const snapshot = await readSnapshot();
  return <Dashboard model={buildDashboard(snapshot)} loginPath={onOs ? "/login" : "/os/login"} />;
}
