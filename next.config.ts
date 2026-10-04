import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    "/api/handoff-subscribe": ["./src/lib/handoff-roster-email.html"],
  },
};

export default nextConfig;
