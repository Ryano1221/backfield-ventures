import type { Metadata } from "next";
import { headers } from "next/headers";
import { SubscriberList } from "@/components/email/SubscriberList";
import { PageHead, SampleTag } from "@/components/email/ui";
import { formatJoined } from "@/lib/email/format";
import { emailHrefs } from "@/lib/email/nav";
import { REAL_STRIP, SAMPLE_STATS, SAMPLE_WEEKS } from "@/lib/email/sample";
import { loadSends, loadSubscribers } from "@/lib/email/store";
import { isOsHost } from "@/lib/os/host";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Email | Backfield OS",
  robots: { index: false, follow: false },
};

export default async function EmailDashboardPage() {
  const headerList = await headers();
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host") ?? "";
  const hrefs = emailHrefs(isOsHost(host));
  const [people, sends] = await Promise.all([loadSubscribers(), loadSends()]);
  const stats = people.sample
    ? SAMPLE_STATS
    : {
        subscribers: people.rows.length,
        newThisMonth: people.rows.filter((row) => row.joined.startsWith(new Date().toISOString().slice(0, 7))).length,
        unsubscribed: null as number | null,
        listSignups: null as number | null,
      };
  const cards = [
    { label: "Subscribers", value: stats.subscribers, detail: "On The Handoff" },
    { label: "New this month", value: stats.newThisMonth, detail: "From the site and list pages" },
    stats.unsubscribed == null ? null : { label: "Unsubscribed", value: stats.unsubscribed, detail: "This month" },
    stats.listSignups == null ? null : { label: "List signups", value: stats.listSignups, detail: "From lead magnet pages" },
  ].filter((card) => card != null);

  return (
    <>
      <PageHead
        title="Dashboard"
        lede={
          <>
            All lists, last 30 days. {people.sample ? <SampleTag /> : null}
          </>
        }
        primary={
          <a className="primary-btn" href={hrefs.compose}>
            Open draft
          </a>
        }
      />
      <div className="kpis">
        {cards.map((card) => (
          <div className="kpi" key={card.label}>
            <div className="lbl">
              {card.label} {people.sample ? <SampleTag /> : null}
            </div>
            <div className="v">{card.value}</div>
            <div className="d">{card.detail}</div>
          </div>
        ))}
      </div>
      <div className="grid2">
        <SubscriberList
          sample={people.sample}
          exportHref={hrefs.exportSubscribers}
          rows={people.rows.map((row) => ({
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
              <span className="lbl">
                Recent sends {sends.sample ? <SampleTag /> : null}
              </span>
            </div>
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
                  {sends.rows.map((row) => (
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
              {sends.rows.map((row) => (
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
          </section>
          <section className="card">
            <div className="h">
              <span className="lbl">
                Signups by week <SampleTag />
              </span>
            </div>
            <div className="bars" aria-hidden="true">
              {SAMPLE_WEEKS.map((height, index) => (
                <i key={index} className={index === SAMPLE_WEEKS.length - 1 ? "hl" : ""} style={{ height: `${height}%` }} />
              ))}
            </div>
            <div className="axis lbl">
              <span>12 weeks ago</span>
              <span>This week</span>
            </div>
          </section>
        </div>
      </div>
      <div className="real">
        <span className="lbl">{REAL_STRIP.label}</span>
        <ul>
          <li>
            <b>{REAL_STRIP.subscribers}</b> subscribers
          </li>
          <li>
            <b>1</b> draft, Issue 01
          </li>
          <li>
            <b>{REAL_STRIP.sends}</b> sends
          </li>
          <li>{REAL_STRIP.welcome}</li>
        </ul>
      </div>
      <p className="note">Nothing goes to a list without a test send and my yes. Open and click tracking is off.</p>
    </>
  );
}
