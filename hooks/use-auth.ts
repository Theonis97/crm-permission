"use client"

import { useSession } from "next-auth/react"
import type { Session } from "next-auth"

interface AuthenticatedSession extends Session {
  user: {
    id: string
    email: string
    name?: string | null
    image?: string | null
  }
}

export function useAuth() {
  const { data: session, status } = useSession()

  const isAuthenticated = status === "authenticated" && !!session?.user?.id
  const isLoading = status === "loading"

  return {
    session: session as AuthenticatedSession | null,
    user: session?.user || null,
    isAuthenticated,
    isLoading,
    status,
  }
}
