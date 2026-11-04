import type { Metadata } from "next";
import { headers } from "next/headers";
import { SubscriberList } from "@/components/email/SubscriberList";
import { PageHead, SampleTag } from "@/components/email/ui";
import { formatJoined } from "@/lib/email/format";
import { emailHrefs } from "@/lib/email/nav";
import { loadSubscribers } from "@/lib/email/store";
import { isOsHost } from "@/lib/os/host";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Subscribers | Backfield OS",
  robots: { index: false, follow: false },
};

export default async function SubscribersPage() {
  const headerList = await headers();
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host") ?? "";
  const hrefs = emailHrefs(isOsHost(host));
  const people = await loadSubscribers();

  return (
    <>
      <PageHead
        title="Subscribers"
        lede={
          <>
            Name, email, source, tags, and joined. {people.sample ? <SampleTag /> : null}
          </>
        }
        primary={
          <a className="primary-btn" href={hrefs.exportSubscribers}>
            Export CSV
          </a>
        }
      />
      <SubscriberList
        sample={people.sample}
        rows={people.rows.map((row) => ({
          name: row.name,
          email: row.email,
          source: row.source,
          tags: row.tags,
          joinedLabel: formatJoined(row.joined),
        }))}
      />
    </>
  );
}
