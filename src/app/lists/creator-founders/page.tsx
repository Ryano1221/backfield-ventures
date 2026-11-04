import type { Metadata } from "next";
import Link from "next/link";
import Footer from "@/components/Footer";
import LeftBar from "@/components/LeftBar";
import Nav from "@/components/Nav";
import ParticleBackground from "@/components/ParticleBackground";
import data from "@/data/lists/creator-founders.json";
import CreatorFoundersTable from "./CreatorFoundersTable";
import styles from "./list.module.css";

const verifiedRows = data.rows.filter((row) => row.verified === "Y").length;
const unverifiedRows = data.rows.filter((row) => row.verified === "N").length;

if (data.rows.length !== data.row_count) {
  throw new Error(
    `creator-founders row_count is ${data.row_count} but rows has ${data.rows.length}`,
  );
}

if (verifiedRows !== data.verified_count) {
  throw new Error(
    `creator-founders verified_count is ${data.verified_count} but ${verifiedRows} rows are verified`,
  );
}

if (verifiedRows + unverifiedRows !== data.rows.length) {
  throw new Error("creator-founders has a row that is neither verified nor unverified");
}

if (data.rows.some((row) => !row.source_url)) {
  throw new Error("creator-founders row is missing a source");
}

const allowedBases = new Set(["", "reported", "source estimate", "round"]);
if (data.rows.some((row) => !allowedBases.has(row.value_basis))) {
  throw new Error("creator-founders row has a value basis that is not shown");
}

if (
  data.rows.some(
    (row) => row.value_display.trim() !== "" && row.value_source_url === "",
  )
) {
  throw new Error("creator-founders value is missing its source");
}

const pageTitle = "Creator founders | Backfield Ventures";
const pageDescription =
  "Consumer brands that creators founded or co-founded, with who's behind each one and where they built their audience.";

export const metadata: Metadata = {
  title: pageTitle,
  description: pageDescription,
  keywords: ["creator brands", "creator founders", "consumer brands"],
  alternates: {
    canonical: "https://backfieldventures.com/lists/creator-founders",
  },
  robots: { index: false, follow: false },
  openGraph: {
    title: pageTitle,
    description: pageDescription,
    url: "https://backfieldventures.com/lists/creator-founders",
    siteName: "Backfield Ventures",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary",
    title: pageTitle,
    description: pageDescription,
  },
};

export default function CreatorFoundersPage() {
  return (
    <>
      <ParticleBackground />
      <LeftBar />
      <Nav />
      <main className={styles.main}>
        <div className={styles.wrap}>
          <h1 className={styles.title}>{data.title}</h1>
          <p className={styles.lead}>
            {pageDescription} Updated {data.updated}.
          </p>
          <CreatorFoundersTable />
          <section className={styles.notes} aria-label="Notes">
            <p>
              If you want more like this, I write a newsletter called{" "}
              <Link href="/handoff?src=list-creator-founders">The Handoff</Link>.
            </p>
            <p>
              Got a CPG or sports company worth featuring? Send it to{" "}
              <a href="mailto:hello@backfieldventures.com">
                hello@backfieldventures.com
              </a>
              .
            </p>
            <p>{data.disclaimer}</p>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
