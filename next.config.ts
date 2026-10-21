import type { NextConfig } from "next";

const BACKEND_URL =
  process.env.BACKEND_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:3001";

const nextConfig: NextConfig = {
  experimental: {
    agentFeedback: true,
  },
  // Proxy /api/v1/* to the NestJS backend
  async rewrites() {
    return [
      {
        source: "/api/v1/:path*",
        destination: `${BACKEND_URL}/api/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;
