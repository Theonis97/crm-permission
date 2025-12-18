import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Configuration pour la production
  ...(process.env.NODE_ENV === "production" && {
    env: {
      NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    },
  }),


};

export default nextConfig;
