"use client"

import type React from "react"
import { useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { isAuthenticated, isLoading, isInitialized } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    // Attendre que l'authentification soit initialisée
    if (isInitialized && !isLoading && !isAuthenticated) {
      console.log("Not authenticated, redirecting to login")
      router.push(`/login?from=${encodeURIComponent(pathname)}`)
    }
  }, [isAuthenticated, isInitialized, isLoading, router, pathname])

  // Afficher le loader tant que l'auth n'est pas initialisée
  if (!isInitialized || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    )
  }

  // Rediriger si pas authentifié (après initialisation)
  if (!isAuthenticated) {
    return null
  }

  return <>{children}</>
}
