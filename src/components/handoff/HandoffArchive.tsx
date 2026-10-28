import "server-only";
import { headers } from "next/headers";
import styles from "@/app/handoff/handoff.module.css";
import {
  ARCHIVE_HEADING,
  ARCHIVE_LINE,
  ARCHIVE_SUBHEADING,
  fixtureRequested,
  formatArchiveDate,
  loadArchiveIssues,
  type ArchiveEnv,
} from "@/lib/handoff-archive";

function archiveEnv(): ArchiveEnv {
  return {
    VERCEL_ENV: process.env.VERCEL_ENV,
    HANDOFF_ARCHIVE_FIXTURE: process.env.HANDOFF_ARCHIVE_FIXTURE,
    BEEHIIV_RSS_URL: process.env.BEEHIIV_RSS_URL,
    BEEHIIV_API_KEY: process.env.BEEHIIV_API_KEY,
    BEEHIIV_PUBLICATION_ID: process.env.BEEHIIV_PUBLICATION_ID,
  };
}

async function requestHost(env: ArchiveEnv): Promise<string | null> {
  if (!fixtureRequested(env)) return null;
  const list = await headers();
  return list.get("x-forwarded-host") ?? list.get("host");
}

export default async function HandoffArchive() {
  const env = archiveEnv();
  const issues = await loadArchiveIssues({
    env,
    host: await requestHost(env),
  });
  if (issues.length === 0) return null;

  return (
    <section className={styles.archive} id="past-issues" aria-labelledby="handoff-archive-heading">
      <p className={`${styles.archiveDate} ${styles.archiveEyebrow}`}>{ARCHIVE_HEADING}</p>
      <h2 id="handoff-archive-heading" className={styles.sectionHeading}>
        {ARCHIVE_SUBHEADING}
      </h2>
      <p className={styles.lead}>{ARCHIVE_LINE}</p>
      <ul className={styles.archiveList}>
        {issues.map((issue) => (
          <li key={issue.id}>
            <a className={styles.archiveLink} href={issue.url}>
              <time className={styles.archiveDate} dateTime={new Date(issue.publishedAt).toISOString()}>
                {formatArchiveDate(issue.publishedAt)}
              </time>
              <span className={styles.archiveTitleRow}>
                <span className={styles.archiveTitle}>{issue.title}</span>
                <span className={styles.archiveGo} aria-hidden="true">
                  →
                </span>
              </span>
              {issue.preview ? <span className={styles.archivePreview}>{issue.preview}</span> : null}
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
