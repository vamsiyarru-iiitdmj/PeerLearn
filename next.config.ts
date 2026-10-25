import type { NextConfig } from "next";

const BACKEND_URL = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL;

const nextConfig: NextConfig = {
  experimental: {
    agentFeedback: true,
  },
  // Only proxy if an external (non-localhost) backend URL is explicitly configured.
  // Otherwise, native Next.js API route handlers in app/api/v1/[...path]/route.ts handle all requests directly.
  async rewrites() {
    if (
      BACKEND_URL &&
      !BACKEND_URL.includes("localhost") &&
      !BACKEND_URL.includes("127.0.0.1")
    ) {
      return [
        {
          source: "/api/v1/:path*",
          destination: `${BACKEND_URL}/api/v1/:path*`,
        },
      ];
    }
    return [];
  },
};

export default nextConfig;
