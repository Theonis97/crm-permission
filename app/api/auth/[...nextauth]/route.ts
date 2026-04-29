import NextAuth from "next-auth"
import { authOptions } from "@/lib/auth"

// Configuration pour la production
const handler = NextAuth({
  ...authOptions,
  // Next.js 15+ / hôte local ou reverse proxy : évite des refus CSRF / host header
  trustHost: true,
})

export { handler as GET, handler as POST }
