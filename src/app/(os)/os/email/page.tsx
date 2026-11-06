import type { Metadata } from "next";
import { headers } from "next/headers";
import { SubscriberList } from "@/components/email/SubscriberList";
import { PageHead } from "@/components/email/ui";
import { formatJoined } from "@/lib/email/format";
import { emailHrefs } from "@/lib/email/nav";
import { loadSends, loadSubscribers } from "@/lib/email/store";
import { isOsHost } from "@/lib/os/host";
import { loadOutreachWeeks, readSnapshotOnce } from "@/lib/os/page-data";
import { OutreachWeek } from "@/components/os/night/OutreachWeek";
import { asOfWord } from "@/lib/os/as-of";
import { formatCt } from "@/lib/os/night";
import { STALE_AFTER_MS } from "@/lib/os/types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Email | Backfield OS",
  robots: { index: false, follow: false },
};

export default async function EmailDashboardPage() {
  const headerList = await headers();
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host") ?? "";
  const hrefs = emailHrefs(isOsHost(host));
  const [people, sends, snapshot] = await Promise.all([loadSubscribers(), loadSends(), readSnapshotOnce()]);
  const subscribers = people.sample ? [] : people.rows;
  const sent = sends.sample ? [] : sends.rows;
  const outreach = snapshot?.outreach ?? [];
  const now = readClock();
  const weeks = await loadOutreachWeeks(snapshot, now);
  const generatedMs = snapshot ? Date.parse(snapshot.generated_at) : NaN;
  const stale = Number.isFinite(generatedMs) && now - generatedMs > STALE_AFTER_MS;
  const asOf = asOfWord(stale, snapshot ? formatCt(snapshot.generated_at, true) : null);
  const month = new Date(now).toISOString().slice(0, 7);
  const newThisMonth = subscribers.filter((row) => row.joined.startsWith(month)).length;

  return (
    <>
      <PageHead
        title="Dashboard"
        lede="What this snapshot actually has. Empty lines are missing, not zero."
        primary={
          <a className="primary-btn" href={hrefs.compose}>
            Open draft
          </a>
        }
      />
      <div className="kpis">
        <div className="kpi">
          <div className="lbl">Subscribers</div>
          <div className="v">{people.sample ? "Not loaded" : subscribers.length.toLocaleString("en-US")}</div>
          <div className="d">{people.sample ? "No subscriber list on this snapshot." : "On The Handoff"}</div>
        </div>
        <div className="kpi">
          <div className="lbl">New this month</div>
          <div className="v">{people.sample ? "Not loaded" : newThisMonth.toLocaleString("en-US")}</div>
          <div className="d">{people.sample ? "Needs a joined date on each subscriber." : "Joined this month"}</div>
        </div>
        <div className="kpi">
          <div className="lbl">Outreach {asOf}</div>
          <div className="v">{outreach.length ? outreach.reduce((sum, row) => sum + row.sent, 0).toLocaleString("en-US") : "0"}</div>
          <div className="d">{outreach.length ? "Sent across the tracks on this snapshot." : "No outreach counts on this snapshot."}</div>
        </div>
      </div>
      {weeks.length ? (
        <OutreachWeek weeks={weeks} />
      ) : outreach.length ? (
        <section className="card">
          <div className="h"><span className="lbl">Outreach</span></div>
          <ul>
            {outreach.map((row) => (
              <li key={row.track}>
                <b>{row.label || row.track}</b> {row.sent.toLocaleString("en-US")}
                {row.floor ? ` of ${row.floor.toLocaleString("en-US")}` : ""}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      <div className="grid2">
        <SubscriberList
          sample={false}
          exportHref={people.sample ? undefined : hrefs.exportSubscribers}
          rows={subscribers.map((row) => ({
            name: row.name,
            email: row.email,
            source: row.source,
            tags: row.tags,
            joinedLabel: formatJoined(row.joined),
          }))}
        />
        <div className="col">
          <section className="card">
            <div className="h">
              <span className="lbl">Recent sends</span>
            </div>
            {sent.length ? <>
            <div className="desk-only">
              <table>
                <thead>
                  <tr>
                    <th>Email</th>
                    <th>List</th>
                    <th>State</th>
                    <th>Sent to</th>
                  </tr>
                </thead>
                <tbody>
                  {sent.map((row) => (
                    <tr key={row.name}>
                      <td>
                        <div className="n">{row.name}</div>
                      </td>
                      <td>{row.list}</td>
                      <td>
                        <span className="state">{row.state}</span>
                      </td>
                      <td className="mono">{row.sentTo}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mob-only">
              {sent.map((row) => (
                <div className="row" key={row.name}>
                  <div className="n">{row.name}</div>
                  <div className="m">
                    <span>{row.list}</span>
                    <span className="state">{row.state}</span>
                    <span>Sent to: {row.sentTo}</span>
                  </div>
                </div>
              ))}
            </div>
            </> : <p className="note">No sends on this snapshot.</p>}
          </section>
          <section className="card">
            <div className="h"><span className="lbl">Signups by week</span></div>
            <p className="note">No weekly signup series on this snapshot.</p>
          </section>
        </div>
      </div>
      <p className="note">Nothing goes to a list without a test send and your yes. Open and click tracking is off. Unsubscribes, list signups, and weekly signup counts are not on this snapshot.</p>
    </>
  );
}

function readClock(): number {
  return Date.now();
}
