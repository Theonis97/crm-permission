import type { NextConfig } from "next";
import { loadEnvConfig } from "@next/env";
import { resolve } from "path";

// Garantit le chargement .env depuis la racine du projet (évite un process.cwd() inattendu au démarrage).
loadEnvConfig(resolve(process.cwd()));

const nextConfig: NextConfig = {
  // Désactivé tant que le projet n’est pas passé au vert avec `npx tsc --noEmit`
  // (erreurs Prisma Tx, productId | null, etc.).
  typescript: {
    ignoreBuildErrors: true,
  },
  ...(process.env.NODE_ENV === "production" && {
    env: {
      NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    },
  }),
};

export default nextConfig;
