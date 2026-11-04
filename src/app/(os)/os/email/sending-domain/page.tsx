import type { Metadata } from "next";
import { CopyButton } from "@/components/email/CopyButton";
import { PageHead } from "@/components/email/ui";
import { HANDOFF_FROM, HANDOFF_REPLY_TO } from "@/lib/email/copy";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Sending domain | Backfield OS",
  robots: { index: false, follow: false },
};

const FROM_ADDRESS = "ryan@info.backfieldventures.com";

export default function SendingDomainPage() {
  return (
    <>
      <PageHead
        title="Sending domain"
        lede="The Handoff sends from info.backfieldventures.com."
        primary={<CopyButton primary label="Copy from address" value={FROM_ADDRESS} />}
      />
      <section className="card">
        <div className="block">
          <div className="pair">
            <span className="lbl">From</span>
            <span>{HANDOFF_FROM}</span>
          </div>
          <div className="pair">
            <span className="lbl">Reply to</span>
            <span>{HANDOFF_REPLY_TO}</span>
          </div>
          <p className="hint">This page does not look up records. The values are static text.</p>
        </div>
      </section>
    </>
  );
}
