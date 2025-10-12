"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import {
  ArrowLeft,
  Mail,
  Phone,
  Calendar,
  Edit,
  MoreHorizontal,
  Plus,
  Search,
  Filter,
  User,
  Activity,
  Truck,
  Package,
  MapPin,
  Star,
  ShoppingBag,
  Users,
  TrendingUp,
  Clock,
  CheckSquare,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { format } from "date-fns"
import { fr } from "date-fns/locale"

interface Driver {
  id: string
  name: string
  email: string
  phone: string
  status: string
  avatar?: string
  vehicle: string
  plateNumber: string
  zone: string
  activeDeliveries: number
  totalDeliveries: number
  rating: number
  stockValue: number
}

export default function StoreDriverDetailPage() {
  const params = useParams()
  const router = useRouter()
  const storeId = params.id as string
  const driverId = params.driverId as string

  const [driver, setDriver] = useState<Driver | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("orders")
  const [dateFilter, setDateFilter] = useState("today")

  useEffect(() => {
    setTimeout(() => {
      setDriver({
        id: driverId,
        name: "Jacques Mballa",
        email: "jacques.mballa@email.com",
        phone: "+241 0X XX XX 111",
        status: "available",
        avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Jacques",
        vehicle: "Moto Yamaha",
        plateNumber: "LBV-1234-AB",
        zone: "Libreville Centre",
        activeDeliveries: 3,
        totalDeliveries: 156,
        rating: 4.8,
        stockValue: 450000,
      })
      setLoading(false)
    }, 500)
  }, [driverId])

  const getDriverInitials = (name: string) => {
    return name.substring(0, 2).toUpperCase()
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "available":
        return <Badge className="bg-green-100 text-green-700">Disponible</Badge>
      case "busy":
        return <Badge className="bg-amber-100 text-amber-700">En livraison</Badge>
      case "offline":
        return <Badge className="bg-gray-100 text-gray-700">Hors ligne</Badge>
      default:
        return <Badge>{status}</Badge>
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!driver) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-semibold">Livreur non trouvé</h3>
        <Button onClick={() => router.push(`/dashboard/stores/${storeId}/drivers`)} className="mt-4">
          Retour aux livreurs
        </Button>
      </div>
    )
  }

  const getDateFilterStats = () => {
    // Mock data basé sur le filtre de date
    switch (dateFilter) {
      case "today":
        return { orders: 8, revenue: 120000, avgOrder: 15000, completionRate: 100 }
      case "month":
        return { orders: 156, revenue: 2340000, avgOrder: 15000, completionRate: 98 }
      case "lastMonth":
        return { orders: 142, revenue: 2130000, avgOrder: 15000, completionRate: 97 }
      default:
        return { orders: 8, revenue: 120000, avgOrder: 15000, completionRate: 100 }
    }
  }

  const stats = getDateFilterStats()

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="px-6 py-6">
        {/* Bouton retour et filtres */}
        <div className="mb-6 flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push(`/dashboard/stores/${storeId}/drivers`)}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour aux livreurs
          </Button>

          {/* Filtres de date */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-600 mr-2">Période :</span>
            <Button
              variant={dateFilter === "today" ? "default" : "outline"}
              size="sm"
              onClick={() => setDateFilter("today")}
              className={dateFilter === "today" ? "bg-blue-900" : ""}
            >
              Aujourd'hui
            </Button>
            <Button
              variant={dateFilter === "month" ? "default" : "outline"}
              size="sm"
              onClick={() => setDateFilter("month")}
              className={dateFilter === "month" ? "bg-blue-900" : ""}
            >
              Ce mois
            </Button>
            <Button
              variant={dateFilter === "lastMonth" ? "default" : "outline"}
              size="sm"
              onClick={() => setDateFilter("lastMonth")}
              className={dateFilter === "lastMonth" ? "bg-blue-900" : ""}
            >
              Mois dernier
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <Card className="sticky top-24">
              <CardContent className="p-6">
                <div className="text-center mb-6">
                  <Avatar className="h-24 w-24 mx-auto mb-4">
                    <AvatarImage src={driver.avatar} />
                    <AvatarFallback className="text-2xl bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                      {getDriverInitials(driver.name)}
                    </AvatarFallback>
                  </Avatar>
                  <h1 className="text-2xl font-bold text-gray-900 mb-2">{driver.name}</h1>
                  <p className="text-gray-600 mb-2">{driver.vehicle}</p>
                  <div className="flex justify-center gap-2 mb-4">
                    {getStatusBadge(driver.status)}
                    <Badge variant="outline">{driver.plateNumber}</Badge>
                  </div>
                </div>

                {/* Actions rapides */}
                <div className="grid grid-cols-2 gap-2 mb-6">
                  <Button variant="outline" size="sm">
                    <Phone className="h-4 w-4 mr-2" />
                    Appeler
                  </Button>
                  <Button variant="outline" size="sm">
                    <Mail className="h-4 w-4 mr-2" />
                    Email
                  </Button>
                  <Button variant="outline" size="sm">
                    <MapPin className="h-4 w-4 mr-2" />
                    Zone
                  </Button>
                  <Button variant="outline" size="sm">
                    <Package className="h-4 w-4 mr-2" />
                    Stock
                  </Button>
                </div>

                {/* Stats basées sur le filtre de date */}
                <div className="space-y-4 mb-6">
                  <div className="p-4 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">Commandes</span>
                      <ShoppingBag className="h-4 w-4 text-blue-600" />
                    </div>
                    <div className="text-2xl font-bold text-gray-900">{stats.orders}</div>
                    <div className="text-xs text-gray-600">
                      {dateFilter === "today" ? "aujourd'hui" : dateFilter === "month" ? "ce mois" : "mois dernier"}
                    </div>
                  </div>

                  <div className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">Chiffre d'affaires</span>
                      <TrendingUp className="h-4 w-4 text-green-600" />
                    </div>
                    <div className="text-2xl font-bold text-green-600">
                      {(stats.revenue / 1000).toFixed(0)}k
                    </div>
                    <div className="text-xs text-gray-600">FCFA générés</div>
                  </div>

                  <div className="p-4 bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">Panier moyen</span>
                      <Package className="h-4 w-4 text-purple-600" />
                    </div>
                    <div className="text-2xl font-bold text-gray-900">
                      {(stats.avgOrder / 1000).toFixed(0)}k
                    </div>
                    <div className="text-xs text-gray-600">FCFA par commande</div>
                  </div>

                  <div className="p-4 bg-gradient-to-br from-amber-50 to-orange-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">Taux de réussite</span>
                      <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                    </div>
                    <div className="text-2xl font-bold text-gray-900">{stats.completionRate}%</div>
                    <div className="text-xs text-gray-600">commandes livrées</div>
                  </div>
                </div>

                {/* Informations */}
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-3 border-b pb-2">Informations</h3>
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm font-medium text-gray-500">Email</label>
                        <div className="text-sm text-gray-900">
                          <a href={`mailto:${driver.email}`} className="text-blue-600 hover:underline">
                            {driver.email}
                          </a>
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Téléphone</label>
                        <div className="text-sm text-gray-900">
                          <a href={`tel:${driver.phone}`} className="text-blue-600 hover:underline">
                            {driver.phone}
                          </a>
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Zone de livraison</label>
                        <div className="text-sm text-gray-900">{driver.zone}</div>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Véhicule</label>
                        <div className="text-sm text-gray-900">
                          {driver.vehicle} - {driver.plateNumber}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Contenu principal */}
          <div className="lg:col-span-3">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="orders">
                  <ShoppingBag className="h-4 w-4 mr-2" />
                  Commandes
                </TabsTrigger>
                <TabsTrigger value="performance">
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Performance
                </TabsTrigger>
                <TabsTrigger value="deliveries">
                  <Truck className="h-4 w-4 mr-2" />
                  Livraisons
                </TabsTrigger>
                <TabsTrigger value="stock">
                  <Package className="h-4 w-4 mr-2" />
                  Stock
                </TabsTrigger>
                <TabsTrigger value="history">
                  <Clock className="h-4 w-4 mr-2" />
                  Historique
                </TabsTrigger>
              </TabsList>

              <TabsContent value="orders" className="space-y-6">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>Liste des commandes ({stats.orders})</CardTitle>
                      <div className="text-sm font-semibold text-green-600">
                        CA: {(stats.revenue / 1000).toFixed(0)}k FCFA
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {Array.from({ length: Math.min(stats.orders, 10) }).map((_, i) => (
                        <div key={i} className="flex items-start gap-4 p-4 border rounded-lg hover:bg-gray-50">
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="font-medium">Commande #{12340 + i}</h4>
                              <div className="flex items-center gap-3">
                                <Badge className="bg-green-100 text-green-700">Livrée</Badge>
                                <span className="font-semibold text-gray-900">
                                  {(15000 + (i * 1000)).toLocaleString()} FCFA
                                </span>
                              </div>
                            </div>
                            <div className="grid grid-cols-3 gap-4 text-sm text-gray-600">
                              <div className="flex items-center gap-2">
                                <User className="h-4 w-4" />
                                <span>Client #{100 + i}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <MapPin className="h-4 w-4" />
                                <span>Libreville Centre</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4" />
                                <span>{8 + i}:30</span>
                              </div>
                            </div>
                            <div className="mt-2 text-sm text-gray-600">
                              {2 + (i % 3)} articles livrés
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="performance" className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Indicateurs clés</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
                          <div>
                            <div className="text-sm text-gray-600 mb-1">Taux de réussite</div>
                            <div className="text-2xl font-bold text-green-600">{stats.completionRate}%</div>
                          </div>
                          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                            <CheckSquare className="h-6 w-6 text-green-600" />
                          </div>
                        </div>
                        <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                          <div>
                            <div className="text-sm text-gray-600 mb-1">Temps moyen</div>
                            <div className="text-2xl font-bold text-blue-600">25 min</div>
                          </div>
                          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                            <Clock className="h-6 w-6 text-blue-600" />
                          </div>
                        </div>
                        <div className="flex items-center justify-between p-4 bg-purple-50 rounded-lg">
                          <div>
                            <div className="text-sm text-gray-600 mb-1">Note client</div>
                            <div className="text-2xl font-bold text-purple-600">{driver.rating}/5</div>
                          </div>
                          <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                            <Star className="h-6 w-6 text-purple-600 fill-purple-600" />
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Évolution du CA</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="p-4 bg-gray-50 rounded-lg">
                          <div className="text-sm text-gray-600 mb-2">Chiffre d'affaires total</div>
                          <div className="text-3xl font-bold text-green-600 mb-1">
                            {(stats.revenue / 1000).toFixed(0)}k FCFA
                          </div>
                          <div className="text-sm text-gray-500">
                            {dateFilter === "today" ? "Aujourd'hui" : dateFilter === "month" ? "Ce mois" : "Mois dernier"}
                          </div>
                        </div>
                        <div className="p-4 bg-gray-50 rounded-lg">
                          <div className="text-sm text-gray-600 mb-2">Panier moyen</div>
                          <div className="text-2xl font-bold text-gray-900 mb-1">
                            {(stats.avgOrder / 1000).toFixed(0)}k FCFA
                          </div>
                          <div className="text-sm text-gray-500">
                            Par commande
                          </div>
                        </div>
                        <div className="p-4 bg-gray-50 rounded-lg">
                          <div className="text-sm text-gray-600 mb-2">Nombre de commandes</div>
                          <div className="text-2xl font-bold text-gray-900 mb-1">
                            {stats.orders}
                          </div>
                          <div className="text-sm text-gray-500">
                            Commandes livrées
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="deliveries" className="space-y-6">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>Livraisons en cours ({driver.activeDeliveries})</CardTitle>
                      <Button size="sm">
                        <Plus className="h-4 w-4 mr-2" />
                        Assigner livraison
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="flex items-start gap-4 p-4 border rounded-lg">
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="font-medium">Commande #{12340 + i}</h4>
                              <Badge className="bg-amber-100 text-amber-700">En livraison</Badge>
                            </div>
                            <div className="space-y-2 text-sm text-gray-600">
                              <div className="flex items-center gap-2">
                                <MapPin className="h-4 w-4" />
                                <span>Libreville Centre - Quartier Glass</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <User className="h-4 w-4" />
                                <span>Client: Marie Ngono</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Package className="h-4 w-4" />
                                <span>3 articles - 45,000 FCFA</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="stock" className="space-y-6">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>Stock actuel du livreur</CardTitle>
                      <Button size="sm">
                        <Plus className="h-4 w-4 mr-2" />
                        Ajouter produits
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {[
                        { name: "Coca-Cola 1.5L", quantity: 12, price: 1000 },
                        { name: "Pain de mie", quantity: 8, price: 750 },
                        { name: "Lait condensé", quantity: 15, price: 1500 },
                      ].map((product, i) => (
                        <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
                          <div>
                            <h4 className="font-medium">{product.name}</h4>
                            <p className="text-sm text-gray-600">Quantité: {product.quantity}</p>
                          </div>
                          <div className="text-right">
                            <div className="font-semibold">{product.price.toLocaleString()} FCFA</div>
                            <div className="text-sm text-gray-600">par unité</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="history" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Historique des prises de produits</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="flex items-start gap-4 p-4 border rounded-lg">
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="font-medium">
                                Prise du {format(new Date(2024, 11, 28 - i), "d MMM yyyy", { locale: fr })}
                              </h4>
                              <span className="font-semibold">150,000 FCFA</span>
                            </div>
                            <div className="text-sm text-gray-600">
                              25 produits récupérés - Retour en fin de journée: 12,000 FCFA
                            </div>
                            <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                              <Calendar className="h-3 w-3" />
                              <span>08:30 - 18:45</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  )
}
