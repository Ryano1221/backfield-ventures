import type { Metadata } from "next";
import { Bebas_Neue, Space_Mono } from "next/font/google";
import "./globals.css";

const bebasNeue = Bebas_Neue({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-bebas-neue",
  display: "swap",
});

const spaceMono = Space_Mono({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-space-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Backfield Ventures | Sports & CPG Venture Capital | Austin, TX",
  description:
    "Backfield Ventures is an Austin, TX venture capital firm backing the next generation of sports, CPG, and consumer companies. Pre-Seed to Series A. Founder, investor, or operator — let's talk.",
  applicationName: "Backfield Ventures",
  metadataBase: new URL("https://backfieldventures.com"),
  alternates: {
    canonical: "https://backfieldventures.com",
  },
  keywords: [
    // Core identity
    "Backfield Ventures",
    "venture capital Austin Texas",
    "Austin VC firm",
    "Austin venture capital",
    "Texas venture capital",
    // Sports investing
    "sports venture capital",
    "sports investing",
    "sports VC",
    "invest in sports companies",
    "sports startup funding",
    "sports technology investment",
    "fan engagement investment",
    "athlete brands venture capital",
    "sports media investment",
    "sports data analytics investment",
    // CPG
    "CPG venture capital",
    "CPG investing",
    "consumer packaged goods startup funding",
    "CPG startup investor",
    "CPG brand investment",
    "emerging CPG brands",
    // Consumer
    "consumer brands venture capital",
    "DTC venture capital",
    "direct to consumer startup funding",
    "consumer health wellness investment",
    "lifestyle brand investment",
    "commerce marketplace funding",
    // Stage
    "pre-seed venture capital",
    "seed funding",
    "Series A venture capital",
    "early stage startup funding",
    "seed stage investor",
    // General VC
    "venture capital fund",
    "startup investor",
    "angel investor Austin",
    "VC for consumer startups",
    "how to get venture capital funding",
  ],
  openGraph: {
    title: "Backfield Ventures | Sports & CPG Venture Capital | Austin, TX",
    description:
      "Backfield Ventures is an Austin, TX venture capital firm backing the next generation of sports, CPG, and consumer companies. Pre-Seed to Series A. Founder, investor, or operator — let's talk.",
    url: "https://backfieldventures.com",
    siteName: "Backfield Ventures",
    type: "website",
    locale: "en_US",
    // og:image is auto-generated from src/app/opengraph-image.png
  },
  twitter: {
    card: "summary_large_image",
    title: "Backfield Ventures | Sports & CPG Venture Capital | Austin, TX",
    description:
      "Backfield Ventures is an Austin, TX venture capital firm backing the next generation of sports, CPG, and consumer companies. Pre-Seed to Series A. Founder, investor, or operator — let's talk.",
    // twitter:image falls back to og:image
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-snippet": -1,
      "max-image-preview": "large",
      "max-video-preview": -1,
    },
  },
  icons: {
    shortcut: "/favicon.ico",
    icon: [
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
    other: [{ rel: "manifest", url: "/site.webmanifest" }],
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": ["Organization", "FinancialService"],
      "@id": "https://backfieldventures.com/#organization",
      name: "Backfield Ventures",
      url: "https://backfieldventures.com",
      logo: "https://backfieldventures.com/logo-text.png",
      image: "https://backfieldventures.com/opengraph-image.png",
      description:
        "Backfield Ventures is an Austin, Texas venture capital firm investing in sports, CPG, and consumer brands from pre-seed through Series A.",
      email: "hello@backfieldventures.com",
      address: {
        "@type": "PostalAddress",
        addressLocality: "Austin",
        addressRegion: "TX",
        addressCountry: "US",
      },
      areaServed: ["United States"],
      knowsAbout: [
        "Venture Capital",
        "Sports Investing",
        "Consumer Packaged Goods",
        "CPG Brands",
        "Consumer Brands",
        "DTC Startups",
        "Sports Technology",
        "Fan Engagement",
        "Athlete Brands",
        "Seed Funding",
        "Series A Funding",
        "Austin Texas Startups",
      ],
      sameAs: ["https://www.linkedin.com/company/backfield-ventures"],
    },
    {
      "@type": "WebSite",
      "@id": "https://backfieldventures.com/#website",
      url: "https://backfieldventures.com",
      name: "Backfield Ventures",
      publisher: { "@id": "https://backfieldventures.com/#organization" },
    },
    {
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: "What does Backfield Ventures invest in?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Backfield Ventures invests in sports, CPG, and consumer brands. Our consumer focus includes DTC brands, CPG companies, consumer health & wellness, community-driven platforms, modern lifestyle brands, and commerce & marketplaces. Our sports focus includes fan engagement & experiences, athlete brands & ventures, sports technology, media & streaming, and sports data & analytics.",
          },
        },
        {
          "@type": "Question",
          name: "Is Backfield Ventures based in Austin, Texas?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes. Backfield Ventures is headquartered in Austin, Texas and invests in sports, CPG, and consumer companies across the United States.",
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
          name: "Does Backfield Ventures invest in CPG companies?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes. Backfield Ventures actively invests in CPG (consumer packaged goods) brands and DTC companies, particularly those with strong brand identity, community, and omnichannel growth potential.",
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
    <html lang="en" className={`${bebasNeue.variable} ${spaceMono.variable}`}>
      <head>
        <link rel="preconnect" href="https://api.fontshare.com" />
        <link
          href="https://api.fontshare.com/v2/css?f[]=switzer@300,400,500,700&display=swap"
          rel="stylesheet"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="grain">{children}</body>
    </html>
  );
}
