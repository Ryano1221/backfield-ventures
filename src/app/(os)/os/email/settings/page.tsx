import type { Metadata } from "next";
import { headers } from "next/headers";
import { PageHead } from "@/components/email/ui";
import { emailFlags } from "@/lib/email/flags";
import { emailHrefs } from "@/lib/email/nav";
import { isOsHost } from "@/lib/os/host";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Settings | Backfield OS",
  robots: { index: false, follow: false },
};

export default async function SettingsPage() {
  const headerList = await headers();
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host") ?? "";
  const hrefs = emailHrefs(isOsHost(host));
  const flags = emailFlags();
  const optIn = flags.doubleOptIn
    ? "Not decided yet. The flag is on, so a signup stays pending and no confirmation is sent."
    : "Not decided yet. Signups use single opt-in while the flag is off.";

  return (
    <>
      <PageHead
        title="Settings"
        lede="Read only for now."
        primary={
          <a className="primary-btn" href={`${hrefs.compose}?draft=welcome`}>
            Review welcome draft
          </a>
        }
      />
      <section className="card">
        <div className="block">
          <div className="pair">
            <span className="lbl">Tracking</span>
            <span>Off</span>
          </div>
          <div className="pair">
            <span className="lbl">Double opt-in</span>
            <span>{optIn}</span>
          </div>
          <div className="pair">
            <span className="lbl">Login</span>
            <span>OS login, Ryan only</span>
          </div>
          <div className="pair">
            <span className="lbl">Backup</span>
            <span>beehiiv stays as a backup</span>
          </div>
          <div className="pair">
            <span className="lbl">Welcome email</span>
            <span>Draft. Ryan sees this before it is turned on.</span>
          </div>
          <div className="pair">
            <span className="lbl">Sending</span>
            <span>{flags.send ? "Flag on, and still not wired" : "Off"}</span>
          </div>
          <div className="pair">
            <span className="lbl">Database writes</span>
            <span>{flags.db ? "On" : "Off"}</span>
          </div>
          <div className="pair">
            <span className="lbl">Sheet writes</span>
            <span>{flags.sheet ? "On" : "Off"}</span>
          </div>
        </div>
      </section>
    </>
  );
}
