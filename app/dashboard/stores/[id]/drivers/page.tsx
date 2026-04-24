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
  Star,
  Loader2,
  Edit,
  Trash2,
  UserPlus,
  CheckCircle2,
  Eye,
  Package,
  Clock,
  DollarSign,
  Calendar,
  TrendingUp,
  Activity,
} from "lucide-react"
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
import { toast } from "@/lib/app-toast"
import { DriverTodayOrders, DriverStock, DriverCloses, DriverRestockingRequests } from "@/components/drivers"
import { FileText, ShoppingCart } from "lucide-react"

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

// Note: DriverDetailedStats interface removed - now using modular components
// that handle their own types internally

export default function DriversPage() {
  const params = useParams()
  const storeId = params.id as string
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [storeFilter, setStoreFilter] = useState("all")
  
  // États pour les données
  const [drivers, setDrivers] = useState<DeliveryPerson[]>([])
  const [zones, setZones] = useState<DeliveryZone[]>([])
  const [isLoadingDrivers, setIsLoadingDrivers] = useState(true)
  const [isLoadingZones, setIsLoadingZones] = useState(true)
  
  // États pour les dialogues
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isZonesDialogOpen, setIsZonesDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedDriver, setSelectedDriver] = useState<DeliveryPerson | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  
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
      // Tous les livreurs, tous magasins confondus
      const response = await fetch(`/api/delivery-persons`)
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
    if (!formData.name.trim() || !formData.phone.trim() || !formData.email.trim()) {
      toast.error("Le nom, le téléphone et l'email sont requis")
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
          vehicle: formData.vehicle || null,
          plateNumber: formData.plateNumber || null,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Erreur lors de la création")
      }

      const result = await response.json()
      
      // Message différent selon que l'utilisateur existait déjà ou non
      if (result.userAlreadyExisted) {
        toast.success(
          `Livreur créé avec succès!\n` +
          `📧 Utilisateur existant associé: ${result.userEmail}\n` +
          `ℹ️ Le compte utilisateur existait déjà`,
          { duration: 8000 }
        )
      } else {
        toast.success(
          `Livreur créé avec succès!\n` +
          `📧 Nouveau compte créé pour: ${result.userEmail}\n` +
          `🔑 Mot de passe: ${result.defaultPassword}`,
          { duration: 8000 }
        )
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

  const openDetailsSheet = (driver: DeliveryPerson) => {
    setSelectedDriver(driver)
    setIsDetailsSheetOpen(true)
  }

  const handleDeleteDriver = async () => {
    if (!selectedDriver) return

    setIsDeleting(true)
    try {
      const response = await fetch(`/api/delivery-persons/${selectedDriver.id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Erreur lors de la suppression")
      }

      toast.success("Livreur supprimé avec succès")
      setIsDeleteDialogOpen(false)
      setSelectedDriver(null)
      await loadDrivers()
    } catch (error: any) {
      console.error("Error deleting driver:", error)
      toast.error(error.message || "Erreur lors de la suppression")
    } finally {
      setIsDeleting(false)
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

  const allStores = Array.from(
    new Map(drivers.filter(d => d.store).map(d => [d.store!.id, d.store!])).values()
  )

  const filteredDrivers = drivers.filter(driver => {
    const matchesSearch = driver.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (driver.email?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
                         driver.phone.includes(searchTerm)
    const matchesStatus = statusFilter === "all" || driver.status === statusFilter
    const matchesStore = storeFilter === "all" || driver.store?.id === storeFilter
    return matchesSearch && matchesStatus && matchesStore
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
            <p className="text-gray-600">Tous les livreurs — tous magasins confondus</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Rechercher un livreur..."
                className="pl-10 w-64"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={storeFilter} onValueChange={setStoreFilter}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Tous les magasins" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les magasins</SelectItem>
                {allStores.map(s => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}{s.id === storeId ? " (ce magasin)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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

      <div className="p-6">
        <div>
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
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {filteredDrivers.map((driver) => (
                  <Card 
                    key={driver.id} 
                    className="hover:shadow-lg py-0 transition-all cursor-pointer border border-gray-200 group"
                  >
                    <CardContent className="p-4">
                      {/* Header avec avatar et statut */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-12 w-12">
                            <AvatarImage src={driver.avatar || undefined} />
                            <AvatarFallback className="bg-blue-100 text-blue-900 text-lg">
                              {getDriverInitials(driver.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <h3 className="font-semibold text-gray-900">{driver.name}</h3>
                            <div className="flex items-center gap-1 text-sm text-gray-500">
                              <Phone className="h-3 w-3" />
                              {driver.phone}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Magasin d'attache */}
                      {driver.store && (
                        <div className="mb-2">
                          <Badge
                            variant="outline"
                            className={
                              driver.store.id === storeId
                                ? "border-blue-300 bg-blue-50 text-blue-700 text-xs"
                                : "border-orange-300 bg-orange-50 text-orange-700 text-xs"
                            }
                          >
                            <MapPin className="h-3 w-3 mr-1" />
                            {driver.store.name}
                            {driver.store.id !== storeId && " ↗"}
                          </Badge>
                        </div>
                      )}

                      {/* Informations supplémentaires */}
                      <div className="space-y-2 mb-3">
                        {driver.email && (
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Mail className="h-3.5 w-3.5 text-gray-400" />
                            <span className="truncate">{driver.email}</span>
                          </div>
                        )}
                        {driver.vehicle && (
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Truck className="h-3.5 w-3.5 text-gray-400" />
                            <span>{driver.vehicle}</span>
                            {driver.plateNumber && (
                              <Badge variant="outline" className="text-xs ml-1">
                                {driver.plateNumber}
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Statistiques */}
                      <div className="flex items-center gap-3 py-2 border-t border-gray-100">
                        <div className="flex items-center gap-1.5 text-sm">
                          <Package className="h-4 w-4 text-blue-500" />
                          <span className="font-semibold text-gray-900">{driver._count?.orders || driver.totalDeliveries || 0}</span>
                          <span className="text-gray-500">commandes</span>
                        </div>
                        {driver.rating && driver.rating > 0 && (
                          <div className="flex items-center gap-1 text-sm">
                            <Star className="h-4 w-4 text-amber-400 fill-amber-400" />
                            <span className="font-medium">{driver.rating.toFixed(1)}</span>
                          </div>
                        )}
                      </div>

                      {/* Zones de livraison */}
                      {driver.deliveryZones && driver.deliveryZones.length > 0 && (
                        <div className="flex flex-wrap gap-1 py-2 border-t border-gray-100">
                          {driver.deliveryZones.slice(0, 2).map(zone => (
                            <span
                              key={zone.id}
                              className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
                              style={{ backgroundColor: `${zone.color}20`, color: zone.color }}
                            >
                              <MapPin className="h-3 w-3 mr-1" />
                              {zone.name}
                            </span>
                          ))}
                          {driver.deliveryZones.length > 2 && (
                            <span className="text-xs text-gray-500 px-1">+{driver.deliveryZones.length - 2}</span>
                          )}
                        </div>
                      )}

                      {/* Boutons d'action rapide */}
                      <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 h-8 text-xs"
                          onClick={(e) => {
                            e.stopPropagation()
                            openDetailsSheet(driver)
                          }}
                        >
                          <Eye className="h-3.5 w-3.5 mr-1" />
                          Voir
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 h-8 text-xs"
                          onClick={(e) => {
                            e.stopPropagation()
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
                          }}
                        >
                          <Edit className="h-3.5 w-3.5 mr-1" />
                          Modifier
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 px-2"
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedDriver(driver)
                            setIsZonesDialogOpen(true)
                          }}
                        >
                          <MapPin className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 px-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedDriver(driver)
                            setIsDeleteDialogOpen(true)
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
        </div>
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
                Email *
                <Badge variant="default" className="text-xs font-normal bg-blue-500">
                  Obligatoire
                </Badge>
              </Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="Ex: jean.dupont@email.com"
                required
              />
              <p className="text-xs text-gray-500">
                💡 Si l'email n'existe pas, un nouveau compte sera créé avec le mot de passe : <code className="font-mono bg-gray-100 px-1 py-0.5 rounded">innotech</code>
                <br />
                ℹ️ Si l'email existe déjà, l'utilisateur sera simplement ajouté comme livreur
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
        <SheetContent className="w-full sm:max-w-3xl overflow-hidden">
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

          {selectedDriver && (
            <Tabs defaultValue="today" className="mt-4">
              <TabsList className="grid w-full grid-cols-4 mb-4">
                <TabsTrigger value="today" className="gap-1 text-xs px-2">
                  <Calendar className="h-4 w-4" />
                  Commandes
                </TabsTrigger>
                <TabsTrigger value="stock" className="gap-1 text-xs px-2">
                  <Package className="h-4 w-4" />
                  Stock
                </TabsTrigger>
                <TabsTrigger value="closes" className="gap-1 text-xs px-2">
                  <FileText className="h-4 w-4" />
                  Clôtures
                </TabsTrigger>
                <TabsTrigger value="restocking" className="gap-1 text-xs px-2">
                  <ShoppingCart className="h-4 w-4" />
                  Appro.
                </TabsTrigger>
              </TabsList>

              {/* Onglet Commandes du jour */}
              <TabsContent value="today">
                <ScrollArea className="h-[calc(100vh-220px)]">
                  <div className="pr-4">
                    <DriverTodayOrders driverId={selectedDriver.id} />
                  </div>
                </ScrollArea>
              </TabsContent>

              {/* Onglet Stock */}
              <TabsContent value="stock">
                <ScrollArea className="h-[calc(100vh-220px)]">
                  <div className="pr-4">
                    <DriverStock driverId={selectedDriver.id} />
                  </div>
                </ScrollArea>
              </TabsContent>

              {/* Onglet Clôtures */}
              <TabsContent value="closes">
                <ScrollArea className="h-[calc(100vh-220px)]">
                  <div className="pr-4">
                    <DriverCloses driverId={selectedDriver.id} />
                  </div>
                </ScrollArea>
              </TabsContent>

              {/* Onglet Demandes d'approvisionnement */}
              <TabsContent value="restocking">
                <ScrollArea className="h-[calc(100vh-220px)]">
                  <div className="pr-4">
                    <DriverRestockingRequests driverId={selectedDriver.id} />
                  </div>
                </ScrollArea>
              </TabsContent>
            </Tabs>
          )}

          {!selectedDriver && (
            <div className="flex items-center justify-center h-96">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Dialogue de confirmation de suppression - KEEP THIS */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Supprimer le livreur</DialogTitle>
            <DialogDescription>
              Êtes-vous sûr de vouloir supprimer le livreur <strong>{selectedDriver?.name}</strong> ? 
              Cette action est irréversible.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
              disabled={isDeleting}
            >
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteDriver}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Suppression...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Supprimer
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
