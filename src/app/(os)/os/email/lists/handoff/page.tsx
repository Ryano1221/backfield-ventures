import type { Metadata } from "next";
import { headers } from "next/headers";
import { PageHead, SampleTag } from "@/components/email/ui";
import { emailHrefs } from "@/lib/email/nav";
import { isOsHost } from "@/lib/os/host";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "The Handoff | Backfield OS",
  robots: { index: false, follow: false },
};

export default async function HandoffListPage() {
  const headerList = await headers();
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host") ?? "";
  const hrefs = emailHrefs(isOsHost(host));
  return (
    <>
      <PageHead
        title="The Handoff"
        lede={
          <>
            The monthly note. <SampleTag />
          </>
        }
        primary={
          <a className="primary-btn" href={hrefs.compose}>
            Open draft
          </a>
        }
      />
      <section className="card">
        <div className="block">
          <div className="pair">
            <span className="lbl">Readers</span>
            <span>
              120 <SampleTag />
            </span>
          </div>
          <div className="pair">
            <span className="lbl">From</span>
            <span>Ryan Arnold &lt;ryan@info.backfieldventures.com&gt;</span>
          </div>
          <p className="hint">Nothing goes to this list without a test send and my yes.</p>
        </div>
      </section>
    </>
  );
}
