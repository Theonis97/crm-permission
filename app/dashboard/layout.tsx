"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter, usePathname } from "next/navigation"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    if (status === "loading") return // Encore en cours de chargement

    if (status === "unauthenticated") {
      router.push(`/login?from=${encodeURIComponent(pathname)}`)
      return
    }

    if (status === "authenticated" && session) {
      setIsChecking(false)
    }
  }, [status, session, router, pathname])

  // Afficher le loader pendant la vérification
  if (status === "loading" || isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="text-gray-600">Vérification de l'authentification...</p>
        </div>
      </div>
    )
  }

  // Ne pas afficher le contenu si pas authentifié
  if (status === "unauthenticated") {
    return null
  }

  return <>{children}</>
}
