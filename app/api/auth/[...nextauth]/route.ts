import NextAuth from "next-auth"
import { authOptions } from "@/lib/auth"

// Configuration pour la production
const handler = NextAuth({
  ...authOptions,
  
  // Gestion du trustHost pour la production
  ...(process.env.NODE_ENV === "production" && {
    trustHost: true,
  }),
})

export { handler as GET, handler as POST }
