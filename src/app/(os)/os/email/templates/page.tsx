import type { Metadata } from "next";
import { CopyButton } from "@/components/email/CopyButton";
import { PageHead, SampleTag } from "@/components/email/ui";
import { BEST3_HTML, BEST3_TEXT, HANDOFF_HTML, HANDOFF_TEXT, WELCOME_PREVIEW, WELCOME_SUBJECT, WELCOME_TEXT } from "@/lib/email/templates";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Templates | Backfield OS",
  robots: { index: false, follow: false },
};

export default function TemplatesPage() {
  return (
    <>
      <PageHead
        title="Templates"
        lede={
          <>
            The Handoff and Best 3. <SampleTag />
          </>
        }
        primary={<CopyButton primary label="Copy Handoff HTML" value={HANDOFF_HTML} />}
      />
      <div className="stack">
        <section className="card">
          <div className="h">
            <span className="lbl">
              The Handoff <SampleTag />
            </span>
          </div>
          <div className="block">
            <p>From Ryan Arnold &lt;ryan@info.backfieldventures.com&gt;</p>
            <p className="hint">Reply to ryan@backfieldventures.com</p>
            <div className="actions">
              <CopyButton label="Copy text" value={HANDOFF_TEXT} />
            </div>
            <pre className="embed">{HANDOFF_TEXT}</pre>
          </div>
        </section>
        <section className="card">
          <div className="h">
            <span className="lbl">
              Best 3 <SampleTag />
            </span>
          </div>
          <div className="block">
            <p>Best 3 stays in the mail client. This screen only holds the template.</p>
            <div className="actions">
              <CopyButton label="Copy HTML" value={BEST3_HTML} />
              <CopyButton label="Copy text" value={BEST3_TEXT} />
            </div>
            <pre className="embed">{BEST3_TEXT}</pre>
          </div>
        </section>
        <section className="card">
          <div className="h">
            <span className="lbl">
              Welcome email <span className="state">Draft</span>
            </span>
          </div>
          <div className="block">
            <p>{WELCOME_SUBJECT}</p>
            <p className="hint">{WELCOME_PREVIEW}</p>
            <p className="hint">Ryan sees this before it is turned on.</p>
            <div className="actions">
              <CopyButton label="Copy text" value={WELCOME_TEXT} />
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
