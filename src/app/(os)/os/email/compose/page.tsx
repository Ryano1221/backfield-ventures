import type { Metadata } from "next";
import { ComposeScreen } from "@/components/email/ComposeScreen";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Compose | Backfield OS",
  robots: { index: false, follow: false },
};

export default async function ComposePage({ searchParams }: { searchParams: Promise<{ draft?: string }> }) {
  const params = await searchParams;
  const draft = params.draft || "issue-01";
  return <ComposeScreen key={draft} initialId={draft} />;
}
