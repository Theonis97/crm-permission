"use client"

import { useSession } from "next-auth/react"
import { useEffect, useState } from "react"
import type { Session } from "next-auth"

interface AuthenticatedSession extends Session {
  user: {
    id: string
    email: string
    name?: string | null
    image?: string | null
    firstName?: string | null
    lastName?: string | null
  }
}

export function useAuth() {
  const { data: session, status, update } = useSession()
  const [isInitialized, setIsInitialized] = useState(false)

  useEffect(() => {
    if (status !== "loading") {
      setIsInitialized(true)
    }
  }, [status])

  const isAuthenticated = status === "authenticated" && !!session?.user?.id
  const isLoading = status === "loading"

  const refreshSession = async () => {
    await update()
  }

  // Debug logs
  useEffect(() => {
    console.log("Auth status:", status)
    console.log("Session:", session)
    console.log("Is authenticated:", isAuthenticated)
  }, [status, session, isAuthenticated])

  return {
    session: session as AuthenticatedSession | null,
    user: session?.user || null,
    isAuthenticated,
    isLoading,
    status,
    refreshSession,
    isInitialized,
  }
}
