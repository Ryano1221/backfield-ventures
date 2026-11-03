import type { Metadata } from "next";
import PitchForm from "./PitchForm";

export const metadata: Metadata = {
  title: "Pitch Us | Backfield Ventures",
  description:
    "Submit your pitch to Backfield Ventures. We invest in sports, CPG, and consumer brands at pre-seed through Series A. Tell us what you're building.",
  metadataBase: new URL("https://backfieldventures.com"),
  alternates: { canonical: "https://backfieldventures.com/pitch" },
  openGraph: {
    title: "Pitch Us | Backfield Ventures",
    description:
      "Submit your pitch to Backfield Ventures. We invest in sports, CPG, and consumer brands at pre-seed through Series A.",
    url: "https://backfieldventures.com/pitch",
    siteName: "Backfield Ventures",
    type: "website",
  },
  robots: { index: false, follow: false },
};

export default function PitchPage() {
  return <PitchForm />;
}
