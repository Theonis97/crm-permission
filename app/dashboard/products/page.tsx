"use client"

import { useState, useEffect } from "react"
import { PermissionGuard } from "@/components/auth/permission-guard"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Package, FolderTree, TrendingUp, AlertTriangle } from "lucide-react"

interface ProductStats {
  totalProducts: number
  totalCategories: number
  lowStockProducts: number
  outOfStockProducts: number
  totalValue: number
}

export default function ProductsHomePage() {
  const [stats, setStats] = useState<ProductStats>({
    totalProducts: 0,
    totalCategories: 0,
    lowStockProducts: 0,
    outOfStockProducts: 0,
    totalValue: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      const response = await fetch("/api/products/stats")
      if (response.ok) {
        const data = await response.json()
        setStats(data)
      }
    } catch (error) {
      console.error("Error fetching stats:", error)
    } finally {
      setLoading(false)
    }
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
    }).format(price)
  }

  if (loading) {
    return (
      <PermissionGuard permission="products.view">
        <div className="p-6">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
              ))}
            </div>
          </div>
        </div>
      </PermissionGuard>
    )
  }

  return (
    <PermissionGuard permission="products.view">
      <div className="p-6">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Tableau de bord Produits</h1>
          <p className="text-gray-600 mt-2">Vue d'ensemble de votre catalogue produits</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Produits</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalProducts}</div>
              <p className="text-xs text-muted-foreground">produits au catalogue</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Catégories</CardTitle>
              <FolderTree className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalCategories}</div>
              <p className="text-xs text-muted-foreground">catégories créées</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Valeur Stock</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatPrice(stats.totalValue)}</div>
              <p className="text-xs text-muted-foreground">valeur totale</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Alertes Stock</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <div className="text-2xl font-bold text-red-600">{stats.outOfStockProducts}</div>
                <Badge variant="destructive" className="text-xs">
                  Rupture
                </Badge>
              </div>
              <div className="flex items-center space-x-2 mt-1">
                <div className="text-lg font-semibold text-orange-600">{stats.lowStockProducts}</div>
                <Badge variant="secondary" className="text-xs">
                  Stock faible
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Actions Rapides</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Card className="p-4 hover:bg-gray-50 cursor-pointer transition-colors">
                  <div className="flex items-center space-x-3">
                    <Package className="h-8 w-8 text-blue-500" />
                    <div>
                      <h3 className="font-medium">Nouveau Produit</h3>
                      <p className="text-sm text-gray-500">Ajouter un produit</p>
                    </div>
                  </div>
                </Card>
                <Card className="p-4 hover:bg-gray-50 cursor-pointer transition-colors">
                  <div className="flex items-center space-x-3">
                    <FolderTree className="h-8 w-8 text-green-500" />
                    <div>
                      <h3 className="font-medium">Nouvelle Catégorie</h3>
                      <p className="text-sm text-gray-500">Organiser le catalogue</p>
                    </div>
                  </div>
                </Card>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Activité Récente</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">Nouveau produit ajouté</p>
                    <p className="text-xs text-gray-500">Il y a 2 heures</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">Stock mis à jour</p>
                    <p className="text-xs text-gray-500">Il y a 4 heures</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">Alerte stock faible</p>
                    <p className="text-xs text-gray-500">Il y a 6 heures</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </PermissionGuard>
  )
}
