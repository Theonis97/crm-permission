"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
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
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Loader2,
  PackageX,
  History,
  ClipboardList,
  Store,
  CheckCircle2,
  XCircle,
  RefreshCw,
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
import { toast } from "sonner"

interface Driver {
  id: string
  name: string
  email: string | null
  phone: string
  status: "AVAILABLE" | "BUSY" | "OFFLINE"
  avatar: string | null
  vehicle: string | null
  plateNumber: string | null
  rating: number | null
  totalDeliveries: number
  activeDeliveries: number
  stockValue: number
  isActive: boolean
  createdAt: string
  updatedAt: string
  store: {
    id: string
    name: string
  }
  deliveryZones: Array<{
    id: string
    name: string
    color: string
  }>
}

interface StockItem {
  id: string
  productId: string
  variantId: string | null
  quantity: number
  reserved: number
  product: {
    id: string
    name: string
    sku: string | null
    prixVente: number
    photos: string[]
  }
  variant: {
    id: string
    name: string | null
    sku: string
    prixVente: number | null
    attributes: any
    images: string[]
  } | null
}

interface StockMovement {
  id: string
  type: "SUPPLY" | "SALE" | "RETURN" | "ADJUSTMENT"
  quantity: number
  notes: string | null
  createdAt: string
  product: {
    id: string
    name: string
    sku: string | null
    photos: string[]
  }
  variant: {
    id: string
    name: string | null
    sku: string
    attributes: any
  } | null
  storeOrder: {
    id: string
    number: string
    customerName: string
    status: string
  } | null
  createdBy: {
    id: string
    name: string | null
    email: string
  } | null
}

interface StoreProduct {
  id: string
  productId: string
  name: string
  sku: string | null
  stock: number
  prixVente: number
}

interface RestockRequest {
  id: string
  status: "PENDING" | "APPROVED" | "REJECTED" | "COMPLETED"
  createdAt: string
  notes: string | null
  store: { id: string; name: string }
  items: Array<{
    id: string
    requestedQuantity: number
    approvedQuantity?: number
    product: { id: string; name: string; sku: string | null; photos: string[] }
    variant?: { id: string; name: string; sku: string | null } | null
  }>
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
  const [stats, setStats] = useState({ orders: 0, revenue: 0, avgOrder: 0, completionRate: 0 })
  
  // Stock management states
  const [stock, setStock] = useState<StockItem[]>([])
  const [stockSummary, setStockSummary] = useState({ totalItems: 0, totalValue: 0, totalProducts: 0 })
  const [movements, setMovements] = useState<StockMovement[]>([])
  const [loadingStock, setLoadingStock] = useState(false)
  const [loadingMovements, setLoadingMovements] = useState(false)
  
  // Dialogues
  const [showAddStockDialog, setShowAddStockDialog] = useState(false)
  const [showMovementDialog, setShowMovementDialog] = useState(false)
  
  // Add stock form
  const [storeProducts, setStoreProducts] = useState<StoreProduct[]>([])
  const [selectedProduct, setSelectedProduct] = useState("")
  const [addQuantity, setAddQuantity] = useState("")
  const [addNotes, setAddNotes] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Movement form
  const [movementType, setMovementType] = useState<"RETURN" | "ADJUSTMENT">("RETURN")
  const [movementProduct, setMovementProduct] = useState("")
  const [movementQuantity, setMovementQuantity] = useState("")
  const [movementNotes, setMovementNotes] = useState("")

  // Restocking requests
  const [restockRequests, setRestockRequests] = useState<RestockRequest[]>([])
  const [loadingRestock, setLoadingRestock] = useState(false)
  const [restockStatusFilter, setRestockStatusFilter] = useState("all")

  // Fetch driver data
  useEffect(() => {
    fetchDriverData()
  }, [driverId])
  
  // Fetch stock when tab changes
  useEffect(() => {
    if (activeTab === "stock") {
      fetchStock()
    } else if (activeTab === "history") {
      fetchMovements()
    } else if (activeTab === "restock") {
      fetchRestockRequests()
    }
  }, [activeTab, driverId])
  
