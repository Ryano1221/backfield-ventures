import type { NextConfig } from "next";

const osHeaders = [
  { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" },
  { key: "Cache-Control", value: "private, no-store" },
  { key: "Referrer-Policy", value: "no-referrer" },
  { key: "X-Frame-Options", value: "DENY" },
];

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
  outputFileTracingIncludes: {
    "/api/handoff-subscribe": ["./src/lib/handoff-roster-email.html"],
  },
  async headers() {
    return [
      { source: "/os", headers: osHeaders },
      { source: "/os/:path*", headers: osHeaders },
      { source: "/api/os/:path*", headers: osHeaders },
    ];
  },
};

export default nextConfig;
