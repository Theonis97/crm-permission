"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { StorePageHeader } from "@/components/stores/store-page-header"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  ShoppingCart,
  Search,
  Plus,
  Clock,
  CheckCircle2,
  XCircle,
  Package,
  CreditCard,
  Zap,
  TrendingUp,
  Users,
  Filter,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  Calculator,
  Scan,
  Receipt,
  Star,
  ArrowUpRight,
  ArrowDownRight,
  DollarSign,
  ShoppingBag,
  Wallet,
  PieChart,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface SalesPageProps {
  params: Promise<{
    id: string
  }>
}

// Données mockées pour les commandes
const mockOrders = [
  { 
    id: "CMD-001", 
    customer: "Jean Dupont", 
    items: 3, 
    total: 270000, 
    status: "pending", 
    date: "2025-10-10 14:30",
    avatar: "JD",
    priority: "high",
    paymentMethod: "card"
  },
  { 
    id: "CMD-002", 
    customer: "Marie Martin", 
    items: 2, 
    total: 471000, 
    status: "completed", 
    date: "2025-10-10 14:15",
    avatar: "MM",
    priority: "normal",
    paymentMethod: "cash"
  },
  { 
    id: "CMD-003", 
    customer: "Paul Bernard", 
    items: 5, 
    total: 192000, 
    status: "processing", 
    date: "2025-10-10 13:45",
    avatar: "PB",
    priority: "urgent",
    paymentMethod: "mobile"
  },
  { 
    id: "CMD-004", 
    customer: "Sophie Laurent", 
    items: 4, 
    total: 720000, 
    status: "completed", 
    date: "2025-10-10 12:30",
    avatar: "SL",
    priority: "normal",
    paymentMethod: "card"
  },
]

// Données mockées pour les produits POS
const mockProducts = [
  { id: 1, name: "iPhone 14 Pro", price: 450000, category: "Téléphones", stock: 12, image: "📱" },
  { id: 2, name: "MacBook Air M2", price: 720000, category: "Ordinateurs", stock: 8, image: "💻" },
  { id: 3, name: "AirPods Pro", price: 150000, category: "Audio", stock: 25, image: "🎧" },
  { id: 4, name: "iPad Pro 12.9", price: 540000, category: "Tablettes", stock: 15, image: "📱" },
  { id: 5, name: "Apple Watch S9", price: 240000, category: "Montres", stock: 20, image: "⌚" },
  { id: 6, name: "Samsung Galaxy S24", price: 420000, category: "Téléphones", stock: 18, image: "📱" },
]

const getStatusConfig = (status: string) => {
  switch (status) {
    case "completed":
      return { 
        badge: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20", 
        dot: "bg-emerald-500",
        label: "Complétée",
        icon: CheckCircle2
      }
    case "pending":
      return { 
        badge: "bg-amber-500/10 text-amber-600 border-amber-500/20", 
        dot: "bg-amber-500",
        label: "En attente",
        icon: Clock
      }
    case "processing":
      return { 
        badge: "bg-blue-500/10 text-blue-600 border-blue-500/20", 
        dot: "bg-blue-500",
        label: "En cours",
        icon: Package
      }
    case "cancelled":
      return { 
        badge: "bg-red-500/10 text-red-600 border-red-500/20", 
        dot: "bg-red-500",
        label: "Annulée",
        icon: XCircle
      }
    default:
      return { 
        badge: "bg-gray-500/10 text-gray-600 border-gray-500/20", 
        dot: "bg-gray-500",
        label: status,
        icon: Package
      }
  }
}

const getPriorityConfig = (priority: string) => {
  switch (priority) {
    case "urgent":
      return { color: "text-red-500", bg: "bg-red-500/10", label: "Urgent" }
    case "high":
      return { color: "text-orange-500", bg: "bg-orange-500/10", label: "Élevée" }
    case "normal":
      return { color: "text-blue-500", bg: "bg-blue-500/10", label: "Normale" }
    default:
      return { color: "text-gray-500", bg: "bg-gray-500/10", label: "Normale" }
  }
}

