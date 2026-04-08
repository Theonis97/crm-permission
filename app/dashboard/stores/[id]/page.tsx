"use client"

import { useState, use, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { StorePageHeader } from "@/components/stores/store-page-header"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import {
  MoreHorizontal,
  ExternalLink,
  Loader2,
  Package,
  TrendingUp,
  AlertTriangle,
  ShoppingCart,
  Users,
  Lock,
  ArrowRight,
  Pencil,
} from "lucide-react"
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"
import { toast } from "sonner"
import { usePermissions } from "@/hooks/use-permissions"
import { useStorePermissions } from "@/hooks/use-store-permissions"
import { STORE_PERMISSIONS } from "@/types/store-auth"
import { StoreDayCloses } from "@/components/stores/store-day-closes"
import { EditStoreSheet } from "@/components/stores/edit-store-sheet"
import { TopProductsModal } from "@/components/stores/top-products-modal"

interface StorePageProps {
  params: Promise<{
    id: string
  }>
}

interface StoreStats {
  store: {
    id: string
    name: string
    address: string | null
    phone: string | null
    email: string | null
  }
  stats: {
    totalProducts: number
    lowStockProducts: number
    outOfStockProducts: number
    stockValue: number
    totalOrdersThisMonth: number
    totalOrdersLastMonth: number
    ordersToday: number
    pendingOrders: number
    deliveringOrders: number
    deliveredThisMonth: number
    revenueThisMonth: number
    revenueLastMonth: number
    revenueChange: number
    averageOrderValue: number
    averageOrderChange: number
    totalContacts: number
    newContactsThisMonth: number
    totalDrivers: number
    availableDrivers: number
    busyDrivers: number
  }
  recentOrders: Array<{
    id: string
    number: string
    customerName: string
    total: number
    status: string
    itemsCount: number
    createdAt: string
  }>
  topProducts: {
    byQuantity: Array<{
      id: string
      name: string
      sku: string | null
      quantity: number
      revenue: number
      categoryName?: string
    }>
    byRevenue: Array<{
      id: string
      name: string
      quantity: number
      revenue: number
    }>
  }
  charts: {
    monthlyRevenue: Array<{
      month: string
      revenue: number
      orders: number
    }>
    dailySales: Array<{
      day: string
      sales: number
    }>
  }
}


// Fonction pour formater les prix en FCFA
const formatFCFA = (amount: number) => {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'XAF',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount).replace('XAF', 'FCFA')
}


