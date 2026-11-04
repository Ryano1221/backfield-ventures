import type { Metadata } from "next";
import { CopyButton } from "@/components/email/CopyButton";
import { PageHead, SampleTag } from "@/components/email/ui";
import { BEST3_HTML, BEST3_TEXT } from "@/lib/email/templates";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Best 3 | Backfield OS",
  robots: { index: false, follow: false },
};

export default function Best3ListPage() {
  return (
    <>
      <PageHead
        title="Best 3"
        lede={
          <>
            Stays in the mail client. This screen only holds the template. <SampleTag />
          </>
        }
        primary={<CopyButton primary label="Copy HTML" value={BEST3_HTML} />}
      />
      <section className="card">
        <div className="block">
          <p>No send button. Copy the HTML or the text, then send it yourself.</p>
          <div className="actions">
            <CopyButton label="Copy text" value={BEST3_TEXT} />
          </div>
        </div>
      </section>
    </>
  );
}