export default function SalesPage({ params }: SalesPageProps) {
  const [activeTab, setActiveTab] = useState("orders")
  const [selectedProducts, setSelectedProducts] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState("")

  const totalRevenue = mockOrders.reduce((sum, order) => sum + order.total, 0)
  const completedOrders = mockOrders.filter(o => o.status === "completed").length
  const pendingOrders = mockOrders.filter(o => o.status === "pending").length

  return (
    <>
      <StorePageHeader
        title="Ventes"
        description="Gérer les ventes et point de vente"
      />

      {/* Hero Section avec Gradient */}
      <div className="relative overflow-hidden bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900">
        <div className="absolute inset-0 bg-black/20" />
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-purple-600/20" />
        
        {/* Animated Background Elements */}
        <div className="absolute top-0 left-0 w-72 h-72 bg-purple-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse delay-1000" />
        
        <div className="relative px-8 py-12">
          {/* Stats Cards avec Glassmorphism */}
          <div className="grid gap-6 md:grid-cols-4 mb-8">
            <div className="group relative overflow-hidden rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 p-6 hover:bg-white/15 transition-all duration-300 hover:scale-105">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/20 to-teal-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="relative">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 rounded-xl bg-emerald-500/20 backdrop-blur-sm">
                    <DollarSign className="h-6 w-6 text-emerald-400" />
                  </div>
                  <div className="flex items-center text-emerald-400 text-sm font-medium">
                    <ArrowUpRight className="h-4 w-4 mr-1" />
                    +12.5%
                  </div>
                </div>
                <div className="text-3xl font-bold text-white mb-1">
                  {(totalRevenue / 1000000).toFixed(1)}M
                </div>
                <div className="text-white/70 text-sm">Chiffre d'affaires</div>
              </div>
            </div>

            <div className="group relative overflow-hidden rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 p-6 hover:bg-white/15 transition-all duration-300 hover:scale-105">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="relative">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 rounded-xl bg-blue-500/20 backdrop-blur-sm">
                    <ShoppingBag className="h-6 w-6 text-blue-400" />
                  </div>
                  <div className="flex items-center text-blue-400 text-sm font-medium">
                    <ArrowUpRight className="h-4 w-4 mr-1" />
                    +8.2%
                  </div>
                </div>
                <div className="text-3xl font-bold text-white mb-1">{mockOrders.length}</div>
                <div className="text-white/70 text-sm">Total commandes</div>
              </div>
            </div>

            <div className="group relative overflow-hidden rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 p-6 hover:bg-white/15 transition-all duration-300 hover:scale-105">
              <div className="absolute inset-0 bg-gradient-to-br from-amber-500/20 to-orange-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="relative">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 rounded-xl bg-amber-500/20 backdrop-blur-sm">
                    <Clock className="h-6 w-6 text-amber-400" />
                  </div>
                  <div className="flex items-center text-amber-400 text-sm font-medium">
                    <ArrowDownRight className="h-4 w-4 mr-1" />
                    -2.1%
                  </div>
                </div>
                <div className="text-3xl font-bold text-white mb-1">{pendingOrders}</div>
                <div className="text-white/70 text-sm">En attente</div>
              </div>
            </div>

            <div className="group relative overflow-hidden rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 p-6 hover:bg-white/15 transition-all duration-300 hover:scale-105">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 to-pink-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="relative">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 rounded-xl bg-purple-500/20 backdrop-blur-sm">
                    <CheckCircle2 className="h-6 w-6 text-purple-400" />
                  </div>
                  <div className="flex items-center text-purple-400 text-sm font-medium">
                    <ArrowUpRight className="h-4 w-4 mr-1" />
                    +15.3%
                  </div>
                </div>
                <div className="text-3xl font-bold text-white mb-1">{completedOrders}</div>
                <div className="text-white/70 text-sm">Complétées</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Section */}
      <div className="px-8 py-6 bg-gray-50/50">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="flex items-center justify-between mb-8">
            <TabsList className="grid w-fit grid-cols-2 bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-2xl p-1 shadow-lg">
              <TabsTrigger 
                value="orders" 
                className="rounded-xl px-8 py-3 text-sm font-medium transition-all data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-purple-600 data-[state=active]:text-white data-[state=active]:shadow-lg"
              >
                <Package className="h-4 w-4 mr-2" />
                Commandes
              </TabsTrigger>
              <TabsTrigger 
                value="pos" 
                className="rounded-xl px-8 py-3 text-sm font-medium transition-all data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-600 data-[state=active]:to-teal-600 data-[state=active]:text-white data-[state=active]:shadow-lg"
              >
                <Calculator className="h-4 w-4 mr-2" />
                Caisses (POS)
              </TabsTrigger>
            </TabsList>

            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input 
                  placeholder="Rechercher..." 
                  className="pl-10 w-80 bg-white/80 backdrop-blur-sm border-gray-200/50 rounded-xl"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl px-6 shadow-lg">
                <Plus className="h-4 w-4 mr-2" />
                Nouveau
              </Button>
            </div>
          </div>

          <TabsContent value="orders" className="space-y-6">
            {/* Orders Grid */}
            <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
              {mockOrders.map((order) => {
                const statusConfig = getStatusConfig(order.status)
                const priorityConfig = getPriorityConfig(order.priority)
                const StatusIcon = statusConfig.icon

                return (
                  <div key={order.id} className="group relative overflow-hidden rounded-2xl bg-white border border-gray-200/50 hover:border-gray-300/50 transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
                    {/* Priority Indicator */}
                    <div className={cn("absolute top-0 left-0 w-full h-1 bg-gradient-to-r", 
                      order.priority === "urgent" ? "from-red-500 to-pink-500" :
                      order.priority === "high" ? "from-orange-500 to-yellow-500" :
                      "from-blue-500 to-purple-500"
                    )} />
                    
                    <div className="p-6">
                      {/* Header */}
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-semibold text-sm">
                            {order.avatar}
                          </div>
                          <div>
                            <div className="font-semibold text-gray-900">{order.customer}</div>
                            <div className="text-sm text-gray-500">{order.id}</div>
                          </div>
                        </div>
                        <div className={cn("px-3 py-1 rounded-full text-xs font-medium border", statusConfig.badge)}>
                          <div className="flex items-center gap-1">
                            <div className={cn("w-2 h-2 rounded-full", statusConfig.dot)} />
                            {statusConfig.label}
                          </div>
                        </div>
                      </div>

                      {/* Content */}
                      <div className="space-y-3 mb-4">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Articles</span>
                          <span className="font-medium">{order.items} items</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Montant</span>
                          <span className="font-bold text-lg text-gray-900">
                            {(order.total / 1000).toFixed(0)}k FCFA
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Priorité</span>
                          <span className={cn("px-2 py-1 rounded-lg text-xs font-medium", priorityConfig.bg, priorityConfig.color)}>
                            {priorityConfig.label}
                          </span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 pt-4 border-t border-gray-100">
                        <Button size="sm" variant="ghost" className="flex-1 hover:bg-blue-50 hover:text-blue-600">
                          <Eye className="h-4 w-4 mr-2" />
                          Voir
                        </Button>
                        <Button size="sm" variant="ghost" className="hover:bg-emerald-50 hover:text-emerald-600">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" className="hover:bg-red-50 hover:text-red-600">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </TabsContent>

          <TabsContent value="pos" className="space-y-6">
            <div className="grid gap-8 lg:grid-cols-3">
              {/* Products Grid */}
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-white rounded-2xl border border-gray-200/50 p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold text-gray-900">Produits</h3>
                    <Button variant="outline" size="sm" className="rounded-xl">
                      <Scan className="h-4 w-4 mr-2" />
                      Scanner
                    </Button>
                  </div>
                  
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {mockProducts.map((product) => (
                      <div 
                        key={product.id}
                        className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200/50 p-4 hover:shadow-lg transition-all duration-300 cursor-pointer hover:-translate-y-1"
                        onClick={() => {
                          setSelectedProducts(prev => [...prev, product])
                        }}
                      >
                        <div className="text-center">
                          <div className="text-4xl mb-3">{product.image}</div>
                          <div className="font-semibold text-gray-900 text-sm mb-1">{product.name}</div>
                          <div className="text-xs text-gray-500 mb-2">{product.category}</div>
                          <div className="font-bold text-blue-600">
                            {(product.price / 1000).toFixed(0)}k FCFA
                          </div>
                          <div className="text-xs text-gray-500 mt-1">Stock: {product.stock}</div>
                        </div>
                        
                        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Cart */}
              <div className="space-y-6">
                <div className="bg-white rounded-2xl border border-gray-200/50 p-6 sticky top-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold text-gray-900">Panier</h3>
                    <Button variant="ghost" size="sm" onClick={() => setSelectedProducts([])}>
                      Vider
                    </Button>
                  </div>

                  {selectedProducts.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <ShoppingCart className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                      <p>Panier vide</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {selectedProducts.map((product, index) => (
                        <div key={index} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50">
                          <div className="text-2xl">{product.image}</div>
                          <div className="flex-1">
                            <div className="font-medium text-sm">{product.name}</div>
                            <div className="text-xs text-gray-500">{(product.price / 1000).toFixed(0)}k FCFA</div>
                          </div>
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            onClick={() => setSelectedProducts(prev => prev.filter((_, i) => i !== index))}
                            className="text-red-500 hover:text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}

                      <div className="border-t pt-4 mt-4">
                        <div className="flex items-center justify-between mb-4">
                          <span className="font-semibold">Total</span>
                          <span className="font-bold text-xl text-blue-600">
                            {(selectedProducts.reduce((sum, p) => sum + p.price, 0) / 1000).toFixed(0)}k FCFA
                          </span>
                        </div>
                        
                        <Button className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl py-3">
                          <Receipt className="h-4 w-4 mr-2" />
                          Finaliser la vente
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </>
  )
}
