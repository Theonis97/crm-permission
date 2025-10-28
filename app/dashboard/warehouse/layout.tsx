"use client"

import { useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { signOut } from "next-auth/react"
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
import { ModuleSelector } from "@/components/navigation/module-selector"
import { cn } from "@/lib/utils"
import {
  Warehouse,
  LayoutGrid,
  Package,
  History,
  Tags,
  Bookmark,
  ChevronLeft,
  ChevronRightIcon,
  User,
  Settings,
  LogOut,
  ShoppingCart,
  Store,
  Map,
} from "lucide-react"

interface MenuItem {
  id: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  href?: string
  subItems?: MenuItem[]
}

const menuItems: MenuItem[] = [
  {
    id: "dashboard",
    label: "Vue d'ensemble",
    icon: LayoutGrid,
    href: "/dashboard/warehouse",
  },
  {
    id: "maps",
    label: "Carte",
    icon: Map,
    href: "/dashboard/delivery-map",
  },
  {
    id: "orders",
    label: "Commandes",
    icon: ShoppingCart,
    href: "/dashboard/warehouse/orders",
  },
  {
    id: "movements",
    label: "Mouvements",
    icon: History,
    href: "/dashboard/warehouse/movements",
  },
  {
    id: "products",
    label: "Produits",
    icon: Package,
    href: "/dashboard/warehouse/products",
  },
  {
    id: "categories",
    label: "Catégories",
    icon: Tags,
    href: "/dashboard/warehouse/categories",
  },
  {
    id: "brands",
    label: "Marques",
    icon: Bookmark,
    href: "/dashboard/warehouse/brands",
  },
  {
    id: "stores",
    label: "Magasins",
    icon: Store,
    href: "/dashboard/warehouse/stores",
  },
]

export default function WarehouseLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { session, user } = useAuth()
  const [isCollapsed, setIsCollapsed] = useState(false)

  const isActive = (href?: string) => {
    if (!href) return false
    return pathname === href
  }

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

  const getUserInitials = () => {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName[0]}${user.lastName[0]}`
    }
    if (session?.user?.name) {
      return session.user.name
        .split(" ")
        .map((n: string) => n[0])
        .join("")
        .slice(0, 2)
    }
    return session?.user?.email?.[0]?.toUpperCase() || "U"
  }

  const getUserDisplayName = () => {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName} ${user.lastName}`
    }
    return session?.user?.name || "Utilisateur"
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 h-screen bg-white border-r border-gray-200 transition-all duration-300 z-40 flex flex-col",
          isCollapsed ? "w-16" : "w-64"
        )}
      >
        {/* Header de la sidebar */}
        <div className="h-16 border-b border-gray-200 flex items-center justify-between px-4">
          {!isCollapsed && (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-950 rounded-lg flex items-center justify-center">
                <Warehouse className="h-5 w-5 text-white" />
              </div>
              <span className="font-semibold text-gray-900">Entrepôt</span>
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            className={cn("h-8 w-8 p-0", isCollapsed && "mx-auto")}
            onClick={() => setIsCollapsed(!isCollapsed)}
          >
            {isCollapsed ? (
              <ChevronRightIcon className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-3">
          <div className="space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon
              const active = isActive(item.href)

              return (
                <button
                  key={item.id}
                  onClick={() => item.href && router.push(item.href)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                    active
                      ? "bg-blue-950 text-white"
                      : "text-gray-700 hover:bg-gray-100",
                    isCollapsed && "justify-center px-2"
                  )}
                  title={isCollapsed ? item.label : undefined}
                >
                  <Icon className={cn("h-5 w-5 flex-shrink-0", active ? "text-white" : "text-gray-500")} />
                  {!isCollapsed && <span className="truncate">{item.label}</span>}
                </button>
              )
            })}
          </div>
        </nav>

        {/* Footer de la sidebar - Sélecteur de modules et Utilisateur */}
        <div className="border-t border-gray-200 p-3 space-y-2">
          {/* Sélecteur de modules */}
          <div className="mb-2">
            <ModuleSelector showLabel={!isCollapsed} />
          </div>

          {/* Menu utilisateur */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              {!isCollapsed ? (
                <button className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-gray-100 transition-all">
                  <Avatar className="h-8 w-8 flex-shrink-0">
                    <AvatarImage src={session?.user?.image || ""} />
                    <AvatarFallback className="bg-blue-950 text-white font-semibold text-xs">
                      {getUserInitials()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 text-left min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{getUserDisplayName()}</p>
                    <p className="text-xs text-gray-500 truncate">{session?.user?.email}</p>
                  </div>
                </button>
              ) : (
                <button className="w-full flex items-center justify-center p-2.5 rounded-lg hover:bg-gray-100 transition-all">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={session?.user?.image || ""} />
                    <AvatarFallback className="bg-blue-950 text-white font-semibold text-xs">
                      {getUserInitials()}
                    </AvatarFallback>
                  </Avatar>
                </button>
              )}
            </DropdownMenuTrigger>
            <DropdownMenuContent align={isCollapsed ? "end" : "start"} className="w-56">
              <div className="px-2 py-1.5">
                <p className="text-sm font-medium text-gray-900">{getUserDisplayName()}</p>
                <p className="text-xs text-gray-500">{session?.user?.email}</p>
              </div>
              <DropdownMenuSeparator />
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
      </aside>

      {/* Main Content */}
      <main
        className={cn(
          "flex-1 transition-all duration-300 overflow-x-auto",
          isCollapsed ? "ml-16" : "ml-64"
        )}
      >
        <div className="min-h-screen">
          {children}
        </div>
      </main>
    </div>
  )
}
