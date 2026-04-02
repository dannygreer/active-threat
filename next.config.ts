import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/admin",
        destination: "/active-threat/admin",
        permanent: true,
      },
      {
        source: "/admin/:path*",
        destination: "/active-threat/admin/:path*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