  const fetchDriverData = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/delivery-persons/${driverId}`)
      
      if (!response.ok) {
        throw new Error("Livreur non trouvé")
      }
      
      const data = await response.json()
      setDriver(data)
    } catch (error) {
      console.error("Error fetching driver:", error)
      toast.error("Erreur lors du chargement des données")
      setDriver(null)
    } finally {
      setLoading(false)
    }
  }
  
  const fetchStock = async () => {
    try {
      setLoadingStock(true)
      const response = await fetch(`/api/delivery-persons/${driverId}/stock`)
      if (response.ok) {
        const data = await response.json()
        setStock(data.stock)
        setStockSummary(data.summary)
      } else {
        toast.error("Erreur lors du chargement du stock")
      }
    } catch (error) {
      console.error("Error fetching stock:", error)
      toast.error("Erreur lors du chargement du stock")
    } finally {
      setLoadingStock(false)
    }
  }
  
  const fetchMovements = async () => {
    try {
      setLoadingMovements(true)
      const response = await fetch(`/api/delivery-persons/${driverId}/stock/movements?limit=50`)
      if (response.ok) {
        const data = await response.json()
        setMovements(data.movements)
      } else {
        toast.error("Erreur lors du chargement des mouvements")
      }
    } catch (error) {
      console.error("Error fetching movements:", error)
      toast.error("Erreur lors du chargement des mouvements")
    } finally {
      setLoadingMovements(false)
    }
  }
  
  const fetchRestockRequests = async () => {
    try {
      setLoadingRestock(true)
      const res = await fetch(`/api/restocking-requests?deliveryPersonId=${driverId}`)
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        setRestockRequests(Array.isArray(data.data) ? data.data : [])
      } else {
        toast.error("Erreur lors du chargement des demandes de réapprovisionnement")
      }
    } catch {
      toast.error("Erreur réseau")
    } finally {
      setLoadingRestock(false)
    }
  }

  const fetchStoreProducts = async () => {
    try {
      const response = await fetch(`/api/stores/${storeId}/products`)
      if (response.ok) {
        const data = await response.json()
        setStoreProducts(data.products || [])
      }
    } catch (error) {
      console.error("Error fetching products:", error)
    }
  }
  
  const handleAddStock = async () => {
    if (!selectedProduct || !addQuantity || parseInt(addQuantity) <= 0) {
      toast.error("Veuillez sélectionner un produit et une quantité valide")
      return
    }
    
    try {
      setIsSubmitting(true)
      const response = await fetch(`/api/delivery-persons/${driverId}/stock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: selectedProduct,
          quantity: parseInt(addQuantity),
          notes: addNotes,
        }),
      })
      
      if (response.ok) {
        toast.success("Stock ajouté avec succès")
        setShowAddStockDialog(false)
        setSelectedProduct("")
        setAddQuantity("")
        setAddNotes("")
        fetchStock()
      } else {
        const error = await response.json()
        toast.error(error.error || "Erreur lors de l'ajout du stock")
      }
    } catch (error) {
      console.error("Error adding stock:", error)
      toast.error("Erreur lors de l'ajout du stock")
    } finally {
      setIsSubmitting(false)
    }
  }
  
  const handleMovement = async () => {
    if (!movementProduct || !movementQuantity) {
      toast.error("Veuillez remplir tous les champs")
      return
    }
    
    try {
      setIsSubmitting(true)
      const response = await fetch(`/api/delivery-persons/${driverId}/stock/movements`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: movementProduct,
          type: movementType,
          quantity: parseInt(movementQuantity),
          notes: movementNotes,
        }),
      })
      
      if (response.ok) {
        toast.success("Mouvement enregistré avec succès")
        setShowMovementDialog(false)
        setMovementProduct("")
        setMovementQuantity("")
        setMovementNotes("")
        fetchStock()
        fetchMovements()
      } else {
        const error = await response.json()
        toast.error(error.error || "Erreur lors de l'enregistrement du mouvement")
      }
    } catch (error) {
      console.error("Error creating movement:", error)
      toast.error("Erreur lors de l'enregistrement du mouvement")
    } finally {
      setIsSubmitting(false)
    }
  }
  
  useEffect(() => {
    if (showAddStockDialog) {
      fetchStoreProducts()
    }
  }, [showAddStockDialog])

  const getDriverInitials = (name: string) => {
    return name.substring(0, 2).toUpperCase()
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "AVAILABLE":
        return <Badge className="bg-green-100 text-green-700">Disponible</Badge>
      case "BUSY":
        return <Badge className="bg-amber-100 text-amber-700">Occupé</Badge>
      case "OFFLINE":
        return <Badge className="bg-gray-100 text-gray-700">Hors ligne</Badge>
      default:
        return <Badge>{status}</Badge>
    }
  }

  // Charger les statistiques selon le filtre de date
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch(`/api/delivery-persons/${driverId}/stats`)
        if (response.ok) {
          const data = await response.json()
          // Pour l'instant on utilise les stats "today", on pourrait ajouter des filtres plus tard
          setStats({
            orders: data.today.total,
            revenue: data.today.revenue,
            avgOrder: data.allTime.avgOrderValue,
            completionRate: data.today.total > 0 
              ? Math.round((data.today.delivered / data.today.total) * 100) 
              : 0
          })
        }
      } catch (error) {
        console.error("Error fetching stats:", error)
      }
    }
    
    if (driver) {
      fetchStats()
    }
  }, [driver, driverId, dateFilter])

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
                    <AvatarImage src={driver.avatar || undefined} />
                    <AvatarFallback className="text-2xl bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                      {getDriverInitials(driver.name)}
                    </AvatarFallback>
                  </Avatar>
                  <h1 className="text-2xl font-bold text-gray-900 mb-2">{driver.name}</h1>
                  {driver.vehicle && <p className="text-gray-600 mb-2">{driver.vehicle}</p>}
                  <div className="flex justify-center gap-2 mb-4">
                    {getStatusBadge(driver.status)}
                    {driver.plateNumber && <Badge variant="outline">{driver.plateNumber}</Badge>}
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
                      {driver.email && (
                        <div>
                          <label className="text-sm font-medium text-gray-500">Email</label>
                          <div className="text-sm text-gray-900">
                            <a href={`mailto:${driver.email}`} className="text-blue-600 hover:underline">
                              {driver.email}
                            </a>
                          </div>
                        </div>
                      )}
                      <div>
                        <label className="text-sm font-medium text-gray-500">Téléphone</label>
                        <div className="text-sm text-gray-900">
                          <a href={`tel:${driver.phone}`} className="text-blue-600 hover:underline">
                            {driver.phone}
                          </a>
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Zones de livraison</label>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {driver.deliveryZones.length > 0 ? (
                            driver.deliveryZones.map(zone => (
                              <span
                                key={zone.id}
                                className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs"
                                style={{ backgroundColor: `${zone.color}20`, color: zone.color }}
                              >
                                {zone.name}
                              </span>
                            ))
                          ) : (
                            <span className="text-sm text-gray-400">Aucune zone assignée</span>
                          )}
                        </div>
                      </div>
                      {driver.vehicle && (
                        <div>
                          <label className="text-sm font-medium text-gray-500">Véhicule</label>
                          <div className="text-sm text-gray-900">
                            {driver.vehicle} {driver.plateNumber && `- ${driver.plateNumber}`}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Contenu principal */}
          <div className="lg:col-span-3">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
              <TabsList className="grid w-full grid-cols-6">
                <TabsTrigger value="orders">
                  <ShoppingBag className="h-4 w-4 mr-1" />
                  Commandes
                </TabsTrigger>
                <TabsTrigger value="performance">
                  <TrendingUp className="h-4 w-4 mr-1" />
                  Performance
                </TabsTrigger>
                <TabsTrigger value="deliveries">
                  <Truck className="h-4 w-4 mr-1" />
                  Livraisons
                </TabsTrigger>
                <TabsTrigger value="stock">
                  <Package className="h-4 w-4 mr-1" />
                  Stock
                </TabsTrigger>
                <TabsTrigger value="history">
                  <Clock className="h-4 w-4 mr-1" />
                  Historique
                </TabsTrigger>
                <TabsTrigger value="restock">
                  <ClipboardList className="h-4 w-4 mr-1" />
                  Réappro.
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
                {/* Stock Summary Cards */}
                <div className="grid gap-4 md:grid-cols-3">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium text-gray-600">Total Articles</CardTitle>
                      <Package className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-gray-900">{stockSummary.totalItems}</div>
                      <p className="text-xs text-gray-500">en stock</p>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium text-gray-600">Valeur Totale</CardTitle>
                      <TrendingUp className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-green-600">
                        {(stockSummary.totalValue / 1000).toFixed(0)}k
                      </div>
                      <p className="text-xs text-gray-500">FCFA</p>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium text-gray-600">Produits Différents</CardTitle>
                      <ShoppingBag className="h-4 w-4 text-purple-500" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-gray-900">{stockSummary.totalProducts}</div>
                      <p className="text-xs text-gray-500">références</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Stock Actions */}
                <div className="flex gap-2">
                  <Button onClick={() => setShowAddStockDialog(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Approvisionner
                  </Button>
                  <Button variant="outline" onClick={() => setShowMovementDialog(true)}>
                    <ArrowUpRight className="h-4 w-4 mr-2" />
                    Retour / Ajustement
                  </Button>
                </div>

                {/* Stock List */}
                <Card>
                  <CardHeader>
                    <CardTitle>Stock actuel du livreur</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {loadingStock ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                      </div>
                    ) : stock.length === 0 ? (
                      <div className="text-center py-8">
                        <PackageX className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-500">Aucun stock disponible</p>
                        <Button
                          variant="outline"
                          className="mt-4"
                          onClick={() => setShowAddStockDialog(true)}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Ajouter du stock
                        </Button>
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Produit</TableHead>
                            <TableHead>SKU</TableHead>
                            <TableHead className="text-right">Quantité</TableHead>
                            <TableHead className="text-right">Réservé</TableHead>
                            <TableHead className="text-right">Disponible</TableHead>
                            <TableHead className="text-right">Prix unitaire</TableHead>
                            <TableHead className="text-right">Valeur totale</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {stock.map((item) => {
                            const price = item.variant?.prixVente || item.product.prixVente
                            const available = item.quantity - item.reserved
                            const totalValue = price * item.quantity
                            
                            return (
                              <TableRow key={item.id}>
                                <TableCell>
                                  <div>
                                    <div className="font-medium">{item.product.name}</div>
                                    {item.variant && (
                                      <div className="text-sm text-gray-500">{item.variant.name}</div>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell className="text-sm text-gray-600">
                                  {item.variant?.sku || item.product.sku || "-"}
                                </TableCell>
                                <TableCell className="text-right font-medium">{item.quantity}</TableCell>
                                <TableCell className="text-right text-amber-600">{item.reserved}</TableCell>
                                <TableCell className="text-right">
                                  <Badge variant={available > 0 ? "default" : "secondary"}>
                                    {available}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                  {price.toLocaleString()} FCFA
                                </TableCell>
                                <TableCell className="text-right font-semibold">
                                  {totalValue.toLocaleString()} FCFA
                                </TableCell>
                              </TableRow>
                            )
                          })}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="history" className="space-y-6">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>Historique des mouvements de stock</CardTitle>
                      <Button variant="outline" size="sm" onClick={fetchMovements}>
                        <History className="h-4 w-4 mr-2" />
                        Actualiser
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {loadingMovements ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                      </div>
                    ) : movements.length === 0 ? (
                      <div className="text-center py-8">
                        <History className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-500">Aucun mouvement enregistré</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {movements.map((movement) => {
                          const isPositive = movement.type === "SUPPLY" || movement.type === "RETURN"
                          const typeColors = {
                            SUPPLY: "bg-green-100 text-green-700",
                            SALE: "bg-blue-100 text-blue-700",
                            RETURN: "bg-amber-100 text-amber-700",
                            ADJUSTMENT: "bg-purple-100 text-purple-700",
                          }
                          const typeLabels = {
                            SUPPLY: "Approvisionnement",
                            SALE: "Vente",
                            RETURN: "Retour",
                            ADJUSTMENT: "Ajustement",
                          }
                          const typeIcons = {
                            SUPPLY: <ArrowDownRight className="h-4 w-4" />,
                            SALE: <ArrowUpRight className="h-4 w-4" />,
                            RETURN: <ArrowDownRight className="h-4 w-4" />,
                            ADJUSTMENT: <Activity className="h-4 w-4" />,
                          }
                          
                          return (
                            <div key={movement.id} className="flex items-start gap-4 p-4 border rounded-lg hover:bg-gray-50">
                              <div className="flex-1">
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-2">
                                    <Badge className={typeColors[movement.type]}>
                                      {typeIcons[movement.type]}
                                      <span className="ml-1">{typeLabels[movement.type]}</span>
                                    </Badge>
                                    <span className="text-sm text-gray-500">
                                      {format(new Date(movement.createdAt), "d MMM yyyy 'à' HH:mm", { locale: fr })}
                                    </span>
                                  </div>
                                  <span className={`font-semibold ${isPositive ? "text-green-600" : "text-red-600"}`}>
                                    {isPositive ? "+" : "-"}{Math.abs(movement.quantity)} unités
                                  </span>
                                </div>
                                
                                <div className="space-y-1">
                                  <div className="font-medium">{movement.product.name}</div>
                                  {movement.variant && (
                                    <div className="text-sm text-gray-500">{movement.variant.name}</div>
                                  )}
                                  {movement.notes && (
                                    <div className="text-sm text-gray-600 italic">{movement.notes}</div>
                                  )}
                                  {movement.storeOrder && (
                                    <div className="text-sm text-blue-600">
                                      Commande #{movement.storeOrder.number} - {movement.storeOrder.customerName}
                                    </div>
                                  )}
                                  {movement.createdBy && (
                                    <div className="text-xs text-gray-500">
                                      Par {movement.createdBy.name || movement.createdBy.email}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
              {/* ── Onglet Réapprovisionnement ───────────────────────────── */}
              <TabsContent value="restock" className="space-y-4">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <ClipboardList className="h-5 w-5 text-orange-500" />
                          Demandes de réapprovisionnement
                        </CardTitle>
                        <p className="text-sm text-gray-500 mt-1">
                          Toutes les demandes de {driver.name} auprès des différents magasins
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <select
                          value={restockStatusFilter}
                          onChange={(e) => setRestockStatusFilter(e.target.value)}
                          className="text-sm border rounded-lg px-3 py-1.5 bg-white"
                        >
                          <option value="all">Tous les statuts</option>
                          <option value="PENDING">En attente</option>
                          <option value="APPROVED">Approuvées</option>
                          <option value="REJECTED">Rejetées</option>
                          <option value="COMPLETED">Terminées</option>
                        </select>
                        <Button variant="outline" size="sm" onClick={fetchRestockRequests} disabled={loadingRestock}>
                          <RefreshCw className={`h-4 w-4 mr-1 ${loadingRestock ? "animate-spin" : ""}`} />
                          Actualiser
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {loadingRestock ? (
                      <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                      </div>
                    ) : restockRequests.length === 0 ? (
                      <div className="text-center py-12">
                        <ClipboardList className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-500">Aucune demande de réapprovisionnement</p>
                        <p className="text-sm text-gray-400 mt-1">
                          Les demandes envoyées par {driver.name} apparaîtront ici.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {/* Statistiques rapides */}
                        <div className="grid grid-cols-4 gap-3 mb-4">
                          {(["all", "PENDING", "APPROVED", "COMPLETED"] as const).map((s) => {
                            const count = s === "all"
                              ? restockRequests.length
                              : restockRequests.filter((r) => r.status === s).length
                            const cfg: Record<string, { label: string; color: string }> = {
                              all: { label: "Total", color: "text-gray-700" },
                              PENDING: { label: "En attente", color: "text-amber-600" },
                              APPROVED: { label: "Approuvées", color: "text-blue-600" },
                              COMPLETED: { label: "Terminées", color: "text-green-600" },
                            }
                            return (
                              <div key={s} className="bg-gray-50 rounded-xl p-3 text-center border">
                                <div className={`text-2xl font-bold ${cfg[s].color}`}>{count}</div>
                                <div className="text-xs text-gray-500">{cfg[s].label}</div>
                              </div>
                            )
                          })}
                        </div>

                        {/* Liste filtrée */}
                        {restockRequests
                          .filter((r) => restockStatusFilter === "all" || r.status === restockStatusFilter)
                          .map((req) => {
                            const statusCfg: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
                              PENDING: { label: "En attente", cls: "bg-amber-100 text-amber-700", icon: <Clock className="h-3 w-3" /> },
                              APPROVED: { label: "Approuvée", cls: "bg-blue-100 text-blue-700", icon: <CheckCircle2 className="h-3 w-3" /> },
                              REJECTED: { label: "Rejetée", cls: "bg-red-100 text-red-700", icon: <XCircle className="h-3 w-3" /> },
                              COMPLETED: { label: "Terminée", cls: "bg-green-100 text-green-700", icon: <CheckCircle2 className="h-3 w-3" /> },
                            }
                            const st = statusCfg[req.status] ?? statusCfg.PENDING
                            const totalQty = req.items.reduce((s, i) => s + i.requestedQuantity, 0)
                            return (
                              <div key={req.id} className="border rounded-xl p-4 hover:bg-gray-50 transition-colors">
                                {/* En-tête */}
                                <div className="flex items-center justify-between mb-3">
                                  <div className="flex items-center gap-2">
                                    <Store className="h-4 w-4 text-gray-400" />
                                    <span className="font-semibold text-gray-900">{req.store.name}</span>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <span className="text-xs text-gray-400">
                                      {new Date(req.createdAt).toLocaleString("fr-FR", {
                                        day: "2-digit", month: "2-digit", year: "numeric",
                                        hour: "2-digit", minute: "2-digit",
                                      })}
                                    </span>
                                    <Badge className={`flex items-center gap-1 text-xs ${st.cls}`}>
                                      {st.icon}
                                      {st.label}
                                    </Badge>
                                  </div>
                                </div>

                                {/* Produits en petits carreaux */}
                                <div className="flex flex-wrap gap-2 mb-2">
                                  {req.items.map((item) => {
                                    const photo = Array.isArray(item.product?.photos) && item.product.photos.length > 0
                                      ? item.product.photos[0] : null
                                    const label = item.variant
                                      ? `${item.product.name} · ${item.variant.name}`
                                      : item.product.name
                                    return (
                                      <div
                                        key={item.id}
                                        className="relative h-14 w-14 rounded-lg overflow-hidden border border-gray-200 bg-gray-100 shrink-0 shadow-sm"
                                        title={`${label} ×${item.requestedQuantity}`}
                                      >
                                        {photo ? (
                                          // eslint-disable-next-line @next/next/no-img-element
                                          <img src={photo} alt="" className="h-full w-full object-cover" />
                                        ) : (
                                          <div className="h-full w-full flex items-center justify-center">
                                            <Package className="h-5 w-5 text-gray-400" />
                                          </div>
                                        )}
                                        <span className="absolute bottom-0 right-0 bg-black/70 text-white text-[9px] font-bold px-1 py-0.5 rounded-tl">
                                          ×{item.requestedQuantity}
                                        </span>
                                      </div>
                                    )
                                  })}
                                </div>

                                {/* Résumé */}
                                <div className="flex items-center justify-between mt-2">
                                  <span className="text-xs text-gray-500">
                                    {req.items.length} produit{req.items.length > 1 ? "s" : ""} · {totalQty} unité{totalQty > 1 ? "s" : ""}
                                  </span>
                                  {req.notes && (
                                    <span className="text-xs text-gray-400 italic truncate max-w-xs">
                                      « {req.notes} »
                                    </span>
                                  )}
                                </div>
                              </div>
                            )
                          })}

                        {restockRequests.filter((r) => restockStatusFilter === "all" || r.status === restockStatusFilter).length === 0 && (
                          <div className="text-center py-8 text-gray-400 text-sm">
                            Aucune demande avec ce statut.
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>

      {/* Dialog: Ajouter du stock */}
      <Dialog open={showAddStockDialog} onOpenChange={setShowAddStockDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Approvisionner le livreur</DialogTitle>
            <DialogDescription>
              Transférer des produits du stock du magasin vers le livreur
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="product">Produit</Label>
              <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                <SelectTrigger id="product">
                  <SelectValue placeholder="Sélectionner un produit" />
                </SelectTrigger>
                <SelectContent>
                  {storeProducts.map((product) => (
                    <SelectItem key={product.productId} value={product.productId}>
                      {product.name} - Stock: {product.stock}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantité</Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                value={addQuantity}
                onChange={(e) => setAddQuantity(e.target.value)}
                placeholder="Ex: 10"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="notes">Notes (optionnel)</Label>
              <Textarea
                id="notes"
                value={addNotes}
                onChange={(e) => setAddNotes(e.target.value)}
                placeholder="Ajouter une note..."
                rows={3}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowAddStockDialog(false)}
              disabled={isSubmitting}
            >
              Annuler
            </Button>
            <Button onClick={handleAddStock} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Ajouter au stock
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Retour ou Ajustement */}
      <Dialog open={showMovementDialog} onOpenChange={setShowMovementDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Mouvement de stock</DialogTitle>
            <DialogDescription>
              Enregistrer un retour ou un ajustement de stock
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="movementType">Type de mouvement</Label>
              <Select value={movementType} onValueChange={(value: any) => setMovementType(value)}>
                <SelectTrigger id="movementType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="RETURN">Retour au magasin</SelectItem>
                  <SelectItem value="ADJUSTMENT">Ajustement de stock</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="movementProduct">Produit</Label>
              <Select value={movementProduct} onValueChange={setMovementProduct}>
                <SelectTrigger id="movementProduct">
                  <SelectValue placeholder="Sélectionner un produit" />
                </SelectTrigger>
                <SelectContent>
                  {stock.map((item) => (
                    <SelectItem key={item.id} value={item.productId}>
                      {item.product.name} - Stock: {item.quantity}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="movementQuantity">
                Quantité {movementType === "ADJUSTMENT" && "(+ ou -)"}
              </Label>
              <Input
                id="movementQuantity"
                type="number"
                value={movementQuantity}
                onChange={(e) => setMovementQuantity(e.target.value)}
                placeholder={movementType === "ADJUSTMENT" ? "Ex: +5 ou -3" : "Ex: 10"}
              />
              <p className="text-xs text-gray-500">
                {movementType === "RETURN" 
                  ? "Quantité à retourner au magasin" 
                  : "Quantité positive pour ajouter, négative pour retirer"}
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="movementNotes">Notes (optionnel)</Label>
              <Textarea
                id="movementNotes"
                value={movementNotes}
                onChange={(e) => setMovementNotes(e.target.value)}
                placeholder="Raison du mouvement..."
                rows={3}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowMovementDialog(false)}
              disabled={isSubmitting}
            >
              Annuler
            </Button>
            <Button onClick={handleMovement} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
