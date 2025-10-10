"use client"

import { useState } from "react"
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
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { DashboardData, StockAlert } from "@/types/warehouse"
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

// Données mockées pour le dashboard
const mockDashboardData: DashboardData = {
  warehouseStats: {
    totalWarehouses: 1,
    activeWarehouses: 1,
    totalCapacity: 5000,
    totalOccupation: 3500,
    occupationRate: 70,
  },
  stockStats: {
    totalProducts: 1247,
    totalQuantity: 45230,
    productsOk: 1089,
    productsLowStock: 124,
    productsOutOfStock: 18,
    productsOverstocked: 16,
    productsExpiringSoon: 23,
    totalValue: 2450000,
  },
  movementStats: {
    totalMovements: 3456,
    movementsToday: 45,
    movementsThisWeek: 287,
    movementsThisMonth: 1234,
    entriesThisMonth: 678,
    exitsThisMonth: 556,
    pendingMovements: 12,
  },
  inventoryStats: {
    totalInventories: 48,
    plannedInventories: 3,
    inProgressInventories: 1,
    completedInventories: 44,
    lastInventoryDate: new Date("2025-10-05"),
    averageAccuracy: 98.5,
  },
  recentMovements: [],
  stockAlerts: [],
  upcomingInventories: [],
}

const mockRecentMovements = [
  {
    id: "1",
    type: "IN" as const,
    subtype: "PURCHASE" as const,
    productName: "Laptop Dell XPS 15",
    sku: "LAP-DELL-001",
    quantity: 25,
    user: "Jean Dupont",
    time: "Il y a 5 min",
    status: "VALIDATED" as const,
  },
  {
    id: "2",
    type: "OUT" as const,
    subtype: "SALE" as const,
    productName: "Souris Logitech MX Master",
    sku: "MOU-LOG-003",
    quantity: 15,
    user: "Marie Martin",
    time: "Il y a 15 min",
    status: "VALIDATED" as const,
  },
  {
    id: "3",
    type: "IN" as const,
    subtype: "RETURN_CLIENT" as const,
    productName: "Clavier mécanique",
    sku: "CLV-MEC-005",
    quantity: 3,
    user: "Sophie Laurent",
    time: "Il y a 2h",
    status: "VALIDATED" as const,
  },
  {
    id: "4",
    type: "ADJUSTMENT" as const,
    subtype: "ADJUSTMENT_NEGATIVE" as const,
    productName: "Cable HDMI 2m",
    sku: "CAB-HDM-001",
    quantity: 5,
    user: "Thomas Petit",
    time: "Il y a 3h",
    status: "VALIDATED" as const,
  },
  {
    id: "5",
    type: "OUT" as const,
    subtype: "SALE" as const,
    productName: "Écran Samsung 27\"",
    sku: "ECR-SAM-002",
    quantity: 8,
    user: "Pierre Dubois",
    time: "Il y a 4h",
    status: "VALIDATED" as const,
  },
]

const mockStockAlerts = [
  {
    id: "1",
    type: "OUT_OF_STOCK" as const,
    severity: "CRITICAL" as const,
    productName: "Batterie externe 20000mAh",
    sku: "BAT-EXT-004",
    currentStock: 0,
    minStock: 50,
  },
  {
    id: "2",
    type: "LOW_STOCK" as const,
    severity: "WARNING" as const,
    productName: "Adaptateur USB-C vers HDMI",
    sku: "ADP-USC-002",
    currentStock: 12,
    minStock: 50,
  },
  {
    id: "3",
    type: "EXPIRING_SOON" as const,
    severity: "WARNING" as const,
    productName: "Licence Office 365",
    sku: "LIC-OFF-001",
    currentStock: 45,
    expiryDate: "15/10/2025",
  },
  {
    id: "4",
    type: "OVERSTOCKED" as const,
    severity: "INFO" as const,
    productName: "Tapis de souris",
    sku: "TAP-SOU-001",
    currentStock: 350,
    maxStock: 200,
  },
]

// Données pour les graphiques - Métriques pertinentes pour la gestion d'entrepôt
const monthlyFlowData = [
  { date: "Jan", entrees: 5200, sorties: 4100 },
  { date: "Fév", entrees: 6100, sorties: 4500 },
  { date: "Mar", entrees: 7200, sorties: 4600 },
  { date: "Avr", entrees: 5800, sorties: 5100 },
  { date: "Mai", entrees: 6400, sorties: 5700 },
  { date: "Juin", entrees: 6800, sorties: 5750 },
  { date: "Juil", entrees: 7100, sorties: 6230 },
  { date: "Août", entrees: 5900, sorties: 7200 },
  { date: "Sep", entrees: 6700, sorties: 6300 },
  { date: "Oct", entrees: 6500, sorties: 6470 },
]

const stockValueByCategoryData = [
  { category: "Électronique", value: 850000 },
  { category: "Accessoires", value: 420000 },
  { category: "Logiciels", value: 580000 },
  { category: "Périphériques", value: 380000 },
  { category: "Câbles", value: 120000 },
  { category: "Autres", value: 100000 },
]

export default function WarehouseDashboardPage() {
  const router = useRouter()
  const [data] = useState<DashboardData>(mockDashboardData)

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
        {/* Indicateurs clés */}
        <div className="grid gap-4 md:grid-cols-3">
          {/* Références en stock */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Références (SKU)</CardTitle>
              <Package className="h-4 w-4 text-gray-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{data.stockStats.totalProducts.toLocaleString()}</div>
              <div className="mt-2 flex items-center gap-2">
                <Badge variant="outline" className="text-xs border-red-200 text-red-700">
                  <XCircle className="h-3 w-3 mr-1" />
                  {data.stockStats.productsOutOfStock} ruptures
                </Badge>
                <Badge variant="outline" className="text-xs border-amber-200 text-amber-700">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  {data.stockStats.productsLowStock} alertes
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
                {((data.stockStats.totalValue || 0) / 1000000).toFixed(2)}M €
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
              <div className="text-2xl font-bold text-gray-900">24</div>
              <div className="mt-2 flex items-center gap-2">
                <Badge variant="outline" className="text-xs border-amber-200 text-amber-700">
                  <Clock className="h-3 w-3 mr-1" />
                  8 en attente
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
                <BarChart data={stockValueByCategoryData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="category" stroke="#6b7280" fontSize={11} angle={-20} textAnchor="end" height={80} />
                  <YAxis stroke="#6b7280" fontSize={12} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                    formatter={(value: number) => `${(value / 1000).toFixed(0)}k €`}
                  />
                  <Bar dataKey="value" fill="#f59e0b" name="Valeur (€)" radius={[8, 8, 0, 0]} />
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
                <LineChart data={monthlyFlowData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" stroke="#6b7280" fontSize={12} />
                  <YAxis stroke="#6b7280" fontSize={12} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                    formatter={(value: number) => value.toLocaleString()}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="entrees" 
                    stroke="#10b981" 
                    strokeWidth={2}
                    name="Entrées"
                    dot={{ fill: '#10b981' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="sorties" 
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
                  {mockStockAlerts.map((alert) => (
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
                          {alert.type === "EXPIRING_SOON" && `Expire le ${alert.expiryDate}`}
                          {alert.type === "OVERSTOCKED" && `Surstock: ${alert.currentStock} / ${alert.maxStock} max`}
                        </div>
                      </div>
                    </div>
                  ))}
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
                  {mockRecentMovements.map((movement) => (
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
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  )
}