export default function StorePage({ params }: StorePageProps) {
  const { id } = use(params)
  const router = useRouter()
  const { hasPermission, loading: permissionsLoading } = usePermissions()
  const { hasStorePermission, loading: storePermsLoading } = useStorePermissions(id)
  const [selectedPeriod, setSelectedPeriod] = useState("Ce Mois")
  const [storeData, setStoreData] = useState<StoreStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [showTopProductsModal, setShowTopProductsModal] = useState(false)
  const [showEditStoreSheet, setShowEditStoreSheet] = useState(false)

  const canEditStore =
    hasPermission("stores.update") || hasStorePermission(STORE_PERMISSIONS.SETTINGS_EDIT)

  useEffect(() => {
    loadStoreStats()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const loadStoreStats = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/stores/${id}/stats`)
      const data = await response.json().catch(() => null)

      if (!response.ok) {
        const body = data && typeof data === "object" ? (data as { message?: string; error?: string }) : {}
        const msg =
          body.error ||
          body.message ||
          (response.status === 401
            ? "Non authentifié — reconnectez-vous."
            : response.status === 403
              ? "Vous n'avez pas la permission d'accéder aux statistiques de ce magasin."
              : `Erreur ${response.status} lors du chargement`)
        throw new Error(msg)
      }

      setStoreData(data as StoreStats)
    } catch (error) {
      console.error("Error loading store stats:", error)
      toast.error(
        error instanceof Error ? error.message : "Erreur lors du chargement des statistiques"
      )
    } finally {
      setLoading(false)
    }
  }

  if (loading || permissionsLoading || storePermsLoading) {
    return (
      <>
        <StorePageHeader
          title="Vue d'ensemble"
          description="Chargement..."
        />
        <div className="flex items-center justify-center min-h-screen bg-gray-50">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-3" />
            <p className="text-gray-600">Chargement des données...</p>
          </div>
        </div>
      </>
    )
  }

  // Vérifier les permissions d'accès à la vue d'ensemble
  if (!hasPermission(STORE_PERMISSIONS.DASHBOARD_VIEW)) {
    return (
      <>
        <StorePageHeader
          title="Accès restreint"
          description="Vous n'avez pas accès à cette section"
        />
        <div className="flex items-center justify-center min-h-screen bg-gray-50">
          <div className="max-w-md mx-auto text-center">
            <div className="bg-white rounded-lg shadow-lg p-8">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Lock className="h-8 w-8 text-red-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Accès non autorisé
              </h3>
              <p className="text-gray-600 mb-6">
                Vous n'avez pas les permissions nécessaires pour accéder à la vue d'ensemble de ce magasin.
              </p>
              
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-gray-700 mb-3">
                  Modules disponibles :
                </h4>
                
                <div className="grid gap-2">
                  {hasPermission(STORE_PERMISSIONS.PRODUCTS_VIEW) && (
                    <Button
                      onClick={() => router.push(`/dashboard/stores/${id}/products`)}
                      variant="outline"
                      className="w-full justify-between"
                    >
                      <div className="flex items-center">
                        <Package className="h-4 w-4 mr-2" />
                        Produits
                      </div>
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  )}
                  
                  {hasPermission(STORE_PERMISSIONS.ORDERS_VIEW) && (
                    <Button
                      onClick={() => router.push(`/dashboard/stores/${id}/orders`)}
                      variant="outline"
                      className="w-full justify-between"
                    >
                      <div className="flex items-center">
                        <ShoppingCart className="h-4 w-4 mr-2" />
                        Commandes
                      </div>
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  )}
                  
                  {hasPermission(STORE_PERMISSIONS.POS_ACCESS) && (
                    <Button
                      onClick={() => router.push(`/dashboard/stores/${id}/pos`)}
                      variant="outline"
                      className="w-full justify-between"
                    >
                      <div className="flex items-center">
                        <TrendingUp className="h-4 w-4 mr-2" />
                        Point de vente
                      </div>
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  )}
                  
                  {hasPermission(STORE_PERMISSIONS.CONTACTS_VIEW) && (
                    <Button
                      onClick={() => router.push(`/dashboard/stores/${id}/contacts`)}
                      variant="outline"
                      className="w-full justify-between"
                    >
                      <div className="flex items-center">
                        <Users className="h-4 w-4 mr-2" />
                        Contacts
                      </div>
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  )}
                  
                  {hasPermission(STORE_PERMISSIONS.USERS_VIEW) && (
                    <Button
                      onClick={() => router.push(`/dashboard/stores/${id}/users`)}
                      variant="outline"
                      className="w-full justify-between"
                    >
                      <div className="flex items-center">
                        <Users className="h-4 w-4 mr-2" />
                        Utilisateurs
                      </div>
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                
                <div className="pt-4 border-t">
                  <Button
                    onClick={() => router.push('/dashboard')}
                    variant="ghost"
                    className="w-full"
                  >
                    Retour au tableau de bord
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </>
    )
  }

  if (!storeData) {
    return (
      <>
        <StorePageHeader
          title="Vue d'ensemble"
          description="Erreur"
        />
        <div className="flex items-center justify-center min-h-screen bg-gray-50">
          <div className="text-center">
            <p className="text-gray-600">Impossible de charger les données</p>
          </div>
        </div>
      </>
    )
  }

  const { store, stats, topProducts, charts } = storeData

  return (
    <>
      <StorePageHeader
        title="Vue d'ensemble"
        description={`Tableau de bord du ${store.name}`}
        actions={
          canEditStore ? (
            <Button variant="outline" size="sm" onClick={() => setShowEditStoreSheet(true)}>
              <Pencil className="h-4 w-4 mr-2" />
              Modifier le magasin
            </Button>
          ) : undefined
        }
      />

      <EditStoreSheet
        storeId={id}
        open={showEditStoreSheet}
        onClose={() => setShowEditStoreSheet(false)}
        onSuccess={() => {
          setShowEditStoreSheet(false)
          loadStoreStats()
          router.refresh()
        }}
      />

      <div className="p-8 space-y-6 bg-gray-50 min-h-screen">
        {/* Header avec salutation et période */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Hey, Admin 👋</h2>
            <p className="text-gray-600">{new Date().toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant={selectedPeriod === "Ce Mois" ? "default" : "outline"} 
              size="sm"
              onClick={() => setSelectedPeriod("Ce Mois")}
              className="bg-gray-900 text-white hover:bg-gray-800"
            >
              Ce Mois
            </Button>
            <Button 
              variant={selectedPeriod === "Comparer: Mois Dernier" ? "default" : "outline"} 
              size="sm"
              onClick={() => setSelectedPeriod("Comparer: Mois Dernier")}
            >
              Comparer: Mois Dernier
            </Button>
            <Button variant="outline" size="sm">
              <MoreHorizontal className="h-4 w-4 mr-2" />
              Modifier Widget
            </Button>
          </div>
        </div>

        {/* Métriques principales */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {/* Sales Performance */}
          <Card className="bg-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                <CardTitle className="text-sm font-medium text-gray-600">Performance des ventes</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">{formatFCFA(stats.revenueThisMonth)}</div>
              <div className="flex items-center gap-1 text-sm mt-2">
                <span className={`font-medium ${stats.revenueChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {stats.revenueChange >= 0 ? '↗' : '↘'} {Math.abs(stats.revenueChange).toFixed(1)}%
                </span>
                <span className="text-gray-500">vs mois dernier</span>
              </div>
            </CardContent>
          </Card>

          {/* Total Sales */}
          <Card className="bg-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-orange-400 rounded-full"></div>
                <CardTitle className="text-sm font-medium text-gray-600">Ventes Totales</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">{stats.totalOrdersThisMonth}</div>
              <div className="flex items-center gap-1 text-sm mt-2">
                {stats.totalOrdersLastMonth > 0 && (
                  <>
                    <span className={`font-medium ${stats.totalOrdersThisMonth >= stats.totalOrdersLastMonth ? 'text-green-600' : 'text-red-600'}`}>
                      {stats.totalOrdersThisMonth >= stats.totalOrdersLastMonth ? '↗' : '↘'} 
                      {Math.abs(((stats.totalOrdersThisMonth - stats.totalOrdersLastMonth) / stats.totalOrdersLastMonth) * 100).toFixed(1)}%
                    </span>
                    <span className="text-gray-500">vs mois dernier</span>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Average Revenue */}
          <Card className="bg-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                <CardTitle className="text-sm font-medium text-gray-600">Chiffre d'Affaires Moyen</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">{formatFCFA(stats.averageOrderValue)}</div>
              <div className="flex items-center gap-1 text-sm mt-2">
                <span className={`font-medium ${stats.averageOrderChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {stats.averageOrderChange >= 0 ? '↗' : '↘'} {Math.abs(stats.averageOrderChange).toFixed(1)}%
                </span>
                <span className="text-gray-500">vs mois dernier</span>
              </div>
            </CardContent>
          </Card>

          {/* Average Order */}
          <Card className="bg-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                <CardTitle className="text-sm font-medium text-gray-600">Commande Moyenne</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">{stats.totalProducts}</div>
              <div className="flex items-center gap-1 text-sm mt-2">
                <span className="text-gray-600 font-medium">
                  <Package className="h-3 w-3 inline" /> {stats.lowStockProducts} stock faible
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Section principale avec graphiques */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Total Revenue Chart */}
          <Card className="lg:col-span-2 bg-white">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                  <span className="text-sm font-medium text-gray-600">Chiffre d'Affaires Total</span>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                    <ExternalLink className="h-3 w-3" />
                  </Button>
                </div>
                <div className="text-3xl font-bold text-gray-900">{formatFCFA(stats.revenueThisMonth)}</div>
                <div className="flex items-center gap-1 text-sm mt-1">
                  <span className={`font-medium ${stats.revenueChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {stats.revenueChange >= 0 ? '↗' : '↘'} {Math.abs(stats.revenueChange).toFixed(1)}%
                  </span>
                  <span className="text-gray-500">vs mois dernier</span>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <Button variant="ghost" size="sm">Voir Plus</Button>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-6 mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-gray-800 rounded-full"></div>
                  <span className="text-sm text-gray-600">Ce mois</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-gray-300 rounded-full"></div>
                  <span className="text-sm text-gray-600">Mois dernier</span>
                </div>
              </div>
              {/* Graphique des revenus */}
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={charts.monthlyRevenue.map((item, idx) => ({
                    name: item.month,
                    thisMonth: item.revenue,
                    lastMonth: idx > 0 ? charts.monthlyRevenue[idx - 1].revenue : 0,
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis 
                      dataKey="name" 
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 12, fill: '#6b7280' }}
                    />
                    <YAxis 
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 12, fill: '#6b7280' }}
                      tickFormatter={(value) => `${(value / 1000000).toFixed(0)}M FCFA`}
                    />
                    <Tooltip 
                      formatter={(value: any) => [`${formatFCFA(value)}`, '']}
                      labelStyle={{ color: '#374151' }}
                      contentStyle={{ 
                        backgroundColor: 'white', 
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                      }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="lastMonth" 
                      stackId="1"
                      stroke="#d1d5db" 
                      fill="#f3f4f6" 
                      strokeWidth={2}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="thisMonth" 
                      stackId="2"
                      stroke="#1f2937" 
                      fill="#374151" 
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Popular Products */}
          <Card className="bg-white">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                  <span className="text-sm font-medium text-gray-600">Produits Populaires</span>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                    <ExternalLink className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setShowTopProductsModal(true)}
                >
                  Voir Plus
                </Button>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {topProducts.byQuantity.length > 0 ? (
                topProducts.byQuantity.slice(0, 4).map((product, idx) => {
                  const maxQuantity = topProducts.byQuantity[0].quantity
                  const progressValue = (product.quantity / maxQuantity) * 100
                  
                  return (
                    <div key={product.id} className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium truncate">{product.name}</span>
                        <span className="text-sm text-gray-500">{product.quantity} Ventes</span>
                      </div>
                      <Progress value={progressValue} className="h-2" />
                    </div>
                  )
                })
              ) : (
                <p className="text-center text-gray-500 py-4">Aucune vente ce mois</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Section inférieure avec métriques détaillées */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Clôtures de journée */}
          <StoreDayCloses storeId={id} />
          {/* Average Order Value */}
          <Card className="bg-white">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                  <span className="text-sm font-medium text-gray-600">Valeur Moyenne des Commandes</span>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                    <ExternalLink className="h-3 w-3" />
                  </Button>
                </div>
                <div className="text-3xl font-bold text-gray-900">595 200 FCFA</div>
                <div className="flex items-center gap-1 text-sm mt-1">
                  <span className="text-green-600 font-medium">↗ 2.4%</span>
                  <span className="text-gray-500">vs mois dernier</span>
                </div>
              </div>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              {/* Graphique des valeurs de commandes */}
              <div className="h-32">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={charts.monthlyRevenue.map((item, idx) => ({
                    day: idx + 1,
                    value: item.revenue / (item.orders || 1),
                  }))}>
                    <XAxis 
                      dataKey="day" 
                      axisLine={false}
                      tickLine={false}
                      tick={false}
                    />
                    <YAxis hide />
                    <Tooltip 
                      formatter={(value: any) => [`${formatFCFA(value)}`, 'Valeur']}
                      labelFormatter={(label) => `Jour ${label}`}
                      contentStyle={{ 
                        backgroundColor: 'white', 
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                      }}
                    />
                    <Bar 
                      dataKey="value" 
                      fill="#fb923c" 
                      radius={[2, 2, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Average Sales */}
          <Card className="bg-white">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 bg-orange-400 rounded-full"></div>
                  <span className="text-sm font-medium text-gray-600">Ventes Moyennes</span>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                    <ExternalLink className="h-3 w-3" />
                  </Button>
                </div>
                <div className="text-3xl font-bold text-gray-900">840</div>
                <div className="flex items-center gap-1 text-sm mt-1">
                  <span className="text-green-600 font-medium">↗ 1.34%</span>
                  <span className="text-gray-500">vs mois dernier</span>
                </div>
              </div>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-orange-400 rounded-full"></div>
                  <span className="text-sm text-gray-600">Ce mois</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-gray-300 rounded-full"></div>
                  <span className="text-sm text-gray-600">Mois dernier</span>
                </div>
              </div>
              {/* Graphique des ventes moyennes */}
              <div className="h-24">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={charts.dailySales}>
                    <XAxis 
                      dataKey="day" 
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 10, fill: '#6b7280' }}
                    />
                    <YAxis hide />
                    <Tooltip 
                      formatter={(value: any) => [value, 'Ventes']}
                      contentStyle={{ 
                        backgroundColor: 'white', 
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                      }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="sales" 
                      stroke="#fb923c" 
                      strokeWidth={3}
                      dot={{ fill: '#fb923c', strokeWidth: 2, r: 4 }}
                      activeDot={{ r: 6, fill: '#fb923c' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Total Sessions */}
          <Card className="bg-white">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                  <span className="text-sm font-medium text-gray-600">Sessions Totales</span>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                    <ExternalLink className="h-3 w-3" />
                  </Button>
                </div>
                <div className="text-3xl font-bold text-gray-900">11,240</div>
                <div className="flex items-center gap-1 text-sm mt-1">
                  <span className="text-green-600 font-medium">↗ 4%</span>
                  <span className="text-gray-500">vs mois dernier</span>
                </div>
              </div>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">Utilisateurs par 2 jours</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-gray-800 rounded-full"></div>
                  <span className="text-sm text-gray-600">Ce mois</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-gray-300 rounded-full"></div>
                  <span className="text-sm text-gray-600">Mois dernier</span>
                </div>
              </div>
              {/* Graphique des sessions */}
              <div className="h-24">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={charts.dailySales.map((item, idx) => ({
                    period: `J${idx + 1}`,
                    thisWeek: item.sales,
                    lastWeek: idx > 0 ? charts.dailySales[idx - 1].sales : 0,
                  }))}>
                    <XAxis 
                      dataKey="period" 
                      axisLine={false}
                      tickLine={false}
                      tick={false}
                    />
                    <YAxis hide />
                    <Tooltip 
                      formatter={(value: any, name: string | undefined) => [
                        value, 
                        name === 'thisWeek' ? 'Cette semaine' : 'Semaine dernière'
                      ]}
                      contentStyle={{ 
                        backgroundColor: 'white', 
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                      }}
                    />
                    <Bar 
                      dataKey="thisWeek" 
                      fill="#1f2937" 
                      radius={[2, 2, 0, 0]}
                    />
                    <Bar 
                      dataKey="lastWeek" 
                      fill="#d1d5db" 
                      radius={[2, 2, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Modal Top Produits */}
        <TopProductsModal
          isOpen={showTopProductsModal}
          onClose={() => setShowTopProductsModal(false)}
          storeId={id}
        />
      </div>
    </>
  )
}
