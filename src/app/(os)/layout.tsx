import type { Metadata, Viewport } from "next";
import "./os.css";

export const metadata: Metadata = {
  title: "Backfield OS",
  description: "Private operating dashboard for Backfield Ventures.",
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: { index: false, follow: false, noimageindex: true },
  },
  referrer: "no-referrer",
  icons: { icon: "/favicon.ico" },
};

export const viewport: Viewport = {
  themeColor: "#f0ede8",
  colorScheme: "light",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
};

export default function OsLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="os theme-a">{children}</body>
    </html>
  );
}
