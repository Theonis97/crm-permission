import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Configuration pour la production
  ...(process.env.NODE_ENV === "production" && {
    env: {
      NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    },
  }),
  
  // Configuration CORS pour permettre les requêtes depuis la PWA
  async headers() {
    return [
      {
        // Appliquer ces headers à toutes les routes API
        source: "/api/:path*",
        headers: [
           {
          key: "Access-Control-Allow-Origin",
          value: process.env.NODE_ENV === 'production' 
            ? "https://livreur.inotech-gabon.com, https://inotech-gabon.com, https://sous-caisse.inotech-gabon.com/"
            : "*",
        },
          {
            key: "Access-Control-Allow-Methods",
            value: "GET, POST, PUT, DELETE, PATCH, OPTIONS",
          },
          {
            key: "Access-Control-Allow-Headers",
            value: "Content-Type, Authorization, X-Requested-With",
          },
          {
            key: "Access-Control-Max-Age",
            value: "86400", // 24 heures
          },
          {
            key: "Access-Control-Allow-Credentials",
            value: "true",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
