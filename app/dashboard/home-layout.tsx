"use client"

import type React from "react"
import { useEffect } from "react"
import { signOut } from "next-auth/react"
import { useRouter } from "next/navigation"
import { usePermissions } from "@/hooks/use-permissions"
import { useAuth } from "@/hooks/use-auth"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { LogOut, Settings, User, Bell, Search, Map, Truck } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertTriangle } from "lucide-react"

export default function HomeLayout({
  children,
  compact = false,
}: {
  children: React.ReactNode
  compact?: boolean
}) {
  const { session, isAuthenticated, isLoading, isInitialized } = useAuth()
  const { user, loading: permissionsLoading, permissionsError } = usePermissions()
  const router = useRouter()

  useEffect(() => {
    if (isInitialized && !isAuthenticated) {
      router.push("/login")
    }
  }, [isAuthenticated, isInitialized, router])

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

  if (!isInitialized || isLoading || permissionsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    )
  }

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

  const getUserDisplayName = () => {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName} ${user.lastName}`
    }
    return session.user?.name || "Utilisateur"
  }

  return (
    <div className="min-h-screen relative bg-white">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white sticky top-0 z-50">
        <div className={compact ? "px-4" : "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"}>
          {compact ? (
            /* Header compact pour l'espace livreur */
            <div className="flex items-center justify-between h-14">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 bg-orange-500 rounded-xl flex items-center justify-center shadow-sm">
                  <Truck className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900 leading-none">Espace Livreur</p>
                  <p className="text-[10px] text-gray-400 leading-none mt-0.5">{getUserDisplayName()}</p>
                </div>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={session.user?.image || ""} />
                      <AvatarFallback className="bg-orange-500 text-white font-semibold text-xs">
                        {getUserInitials()}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="text-red-600 focus:text-red-600">
                    <LogOut className="mr-2 h-4 w-4" />
                    Déconnexion
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ) : (
            /* Header complet ERP-CRM */
            <div className="flex items-center justify-between h-16">
              {/* Logo et titre */}
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-950 rounded-xl flex items-center justify-center shadow-lg">
                    <span className="text-white font-bold text-lg">C</span>
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold bg-blue-950 bg-clip-text text-transparent">
                      ERP-CRM
                    </h1>
                    <p className="text-xs text-gray-500">Plateforme de gestion</p>
                  </div>
                </div>
              </div>

              {/* Barre de recherche */}
              <div className="flex-1 max-w-lg mx-8">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Rechercher dans ERP-CRM..."
                    className="pl-10 bg-gray-50 border-gray-200 focus:bg-white"
                  />
                </div>
              </div>

              {/* Actions utilisateur */}
              <div className="flex items-center space-x-4">
                {/* Notifications */}
                <Button variant="ghost" size="sm" className="relative">
                  <Bell className="h-5 w-5" />
                  <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full text-xs"></span>
                </Button>

                {/* Menu utilisateur */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="flex items-center space-x-3 hover:bg-gray-50">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={session.user?.image || ""} />
                        <AvatarFallback className="bg-blue-950 text-white font-semibold text-sm">
                          {getUserInitials()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="hidden md:block text-left">
                        <p className="text-sm font-medium text-gray-900">{getUserDisplayName()}</p>
                        <p className="text-xs text-gray-500">{session.user?.email}</p>
                      </div>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuItem>
                      <User className="mr-2 h-4 w-4" />
                      Mon profil
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Settings className="mr-2 h-4 w-4" />
                      Paramètres
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout} className="text-red-600 focus:text-red-600">
                      <LogOut className="mr-2 h-4 w-4" />
                      Déconnexion
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          )}
        </div>
      </header>

      {permissionsError && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
          <Alert className="border-amber-200 bg-amber-50 text-amber-950 [&>svg]:text-amber-800">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle className="text-amber-950">Base de données</AlertTitle>
            <AlertDescription className="text-amber-900">{permissionsError}</AlertDescription>
          </Alert>
        </div>
      )}

      {/* Contenu principal */}
      <main>{children}</main>
    </div>
  )
}
