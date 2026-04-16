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
  title: "Backfield Ventures | Venture Capital for Consumer & Sports Companies",
  description:
    "Backfield Ventures backs the next generation of consumer and sports companies. Seed to Series A. If you're a founder, investor, or operator — let's talk.",
  metadataBase: new URL("https://backfieldventures.com"),
  alternates: {
    canonical: "https://backfieldventures.com",
  },
  keywords: [
    "venture capital",
    "consumer brands",
    "sports venture capital",
    "seed funding",
    "Series A",
    "DTC startups",
    "consumer health wellness",
    "sports technology investment",
    "fan engagement",
    "athlete brands",
    "sports media streaming",
    "sports data analytics",
    "early stage venture",
    "consumer product startup funding",
    "sports company investment",
    "venture capital fund",
    "venture capital for consumer brands",
    "community platforms",
    "lifestyle brands",
    "commerce marketplaces",
    "pre-seed investment",
    "Backfield Ventures",
  ],
  openGraph: {
    title: "Backfield Ventures | Venture Capital for Consumer & Sports Companies",
    description:
      "Backfield Ventures backs the next generation of consumer and sports companies. Seed to Series A. If you're a founder, investor, or operator — let's talk.",
    url: "https://backfieldventures.com",
    siteName: "Backfield Ventures",
    type: "website",
    locale: "en_US",
    images: [
      {
        url: "https://backfieldventures.com/og-image.png",
        width: 1200,
        height: 630,
        alt: "Backfield Ventures — Venture Capital for Consumer & Sports Companies",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Backfield Ventures | Venture Capital for Consumer & Sports Companies",
    description:
      "Backfield Ventures backs the next generation of consumer and sports companies. Seed to Series A. If you're a founder, investor, or operator — let's talk.",
    images: ["https://backfieldventures.com/og-image.png"],
  },
  robots: { index: true, follow: true },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      name: "Backfield Ventures",
      url: "https://backfieldventures.com",
      logo: "https://backfieldventures.com/logo-text.png",
      description:
        "Backfield Ventures is a venture capital firm investing in consumer brands and sports companies from pre-seed through Series A.",
      email: "hello@backfieldventures.com",
      sameAs: ["https://www.linkedin.com/company/backfield-ventures"],
    },
    {
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: "What does Backfield Ventures invest in?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Backfield Ventures invests in consumer brands and sports companies. Our consumer focus includes DTC brands, consumer health & wellness, community-driven platforms, modern lifestyle brands, and commerce & marketplaces. Our sports focus includes fan engagement & experiences, athlete brands & ventures, sports technology, media & streaming, and sports data & analytics.",
          },
        },
        {
          "@type": "Question",
          name: "How do I get funding from Backfield Ventures?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Reach out directly at hello@backfieldventures.com with the subject 'Founder Intro'. We read every deck and respond to every serious inquiry.",
          },
        },
        {
          "@type": "Question",
          name: "What stage does Backfield Ventures invest at?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Our primary focus is Seed and Series A. We invest selectively at Pre-Seed when the opportunity is compelling, and occasionally at Series B+ when we have meaningful insight into the business.",
          },
        },
        {
          "@type": "Question",
          name: "How can investors or LPs learn about Backfield Ventures?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "We're selective about LP relationships. Reach out at hello@backfieldventures.com with the subject 'LP Inquiry' to learn more about our focus and portfolio.",
          },
        },
        {
          "@type": "Question",
          name: "How can operators or partners work with Backfield Ventures?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "If you work in consumer or sports and want to explore collaboration — for portfolio companies or in a broader capacity — reach out at hello@backfieldventures.com with the subject 'Partnership'.",
          },
        },
      ],
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={montserrat.variable}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
