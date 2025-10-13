"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ModuleNavbar } from "@/components/navigation/module-navbar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  Warehouse,
  Package,
  TrendingUp,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  BarChart3,
  ShoppingCart,
  DollarSign,
  Trophy,
  Loader2,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"

// Types pour les données du dashboard
interface StockStats {
  totalProducts: number
  totalQuantity: number
  productsOk: number
  productsLowStock: number
  productsOutOfStock: number
  productsOverstocked: number
  totalValue: number
}

interface MovementStats {
  totalMovements: number
  movementsToday: number
  movementsThisWeek: number
  movementsThisMonth: number
  entriesThisMonth: number
  exitsThisMonth: number
}

interface OrderStats {
  ordersInProgress: number
  ordersPending: number
}

interface StockAlert {
  id: string
  productName: string
  sku: string | null
  currentStock: number
  minStock: number
  type: string
  severity: string
}

interface RecentMovement {
  id: string
  type: string
  productName: string
  sku: string | null
  quantity: number
  user: string
  time: string
  note: string | null
}

export default function WarehouseDashboardPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [stockStats, setStockStats] = useState<StockStats | null>(null)
  const [movementStats, setMovementStats] = useState<MovementStats | null>(null)
  const [orderStats, setOrderStats] = useState<OrderStats | null>(null)
  const [stockValueByCategory, setStockValueByCategory] = useState<any[]>([])
  const [movementsByMonth, setMovementsByMonth] = useState<any[]>([])
  const [recentMovements, setRecentMovements] = useState<RecentMovement[]>([])
  const [stockAlerts, setStockAlerts] = useState<StockAlert[]>([])
  const [topProducts, setTopProducts] = useState<any[]>([])
  const [topProductsLoading, setTopProductsLoading] = useState(true)
  const [topProductsSortBy, setTopProductsSortBy] = useState<"quantity" | "revenue">("quantity")

  useEffect(() => {
    loadDashboardData()
  }, [])

  useEffect(() => {
    loadTopProducts()
  }, [topProductsSortBy])

  const loadDashboardData = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/warehouse/dashboard")
      if (!response.ok) throw new Error("Erreur")
      const data = await response.json()
      
      setStockStats(data.stockStats)
      setMovementStats(data.movementStats)
      setOrderStats(data.orderStats)
      setStockValueByCategory(data.stockValueByCategory || [])
      setMovementsByMonth(data.movementsByMonth || [])
      setRecentMovements(data.recentMovements || [])
      setStockAlerts(data.stockAlerts || [])
    } catch (error) {
      console.error("Error loading dashboard data:", error)
      toast.error("Erreur lors du chargement des données")
    } finally {
      setLoading(false)
    }
  }

  const loadTopProducts = async () => {
    try {
      setTopProductsLoading(true)
      const response = await fetch(`/api/products/top-sales?sortBy=${topProductsSortBy}&limit=10`)
      if (!response.ok) throw new Error("Erreur")
      const data = await response.json()
      setTopProducts(data.products || [])
    } catch (error) {
      console.error("Error loading top products:", error)
    } finally {
      setTopProductsLoading(false)
    }
  }

  const getMovementIcon = (type: string) => {
    switch (type) {
      case "IN":
        return <ArrowDownRight className="h-4 w-4" />
      case "OUT":
        return <ArrowUpRight className="h-4 w-4" />
      default:
        return <TrendingUp className="h-4 w-4" />
    }
  }

  const getMovementColor = (type: string) => {
    switch (type) {
      case "IN":
        return "text-green-600"
      case "OUT":
        return "text-red-600"
      default:
        return "text-blue-600"
    }
  }

  const getAlertIcon = (severity: string) => {
    switch (severity) {
      case "CRITICAL":
        return <XCircle className="h-5 w-5 text-red-500" />
      case "WARNING":
        return <AlertTriangle className="h-5 w-5 text-amber-500" />
      default:
        return <AlertTriangle className="h-5 w-5 text-blue-500" />
    }
  }

  const getAlertBgColor = (severity: string) => {
    switch (severity) {
      case "CRITICAL":
        return "bg-red-50 border-red-200"
      case "WARNING":
        return "bg-amber-50 border-amber-200"
      default:
        return "bg-blue-50 border-blue-200"
    }
  }

  return (
    <>
      <ModuleNavbar
        title="Entrepôt"
        description="Vue d'ensemble de la gestion des stocks"
        icon={Warehouse}
      />
      
      <div className="py-8">
        <div className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8 space-y-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        ) : (
          <>
        {/* Indicateurs clés */}
        <div className="grid gap-4 md:grid-cols-3">
          {/* Références en stock */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Références (SKU)</CardTitle>
              <Package className="h-4 w-4 text-gray-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{stockStats?.totalProducts.toLocaleString() || 0}</div>
              <div className="mt-2 flex items-center gap-2">
                <Badge variant="outline" className="text-xs border-red-200 text-red-700">
                  <XCircle className="h-3 w-3 mr-1" />
                  {stockStats?.productsOutOfStock || 0} ruptures
                </Badge>
                <Badge variant="outline" className="text-xs border-amber-200 text-amber-700">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  {stockStats?.productsLowStock || 0} alertes
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Valeur du stock */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Valeur du stock</CardTitle>
              <BarChart3 className="h-4 w-4 text-gray-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">
                {((stockStats?.totalValue || 0) / 1000000).toFixed(2)}M XAF
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Inventaire valorisé
              </p>
            </CardContent>
          </Card>

          {/* Commandes en cours */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Commandes en cours</CardTitle>
              <ShoppingCart className="h-4 w-4 text-gray-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{orderStats?.ordersInProgress || 0}</div>
              <div className="mt-2 flex items-center gap-2">
                <Badge variant="outline" className="text-xs border-amber-200 text-amber-700">
                  <Clock className="h-3 w-3 mr-1" />
                  {orderStats?.ordersPending || 0} en attente
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Graphiques décisionnels */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Valeur du stock par catégorie */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-amber-600" />
                Valeur du stock par catégorie
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={stockValueByCategory}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" stroke="#6b7280" fontSize={11} angle={-20} textAnchor="end" height={80} />
                  <YAxis stroke="#6b7280" fontSize={12} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                    formatter={(value: number) => `${(value / 1000).toFixed(0)}k XAF`}
                  />
                  <Bar dataKey="value" fill="#f59e0b" name="Valeur (XAF)" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Mouvements entrées/sorties */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-600" />
                Flux mensuels (Entrées vs Sorties)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={movementsByMonth}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" stroke="#6b7280" fontSize={12} />
                  <YAxis stroke="#6b7280" fontSize={12} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                    formatter={(value: number) => value.toLocaleString()}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="entries" 
                    stroke="#10b981" 
                    strokeWidth={2}
                    name="Entrées"
                    dot={{ fill: '#10b981' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="exits" 
                    stroke="#ef4444" 
                    strokeWidth={2}
                    name="Sorties"
                    dot={{ fill: '#ef4444' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Top produits du mois */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <Trophy className="h-5 w-5 text-amber-600" />
                Top 10 produits du mois
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  variant={topProductsSortBy === "quantity" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTopProductsSortBy("quantity")}
                >
                  Par ventes
                </Button>
                <Button
                  variant={topProductsSortBy === "revenue" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTopProductsSortBy("revenue")}
                >
                  Par CA
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {topProductsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
              </div>
            ) : topProducts.length === 0 ? (
              <div className="text-center py-8 text-gray-500 text-sm">
                Aucune vente enregistrée ce mois-ci
              </div>
            ) : (
              <div className="space-y-3">
                {topProducts.map((product, index) => (
                  <div
                    key={product.id}
                    className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => router.push(`/dashboard/warehouse/products`)}
                  >
                    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-amber-100 text-amber-700 font-bold text-sm shrink-0">
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm text-gray-900 truncate">{product.name}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            {product.sku && (
                              <Badge variant="outline" className="text-xs">
                                {product.sku}
                              </Badge>
                            )}
                            {product.categoryName && (
                              <span className="text-xs text-gray-500">{product.categoryName}</span>
                            )}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          {topProductsSortBy === "quantity" ? (
                            <div>
                              <p className="font-bold text-sm text-blue-600">
                                {product.totalQuantity} unités
                              </p>
                              <p className="text-xs text-gray-500">
                                {product.totalRevenue.toLocaleString("fr-FR")} XAF
                              </p>
                            </div>
                          ) : (
                            <div>
                              <p className="font-bold text-sm text-green-600">
                                {product.totalRevenue.toLocaleString("fr-FR")} XAF
                              </p>
                              <p className="text-xs text-gray-500">
                                {product.totalQuantity} unités
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="mt-1 flex items-center gap-3 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Package className="h-3 w-3" />
                          Stock: {product.stock}
                        </span>
                        <span className="flex items-center gap-1">
                          <DollarSign className="h-3 w-3" />
                          {product.prixVente.toLocaleString("fr-FR")} XAF
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Alertes de stock */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold">Alertes de stock</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => router.push("/dashboard/warehouse/products")}>
                  Voir tout
                  <ArrowUpRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {stockAlerts.length === 0 ? (
                    <div className="text-center py-8 text-sm text-gray-500">
                      Aucune alerte de stock
                    </div>
                  ) : (
                    stockAlerts.map((alert) => (
                    <div key={alert.id} className={cn("flex items-start gap-3 p-3 rounded-lg border", getAlertBgColor(alert.severity))}>
                      {getAlertIcon(alert.severity)}
                      <div className="flex-1 min-w-0">
                        <div className="flex-1">
                          <p className="font-medium text-sm text-gray-900">{alert.productName}</p>
                          <p className="text-xs text-gray-600">{alert.sku}</p>
                        </div>
                        <div className="mt-1 text-xs text-gray-600">
                          {alert.type === "OUT_OF_STOCK" && "Rupture de stock"}
                          {alert.type === "LOW_STOCK" && `Stock faible: ${alert.currentStock} / ${alert.minStock} min`}
                          {alert.type === "EXPIRING_SOON" && "Expire bientôt"}
                          {alert.type === "OVERSTOCKED" && `Surstock: ${alert.currentStock}`}
                        </div>
                      </div>
                    </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Mouvements récents */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-semibold">Mouvements récents</CardTitle>
                  <Button variant="ghost" size="sm" onClick={() => router.push("/dashboard/warehouse/movements")}>
                    Voir tout
                    <ArrowUpRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {recentMovements.length === 0 ? (
                    <div className="text-center py-8 text-sm text-gray-500">
                      Aucun mouvement récent
                    </div>
                  ) : (
                    recentMovements.map((movement) => (
                    <div key={movement.id} className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
                      <div className={cn("flex items-center justify-center w-8 h-8 rounded-lg bg-gray-100", getMovementColor(movement.type))}>
                        {getMovementIcon(movement.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <p className="font-medium text-sm text-gray-900">{movement.productName}</p>
                            <p className="text-xs text-gray-600">{movement.sku}</p>
                          </div>
                          <div className="text-right">
                            <p className={cn("font-semibold text-sm", getMovementColor(movement.type))}>
                              {movement.type === "OUT" ? "-" : "+"}
                              {movement.quantity}
                            </p>
                          </div>
                        </div>
                        <div className="mt-1 flex items-center justify-between text-xs text-gray-500">
                          <span className="text-gray-600">Par {movement.user}</span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {movement.time}
                          </span>
                        </div>
                      </div>
                    </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </>
        )}
        </div>
      </div>
    </>
  )
}
