import type { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        try {
          const user = await prisma.user.findUnique({
            where: {
              email: credentials.email,
            },
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              name: true,
              password: true,
              status: true,
            },
          })

          if (!user || !user.password) {
            return null
          }

          // Vérifier si l'utilisateur est actif
          if (user.status !== "ACTIVE") {
            return null
          }

          const isPasswordValid = await bcrypt.compare(credentials.password, user.password)

          if (!isPasswordValid) {
            return null
          }

          return {
            id: user.id,
            email: user.email,
            name: user.name || `${user.firstName} ${user.lastName}`,
            firstName: user.firstName,
            lastName: user.lastName,
          }
        } catch (error) {
          console.error("Auth error:", error)
          return null
        }
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 jours
    updateAge: 24 * 60 * 60, // 24 heures
  },
  jwt: {
    maxAge: 30 * 24 * 60 * 60, // 30 jours
  },
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      // Lors de la connexion initiale
      if (user) {
        token.id = user.id
        token.email = user.email
        token.name = user.name
        token.firstName = user.firstName
        token.lastName = user.lastName
      }

      // Lors de la mise à jour de session (update trigger)
      if (trigger === "update" && session) {
        token.name = session.name
        token.firstName = session.firstName
        token.lastName = session.lastName
      }

      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string
        session.user.email = token.email as string
        session.user.name = token.name as string
        session.user.firstName = token.firstName as string
        session.user.lastName = token.lastName as string
      }
      return session
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  cookies: {
    sessionToken: {
      name: `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
        maxAge: 30 * 24 * 60 * 60, // 30 jours
      },
    },
  },
  debug: process.env.NODE_ENV === "development",
  // Pour la production - gestion des hosts
  ...(process.env.NODE_ENV === "production" && {
    useSecureCookies: true,
  }),
}
