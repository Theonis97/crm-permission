"use client"

import { usePermissions } from "@/hooks/use-permissions"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Users,
  Shield,
  Contact,
  Warehouse,
  CheckSquare,
  TrendingUp,
  BarChart3,
  Building2,
  Store,
  ArrowRight,
  Sparkles,
} from "lucide-react"
import { cn } from "@/lib/utils"
import HomeLayout from "./home-layout"

const modules = [
  {
    id: "users",
    name: "Utilisateurs",
    description: "Gestion des comptes utilisateurs",
    icon: Users,
    color: "from-blue-500 to-blue-600",
    permission: "users.view",
    href: "/dashboard/users",
    stats: "12 utilisateurs",
    clickable: true,
  },
  {
    id: "roles",
    name: "Rôles & Permissions",
    description: "Contrôle d'accès et sécurité",
    icon: Shield,
    color: "from-emerald-500 to-emerald-600",
    permission: "roles.view",
    href: "/dashboard/roles",
    stats: "5 rôles",
    clickable: true,
  },
  {
    id: "warehouse",
    name: "Entrepôt",
    description: "Gestion des stocks et inventaire",
    icon: Warehouse,
    color: "from-amber-500 to-amber-600",
    permission: "products.view",
    href: "/dashboard/warehouse",
    stats: "67 produits",
    clickable: true,
  },
  {
    id: "stores",
    name: "Nos Magasins",
    description: "Gestion des points de vente",
    icon: Store,
    color: "from-teal-500 to-teal-600",
    permission: "stores.view",
    href: "/dashboard/stores",
    stats: "5 magasins",
    clickable: true,
  },
  {
    id: "crm",
    name: "CRM",
    description: "Gestion relation client",
    icon: Building2,
    color: "from-indigo-500 to-indigo-600",
    permission: "opportunities.view",
    href: "/dashboard/opportunities",
    stats: "15 opportunités",
    clickable: true,
  },
  {
    id: "sales",
    name: "Ventes",
    description: "Devis, factures et commandes",
    icon: TrendingUp,
    color: "from-orange-500 to-orange-600",
    permission: "quotes.view",
    href: "/dashboard/sales",
    stats: "XAF 45,230 ce mois",
    clickable: true,
  },
  {
    id: "tasks",
    name: "Tâches",
    description: "Gestion des activités",
    icon: CheckSquare,
    color: "from-purple-500 to-purple-600",
    permission: "tasks.view",
    href: "/dashboard/tasks",
    stats: "8 en cours",
    clickable: true,
  },
  {
    id: "reports",
    name: "Rapports",
    description: "Analyses et statistiques",
    icon: BarChart3,
    color: "from-pink-500 to-pink-600",
    permission: "reports.view",
    href: "/dashboard/reports",
    stats: "6 KPIs actifs",
    clickable: true,
  },
]

const quickActions = [
  {
    name: "Nouveau contact",
    description: "Ajouter un contact",
    icon: Contact,
    color: "bg-blue-50 text-blue-600",
    permission: "contacts.create",
  },
  {
    name: "Créer une tâche",
    description: "Nouvelle tâche",
    icon: CheckSquare,
    color: "bg-green-50 text-green-600",
    permission: "tasks.create",
  },
  {
    name: "Nouveau devis",
    description: "Créer un devis",
    icon: TrendingUp,
    color: "bg-orange-50 text-orange-600",
    permission: "quotes.create",
  },
]

export default function DashboardPage() {
  const { user, hasPermission, loading } = usePermissions()
  const router = useRouter()

  const handleModuleClick = (module: (typeof modules)[0]) => {
    if (module.clickable && hasPermission(module.permission)) {
      router.push(module.href)
    }
  }

  if (loading) {
    return (
      <HomeLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </HomeLayout>
    )
  }

  const availableModules = modules.filter((m) => hasPermission(m.permission))
  const restrictedModules = modules.filter((m) => !hasPermission(m.permission))

  return (
    <HomeLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">


        {/* Modules disponibles */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Modules disponibles ({availableModules.length})</h2>
            <Badge variant="secondary" className="bg-green-50 text-green-700 border-green-200">
              {availableModules.length} modules actifs
            </Badge>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {availableModules.map((module) => {
              const Icon = module.icon

              return (
                <Card
                  key={module.id}
                  className={cn(
                    "group py-0 transition-all duration-300 border-gray-200 overflow-hidden",
                    module.clickable
                      ? "cursor-pointer hover:shadow-xl hover:scale-[1.02]"
                      : "cursor-default"
                  )}
                  onClick={() => handleModuleClick(module)}
                >
                  <CardContent className="p-0">
                    <div className={cn("h-32 bg-gradient-to-br flex items-center justify-center", module.color)}>
                      <Icon className="h-12 w-12 text-white" />
                    </div>
                    <div className="p-6">
                      <h3 className="font-bold text-gray-900 mb-2">{module.name}</h3>
                      <p className="text-sm text-gray-600 mb-3">{module.description}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-gray-500">{module.stats}</span>
                        {module.clickable && (
                          <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-gray-600 group-hover:translate-x-1 transition-all" />
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>

        {/* Modules restreints */}
        {restrictedModules.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Modules restreints</h2>
              <Badge variant="secondary" className="bg-gray-50 text-gray-600 border-gray-200">
                {restrictedModules.length} modules
              </Badge>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {restrictedModules.map((module) => {
                const Icon = module.icon

                return (
                  <Card key={module.id} className="opacity-50 py-0 cursor-not-allowed border-gray-200 overflow-hidden">
                    <CardContent className="p-0">
                      <div className="h-32 bg-gray-100 flex items-center justify-center">
                        <Icon className="h-12 w-12 text-gray-400" />
                      </div>
                      <div className="p-6">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-bold text-gray-500">{module.name}</h3>
                          <Badge variant="secondary" className="text-xs bg-red-50 text-red-600 border-red-200">
                            Restreint
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-400 mb-3">{module.description}</p>
                        <span className="text-xs text-gray-400">Accès non autorisé</span>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </HomeLayout>
  )
}
