"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { StorePageHeader } from "@/components/stores/store-page-header"
import { Progress } from "@/components/ui/progress"
import {
  MoreHorizontal,
  ExternalLink,
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

interface StorePageProps {
  params: {
    id: string
  }
}

// Données mockées pour le magasin
const mockStoreData = {
  "1": {
    name: "Magasin Centre-Ville",
    address: "123 Rue Principale, Douala, Cameroun",
    phone: "+237 6XX XXX 001",
    email: "centre@magasin.cm",
    stats: {
      ordersToday: 24,
      ordersPending: 8,
      ordersCompleted: 16,
      revenue: 1245000,
      revenueChange: +12.5,
      products: 156,
      lowStock: 12,
      customers: 89,
      newCustomers: 5,
    },
    recentOrders: [
      { id: "CMD-001", customer: "Jean Dupont", total: 45000, status: "pending", time: "Il y a 5 min" },
      { id: "CMD-002", customer: "Marie Martin", total: 78500, status: "completed", time: "Il y a 15 min" },
      { id: "CMD-003", customer: "Paul Bernard", total: 32000, status: "completed", time: "Il y a 1h" },
      { id: "CMD-004", customer: "Sophie Laurent", total: 120000, status: "pending", time: "Il y a 2h" },
    ],
    topProducts: [
      { name: "Laptop Dell XPS 15", sales: 23, revenue: 920000 },
      { name: "iPhone 14 Pro", sales: 18, revenue: 810000 },
      { name: "Samsung Galaxy S23", sales: 15, revenue: 675000 },
      { name: "MacBook Air M2", sales: 12, revenue: 720000 },
    ],
  },
  "2": {
    name: "Magasin Akwa",
    address: "45 Avenue Akwa, Douala, Cameroun",
    phone: "+237 6XX XXX 002",
    email: "akwa@magasin.cm",
    stats: {
      ordersToday: 18,
      ordersPending: 5,
      ordersCompleted: 13,
      revenue: 890000,
      revenueChange: +8.3,
      products: 134,
      lowStock: 8,
      customers: 67,
      newCustomers: 3,
    },
    recentOrders: [
      { id: "CMD-005", customer: "Alice Durand", total: 55000, status: "completed", time: "Il y a 10 min" },
      { id: "CMD-006", customer: "Bob Martin", total: 92000, status: "pending", time: "Il y a 30 min" },
    ],
    topProducts: [
      { name: "iPad Pro 12.9", sales: 20, revenue: 800000 },
      { name: "AirPods Pro", sales: 35, revenue: 525000 },
    ],
  },
  "3": {
    name: "Magasin Bonanjo",
    address: "78 Rue Bonanjo, Douala, Cameroun",
    phone: "+237 6XX XXX 003",
    email: "bonanjo@magasin.cm",
    stats: {
      ordersToday: 31,
      ordersPending: 12,
      ordersCompleted: 19,
      revenue: 1580000,
      revenueChange: +15.7,
      products: 189,
      lowStock: 15,
      customers: 112,
      newCustomers: 8,
    },
    recentOrders: [
      { id: "CMD-007", customer: "Claire Petit", total: 67000, status: "pending", time: "Il y a 3 min" },
      { id: "CMD-008", customer: "David Roux", total: 145000, status: "completed", time: "Il y a 20 min" },
      { id: "CMD-009", customer: "Emma Blanc", total: 89000, status: "completed", time: "Il y a 45 min" },
    ],
    topProducts: [
      { name: "Sony PS5", sales: 15, revenue: 675000 },
      { name: "Nintendo Switch", sales: 25, revenue: 625000 },
      { name: "Xbox Series X", sales: 12, revenue: 540000 },
    ],
  },
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

// Données pour les graphiques (en FCFA)
const revenueData = [
  { name: 'Jan', thisMonth: 39000000, lastMonth: 34800000 },
  { name: 'Fév', thisMonth: 43200000, lastMonth: 37200000 },
  { name: 'Mar', thisMonth: 40800000, lastMonth: 39000000 },
  { name: 'Avr', thisMonth: 46800000, lastMonth: 42000000 },
  { name: 'Mai', thisMonth: 51000000, lastMonth: 45000000 },
  { name: 'Jun', thisMonth: 56476200, lastMonth: 49200000 },
]

const salesData = [
  { name: 'Lun', value: 120 },
  { name: 'Mar', value: 150 },
  { name: 'Mer', value: 180 },
  { name: 'Jeu', value: 140 },
  { name: 'Ven', value: 200 },
  { name: 'Sam', value: 250 },
  { name: 'Dim', value: 180 },
]

const orderValueData = Array.from({ length: 28 }, (_, i) => ({
  day: i + 1,
  value: Math.floor(Math.random() * 300000) + 480000 // 800-1300 USD = 480k-780k FCFA
}))

const sessionsData = Array.from({ length: 15 }, (_, i) => ({
  period: `P${i + 1}`,
  thisMonth: Math.floor(Math.random() * 800) + 400,
  lastMonth: Math.floor(Math.random() * 600) + 300
}))

export default function StorePage({ params }: StorePageProps) {
  const storeData = mockStoreData[params.id as keyof typeof mockStoreData] || mockStoreData["1"]
  const [selectedPeriod, setSelectedPeriod] = useState("Ce Mois")

  return (
    <>
      <StorePageHeader
        title="Vue d'ensemble"
        description={`Tableau de bord du ${storeData.name}`}
      />

      <div className="p-8 space-y-6 bg-gray-50 min-h-screen">
        {/* Header avec salutation et période */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Hey, Admin 👋</h2>
            <p className="text-gray-600">Lundi, 24 Février 2025</p>
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
              <div className="text-3xl font-bold text-gray-900">13 876 200 FCFA</div>
              <div className="flex items-center gap-1 text-sm mt-2">
                <span className="text-green-600 font-medium">↗ 12%</span>
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
              <div className="text-3xl font-bold text-gray-900">1,849</div>
              <div className="flex items-center gap-1 text-sm mt-2">
                <span className="text-green-600 font-medium">↗ 3%</span>
                <span className="text-gray-500">vs mois dernier</span>
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
              <div className="text-3xl font-bold text-gray-900">9 143 400 FCFA</div>
              <div className="flex items-center gap-1 text-sm mt-2">
                <span className="text-green-600 font-medium">↗ 8%</span>
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
              <div className="text-3xl font-bold text-gray-900">2,034</div>
              <div className="flex items-center gap-1 text-sm mt-2">
                <span className="text-red-600 font-medium">↘ 3%</span>
                <span className="text-gray-500">vs mois dernier</span>
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
                <div className="text-3xl font-bold text-gray-900">56 476 200 FCFA</div>
                <div className="flex items-center gap-1 text-sm mt-1">
                  <span className="text-green-600 font-medium">↗ 9%</span>
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
                  <AreaChart data={revenueData}>
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
                <Button variant="ghost" size="sm">Voir Plus</Button>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">MacBook Air M2 2022 13 Inch</span>
                  <span className="text-sm text-gray-500">3,172 Ventes</span>
                </div>
                <Progress value={85} className="h-2" />
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">MacBook Pro 14 Inch $1200 M1 Pro</span>
                  <span className="text-sm text-gray-500">2,345 Ventes</span>
                </div>
                <Progress value={65} className="h-2 bg-purple-100" />
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Apple Mac Mini Pro M2 2023</span>
                  <span className="text-sm text-gray-500">1,789 Ventes</span>
                </div>
                <Progress value={45} className="h-2 bg-blue-100" />
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">APPLE 32" RKGD Pro Display XDR</span>
                  <span className="text-sm text-gray-500">2,456 Ventes</span>
                </div>
                <Progress value={35} className="h-2 bg-green-100" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Section inférieure avec métriques détaillées */}
        <div className="grid gap-6 lg:grid-cols-3">
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
                  <BarChart data={orderValueData}>
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
                  <LineChart data={salesData}>
                    <XAxis 
                      dataKey="name" 
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
                      dataKey="value" 
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
                  <BarChart data={sessionsData}>
                    <XAxis 
                      dataKey="period" 
                      axisLine={false}
                      tickLine={false}
                      tick={false}
                    />
                    <YAxis hide />
                    <Tooltip 
                      formatter={(value: any, name: string) => [
                        value, 
                        name === 'thisMonth' ? 'Ce mois' : 'Mois dernier'
                      ]}
                      contentStyle={{ 
                        backgroundColor: 'white', 
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                      }}
                    />
                    <Bar 
                      dataKey="thisMonth" 
                      fill="#1f2937" 
                      radius={[2, 2, 0, 0]}
                    />
                    <Bar 
                      dataKey="lastMonth" 
                      fill="#d1d5db" 
                      radius={[2, 2, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  )
}
