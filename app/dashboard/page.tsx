"use client"

import { usePermissions } from "@/hooks/use-permissions"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Users, Shield, Contact, Package, TrendingUp, Activity } from "lucide-react"

export default function DashboardPage() {
  const { user, permissions, hasPermission } = usePermissions()

  const stats = [
    {
      name: "Utilisateurs",
      value: "12",
      icon: Users,
      permission: "users.view",
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      name: "Rôles",
      value: "5",
      icon: Shield,
      permission: "roles.view",
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
    {
      name: "Contacts",
      value: "248",
      icon: Contact,
      permission: "contacts.view",
      color: "text-purple-600",
      bgColor: "bg-purple-50",
    },
    {
      name: "Produits",
      value: "67",
      icon: Package,
      permission: "products.view",
      color: "text-orange-600",
      bgColor: "bg-orange-50",
    },
  ]

  const visibleStats = stats.filter((stat) => hasPermission(stat.permission))

  return (
    <div className="space-y-8">
      {/* En-tête de bienvenue */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center space-x-4">
          <div className="flex-shrink-0">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <Activity className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Bienvenue, {user?.firstName || user?.email?.split("@")[0] || "Utilisateur"}
            </h1>
            <p className="text-gray-600 mt-1">Voici un aperçu de votre CRM et de vos activités récentes</p>
          </div>
        </div>
      </div>

      {/* Statistiques */}
      {visibleStats.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Statistiques</h2>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {visibleStats.map((stat) => {
              const Icon = stat.icon
              return (
                <Card key={stat.name} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">{stat.name}</p>
                        <p className="text-3xl font-bold text-gray-900 mt-2">{stat.value}</p>
                      </div>
                      <div className={`p-3 rounded-full ${stat.bgColor}`}>
                        <Icon className={`h-6 w-6 ${stat.color}`} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      )}

      {/* Permissions utilisateur */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Shield className="w-5 h-5 text-gray-600" />
            <span>Vos permissions</span>
          </CardTitle>
          <CardDescription>
            Liste des permissions accordées à votre compte ({permissions.length} au total)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {permissions.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {permissions.map((permission) => (
                <Badge key={permission} variant="secondary" className="justify-start p-2 text-xs font-medium">
                  {permission}
                </Badge>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Shield className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>Aucune permission trouvée</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Activités récentes (placeholder) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <TrendingUp className="w-5 h-5 text-gray-600" />
            <span>Activités récentes</span>
          </CardTitle>
          <CardDescription>Vos dernières actions dans le CRM</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <TrendingUp className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>Aucune activité récente</p>
            <p className="text-sm mt-1">
              Les activités apparaîtront ici une fois que vous commencerez à utiliser le CRM
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
