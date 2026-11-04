import type { Metadata } from "next";
import { ADDRESS } from "@/lib/email/copy";
import { persistUnsubscribe } from "@/lib/email/store";
import { unsubMessage, unsubscribeByToken } from "@/lib/email/unsubscribe";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Unsubscribe | Backfield Ventures",
  robots: { index: false, follow: false },
};

export default async function UnsubscribePage({ params }: { params: Promise<{ token: string }> }) {
  const { token: raw } = await params;
  let token = raw;
  try {
    token = decodeURIComponent(raw);
  } catch {
    token = raw;
  }
  const result = unsubscribeByToken(token);
  if (result.ok && !result.dryRun) await persistUnsubscribe(token);

  return (
    <div className="unsub">
      <main>
        <img src="/brand/logo-cream.png" alt="Backfield Ventures" />
        <h1>Unsubscribe</h1>
        <p>{unsubMessage(result)}</p>
        {result.dryRun ? <p>This preview did not write to the database.</p> : null}
        <p className="fine">Backfield Ventures, {ADDRESS}</p>
        <p>
          <a href="https://backfieldventures.com">Back to the site</a>
        </p>
      </main>
    </div>
  );
}
