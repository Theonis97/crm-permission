"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Store,
  Package,
  TrendingUp,
  TrendingDown,
  Loader2,
  AlertTriangle,
  ShoppingCart,
  DollarSign,
  Box,
  CheckCircle,
  Clock,
  Trophy,
  XCircle,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

interface StoreDetailsSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  storeId: string | null
}

export function StoreDetailsSheet({
  open,
  onOpenChange,
  storeId,
}: StoreDetailsSheetProps) {
  const [loading, setLoading] = useState(false)
  const [store, setStore] = useState<any>(null)
  const [products, setProducts] = useState<any[]>([])
  const [stats, setStats] = useState<any>(null)
  const [orders, setOrders] = useState<any[]>([])
  const [topProducts, setTopProducts] = useState<any>({ byQuantity: [], byRevenue: [] })

  useEffect(() => {
    if (open && storeId) {
      loadStoreData()
    } else {
      resetData()
    }
  }, [open, storeId])

  const resetData = () => {
    setStore(null)
    setProducts([])
    setStats(null)
    setOrders([])
    setTopProducts({ byQuantity: [], byRevenue: [] })
  }

  const loadStoreData = async () => {
    if (!storeId) return

    try {
      setLoading(true)
      const response = await fetch(`/api/stores/${storeId}/dashboard`)

      if (!response.ok) {
        throw new Error("Erreur lors du chargement")
      }

      const data = await response.json()
      setStore(data.store)
      setProducts(data.products)
      setStats(data.stats)
      setOrders(data.orders)
      setTopProducts(data.topProducts)
    } catch (error) {
      console.error("Error loading store data:", error)
      toast.error("Erreur lors du chargement des données")
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const config: any = {
      PENDING: { label: "En attente", color: "bg-amber-100 text-amber-700 border-amber-200" },
      CONFIRMED: { label: "Confirmée", color: "bg-blue-100 text-blue-700 border-blue-200" },
      PREPARING: { label: "En préparation", color: "bg-purple-100 text-purple-700 border-purple-200" },
      READY: { label: "Prête", color: "bg-cyan-100 text-cyan-700 border-cyan-200" },
      DELIVERING: { label: "En livraison", color: "bg-indigo-100 text-indigo-700 border-indigo-200" },
      DELIVERED: { label: "Livrée", color: "bg-green-100 text-green-700 border-green-200" },
      CANCELLED: { label: "Annulée", color: "bg-red-100 text-red-700 border-red-200" },
    }
    const { label, color } = config[status] || { label: status, color: "bg-gray-100 text-gray-700" }
    return <Badge variant="outline" className={cn("text-xs", color)}>{label}</Badge>
  }

  const getPriorityBadge = (priority: string) => {
    const config: any = {
      LOW: { label: "Basse", color: "bg-gray-100 text-gray-600 border-gray-200" },
      MEDIUM: { label: "Moyenne", color: "bg-blue-100 text-blue-600 border-blue-200" },
      HIGH: { label: "Haute", color: "bg-orange-100 text-orange-600 border-orange-200" },
      URGENT: { label: "Urgente", color: "bg-red-100 text-red-600 border-red-200" },
    }
    const { label, color } = config[priority] || { label: priority, color: "bg-gray-100" }
    return <Badge variant="outline" className={cn("text-xs", color)}>{label}</Badge>
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-5xl p-0 flex flex-col gap-0 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <SheetTitle className="sr-only">Chargement du magasin</SheetTitle>
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        ) : !store ? (
          <div className="flex flex-col items-center justify-center py-20">
            <SheetTitle className="sr-only">Magasin introuvable</SheetTitle>
            <Store className="h-12 w-12 text-gray-400 mb-4" />
            <p className="text-gray-500">Magasin introuvable</p>
          </div>
        ) : (
          <>
            {/* Header fixe */}
            <div className="shrink-0 border-b bg-white">
              <SheetHeader className="p-6 pb-4">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 bg-blue-950 rounded-lg flex items-center justify-center shrink-0">
                    <Store className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <SheetTitle className="text-xl font-bold">{store.name}</SheetTitle>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant={store.isActive ? "default" : "secondary"} className="text-xs">
                        {store.isActive ? "Actif" : "Inactif"}
                      </Badge>
                      {store.address && (
                        <span className="text-xs text-gray-500">{store.address}</span>
                      )}
                    </div>
                  </div>
                </div>
              </SheetHeader>

              {/* Stats rapides */}
              {stats && (
                <div className="px-6 pb-4 grid grid-cols-4 gap-4">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-gray-600 text-xs mb-1">
                      <Package className="h-3.5 w-3.5" />
                      <span>Produits</span>
                    </div>
                    <div className="text-xl font-bold text-gray-900">{stats.totalProducts}</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-gray-600 text-xs mb-1">
                      <Box className="h-3.5 w-3.5" />
                      <span>Stock total</span>
                    </div>
                    <div className="text-xl font-bold text-gray-900">{stats.totalStock}</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-gray-600 text-xs mb-1">
                      <ShoppingCart className="h-3.5 w-3.5" />
                      <span>Commandes</span>
                    </div>
                    <div className="text-xl font-bold text-gray-900">{stats.ordersInProgress}</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-gray-600 text-xs mb-1">
                      <DollarSign className="h-3.5 w-3.5" />
                      <span>CA mois</span>
                    </div>
                    <div className="text-xl font-bold text-gray-900">
                      {(stats.monthlyRevenue / 1000).toFixed(0)}k
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Contenu avec onglets */}
            <div className="flex-1 overflow-y-auto">
              <Tabs defaultValue="overview" className="w-full">
                <TabsList className="w-full justify-start rounded-none border-b bg-white h-12 px-6">
                  <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
                  <TabsTrigger value="products">Stock ({products.length})</TabsTrigger>
                  <TabsTrigger value="orders">Commandes ({orders.length})</TabsTrigger>
                  <TabsTrigger value="restocking">
                    Réapprovisionnement
                    {stats && stats.lowStockProducts > 0 && (
                      <Badge variant="destructive" className="ml-2 h-5 px-1.5 text-xs">
                        {stats.lowStockProducts}
                      </Badge>
                    )}
                  </TabsTrigger>
                </TabsList>

                {/* Onglet Vue d'ensemble */}
                <TabsContent value="overview" className="p-6 space-y-6">
                  {/* Statistiques */}
                  <div className="grid gap-4 md:grid-cols-3">
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-gray-600">
                          Commandes livrées (mois)
                        </CardTitle>
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{stats?.deliveredThisMonth || 0}</div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-gray-600">
                          Alertes stock
                        </CardTitle>
                        <AlertTriangle className="h-4 w-4 text-amber-500" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-amber-600">
                          {stats?.lowStockProducts || 0}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          {stats?.outOfStockProducts || 0} rupture(s)
                        </p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-gray-600">
                          CA mensuel
                        </CardTitle>
                        <DollarSign className="h-4 w-4 text-green-500" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-green-600">
                          {stats?.monthlyRevenue.toLocaleString("fr-FR") || 0} XAF
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Top produits */}
                  <div className="grid gap-6 md:grid-cols-2">
                    {/* Top par ventes */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm font-semibold flex items-center gap-2">
                          <Trophy className="h-4 w-4 text-blue-600" />
                          Top 5 - Meilleures ventes
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {topProducts.byQuantity.length === 0 ? (
                          <div className="text-center py-8 text-sm text-gray-500">
                            Aucune vente ce mois-ci
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {topProducts.byQuantity.slice(0, 5).map((product: any, index: number) => (
                              <div key={product.id} className="flex items-center gap-3">
                                <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold">
                                  {index + 1}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium truncate">{product.name}</p>
                                  <p className="text-xs text-gray-500">{product.categoryName}</p>
                                </div>
                                <div className="text-right">
                                  <p className="text-sm font-bold text-blue-600">
                                    {product.totalQuantity} u.
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    {(product.totalRevenue / 1000).toFixed(0)}k XAF
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Top par CA */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm font-semibold flex items-center gap-2">
                          <Trophy className="h-4 w-4 text-green-600" />
                          Top 5 - Meilleur CA
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {topProducts.byRevenue.length === 0 ? (
                          <div className="text-center py-8 text-sm text-gray-500">
                            Aucune vente ce mois-ci
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {topProducts.byRevenue.slice(0, 5).map((product: any, index: number) => (
                              <div key={product.id} className="flex items-center gap-3">
                                <div className="w-6 h-6 rounded-full bg-green-100 text-green-700 flex items-center justify-center text-xs font-bold">
                                  {index + 1}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium truncate">{product.name}</p>
                                  <p className="text-xs text-gray-500">{product.categoryName}</p>
                                </div>
                                <div className="text-right">
                                  <p className="text-sm font-bold text-green-600">
                                    {(product.totalRevenue / 1000).toFixed(0)}k XAF
                                  </p>
                                  <p className="text-xs text-gray-500">{product.totalQuantity} u.</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                {/* Onglet Stock */}
                <TabsContent value="products" className="p-6">
                  <div className="border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gray-50">
                          <TableHead className="font-semibold">Produit</TableHead>
                          <TableHead className="font-semibold">Catégorie</TableHead>
                          <TableHead className="text-center font-semibold">Stock</TableHead>
                          <TableHead className="text-center font-semibold">Min/Max</TableHead>
                          <TableHead className="text-right font-semibold">Prix</TableHead>
                          <TableHead className="font-semibold">Statut</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {products.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                              Aucun produit dans ce magasin
                            </TableCell>
                          </TableRow>
                        ) : (
                          products.map((product) => (
                            <TableRow key={product.id}>
                              <TableCell>
                                <div>
                                  <p className="font-medium">{product.name}</p>
                                  {product.sku && (
                                    <Badge variant="outline" className="text-xs mt-1">
                                      {product.sku}
                                    </Badge>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="text-sm">{product.categoryName || "—"}</TableCell>
                              <TableCell className="text-center">
                                <span
                                  className={cn(
                                    "font-bold",
                                    product.stock === 0
                                      ? "text-red-600"
                                      : product.needsRestock
                                        ? "text-amber-600"
                                        : "text-gray-900"
                                  )}
                                >
                                  {product.stock}
                                </span>
                              </TableCell>
                              <TableCell className="text-center text-sm text-gray-600">
                                {product.minStock} / {product.maxStock || "—"}
                              </TableCell>
                              <TableCell className="text-right font-semibold">
                                {product.prixVente.toLocaleString("fr-FR")} XAF
                              </TableCell>
                              <TableCell>
                                {product.stock === 0 ? (
                                  <Badge variant="outline" className="text-xs bg-red-50 text-red-700 border-red-200">
                                    <XCircle className="h-3 w-3 mr-1" />
                                    Rupture
                                  </Badge>
                                ) : product.needsRestock ? (
                                  <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200">
                                    <AlertTriangle className="h-3 w-3 mr-1" />
                                    Faible
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                    OK
                                  </Badge>
                                )}
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </TabsContent>

                {/* Onglet Commandes */}
                <TabsContent value="orders" className="p-6">
                  <div className="border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gray-50">
                          <TableHead className="font-semibold">N° Commande</TableHead>
                          <TableHead className="font-semibold">Statut</TableHead>
                          <TableHead className="font-semibold">Priorité</TableHead>
                          <TableHead className="text-center font-semibold">Articles</TableHead>
                          <TableHead className="text-right font-semibold">Total</TableHead>
                          <TableHead className="font-semibold">Date</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {orders.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                              Aucune commande en cours
                            </TableCell>
                          </TableRow>
                        ) : (
                          orders.map((order) => (
                            <TableRow key={order.id}>
                              <TableCell className="font-mono font-medium">{order.number}</TableCell>
                              <TableCell>{getStatusBadge(order.status)}</TableCell>
                              <TableCell>{getPriorityBadge(order.priority)}</TableCell>
                              <TableCell className="text-center">{order.itemsCount}</TableCell>
                              <TableCell className="text-right font-semibold">
                                {order.total.toLocaleString("fr-FR")} XAF
                              </TableCell>
                              <TableCell className="text-sm text-gray-600">
                                {new Date(order.createdAt).toLocaleDateString("fr-FR")}
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </TabsContent>

                {/* Onglet Réapprovisionnement */}
                <TabsContent value="restocking" className="p-6">
                  <div className="border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gray-50">
                          <TableHead className="font-semibold">Produit</TableHead>
                          <TableHead className="text-center font-semibold">Stock actuel</TableHead>
                          <TableHead className="text-center font-semibold">Stock min</TableHead>
                          <TableHead className="text-center font-semibold">À commander</TableHead>
                          <TableHead className="font-semibold">Urgence</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {products.filter((p) => p.needsRestock).length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                              Aucun produit nécessitant un réapprovisionnement
                            </TableCell>
                          </TableRow>
                        ) : (
                          products
                            .filter((p) => p.needsRestock)
                            .map((product) => {
                              const toOrder = Math.max(product.minStock - product.stock, 0)
                              const urgency = product.stock === 0 ? "CRITICAL" : "WARNING"
                              
                              return (
                                <TableRow key={product.id}>
                                  <TableCell>
                                    <div>
                                      <p className="font-medium">{product.name}</p>
                                      {product.sku && (
                                        <Badge variant="outline" className="text-xs mt-1">
                                          {product.sku}
                                        </Badge>
                                      )}
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-center">
                                    <span
                                      className={cn(
                                        "font-bold",
                                        product.stock === 0 ? "text-red-600" : "text-amber-600"
                                      )}
                                    >
                                      {product.stock}
                                    </span>
                                  </TableCell>
                                  <TableCell className="text-center font-semibold">
                                    {product.minStock}
                                  </TableCell>
                                  <TableCell className="text-center">
                                    <span className="font-bold text-blue-600">{toOrder}</span>
                                  </TableCell>
                                  <TableCell>
                                    {urgency === "CRITICAL" ? (
                                      <Badge variant="outline" className="text-xs bg-red-50 text-red-700 border-red-200">
                                        <AlertTriangle className="h-3 w-3 mr-1" />
                                        Critique
                                      </Badge>
                                    ) : (
                                      <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200">
                                        <Clock className="h-3 w-3 mr-1" />
                                        Modérée
                                      </Badge>
                                    )}
                                  </TableCell>
                                </TableRow>
                              )
                            })
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
