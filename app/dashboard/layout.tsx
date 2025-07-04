"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { signOut } from "next-auth/react"
import { useRouter, usePathname } from "next/navigation"
import { usePermissions } from "@/hooks/use-permissions"
import { useAuth } from "@/hooks/use-auth"



export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { session, isAuthenticated, isLoading, isInitialized } = useAuth()
  const { user, hasPermission, loading: permissionsLoading } = usePermissions()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    // Attendre que l'authentification soit initialisée
    if (isInitialized && !isAuthenticated) {
      router.push("/login")
    }
  }, [isAuthenticated, isInitialized, router])

  // Rediriger les anciennes routes vers les nouveaux modules
  useEffect(() => {
    if (pathname === "/dashboard/users" && !pathname.includes("/dashboard/users/")) {
      // Laisser passer pour la page d'accueil du module
    } else if (pathname.startsWith("/dashboard/users/")) {
      // Rediriger vers le module users
      router.push("/dashboard/users")
    }
  }, [pathname, router])

  const handleLogout = async () => {
    try {
      await signOut({
        redirect: false,
        callbackUrl: "/login",
      })
      router.push("/login")
    } catch (error) {
      console.error("Logout error:", error)
      router.push("/login")
    }
  }

  // Afficher le loader tant que l'auth n'est pas initialisée
  if (!isInitialized || isLoading || permissionsLoading) {
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
  if (!isAuthenticated || !session) {
    return null
  }

  const getUserInitials = () => {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName[0]}${user.lastName[0]}`
    }
    if (session.user?.name) {
      return session.user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
    }
    return session.user?.email?.[0]?.toUpperCase() || "U"
  }

  // Si c'est la page d'accueil, on laisse le composant gérer son propre layout
  if (pathname === "/dashboard") {
    return <>{children}</>
  }

  return (
    <div className="min-h-screen bg-gray-50">
        {children}
    </div>
  )
}
