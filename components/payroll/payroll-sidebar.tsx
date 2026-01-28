"use client"

import { useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Banknote,
  Users,
  Calendar,
  Settings,
  FileText,
  TrendingUp,
  Plus,
  LogOut,
  User,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  Percent,
  ClipboardList,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface MenuItem {
  icon: any
  label: string
  href: string
  badge?: string
}

const menuItems: MenuItem[] = [
  {
    icon: LayoutDashboard,
    label: "Vue d'ensemble",
    href: "/dashboard/payroll",
  },
  {
    icon: Users,
    label: "Profils employés",
    href: "/dashboard/payroll/profiles",
  },
  {
    icon: Calendar,
    label: "Périodes de paie",
    href: "/dashboard/payroll/periods",
  },
  {
    icon: Percent,
    label: "Cotisations",
    href: "/dashboard/payroll/contributions",
  },
  {
    icon: Settings,
    label: "Paramètres",
    href: "/dashboard/payroll/settings",
  },
]

interface PayrollSidebarProps {
  collapsed?: boolean
  onToggle?: () => void
  onCreatePeriod?: () => void
}

export function PayrollSidebar({ collapsed = false, onToggle, onCreatePeriod }: PayrollSidebarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { data: session } = useSession()

  const isActive = (href: string) => {
    if (href === "/dashboard/payroll") {
      return pathname === href
    }
    return pathname.startsWith(href)
  }

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          "bg-white border-r border-gray-200 flex flex-col h-screen transition-all duration-300 ease-in-out",
          collapsed ? "w-[72px]" : "w-64"
        )}
      >
        {/* Header */}
        <div className={cn("p-4 border-b border-gray-100", collapsed && "px-3")}>
          <div className={cn("flex items-center gap-3", collapsed && "justify-center")}>
            {!collapsed && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={() => router.push("/dashboard")}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <div className={cn("flex items-center gap-2", collapsed && "flex-col")}>
              <div className={cn(
                "rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/20",
                collapsed ? "p-2.5" : "p-2"
              )}>
                <Banknote className={cn("text-white", collapsed ? "h-5 w-5" : "h-5 w-5")} />
              </div>
              {!collapsed && (
                <div>
                  <h1 className="font-semibold text-gray-900">Paie</h1>
                  <p className="text-xs text-gray-500">Gestion des salaires</p>
                </div>
              )}
            </div>
          </div>

          {/* Bouton Nouvelle période */}
          {!collapsed && (
            <Button
              className="w-full mt-4 bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/20"
              onClick={onCreatePeriod}
            >
              <Plus className="h-4 w-4 mr-2" />
              Nouvelle période
            </Button>
          )}
          {collapsed && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  className="w-full mt-4 bg-indigo-600 hover:bg-indigo-700 text-white"
                  onClick={onCreatePeriod}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">
                Nouvelle période
              </TooltipContent>
            </Tooltip>
          )}
        </div>

        {/* Navigation Menu */}
        <nav className={cn("flex-1 overflow-y-auto p-3 space-y-1", collapsed && "px-2")}>
          {menuItems.map((item) => {
            const Icon = item.icon
            const active = isActive(item.href)

            if (collapsed) {
              return (
                <Tooltip key={item.href}>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className={cn(
                        "w-full h-10",
                        active
                          ? "bg-indigo-50 text-indigo-600"
                          : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                      )}
                      onClick={() => router.push(item.href)}
                    >
                      <Icon className="h-5 w-5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="flex items-center gap-2">
                    {item.label}
                    {item.badge && (
                      <span className="bg-indigo-100 text-indigo-600 text-xs px-1.5 py-0.5 rounded-full">
                        {item.badge}
                      </span>
                    )}
                  </TooltipContent>
                </Tooltip>
              )
            }

            return (
              <Button
                key={item.href}
                variant="ghost"
                className={cn(
                  "w-full justify-start gap-3 font-normal h-10",
                  active
                    ? "bg-indigo-50 text-indigo-600 hover:bg-indigo-100"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                )}
                onClick={() => router.push(item.href)}
              >
                <Icon className="h-5 w-5 shrink-0" />
                <span className="truncate">{item.label}</span>
                {item.badge && (
                  <span className="ml-auto bg-indigo-100 text-indigo-600 text-xs px-1.5 py-0.5 rounded-full">
                    {item.badge}
                  </span>
                )}
              </Button>
            )
          })}
        </nav>

        {/* Toggle Button */}
        <div className="px-3 py-2">
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "w-full text-gray-500 hover:text-gray-700 hover:bg-gray-100",
              collapsed && "px-0"
            )}
            onClick={onToggle}
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <>
                <ChevronLeft className="h-4 w-4 mr-2" />
                Réduire
              </>
            )}
          </Button>
        </div>

        <Separator />

        {/* User Menu */}
        <div className={cn("p-3", collapsed && "px-2")}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className={cn(
                  "w-full h-auto rounded-lg hover:bg-gray-50",
                  collapsed ? "p-2 justify-center" : "p-2 justify-start gap-3"
                )}
              >
                <Avatar className="h-8 w-8 border border-gray-200 shrink-0">
                  <AvatarImage src={session?.user?.image || undefined} />
                  <AvatarFallback className="bg-indigo-100 text-indigo-600 font-medium text-sm">
                    {session?.user?.name?.substring(0, 2).toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
                {!collapsed && (
                  <div className="flex-1 text-left min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {session?.user?.name || "Utilisateur"}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {session?.user?.email || ""}
                    </p>
                  </div>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align={collapsed ? "center" : "start"} side="top" className="w-56">
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
    </TooltipProvider>
  )
}
