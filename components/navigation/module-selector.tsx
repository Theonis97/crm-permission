"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { usePermissions } from "@/hooks/use-permissions"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Users,
  Shield,
  Contact,
  Package,
  CheckSquare,
  TrendingUp,
  BarChart3,
  Settings,
  Calendar,
  MessageSquare,
  Building2,
  Grid3X3,
  Search,
  Home,
} from "lucide-react"
import { cn } from "@/lib/utils"

const modules = [
  {
    id: "dashboard",
    name: "Tableau de bord",
    description: "Vue d'ensemble",
    icon: Home,
    color: "from-gray-500 to-gray-600",
    href: "/dashboard",
    permission: null, // Toujours accessible
  },
  {
    id: "users",
    name: "Utilisateurs",
    description: "Gestion des comptes utilisateurs",
    icon: Users,
    color: "from-blue-500 to-blue-600",
    permission: "users.view",
    href: "/dashboard/users",
  },
  {
    id: "roles",
    name: "Rôles & Permissions",
    description: "Contrôle d'accès et sécurité",
    icon: Shield,
    color: "from-emerald-500 to-emerald-600",
    permission: "roles.view",
    href: "/dashboard/roles",
  },
  {
    id: "contacts",
    name: "Contacts",
    description: "Base de données clients",
    icon: Contact,
    color: "from-teal-500 to-teal-600",
    permission: "contacts.view",
    href: "/dashboard/contacts",
  },
  {
    id: "crm",
    name: "CRM",
    description: "Gestion relation client",
    icon: Building2,
    color: "from-indigo-500 to-indigo-600",
    permission: "opportunities.view",
    href: "/dashboard/crm",
  },
  {
    id: "sales",
    name: "Ventes",
    description: "Devis, factures et commandes",
    icon: TrendingUp,
    color: "from-orange-500 to-orange-600",
    permission: "quotes.view",
    href: "/dashboard/sales",
  },
  {
    id: "products",
    name: "Produits",
    description: "Catalogue et inventaire",
    icon: Package,
    color: "from-amber-500 to-amber-600",
    permission: "products.view",
    href: "/dashboard/products",
  },
  {
    id: "tasks",
    name: "Tâches",
    description: "Gestion des activités",
    icon: CheckSquare,
    color: "from-purple-500 to-purple-600",
    permission: "tasks.view",
    href: "/dashboard/tasks",
  },
  {
    id: "reports",
    name: "Rapports",
    description: "Analyses et statistiques",
    icon: BarChart3,
    color: "from-pink-500 to-pink-600",
    permission: "reports.view",
    href: "/dashboard/reports",
  },
  {
    id: "calendar",
    name: "Calendrier",
    description: "Planning et événements",
    icon: Calendar,
    color: "from-cyan-500 to-cyan-600",
    permission: "tasks.view",
    href: "/dashboard/calendar",
  },
  {
    id: "messages",
    name: "Messages",
    description: "Communication interne",
    icon: MessageSquare,
    color: "from-rose-500 to-rose-600",
    permission: "users.view",
    href: "/dashboard/messages",
  },
  {
    id: "settings",
    name: "Paramètres",
    description: "Configuration système",
    icon: Settings,
    color: "from-gray-500 to-gray-600",
    permission: "roles.view",
    href: "/dashboard/settings",
  },
]

export function ModuleSelector() {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const { hasPermission } = usePermissions()
  const router = useRouter()

  const availableModules = modules.filter((module) => !module.permission || hasPermission(module.permission))

  const filteredModules = availableModules.filter(
    (module) =>
      module.name.toLowerCase().includes(search.toLowerCase()) ||
      module.description.toLowerCase().includes(search.toLowerCase()),
  )

  const handleModuleClick = (module: (typeof modules)[0]) => {
    router.push(module.href)
    setOpen(false)
    setSearch("")
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="h-9 w-9 p-0">
          <Grid3X3 className="h-5 w-5" />
          <span className="sr-only">Applications</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900">Applications</h3>
            <Badge variant="secondary" className="text-xs">
              {availableModules.length} disponibles
            </Badge>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Rechercher une application..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 h-9"
            />
          </div>
        </div>
        <div className="max-h-96 overflow-y-auto p-2">
          <div className="grid grid-cols-2 gap-2">
            {filteredModules.map((module) => {
              const Icon = module.icon

              return (
                <button
                  key={module.id}
                  onClick={() => handleModuleClick(module)}
                  className="flex flex-col items-center p-4 rounded-lg hover:bg-gray-50 transition-colors text-center group"
                >
                  <div
                    className={cn(
                      "w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center mb-2 group-hover:scale-110 transition-transform",
                      module.color,
                    )}
                  >
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  <span className="text-sm font-medium text-gray-900 mb-1">{module.name}</span>
                  <span className="text-xs text-gray-500 leading-tight">{module.description}</span>
                </button>
              )
            })}
          </div>
          {filteredModules.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <Grid3X3 className="h-8 w-8 mx-auto mb-2 text-gray-300" />
              <p className="text-sm">Aucune application trouvée</p>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
