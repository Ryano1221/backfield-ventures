import type { Metadata } from "next";
import Footer from "@/components/Footer";
import LeftBar from "@/components/LeftBar";
import Nav from "@/components/Nav";
import ParticleBackground from "@/components/ParticleBackground";
import DealMosaic from "@/components/handoff/DealMosaic";
import HandoffDrawers from "@/components/handoff/HandoffDrawers";
import HandoffHero from "@/components/handoff/HandoffHero";
import HandoffMidCta from "@/components/handoff/HandoffMidCta";
import HandoffSubscribe from "@/components/handoff/HandoffSubscribe";
import styles from "./handoff.module.css";

export const metadata: Metadata = {
  title: "The Handoff | Backfield Ventures",
  description: "Early sports and consumer brands worth a look. Monthly writeups.",
  alternates: { canonical: "https://backfieldventures.com/handoff" },
  robots: { index: true, follow: true },
  openGraph: {
    title: "The Handoff | Backfield Ventures",
    description: "Early sports and consumer brands worth a look. Monthly writeups.",
    url: "https://backfieldventures.com/handoff",
    siteName: "Backfield Ventures",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "The Handoff | Backfield Ventures",
    description: "Early sports and consumer brands worth a look. Monthly writeups.",
  },
};

export default function HandoffPage() {
  return (
    <>
      <ParticleBackground />
      <LeftBar />
      <Nav />
      <main id="handoff-main" className={styles.main}>
        <section className={`${styles.section} ${styles.sectionFirst}`} aria-labelledby="dr-headline">
          <div className={styles.container}>
            <HandoffHero />
            <HandoffSubscribe />
            <DealMosaic />
            <p className={styles.proofNote}>
              Five public, private brands shown as examples. Not pitches to Backfield. Not an investment offer.
            </p>
            <HandoffMidCta />
          </div>
        </section>
      </main>
      <Footer />
      <HandoffDrawers />
    </>
  );
}
