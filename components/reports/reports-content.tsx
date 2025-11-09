import { Section } from "@/app/dashboard/reports/page"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import {
  Calendar,
  Download,
  ArrowUpRight,
  ArrowDownRight,
  DollarSign,
  ShoppingCart,
  Users,
  Package,
  Star,
  TrendingUp,
  BarChart3,
  Activity,
  CheckCircle2,
  Truck,
  Eye,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface ReportsContentProps {
  currentSection: Section
  period: string
  onPeriodChange: (period: string) => void
  isLoading: boolean
  stats: any
  topProducts: any[]
  recentOrders: any[]
}

export default function ReportsContent({
  currentSection,
  period,
  onPeriodChange,
  isLoading,
  stats,
  topProducts,
  recentOrders,
}: ReportsContentProps) {
  const renderHeader = () => {
    const sectionTitles = {
      overview: "Vue d'ensemble",
      sales: "Analyses des ventes",
      products: "Gestion des produits",
      customers: "Analyse clients",
      orders: "Gestion des commandes",
      drivers: "Performance livreurs",
    }

    return (
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{sectionTitles[currentSection]}</h1>
          <p className="text-gray-500 mt-1">Statistiques et indicateurs de performance</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={period} onValueChange={onPeriodChange}>
            <SelectTrigger className="w-[180px]">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Aujourd'hui</SelectItem>
              <SelectItem value="week">Cette semaine</SelectItem>
              <SelectItem value="month">Ce mois</SelectItem>
              <SelectItem value="year">Cette année</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Exporter
          </Button>
        </div>
      </div>
    )
  }

  const statCards = [
    {
      title: "Chiffre d'affaires",
      value: stats.revenue >= 1000000 
        ? `${(stats.revenue / 1000000).toFixed(2)}M FCFA`
        : `${(stats.revenue / 1000).toFixed(0)}K FCFA`,
      change: stats.revenueChange,
      icon: DollarSign,
      color: "from-green-500 to-emerald-600",
      trend: stats.revenueChange >= 0 ? "up" : "down",
    },
    {
      title: "Commandes",
      value: stats.orders,
      change: stats.ordersChange,
      icon: ShoppingCart,
      color: "from-blue-500 to-blue-600",
      trend: stats.ordersChange >= 0 ? "up" : "down",
    },
    {
      title: "Clients actifs",
      value: stats.customers,
      change: stats.customersChange,
      icon: Users,
      color: "from-purple-500 to-purple-600",
      trend: stats.customersChange >= 0 ? "up" : "down",
    },
    {
      title: "Produits",
      value: stats.products,
      change: stats.productsChange,
      icon: Package,
      color: "from-orange-500 to-orange-600",
      trend: stats.productsChange >= 0 ? "up" : "down",
    },
  ]

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, index) => {
          const Icon = stat.icon
          const TrendIcon = stat.trend === "up" ? ArrowUpRight : ArrowDownRight
          
          return (
            <Card key={index} className="overflow-hidden hover:shadow-xl transition-all duration-300 border-0">
              <CardContent className="p-0">
                <div className={cn("h-1.5 bg-gradient-to-r", stat.color)} />
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className={cn("p-3 rounded-xl bg-gradient-to-br shadow-lg", stat.color)}>
                      <Icon className="h-6 w-6 text-white" />
                    </div>
                    <div className={cn(
                      "flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold",
                      stat.trend === "up" 
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-700"
                    )}>
                      <TrendIcon className="h-3.5 w-3.5" />
                      {Math.abs(stat.change)}%
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1.5 font-medium">{stat.title}</p>
                    <p className="text-3xl font-bold text-gray-900">
                      {isLoading ? "..." : stat.value}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Products */}
        <Card className="border-0 shadow-lg">
          <CardHeader className="border-b bg-gradient-to-r from-orange-50 to-pink-50">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Star className="h-5 w-5 text-orange-600" />
              Top 5 Produits
            </CardTitle>
            <CardDescription>Les plus vendus cette période</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            {topProducts.length === 0 ? (
              <div className="text-center py-12">
                <Package className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">Aucune donnée disponible</p>
              </div>
            ) : (
              <div className="space-y-3">
                {topProducts.map((product, index) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl hover:from-orange-50 hover:to-pink-50 transition-all duration-200">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-full bg-gradient-to-br from-orange-500 to-pink-600 flex items-center justify-center text-white font-bold shadow-md">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-bold text-gray-900">{product.name}</p>
                        <p className="text-xs text-gray-500">{product.sales} ventes</p>
                      </div>
                    </div>
                    <p className="font-bold text-lg text-gray-900">{(product.revenue / 1000).toFixed(0)}K</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Orders */}
        <Card className="border-0 shadow-lg">
          <CardHeader className="border-b bg-gradient-to-r from-blue-50 to-purple-50">
            <CardTitle className="flex items-center gap-2 text-lg">
              <ShoppingCart className="h-5 w-5 text-blue-600" />
              Commandes récentes
            </CardTitle>
            <CardDescription>Dernières transactions</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            {recentOrders.length === 0 ? (
              <div className="text-center py-12">
                <ShoppingCart className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">Aucune commande récente</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentOrders.map((order, index) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-blue-50 transition-colors">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1.5">
                        <p className="font-bold text-gray-900">{order.id}</p>
                        <Badge variant="outline" className={cn(
                          "text-xs font-medium",
                          order.status === "delivered" && "bg-green-50 text-green-700 border-green-200",
                          order.status === "pending" && "bg-yellow-50 text-yellow-700 border-yellow-200"
                        )}>
                          {order.status === "delivered" ? "Livrée" : "En attente"}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600">{order.customer}</p>
                    </div>
                    <p className="text-lg font-bold text-gray-900">{(order.amount / 1000).toFixed(0)}K</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Performance Chart */}
      <Card className="border-0 shadow-lg">
        <CardHeader className="border-b">
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-purple-600" />
            Évolution du chiffre d'affaires
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="h-[300px] bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50 rounded-xl flex items-center justify-center border-2 border-dashed border-purple-200">
            <div className="text-center">
              <BarChart3 className="h-20 w-20 text-purple-300 mx-auto mb-4" />
              <p className="text-gray-700 font-semibold text-lg">Graphique d'évolution</p>
              <p className="text-sm text-gray-500 mt-2">Intégration Chart.js ou Recharts à venir</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )

  const renderSales = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: "Chiffre d'affaires", value: `${(stats.revenue / 1000).toFixed(0)}K FCFA`, change: stats.revenueChange, color: "from-green-500 to-emerald-600", icon: DollarSign },
          { label: "Total commandes", value: stats.orders, change: stats.ordersChange, color: "from-blue-500 to-blue-600", icon: ShoppingCart },
          { label: "Panier moyen", value: stats.orders > 0 ? `${((stats.revenue / stats.orders) / 1000).toFixed(1)}K FCFA` : "0K FCFA", change: 0, color: "from-purple-500 to-purple-600", icon: Activity },
        ].map((item, index) => {
          const Icon = item.icon
          return (
            <Card key={index} className="border-0 shadow-lg overflow-hidden">
              <div className={cn("h-2 bg-gradient-to-r", item.color)} />
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className={cn("p-3 rounded-xl shadow-lg bg-gradient-to-br", item.color)}>
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  <p className="text-sm font-semibold text-gray-700">{item.label}</p>
                </div>
                <p className="text-3xl font-bold text-gray-900">{item.value}</p>
                {item.change !== 0 && (
                  <p className="text-xs text-green-600 mt-2 font-medium">+{item.change}% ce mois</p>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Card className="border-0 shadow-lg">
        <CardHeader className="border-b">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-green-600" />
            Évolution des ventes
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="h-[350px] bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl flex items-center justify-center border-2 border-dashed border-green-200">
            <div className="text-center">
              <BarChart3 className="h-20 w-20 text-green-300 mx-auto mb-4" />
              <p className="text-gray-700 font-semibold text-lg">Graphique des ventes</p>
              <p className="text-sm text-gray-500 mt-2">Chart.js - Courbe évolutive</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )

  const renderProducts = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-0 shadow-lg">
          <CardHeader className="border-b bg-gradient-to-r from-orange-50 to-pink-50">
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5 text-orange-600" />
              Top Produits
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            {topProducts.length === 0 ? (
              <div className="text-center py-12 text-gray-500">Aucune donnée</div>
            ) : (
              <div className="space-y-3">
                {topProducts.map((product, index) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-orange-50 rounded-xl hover:shadow-md transition-all">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-gradient-to-br from-orange-500 to-pink-600 flex items-center justify-center text-white font-bold text-sm shadow-md">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-bold text-gray-900">{product.name}</p>
                        <p className="text-xs text-gray-500">{product.sales} ventes</p>
                      </div>
                    </div>
                    <p className="font-bold text-gray-900">{(product.revenue / 1000).toFixed(0)}K</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardHeader className="border-b bg-gradient-to-r from-orange-50 to-amber-50">
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-orange-600" />
              Statistiques produits
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between p-5 bg-gradient-to-r from-orange-50 to-orange-100 rounded-xl">
                <span className="text-sm font-semibold text-gray-700">Total produits</span>
                <span className="text-3xl font-bold text-orange-600">{stats.products}</span>
              </div>
              <div className="flex items-center justify-between p-5 bg-gradient-to-r from-green-50 to-green-100 rounded-xl">
                <span className="text-sm font-semibold text-gray-700">En stock</span>
                <span className="text-3xl font-bold text-green-600">{stats.products}</span>
              </div>
              <div className="flex items-center justify-between p-5 bg-gradient-to-r from-red-50 to-red-100 rounded-xl">
                <span className="text-sm font-semibold text-gray-700">Rupture</span>
                <span className="text-3xl font-bold text-red-600">0</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )

  const renderCustomers = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: "Clients actifs", value: stats.customers, color: "from-purple-500 to-purple-600", icon: Users },
          { label: "Nouveaux ce mois", value: `+${Math.floor(stats.customers * 0.15)}`, color: "from-blue-500 to-blue-600", icon: Eye },
          { label: "Taux de rétention", value: "87%", color: "from-green-500 to-green-600", icon: CheckCircle2 },
        ].map((item, index) => {
          const Icon = item.icon
          return (
            <Card key={index} className="border-0 shadow-lg overflow-hidden">
              <div className={cn("h-2 bg-gradient-to-r", item.color)} />
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className={cn("p-3 rounded-xl shadow-lg bg-gradient-to-br", item.color)}>
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  <p className="text-sm font-semibold text-gray-700">{item.label}</p>
                </div>
                <p className="text-3xl font-bold text-gray-900">{item.value}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Card className="border-0 shadow-lg">
        <CardHeader className="border-b">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-purple-600" />
            Segmentation clients
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="h-[300px] bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl flex items-center justify-center border-2 border-dashed border-purple-200">
            <div className="text-center">
              <Users className="h-20 w-20 text-purple-300 mx-auto mb-4" />
              <p className="text-gray-700 font-semibold text-lg">Analyse comportementale</p>
              <p className="text-sm text-gray-500 mt-2">Graphiques de segmentation</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )

  const renderOrders = () => (
    <div className="space-y-6">
      <Card className="border-0 shadow-lg">
        <CardHeader className="border-b bg-gradient-to-r from-blue-50 to-cyan-50">
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-blue-600" />
            Toutes les commandes
          </CardTitle>
          <CardDescription>Liste complète des transactions</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          {recentOrders.length === 0 ? (
            <div className="text-center py-16">
              <ShoppingCart className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 font-medium">Aucune commande</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentOrders.map((order, index) => (
                <div key={index} className="flex items-center justify-between p-5 bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl hover:shadow-md transition-all">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <p className="font-bold text-gray-900 text-lg">{order.id}</p>
                      <Badge className={cn(
                        "font-medium",
                        order.status === "delivered" && "bg-green-100 text-green-700",
                        order.status === "pending" && "bg-yellow-100 text-yellow-700"
                      )}>
                        {order.status === "delivered" ? "✓ Livrée" : "⏱ En attente"}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600">{order.customer}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-gray-900">{(order.amount / 1000).toFixed(0)}K</p>
                    <p className="text-xs text-gray-500">FCFA</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )

  const renderDrivers = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: "Livreurs actifs", value: "12", color: "from-teal-500 to-teal-600", icon: Truck },
          { label: "Livraisons", value: stats.orders, color: "from-green-500 to-green-600", icon: CheckCircle2 },
          { label: "Temps moyen", value: "32min", color: "from-orange-500 to-orange-600", icon: Activity },
        ].map((item, index) => {
          const Icon = item.icon
          return (
            <Card key={index} className="border-0 shadow-lg overflow-hidden">
              <div className={cn("h-2 bg-gradient-to-r", item.color)} />
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className={cn("p-3 rounded-xl shadow-lg bg-gradient-to-br", item.color)}>
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  <p className="text-sm font-semibold text-gray-700">{item.label}</p>
                </div>
                <p className="text-3xl font-bold text-gray-900">{item.value}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Card className="border-0 shadow-lg">
        <CardHeader className="border-b">
          <CardTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5 text-teal-600" />
            Performance livreurs
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="h-[300px] bg-gradient-to-br from-teal-50 to-cyan-50 rounded-xl flex items-center justify-center border-2 border-dashed border-teal-200">
            <div className="text-center">
              <Truck className="h-20 w-20 text-teal-300 mx-auto mb-4" />
              <p className="text-gray-700 font-semibold text-lg">Classement et KPIs</p>
              <p className="text-sm text-gray-500 mt-2">Tableau de bord livreurs</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )

  const renderContent = () => {
    switch (currentSection) {
      case "overview": return renderOverview()
      case "sales": return renderSales()
      case "products": return renderProducts()
      case "customers": return renderCustomers()
      case "orders": return renderOrders()
      case "drivers": return renderDrivers()
      default: return renderOverview()
    }
  }

  return (
    <main className="flex-1 overflow-auto bg-gray-50">
      <div className="p-8">
        {renderHeader()}
        {renderContent()}
      </div>
    </main>
  )
}
