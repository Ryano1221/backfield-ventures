import type { Metadata, Viewport } from "next";
import { preload } from "react-dom";
import { BootIntro } from "@/components/os/BootIntro";
import "./os.css";
import "./os-desk.css";

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
  icons: { icon: "/favicon.ico", apple: "/apple-touch-icon.png" },
  // Installed on a phone: cream launch screen and the intro, not a black flash.
  manifest: "/os.webmanifest",
  appleWebApp: { capable: true, title: "Backfield OS", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#f0ede8",
  colorScheme: "light",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
};

// Fetch the OS fonts with the page, so first paint already uses Switzer.
// Without this the fallback font paints first, wrapped rows (People stages,
// email tabs) re-wrap when Switzer arrives, and the page jumps.
const FONTS = ["400", "500", "700"].map((weight) => `/fonts/os/Switzer-${weight}.woff2`);

export default function OsLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  for (const href of FONTS) preload(href, { as: "font", type: "font/woff2", crossOrigin: "anonymous" });
  // The intro's mark: tiny, and ready before the intro plays.
  preload("/logo-bv-mark.png", { as: "image" });
  return (
    <html lang="en">
      <body className="os theme-a">
        <BootIntro className="boot-launch" label="Opening the OS" />
        {children}
      </body>
    </html>
  );
}
