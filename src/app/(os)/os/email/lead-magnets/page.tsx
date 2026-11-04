import type { Metadata } from "next";
import { CopyButton } from "@/components/email/CopyButton";
import { SignupTry } from "@/components/email/SignupTry";
import { PageHead, SampleTag } from "@/components/email/ui";
import { DELIVERY_SUBJECT, DELIVERY_TEXT } from "@/lib/email/templates";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Lead magnets | Backfield OS",
  robots: { index: false, follow: false },
};

export default function LeadMagnetsPage() {
  return (
    <>
      <PageHead
        title="Lead magnets"
        lede={
          <>
            Each magnet has a page, a delivery email, and a separate Handoff opt-in. <SampleTag />
          </>
        }
        primary={<CopyButton primary label="Copy delivery email" value={DELIVERY_TEXT} />}
      />
      <section className="card">
        <div className="h">
          <span className="lbl">
            Sample List <SampleTag />
          </span>
        </div>
        <div className="block">
          <div className="pair">
            <span className="lbl">Page</span>
            <span>backfieldventures.com/lists/sample-list</span>
          </div>
          <div className="pair">
            <span className="lbl">Delivery email</span>
            <span>{DELIVERY_SUBJECT}</span>
          </div>
          <pre className="embed">{DELIVERY_TEXT}</pre>
        </div>
        <SignupTry list="sample-list" showOptIn buttonLabel="Try this signup" />
      </section>
    </>
  );
}
