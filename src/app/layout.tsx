import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import "./globals.css";

const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-montserrat",
  weight: ["300", "400", "500", "600", "700", "800", "900"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Backfield Ventures",
  description:
    "Backfield Ventures invests in consumer and sports companies from seed to Series A. We back founders building the next generation of iconic brands and platforms.",
  metadataBase: new URL("https://backfieldventures.com"),
  openGraph: {
    title: "Backfield Ventures",
    description: "Behind the next generation of consumer and sports companies.",
    url: "https://backfieldventures.com",
    siteName: "Backfield Ventures",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Backfield Ventures",
    description: "Behind the next generation of consumer and sports companies.",
  },
  robots: { index: true, follow: true },
  keywords: [
    "venture capital",
    "consumer startups",
    "sports technology",
    "seed funding",
    "Series A",
    "venture firm",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={montserrat.variable}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
