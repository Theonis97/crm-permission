"use client"

import { useRouter, usePathname } from "next/navigation"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  BarChart3,
  Receipt,
  TrendingUp,
  Plus,
  Settings,
  LogOut,
  User,
  ArrowLeft,
  Calculator,
  FolderTree,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface MenuItem {
  icon: any
  label: string
  href: string
}

const menuItems: MenuItem[] = [
  { 
    icon: BarChart3, 
    label: "Rapport", 
    href: "/dashboard/accounting",
  },
  { 
    icon: TrendingUp, 
    label: "Recettes", 
    href: "/dashboard/accounting/revenues",
  },
  { 
    icon: Receipt, 
    label: "Dépenses", 
    href: "/dashboard/accounting/expenses",
  },
  { 
    icon: FolderTree, 
    label: "Catégories", 
    href: "/dashboard/accounting/categories",
  },
  { 
    icon: Settings, 
    label: "Paramètres", 
    href: "/dashboard/accounting/settings",
  },
]

export function AccountingSidebar() {
  const router = useRouter()
  const pathname = usePathname()
  const { data: session } = useSession()

  const isActive = (href: string) => {
    if (href === "/dashboard/accounting") {
      return pathname === href
    }
    return pathname.startsWith(href)
  }

  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col h-screen">
      {/* Header avec bouton retour */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center gap-3 mb-4">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => router.push("/dashboard")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-gray-100">
              <Calculator className="h-5 w-5 text-gray-700" />
            </div>
            <div>
              <h1 className="font-semibold text-gray-900">Comptabilité</h1>
              <p className="text-xs text-gray-500">Gestion financière</p>
            </div>
          </div>
        </div>

        {/* Bouton Ajouter une dépense */}
        <Button 
          className="w-full bg-gray-900 hover:bg-gray-800 text-white"
          onClick={() => router.push("/dashboard/accounting/expenses?action=new")}
        >
          <Plus className="h-4 w-4 mr-2" />
          Ajouter une dépense
        </Button>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        {menuItems.map((item) => {
          const Icon = item.icon
          const active = isActive(item.href)
          return (
            <Button
              key={item.href}
              variant="ghost"
              className={cn(
                "w-full justify-start gap-3 font-normal",
                active
                  ? "bg-gray-100 text-gray-900"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              )}
              onClick={() => router.push(item.href)}
            >
              <Icon className="h-5 w-5" />
              {item.label}
            </Button>
          )
        })}
      </nav>

      <Separator />

      {/* User Menu */}
      <div className="p-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost" 
              className="w-full p-2 h-auto rounded-lg hover:bg-gray-50 justify-start gap-3"
            >
              <Avatar className="h-8 w-8 border border-gray-200">
                <AvatarImage src={session?.user?.image || undefined} />
                <AvatarFallback className="bg-gray-200 text-gray-700 font-medium text-sm">
                  {session?.user?.name?.substring(0, 2).toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 text-left">
                <p className="text-sm font-medium text-gray-900">{session?.user?.name || "Utilisateur"}</p>
                <p className="text-xs text-gray-500 truncate">{session?.user?.email || ""}</p>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuLabel>
              <div>
                <p className="font-semibold">{session?.user?.name || "Utilisateur"}</p>
                <p className="text-xs font-normal text-gray-500">{session?.user?.email || ""}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push("/dashboard/profile")}>
              <User className="h-4 w-4 mr-2" />
              Mon profil
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push("/dashboard/settings")}>
              <Settings className="h-4 w-4 mr-2" />
              Paramètres
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              className="text-red-600 focus:text-red-600"
              onClick={() => router.push("/api/auth/signout")}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Se déconnecter
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  )
}
