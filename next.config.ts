import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  ...(process.env.NODE_ENV === "production" && {
    env: {
      NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    },
  }),
};

export default nextConfig;
