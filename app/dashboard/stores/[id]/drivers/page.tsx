"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Truck,
  Search,
  Plus,
  Phone,
  Mail,
  MapPin,
  Grid3X3,
  List,
  Star,
  Loader2,
  Edit,
  Trash2,
  UserPlus,
  Users,
  TrendingUp,
  CheckCircle2,
  Eye,
  Package,
  Clock,
  DollarSign,
  Calendar,
  Activity,
} from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { toast } from "sonner"

interface DeliveryPerson {
  id: string
  storeId: string
  name: string
  phone: string
  email: string | null
  avatar: string | null
  vehicle: string | null
  plateNumber: string | null
  status: "AVAILABLE" | "BUSY" | "OFFLINE"
  rating: number | null
  totalDeliveries: number
  isActive: boolean
  createdAt: string
  updatedAt: string
  store?: {
    id: string
    name: string
  }
  deliveryZones?: Array<{
    id: string
    name: string
    color: string
  }>
  _count?: {
    orders: number
  }
  todayStats?: {
    delivered: number
    delivering: number
    pending: number
    revenue: number
  }
  stockSummary?: {
    totalItems: number
    totalValue: number
    totalProducts: number
  }
  orders?: Array<{
    id: string
    number: string
    status: string
    customerName: string
    total: number
  }>
}

interface DeliveryZone {
  id: string
  name: string
  color: string
}

interface DriverDetailedStats {
  today: {
    delivered: number
    delivering: number
    pending: number
    total: number
    revenue: number
    deliveryFees: number
    orders: Array<{
      id: string
      number: string
      status: string
      total: number
      deliveryFee: number
      createdAt: string
      deliveredAt: string | null
      customerName: string
      customerPhone: string
      deliveryAddress: string | null
    }>
  }
  allTime: {
    totalDelivered: number
    totalRevenue: number
    totalDeliveryFees: number
    avgOrderValue: number
    avgDeliveryFee: number
  }
  stock?: {
    items: Array<{
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
      }
      variant: {
        id: string
        name: string | null
        sku: string
        prixVente: number | null
      } | null
    }>
    summary: {
      totalItems: number
      totalValue: number
      totalProducts: number
    }
  }
}

