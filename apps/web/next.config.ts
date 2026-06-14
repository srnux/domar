import path from "node:path";
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

// Same-origin API access is load-bearing: httpOnly auth cookies and <img>
// photo loading rely on the browser never talking to the API directly.
const API_URL = process.env.API_URL ?? "http://localhost:3001";

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: path.join(__dirname, "../.."),
  // Dev-only: allow LAN devices (e.g. a phone on the same Wi-Fi) to reach the
  // dev server's assets/HMR endpoints. Ignored in production builds.
  allowedDevOrigins: ["192.168.*.*", "10.*.*.*"],
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${API_URL}/api/:path*`,
      },
    ];
  },
};

export default withNextIntl(nextConfig);
