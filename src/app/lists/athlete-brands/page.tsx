import type { Metadata } from "next";
import Link from "next/link";
import Footer from "@/components/Footer";
import LeftBar from "@/components/LeftBar";
import Nav from "@/components/Nav";
import ParticleBackground from "@/components/ParticleBackground";
import data from "@/data/lists/athlete-brands.json";
import AthleteBrandsTable from "./AthleteBrandsTable";
import styles from "./list.module.css";

const verifiedRows = data.rows.filter((row) => row.verified === "Y").length;
const unverifiedRows = data.rows.filter((row) => row.verified === "N").length;

if (data.rows.length !== data.row_count) {
  throw new Error(
    `athlete-brands row_count is ${data.row_count} but rows has ${data.rows.length}`,
  );
}

if (verifiedRows !== data.verified_count) {
  throw new Error(
    `athlete-brands verified_count is ${data.verified_count} but ${verifiedRows} rows are verified`,
  );
}

if (verifiedRows + unverifiedRows !== data.rows.length) {
  throw new Error("athlete-brands has a row that is neither verified nor unverified");
}

if (data.rows.some((row) => !row.source_url)) {
  throw new Error("athlete-brands row is missing a source");
}

const allowedBases = new Set(["", "reported", "source estimate", "round"]);
if (data.rows.some((row) => !allowedBases.has(row.value_basis))) {
  throw new Error("athlete-brands row has a value basis that is not shown");
}

if (
  data.rows.some(
    (row) => row.value_display.trim() !== "" && row.value_source_url === "",
  )
) {
  throw new Error("athlete-brands value is missing its source");
}

const pageTitle = "Athlete brands | Backfield Ventures";
const pageDescription =
  "Consumer brands that athletes founded, owned or invested in, with who's behind each one and how they're involved.";

export const metadata: Metadata = {
  title: pageTitle,
  description: pageDescription,
  keywords: ["athlete brands", "consumer brands"],
  alternates: {
    canonical: "https://backfieldventures.com/lists/athlete-brands",
  },
  robots: { index: false, follow: false },
  openGraph: {
    title: pageTitle,
    description: pageDescription,
    url: "https://backfieldventures.com/lists/athlete-brands",
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

export default function AthleteBrandsPage() {
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
          <AthleteBrandsTable />
          <section className={styles.notes} aria-label="Notes">
            <p>
              If you want more like this, I write a newsletter called{" "}
              <Link href="/handoff?src=list-athlete-brands">The Handoff</Link>.
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