export default function DriversPage() {
  const params = useParams()
  const storeId = params.id as string
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid")
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  
  // États pour les données
  const [drivers, setDrivers] = useState<DeliveryPerson[]>([])
  const [zones, setZones] = useState<DeliveryZone[]>([])
  const [isLoadingDrivers, setIsLoadingDrivers] = useState(true)
  const [isLoadingZones, setIsLoadingZones] = useState(true)
  
  // États pour les dialogues
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isZonesDialogOpen, setIsZonesDialogOpen] = useState(false)
  const [selectedDriver, setSelectedDriver] = useState<DeliveryPerson | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // États pour les formulaires
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    vehicle: "",
    plateNumber: "",
    status: "AVAILABLE" as "AVAILABLE" | "BUSY" | "OFFLINE",
  })
  const [selectedZoneIds, setSelectedZoneIds] = useState<string[]>([])
  
  // États pour le Sheet de détails
  const [isDetailsSheetOpen, setIsDetailsSheetOpen] = useState(false)
  const [driverStats, setDriverStats] = useState<DriverDetailedStats | null>(null)
  const [isLoadingStats, setIsLoadingStats] = useState(false)

  // Charger les livreurs
  useEffect(() => {
    loadDrivers()
  }, [storeId])

  // Charger les zones
  useEffect(() => {
    loadZones()
  }, [storeId])

  const loadDrivers = async () => {
    setIsLoadingDrivers(true)
    try {
      const response = await fetch(`/api/delivery-persons?storeId=${storeId}`)
      if (!response.ok) throw new Error("Erreur lors du chargement")
      const data = await response.json()
      setDrivers(data)
    } catch (error) {
      console.error("Error loading drivers:", error)
      toast.error("Erreur lors du chargement des livreurs")
    } finally {
      setIsLoadingDrivers(false)
    }
  }

  const loadZones = async () => {
    setIsLoadingZones(true)
    try {
      const response = await fetch(`/api/delivery-zones?storeId=${storeId}`)
      if (!response.ok) throw new Error("Erreur lors du chargement")
      const data = await response.json()
      setZones(data)
    } catch (error) {
      console.error("Error loading zones:", error)
      toast.error("Erreur lors du chargement des zones")
    } finally {
      setIsLoadingZones(false)
    }
  }

  const handleCreateDriver = async () => {
    if (!formData.name.trim() || !formData.phone.trim()) {
      toast.error("Le nom et le téléphone sont requis")
      return
    }

    setIsSubmitting(true)
    try {
      const response = await fetch("/api/delivery-persons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeId,
          ...formData,
          email: formData.email || null,
          vehicle: formData.vehicle || null,
          plateNumber: formData.plateNumber || null,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Erreur lors de la création")
      }

      const result = await response.json()
      
      // Message différent si un utilisateur a été créé
      if (result.userCreated) {
        toast.success(
          `Livreur créé avec succès!\n` +
          `📧 Compte créé pour: ${result.userEmail}\n` +
          `🔑 Mot de passe: ${result.defaultPassword}`,
          { duration: 8000 }
        )
      } else {
        toast.success("Livreur créé avec succès!")
      }
      
      setIsCreateDialogOpen(false)
      resetForm()
      await loadDrivers()
    } catch (error: any) {
      console.error("Error creating driver:", error)
      toast.error(error.message || "Erreur lors de la création")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleUpdateDriver = async () => {
    if (!selectedDriver || !formData.name.trim() || !formData.phone.trim()) {
      toast.error("Le nom et le téléphone sont requis")
      return
    }

    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/delivery-persons/${selectedDriver.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          email: formData.email || null,
          vehicle: formData.vehicle || null,
          plateNumber: formData.plateNumber || null,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Erreur lors de la modification")
      }

      toast.success("Livreur modifié avec succès!")
      setIsEditDialogOpen(false)
      resetForm()
      await loadDrivers()
    } catch (error: any) {
      console.error("Error updating driver:", error)
      toast.error(error.message || "Erreur lors de la modification")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteDriver = async (driver: DeliveryPerson) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer ${driver.name} ?`)) return

    try {
      const response = await fetch(`/api/delivery-persons/${driver.id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Erreur lors de la suppression")
      }

      toast.success("Livreur supprimé avec succès!")
      await loadDrivers()
    } catch (error: any) {
      console.error("Error deleting driver:", error)
      toast.error(error.message || "Erreur lors de la suppression")
    }
  }

  const handleAssignZones = async () => {
    if (!selectedDriver) return

    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/delivery-persons/${selectedDriver.id}/zones`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ zoneIds: selectedZoneIds }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Erreur lors de l'assignation")
      }

      toast.success("Zones assignées avec succès!")
      setIsZonesDialogOpen(false)
      await loadDrivers()
    } catch (error: any) {
      console.error("Error assigning zones:", error)
      toast.error(error.message || "Erreur lors de l'assignation")
    } finally {
      setIsSubmitting(false)
    }
  }

  const openEditDialog = (driver: DeliveryPerson) => {
    setSelectedDriver(driver)
    setFormData({
      name: driver.name,
      phone: driver.phone,
      email: driver.email || "",
      vehicle: driver.vehicle || "",
      plateNumber: driver.plateNumber || "",
      status: driver.status,
    })
    setIsEditDialogOpen(true)
  }

  const openZonesDialog = (driver: DeliveryPerson) => {
    setSelectedDriver(driver)
    setSelectedZoneIds(driver.deliveryZones?.map(z => z.id) || [])
    setIsZonesDialogOpen(true)
  }

  const openDetailsSheet = async (driver: DeliveryPerson) => {
    setSelectedDriver(driver)
    setIsDetailsSheetOpen(true)
    setIsLoadingStats(true)
    
    try {
      const response = await fetch(`/api/delivery-persons/${driver.id}/stats`)
      if (!response.ok) throw new Error("Erreur lors du chargement des statistiques")
      const stats = await response.json()
      setDriverStats(stats)
    } catch (error) {
      console.error("Error loading driver stats:", error)
      toast.error("Erreur lors du chargement des statistiques")
    } finally {
      setIsLoadingStats(false)
    }
  }

  const resetForm = () => {
    setFormData({
      name: "",
      phone: "",
      email: "",
      vehicle: "",
      plateNumber: "",
      status: "AVAILABLE",
    })
    setSelectedDriver(null)
  }

  const filteredDrivers = drivers.filter(driver => {
    const matchesSearch = driver.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (driver.email?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
                         driver.phone.includes(searchTerm)
    const matchesStatus = statusFilter === "all" || driver.status === statusFilter
    return matchesSearch && matchesStatus
  })

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
        return <Badge variant="outline">{status}</Badge>
    }
  }

  return (
    <>
      <div className="border-b bg-white px-6 py-2.5 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Livreurs</h1>
            <p className="text-gray-600">Gestion de l'équipe de livraison</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode("grid")}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  viewMode === "grid" ? "bg-white text-gray-900 shadow-sm" : "text-gray-600"
                }`}
              >
                <Grid3X3 className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode("table")}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  viewMode === "table" ? "bg-white text-gray-900 shadow-sm" : "text-gray-600"
                }`}
              >
                <List className="h-4 w-4" />
              </button>
            </div>

            <Button 
              className="bg-blue-900 hover:bg-blue-800"
              onClick={() => setIsCreateDialogOpen(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Ajouter un livreur
            </Button>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Statistiques */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total livreurs</p>
                  <p className="text-2xl font-bold text-gray-900">{drivers.length}</p>
                </div>
                <Users className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Disponibles</p>
                  <p className="text-2xl font-bold text-green-600">
                    {drivers.filter(d => d.status === "AVAILABLE").length}
                  </p>
                </div>
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">En livraison</p>
                  <p className="text-2xl font-bold text-amber-600">
                    {drivers.filter(d => d.status === "BUSY").length}
                  </p>
                </div>
                <Truck className="h-8 w-8 text-amber-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Avec zones</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {drivers.filter(d => d.deliveryZones && d.deliveryZones.length > 0).length}
                  </p>
                </div>
                <MapPin className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Liste des livreurs */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row gap-4 justify-between">
              <div className="flex flex-wrap gap-3 items-center">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <Input
                    placeholder="Rechercher par nom, email, téléphone..."
                    className="pl-10 w-80"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>

                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Statut" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous</SelectItem>
                    <SelectItem value="AVAILABLE">Disponibles</SelectItem>
                    <SelectItem value="BUSY">Occupés</SelectItem>
                    <SelectItem value="OFFLINE">Hors ligne</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {!isLoadingDrivers && (
                <Badge variant="outline" className="text-sm">
                  {filteredDrivers.length} livreur{filteredDrivers.length > 1 ? 's' : ''}
                </Badge>
              )}
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {isLoadingDrivers ? (
              <div className="flex items-center justify-center p-12">
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-900" />
                  <p className="text-gray-600">Chargement des livreurs...</p>
                </div>
              </div>
            ) : filteredDrivers.length === 0 ? (
              <div className="text-center p-12">
                <UserPlus className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600 font-medium">Aucun livreur trouvé</p>
                <p className="text-gray-500 text-sm mt-1">Ajoutez votre premier livreur pour commencer</p>
              </div>
            ) : viewMode === "grid" ? (
              <div className="p-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredDrivers.map((driver) => (
                  <Card key={driver.id} className="hover:shadow-lg transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-12 w-12">
                            <AvatarImage src={driver.avatar || undefined} />
                            <AvatarFallback className="bg-blue-100 text-blue-900">
                              {getDriverInitials(driver.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <h3 className="font-semibold text-gray-900">{driver.name}</h3>
                            <p className="text-xs text-gray-500">{driver.phone}</p>
                          </div>
                        </div>
                        {getStatusBadge(driver.status)}
                      </div>

                      <div className="space-y-2 mb-4">
                        {driver.email && (
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Mail className="h-3.5 w-3.5" />
                            <span className="truncate">{driver.email}</span>
                          </div>
                        )}
                        {driver.vehicle && (
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Truck className="h-3.5 w-3.5" />
                            <span>{driver.vehicle} {driver.plateNumber && `• ${driver.plateNumber}`}</span>
                          </div>
                        )}
                        {driver.deliveryZones && driver.deliveryZones.length > 0 && (
                          <div className="flex items-start gap-2 text-sm">
                            <MapPin className="h-3.5 w-3.5 text-purple-600 mt-0.5" />
                            <div className="flex flex-wrap gap-1">
                              {driver.deliveryZones.map(zone => (
                                <span
                                  key={zone.id}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs"
                                  style={{ backgroundColor: `${zone.color}20`, color: zone.color }}
                                >
                                  {zone.name}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Stock du livreur */}
                      {driver.stockSummary && driver.stockSummary.totalItems > 0 && (
                        <div className="mt-3 p-3 bg-gradient-to-r from-amber-50 to-orange-50 rounded-lg border border-amber-100">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <Package className="h-4 w-4 text-amber-600" />
                              <span className="text-xs font-semibold text-amber-900">Stock Personnel</span>
                            </div>
                            <Badge variant="outline" className="bg-white text-amber-700 border-amber-200 text-xs">
                              {driver.stockSummary.totalProducts} produits
                            </Badge>
                          </div>
                          <div className="flex items-center justify-between mt-2">
                            <div>
                              <p className="text-xs text-amber-700">Articles</p>
                              <p className="text-lg font-bold text-amber-900">{driver.stockSummary.totalItems}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-xs text-amber-700">Valeur</p>
                              <p className="text-lg font-bold text-amber-900">{(driver.stockSummary.totalValue / 1000).toFixed(0)}k</p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Statistiques du jour */}
                      {driver.todayStats && (
                        <div className="mt-3 p-3 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
                          
                          <div className="grid grid-cols-3 gap-2">
                            <div className="text-center">
                              <div className="flex items-center justify-center gap-1 mb-1">
                                <CheckCircle2 className="h-3 w-3 text-green-600" />
                                <span className="text-lg font-bold text-green-600">{driver.todayStats.delivered}</span>
                              </div>
                              <p className="text-[10px] text-gray-600">Livrées</p>
                            </div>
                            <div className="text-center">
                              <div className="flex items-center justify-center gap-1 mb-1">
                                <Clock className="h-3 w-3 text-amber-600" />
                                <span className="text-lg font-bold text-amber-600">{driver.todayStats.delivering}</span>
                              </div>
                              <p className="text-[10px] text-gray-600">En cours</p>
                            </div>
                            <div className="text-center">
                              <div className="flex items-center justify-center gap-1 mb-1">
                                <Package className="h-3 w-3 text-blue-600" />
                                <span className="text-lg font-bold text-blue-600">{driver.todayStats.pending}</span>
                              </div>
                              <p className="text-[10px] text-gray-600">En attente</p>
                            </div>
                          </div>
                          {driver.todayStats.revenue > 0 && (
                            <div className="mt-2 pt-2 border-t border-gray-200 text-center">
                              <p className="text-xs text-gray-600">CA: <span className="font-bold text-purple-600">{driver.todayStats.revenue.toLocaleString()} FCFA</span></p>
                            </div>
                          )}
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-3 border-t mt-3">
                        <div className="flex items-center gap-4 text-sm">
                          <div className="flex items-center gap-1">
                            <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                            <span className="font-semibold">{driver.rating || "N/A"}</span>
                          </div>
                          <span className="text-gray-600">{driver.totalDeliveries} total</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              openDetailsSheet(driver)
                            }}
                            title="Voir détails"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              openZonesDialog(driver)
                            }}
                            title="Assigner zones"
                          >
                            <MapPin className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              openEditDialog(driver)
                            }}
                            title="Modifier"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDeleteDriver(driver)
                            }}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            title="Supprimer"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead>Livreur</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Véhicule</TableHead>
                    <TableHead>Zones</TableHead>
                    <TableHead>Stock</TableHead>
                    <TableHead>Aujourd'hui</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDrivers.map((driver) => (
                    <TableRow key={driver.id} className="hover:bg-gray-50">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={driver.avatar || undefined} />
                            <AvatarFallback className="bg-blue-100 text-blue-900">
                              {getDriverInitials(driver.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">{driver.name}</div>
                            <div className="text-sm text-gray-500">{driver.phone}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(driver.status)}</TableCell>
                      <TableCell>
                        {driver.email ? (
                          <div className="text-sm text-gray-600">{driver.email}</div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {driver.vehicle ? (
                          <div className="text-sm">
                            <div>{driver.vehicle}</div>
                            {driver.plateNumber && (
                              <div className="text-gray-500">{driver.plateNumber}</div>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {driver.deliveryZones && driver.deliveryZones.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {driver.deliveryZones.map(zone => (
                              <span
                                key={zone.id}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs"
                                style={{ backgroundColor: `${zone.color}20`, color: zone.color }}
                              >
                                {zone.name}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <Badge variant="outline" className="text-gray-500">Non assigné</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {driver.stockSummary && driver.stockSummary.totalItems > 0 ? (
                          <div className="flex items-center gap-3 text-xs">
                            <div className="flex items-center gap-1">
                              <Package className="h-3 w-3 text-amber-600" />
                              <span className="font-semibold text-amber-700">{driver.stockSummary.totalItems}</span>
                            </div>
                            <div className="flex items-center gap-1 text-green-600">
                              <span className="font-semibold">{(driver.stockSummary.totalValue / 1000).toFixed(0)}k</span>
                            </div>
                          </div>
                        ) : (
                          <span className="text-gray-400 text-xs">Vide</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {driver.todayStats ? (
                          <div className="flex items-center gap-3 text-xs">
                            <div className="flex items-center gap-1">
                              <CheckCircle2 className="h-3 w-3 text-green-600" />
                              <span className="font-semibold text-green-600">{driver.todayStats.delivered}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3 text-amber-600" />
                              <span className="font-semibold text-amber-600">{driver.todayStats.delivering}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Package className="h-3 w-3 text-blue-600" />
                              <span className="font-semibold text-blue-600">{driver.todayStats.pending}</span>
                            </div>
                            {driver.todayStats.revenue > 0 && (
                              <div className="flex items-center gap-1 ml-2 pl-2 border-l">
                                <DollarSign className="h-3 w-3 text-purple-600" />
                                <span className="font-semibold text-purple-600">{(driver.todayStats.revenue / 1000).toFixed(0)}k</span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400 text-xs">Aucune</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3 text-sm">
                          <div className="flex items-center gap-1">
                            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                            <span>{driver.rating || "N/A"}</span>
                          </div>
                          <span className="text-gray-600">{driver.totalDeliveries}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openDetailsSheet(driver)}
                            title="Voir détails"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openZonesDialog(driver)}
                            title="Assigner zones"
                          >
                            <MapPin className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditDialog(driver)}
                            title="Modifier"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteDriver(driver)}
                            className="text-red-600 hover:text-red-700"
                            title="Supprimer"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Dialogue Créer un livreur */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Ajouter un nouveau livreur</DialogTitle>
            <DialogDescription>
              Remplissez les informations du livreur. Les champs marqués * sont obligatoires.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Nom complet *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Jean Dupont"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="phone">Téléphone *</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="Ex: +241 06 XX XX XX XX"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="email" className="flex items-center gap-2">
                Email
                <Badge variant="outline" className="text-xs font-normal">
                  Optionnel
                </Badge>
              </Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="Ex: jean.dupont@email.com"
              />
              <p className="text-xs text-gray-500">
                💡 Si un email est fourni, un compte utilisateur sera créé automatiquement avec le mot de passe : <code className="font-mono bg-gray-100 px-1 py-0.5 rounded">innotech</code>
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="vehicle">Véhicule</Label>
                <Input
                  id="vehicle"
                  value={formData.vehicle}
                  onChange={(e) => setFormData({ ...formData, vehicle: e.target.value })}
                  placeholder="Ex: Moto Yamaha"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="plateNumber">Plaque</Label>
                <Input
                  id="plateNumber"
                  value={formData.plateNumber}
                  onChange={(e) => setFormData({ ...formData, plateNumber: e.target.value })}
                  placeholder="Ex: LBV-1234-AB"
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="status">Statut</Label>
              <Select 
                value={formData.status} 
                onValueChange={(value: any) => setFormData({ ...formData, status: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="AVAILABLE">Disponible</SelectItem>
                  <SelectItem value="BUSY">Occupé</SelectItem>
                  <SelectItem value="OFFLINE">Hors ligne</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsCreateDialogOpen(false)
                resetForm()
              }}
              disabled={isSubmitting}
            >
              Annuler
            </Button>
            <Button
              onClick={handleCreateDriver}
              disabled={isSubmitting || !formData.name || !formData.phone}
              className="bg-blue-900 hover:bg-blue-800"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Création...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Créer le livreur
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialogue Modifier un livreur */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Modifier le livreur</DialogTitle>
            <DialogDescription>
              Modifiez les informations de {selectedDriver?.name}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-name">Nom complet *</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="edit-phone">Téléphone *</Label>
              <Input
                id="edit-phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-vehicle">Véhicule</Label>
                <Input
                  id="edit-vehicle"
                  value={formData.vehicle}
                  onChange={(e) => setFormData({ ...formData, vehicle: e.target.value })}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="edit-plateNumber">Plaque</Label>
                <Input
                  id="edit-plateNumber"
                  value={formData.plateNumber}
                  onChange={(e) => setFormData({ ...formData, plateNumber: e.target.value })}
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="edit-status">Statut</Label>
              <Select 
                value={formData.status} 
                onValueChange={(value: any) => setFormData({ ...formData, status: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="AVAILABLE">Disponible</SelectItem>
                  <SelectItem value="BUSY">Occupé</SelectItem>
                  <SelectItem value="OFFLINE">Hors ligne</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsEditDialogOpen(false)
                resetForm()
              }}
              disabled={isSubmitting}
            >
              Annuler
            </Button>
            <Button
              onClick={handleUpdateDriver}
              disabled={isSubmitting || !formData.name || !formData.phone}
              className="bg-blue-900 hover:bg-blue-800"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Modification...
                </>
              ) : (
                "Enregistrer les modifications"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialogue Assigner des zones */}
      <Dialog open={isZonesDialogOpen} onOpenChange={setIsZonesDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Assigner des zones de livraison</DialogTitle>
            <DialogDescription>
              Sélectionnez les zones de livraison pour {selectedDriver?.name}
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            {isLoadingZones ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="h-6 w-6 animate-spin text-blue-900" />
              </div>
            ) : zones.length === 0 ? (
              <div className="text-center p-8 text-gray-500">
                <MapPin className="h-10 w-10 mx-auto mb-2 text-gray-400" />
                <p>Aucune zone disponible</p>
                <p className="text-sm mt-1">Créez d'abord des zones de livraison</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {zones.map((zone) => (
                  <div
                    key={zone.id}
                    className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-gray-50 cursor-pointer"
                    onClick={() => {
                      setSelectedZoneIds(prev =>
                        prev.includes(zone.id)
                          ? prev.filter(id => id !== zone.id)
                          : [...prev, zone.id]
                      )
                    }}
                  >
                    <Checkbox
                      checked={selectedZoneIds.includes(zone.id)}
                      onCheckedChange={(checked) => {
                        setSelectedZoneIds(prev =>
                          checked
                            ? [...prev, zone.id]
                            : prev.filter(id => id !== zone.id)
                        )
                      }}
                    />
                    <div 
                      className="w-4 h-4 rounded-full flex-shrink-0"
                      style={{ backgroundColor: zone.color }}
                    />
                    <div className="flex-1">
                      <div className="font-medium">{zone.name}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsZonesDialogOpen(false)}
              disabled={isSubmitting}
            >
              Annuler
            </Button>
            <Button
              onClick={handleAssignZones}
              disabled={isSubmitting || zones.length === 0}
              className="bg-blue-900 hover:bg-blue-800"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Assignation...
                </>
              ) : (
                <>
                  <MapPin className="h-4 w-4 mr-2" />
                  Assigner {selectedZoneIds.length} zone{selectedZoneIds.length > 1 ? 's' : ''}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sheet Détails du livreur */}
      <Sheet open={isDetailsSheetOpen} onOpenChange={setIsDetailsSheetOpen}>
        <SheetContent className="w-full sm:max-w-2xl">
          <SheetHeader className="space-y-3 pb-4">
            {selectedDriver && (
              <div className="flex items-center gap-3">
                <Avatar className="h-14 w-14">
                  <AvatarImage src={selectedDriver.avatar || undefined} />
                  <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-lg">
                    {getDriverInitials(selectedDriver.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <SheetTitle className="text-xl mb-0.5">{selectedDriver.name}</SheetTitle>
                  <SheetDescription className="text-sm">{selectedDriver.phone}</SheetDescription>
                </div>
              </div>
            )}
          </SheetHeader>

          {isLoadingStats ? (
            <div className="flex items-center justify-center h-96">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
          ) : driverStats ? (
            <Tabs defaultValue="today" className="mt-6">
              <TabsList className="grid w-full grid-cols-4 mb-6">
                <TabsTrigger value="today" className="gap-2">
                  <Calendar className="h-4 w-4" />
                  Aujourd'hui
                </TabsTrigger>
                <TabsTrigger value="stock" className="gap-2">
                  <Package className="h-4 w-4" />
                  Stock
                </TabsTrigger>
                <TabsTrigger value="performance" className="gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Performance
                </TabsTrigger>
                <TabsTrigger value="orders" className="gap-2">
                  <Truck className="h-4 w-4" />
                  Commandes
                </TabsTrigger>
              </TabsList>

              {/* Onglet Aujourd'hui */}
              <TabsContent value="today" className="space-y-6">
                <ScrollArea className="h-[calc(100vh-280px)]">
                  <div className="space-y-6 pr-4">
                    {/* Stats rapides */}
                    <div className="grid grid-cols-4 gap-3">
                      <div className="text-center p-4 bg-green-50 rounded-xl border border-green-100">
                        <CheckCircle2 className="h-6 w-6 text-green-600 mx-auto mb-2" />
                        <p className="text-2xl font-bold text-green-700">{driverStats.today.delivered}</p>
                        <p className="text-xs text-green-600 mt-1">Livrées</p>
                      </div>
                      <div className="text-center p-4 bg-amber-50 rounded-xl border border-amber-100">
                        <Clock className="h-6 w-6 text-amber-600 mx-auto mb-2" />
                        <p className="text-2xl font-bold text-amber-700">{driverStats.today.delivering}</p>
                        <p className="text-xs text-amber-600 mt-1">En cours</p>
                      </div>
                      <div className="text-center p-4 bg-blue-50 rounded-xl border border-blue-100">
                        <Package className="h-6 w-6 text-blue-600 mx-auto mb-2" />
                        <p className="text-2xl font-bold text-blue-700">{driverStats.today.pending}</p>
                        <p className="text-xs text-blue-600 mt-1">En attente</p>
                      </div>
                      <div className="text-center p-4 bg-purple-50 rounded-xl border border-purple-100">
                        <Activity className="h-6 w-6 text-purple-600 mx-auto mb-2" />
                        <p className="text-2xl font-bold text-purple-700">{driverStats.today.total}</p>
                        <p className="text-xs text-purple-600 mt-1">Total</p>
                      </div>
                    </div>

                    {/* Chiffre d'affaires */}
                    <div className="bg-gradient-to-br from-blue-500 to-purple-600 text-white rounded-2xl p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <p className="text-blue-100 text-sm mb-1">Chiffre d'affaires</p>
                          <p className="text-4xl font-bold">{driverStats.today.revenue.toLocaleString()}</p>
                          <p className="text-sm text-blue-100">FCFA</p>
                        </div>
                        <DollarSign className="h-12 w-12 text-white/20" />
                      </div>
                      <Separator className="bg-white/20 my-4" />
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-blue-100">Frais de livraison</span>
                        <span className="font-semibold">{driverStats.today.deliveryFees.toLocaleString()} FCFA</span>
                      </div>
                    </div>
                  </div>
                </ScrollArea>
              </TabsContent>

              {/* Onglet Stock */}
              <TabsContent value="stock" className="space-y-6">
                <ScrollArea className="h-[calc(100vh-280px)]">
                  {driverStats.stock ? (
                    <div className="space-y-6 pr-4">
                      {/* Résumé du stock */}
                      <div className="grid grid-cols-3 gap-3">
                        <div className="text-center p-4 bg-amber-50 rounded-xl border border-amber-100">
                          <Package className="h-6 w-6 text-amber-600 mx-auto mb-2" />
                          <p className="text-2xl font-bold text-amber-700">{driverStats.stock.summary.totalItems}</p>
                          <p className="text-xs text-amber-600 mt-1">Articles</p>
                        </div>
                        <div className="text-center p-4 bg-green-50 rounded-xl border border-green-100">
                          <DollarSign className="h-6 w-6 text-green-600 mx-auto mb-2" />
                          <p className="text-2xl font-bold text-green-700">{(driverStats.stock.summary.totalValue / 1000).toFixed(0)}k</p>
                          <p className="text-xs text-green-600 mt-1">Valeur (FCFA)</p>
                        </div>
                        <div className="text-center p-4 bg-blue-50 rounded-xl border border-blue-100">
                          <Activity className="h-6 w-6 text-blue-600 mx-auto mb-2" />
                          <p className="text-2xl font-bold text-blue-700">{driverStats.stock.summary.totalProducts}</p>
                          <p className="text-xs text-blue-600 mt-1">Produits</p>
                        </div>
                      </div>

                      {/* Liste des produits en stock */}
                      {driverStats.stock.items.length === 0 ? (
                        <div className="text-center py-12 text-gray-400">
                          <Package className="h-16 w-16 mx-auto mb-4 opacity-20" />
                          <p className="text-sm">Aucun produit en stock</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <h3 className="font-semibold text-gray-900 text-sm">Produits en stock ({driverStats.stock.items.length})</h3>
                          {driverStats.stock.items.map((item) => {
                            const price = item.variant?.prixVente || item.product.prixVente
                            const available = item.quantity - item.reserved
                            const totalValue = price * item.quantity
                            
                            return (
                              <div key={item.id} className="p-4 bg-gray-50 rounded-xl border hover:border-gray-300 transition-colors">
                                <div className="flex items-start justify-between mb-2">
                                  <div className="flex-1">
                                    <p className="font-semibold text-gray-900">{item.product.name}</p>
                                    {item.variant && (
                                      <p className="text-xs text-gray-500 mt-0.5">{item.variant.name}</p>
                                    )}
                                    {(item.variant?.sku || item.product.sku) && (
                                      <p className="text-xs text-gray-400 mt-0.5">SKU: {item.variant?.sku || item.product.sku}</p>
                                    )}
                                  </div>
                                  <div className="text-right ml-4">
                                    <p className="text-sm font-bold text-gray-900">{totalValue.toLocaleString()} F</p>
                                    <p className="text-xs text-gray-500">{price.toLocaleString()} F/u</p>
                                  </div>
                                </div>
                                
                                <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                                  <div className="flex items-center gap-4 text-sm">
                                    <div className="flex items-center gap-1">
                                      <span className="text-gray-600">Total:</span>
                                      <span className="font-semibold text-gray-900">{item.quantity}</span>
                                    </div>
                                    {item.reserved > 0 && (
                                      <div className="flex items-center gap-1">
                                        <span className="text-amber-600">Réservé:</span>
                                        <span className="font-semibold text-amber-700">{item.reserved}</span>
                                      </div>
                                    )}
                                    <div className="flex items-center gap-1">
                                      <span className="text-green-600">Disponible:</span>
                                      <span className="font-semibold text-green-700">{available}</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}

                      {/* Bouton pour voir plus de détails */}
                      <div className="pt-4 border-t">
                        <Button
                          variant="outline"
                          className="w-full"
                          onClick={() => {
                            window.location.href = `/dashboard/stores/${storeId}/drivers/${selectedDriver?.id}`
                          }}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          Voir le détail complet
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-12 text-gray-400">
                      <Package className="h-16 w-16 mx-auto mb-4 opacity-20" />
                      <p className="text-sm">Aucune information de stock</p>
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>

              {/* Onglet Performance */}
              <TabsContent value="performance" className="space-y-6">
                <ScrollArea className="h-[calc(100vh-280px)]">
                  <div className="space-y-4 pr-4">
                    {/* Métriques principales */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 bg-gray-200 rounded-lg flex items-center justify-center">
                            <Package className="h-5 w-5 text-gray-700" />
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Total livraisons</p>
                            <p className="text-2xl font-bold text-gray-900">{driverStats.allTime.totalDelivered}</p>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between p-4 bg-green-50 rounded-xl border border-green-100">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 bg-green-200 rounded-lg flex items-center justify-center">
                            <DollarSign className="h-5 w-5 text-green-700" />
                          </div>
                          <div>
                            <p className="text-sm text-green-600">CA total généré</p>
                            <p className="text-2xl font-bold text-green-700">{driverStats.allTime.totalRevenue.toLocaleString()}</p>
                            <p className="text-xs text-green-600">FCFA</p>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between p-4 bg-blue-50 rounded-xl border border-blue-100">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 bg-blue-200 rounded-lg flex items-center justify-center">
                            <Truck className="h-5 w-5 text-blue-700" />
                          </div>
                          <div>
                            <p className="text-sm text-blue-600">Frais de livraison</p>
                            <p className="text-2xl font-bold text-blue-700">{driverStats.allTime.totalDeliveryFees.toLocaleString()}</p>
                            <p className="text-xs text-blue-600">FCFA</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <Separator className="my-6" />

                    {/* Moyennes */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-4 bg-gray-50 rounded-xl border text-center">
                        <p className="text-xs text-gray-600 uppercase mb-2">Panier moyen</p>
                        <p className="text-2xl font-bold text-gray-900">{driverStats.allTime.avgOrderValue.toLocaleString()}</p>
                        <p className="text-xs text-gray-500 mt-1">FCFA</p>
                      </div>
                      <div className="p-4 bg-gray-50 rounded-xl border text-center">
                        <p className="text-xs text-gray-600 uppercase mb-2">Frais moyen</p>
                        <p className="text-2xl font-bold text-gray-900">{driverStats.allTime.avgDeliveryFee.toLocaleString()}</p>
                        <p className="text-xs text-gray-500 mt-1">FCFA</p>
                      </div>
                    </div>
                  </div>
                </ScrollArea>
              </TabsContent>

              {/* Onglet Commandes */}
              <TabsContent value="orders" className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-600">{driverStats.today.orders.length} commande{driverStats.today.orders.length > 1 ? 's' : ''} aujourd'hui</p>
                </div>

                <ScrollArea className="h-[calc(100vh-300px)]">
                  {driverStats.today.orders.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                      <Package className="h-16 w-16 mb-4 opacity-20" />
                      <p className="text-sm">Aucune commande aujourd'hui</p>
                    </div>
                  ) : (
                    <div className="space-y-3 pr-4">
                      {driverStats.today.orders.map((order) => (
                        <div key={order.id} className="p-4 bg-gray-50 rounded-xl border hover:border-gray-300 transition-colors">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <p className="font-semibold text-gray-900">#{order.number}</p>
                              <p className="text-sm text-gray-600 mt-0.5">{order.customerName}</p>
                            </div>
                            <Badge 
                              variant="outline"
                              className={
                                order.status === "DELIVERED" ? "bg-green-50 text-green-700 border-green-200" :
                                order.status === "DELIVERING" ? "bg-amber-50 text-amber-700 border-amber-200" :
                                "bg-blue-50 text-blue-700 border-blue-200"
                              }
                            >
                              {order.status === "DELIVERED" ? "Livrée" :
                               order.status === "DELIVERING" ? "En cours" : "En attente"}
                            </Badge>
                          </div>
                          
                          {order.deliveryAddress && (
                            <div className="flex items-start gap-2 text-xs text-gray-500 mb-3 p-2 bg-white rounded-lg">
                              <MapPin className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                              <span className="flex-1">{order.deliveryAddress}</span>
                            </div>
                          )}
                          
                          <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                            <div className="flex items-center gap-3 text-xs text-gray-600">
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {new Date(order.createdAt).toLocaleTimeString("fr-FR", {
                                  hour: "2-digit",
                                  minute: "2-digit"
                                })}
                              </span>
                              {order.deliveredAt && (
                                <span className="flex items-center gap-1 text-green-600">
                                  <CheckCircle2 className="h-3 w-3" />
                                  {new Date(order.deliveredAt).toLocaleTimeString("fr-FR", {
                                    hour: "2-digit",
                                    minute: "2-digit"
                                  })}
                                </span>
                              )}
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-gray-900">{order.total.toLocaleString()} F</p>
                              <p className="text-xs text-gray-500">+{order.deliveryFee.toLocaleString()} F</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>
            </Tabs>
          ) : (
            <div className="text-center p-12 text-gray-500">
              <Activity className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p>Aucune statistique disponible</p>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  )
}
