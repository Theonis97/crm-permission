"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Map,
  Search,
  Plus,
  MapPin,
  Truck,
  TrendingUp,
  List,
  Circle,
  Edit,
  Trash2,
  Eye,
  Loader2,
  ChevronRight,
  ChevronLeft,
  Info,
  X,
  ShoppingCart,
  Clock,
  Package,
  RefreshCw,
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { DeliveryZoneMap } from "@/components/delivery/delivery-zone-map"
import { toast } from "@/lib/app-toast"

interface DeliveryZone {
  id: string
  storeId: string
  name: string
  color: string
  coverage: string | null
  coordinates: Array<{ lat: number; lng: number }>
  centerLatitude: number | null
  centerLongitude: number | null
  deliveryFee: number
  estimatedTime: number | null
  isActive: boolean
  deliveryPersonId: string | null
  createdAt: string
  updatedAt: string
  store?: {
    id: string
    name: string
  }
  deliveryPerson?: {
    id: string
    name: string
    phone: string
    status: string
  } | null
  storeOrders?: Array<{
    id: string
    number: string
    status: string
    total: number
    createdAt: string
    contact: {
      firstName: string | null
      lastName: string | null
      phone: string | null
    } | null
  }>
  _count?: {
    storeOrders: number
  }
}

export default function StoreZonesPage() {
  const params = useParams()
  const storeId = params.id as string
  const [viewMode, setViewMode] = useState<"map" | "list">("map")
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedZone, setSelectedZone] = useState<string>("all")
  const [mapCenter] = useState({ lat: 0.4162, lng: 9.4673 }) // Libreville
  
  // États pour les données réelles
  const [zones, setZones] = useState<DeliveryZone[]>([])
  const [isLoadingZones, setIsLoadingZones] = useState(true)
  
  // États pour le dialogue de création
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [currentStep, setCurrentStep] = useState(1)
  const [newZoneName, setNewZoneName] = useState("")
  const [newZoneColor, setNewZoneColor] = useState("#3B82F6")
  const [newZoneCoverage, setNewZoneCoverage] = useState("")
  const [newZoneDeliveryFee, setNewZoneDeliveryFee] = useState("")
  const [newZoneEstimatedTime, setNewZoneEstimatedTime] = useState("")
  const [newZoneCoordinates, setNewZoneCoordinates] = useState<Array<{lat: number, lng: number}>>([])
  
  // États pour l'autocomplétion de lieux
  const [locationSearch, setLocationSearch] = useState("")
  const [locationResults, setLocationResults] = useState<any[]>([])
  const [isSearchingLocation, setIsSearchingLocation] = useState(false)

  // Charger les zones depuis l'API
  useEffect(() => {
    loadZones()
    
    // Rafraîchissement automatique toutes les 30 secondes
    const interval = setInterval(() => {
      loadZones()
    }, 30000)
    
    return () => clearInterval(interval)
  }, [storeId])

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

  const filteredZones = zones.filter(zone => {
    const matchesSearch = zone.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesFilter = selectedZone === "all" || zone.id === selectedZone
    return matchesSearch && matchesFilter
  })

  // Gestion de la création de zone
  const handleCreateZone = async () => {
    if (!newZoneName.trim()) {
      toast.error("Le nom de la zone est requis")
      return
    }

    if (newZoneCoordinates.length < 3) {
      toast.error("La zone doit avoir au moins 3 points")
      return
    }

    setIsCreating(true)
    try {
      const response = await fetch("/api/delivery-zones", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          storeId,
          name: newZoneName,
          color: newZoneColor,
          coverage: newZoneCoverage || undefined,
          coordinates: newZoneCoordinates,
          deliveryFee: newZoneDeliveryFee ? parseFloat(newZoneDeliveryFee) : 0,
          estimatedTime: newZoneEstimatedTime ? parseInt(newZoneEstimatedTime) : undefined,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Erreur lors de la création")
      }

      const newZone = await response.json()
      toast.success(`Zone "${newZone.name}" créée avec succès!`)
      
      // Réinitialiser le formulaire et fermer le dialogue
      setIsCreateDialogOpen(false)
      resetCreateForm()
      
      // Rafraîchir la liste des zones
      await loadZones()
      
    } catch (error: any) {
      console.error("Error creating zone:", error)
      toast.error(error.message || "Erreur lors de la création de la zone")
    } finally {
      setIsCreating(false)
    }
  }

  const resetCreateForm = () => {
    setCurrentStep(1)
    setNewZoneName("")
    setNewZoneColor("#3B82F6")
    setNewZoneCoverage("")
    setNewZoneDeliveryFee("")
    setNewZoneEstimatedTime("")
    setNewZoneCoordinates([])
    setLocationSearch("")
    setLocationResults([])
  }

  // Recherche de lieux via Nominatim API
  const searchLocation = async (query: string) => {
    if (!query || query.length < 3) {
      setLocationResults([])
      return
    }

    setIsSearchingLocation(true)
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?` +
        `q=${encodeURIComponent(query)}&` +
        `format=json&` +
        `limit=5&` +
        `countrycodes=ga&` + // Gabon
        `addressdetails=1`
      )
      const data = await response.json()
      setLocationResults(data)
    } catch (error) {
      console.error("Error searching location:", error)
      toast.error("Erreur lors de la recherche de lieu")
    } finally {
      setIsSearchingLocation(false)
    }
  }

  // Ajouter un point depuis la recherche de lieu
  const handleAddLocationPoint = (location: any) => {
    const newPoint = {
      lat: parseFloat(location.lat),
      lng: parseFloat(location.lon),
    }
    setNewZoneCoordinates([...newZoneCoordinates, newPoint])
    setLocationSearch("")
    setLocationResults([])
    toast.success(`Point ajouté: ${location.display_name}`)
  }

  // Supprimer un point
  const handleRemovePoint = (index: number) => {
    setNewZoneCoordinates(newZoneCoordinates.filter((_, i) => i !== index))
    toast.info("Point supprimé")
  }

  // Navigation entre les étapes
  const handleNextStep = () => {
    if (currentStep === 1) {
      if (!newZoneName.trim()) {
        toast.error("Le nom de la zone est requis")
        return
      }
      setCurrentStep(2)
    }
  }

  const handlePreviousStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleZoneCoordinatesSave = (coordinates: Array<{lat: number, lng: number}>) => {
    setNewZoneCoordinates(coordinates)
  }

  return (
    <>
      <div className="border-b bg-white px-6 py-2.5 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Zones de Livraison</h1>
            <p className="text-gray-600">Cartographie et gestion des zones - Libreville, Gabon</p>
          </div>
          <div className="flex items-center gap-3">
            {/* Toggle Vue */}
            <div className="flex items-center bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode("map")}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  viewMode === "map"
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                <Map className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  viewMode === "list"
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
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
              Nouvelle zone
            </Button>
          </div>
        </div>
      </div>

      <div className="p-6">

        {/* Vue Map ou Liste */}
        {viewMode === "map" ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Carte Interactive OpenStreetMap */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Map className="h-5 w-5" />
                  Carte Interactive - Libreville, Gabon
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingZones ? (
                  <div className="w-full h-[600px] bg-gray-100 rounded-lg flex items-center justify-center">
                    <div className="flex flex-col items-center gap-3">
                      <Loader2 className="h-8 w-8 animate-spin text-blue-900" />
                      <p className="text-gray-600">Chargement des zones...</p>
                    </div>
                  </div>
                ) : filteredZones.length === 0 ? (
                  <div className="w-full h-[600px] bg-gray-50 rounded-lg flex items-center justify-center border-2 border-dashed">
                    <div className="text-center">
                      <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                      <p className="text-gray-600 font-medium">Aucune zone de livraison</p>
                      <p className="text-gray-500 text-sm mt-1">Créez votre première zone pour commencer</p>
                    </div>
                  </div>
                ) : (
                  <div>
                    <DeliveryZoneMap
                      initialZones={filteredZones.map(zone => ({
                        id: zone.id,
                        name: zone.name,
                        color: zone.color,
                        coordinates: zone.coordinates
                      }))}
                      readonly={true}
                      onSave={() => {}}
                    />
                    
                    {/* Légende */}
                    <div className="mt-4 p-4 bg-gray-50 rounded-lg border">
                      <h4 className="font-semibold text-sm mb-3">Légende des zones ({filteredZones.length})</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                        {filteredZones.map((zone) => (
                          <div key={zone.id} className="flex items-center gap-2 text-xs p-2 bg-white rounded">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: zone.color }} />
                            <div className="flex-1">
                              <span className="font-medium">{zone.name}</span>
                              {zone.deliveryPerson && (
                                <span className="text-gray-500 block">
                                  🚚 {zone.deliveryPerson.name}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Panneau latéral - Statistiques des zones */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Truck className="h-5 w-5" />
                    Livreurs Assignés
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoadingZones ? (
                    <div className="flex items-center justify-center p-6">
                      <Loader2 className="h-6 w-6 animate-spin text-blue-900" />
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[250px] overflow-y-auto">
                      {filteredZones.filter(z => z.deliveryPerson).length === 0 ? (
                        <div className="text-center p-6 text-gray-500 text-sm">
                          Aucun livreur assigné
                        </div>
                      ) : (
                        filteredZones
                          .filter(z => z.deliveryPerson)
                          .map((zone) => (
                            <div key={zone.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                              <div 
                                className="w-3 h-3 rounded-full flex-shrink-0" 
                                style={{ backgroundColor: zone.color }}
                              />
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-sm">{zone.deliveryPerson?.name}</div>
                                <div className="text-xs text-gray-600">{zone.name}</div>
                                <div className="text-xs text-gray-500">{zone.deliveryPerson?.phone}</div>
                              </div>
                              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                Actif
                              </Badge>
                            </div>
                          ))
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5" />
                      Statistiques
                    </CardTitle>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={loadZones}
                      disabled={isLoadingZones}
                      className="h-8 w-8 p-0"
                    >
                      <RefreshCw className={`h-4 w-4 ${isLoadingZones ? 'animate-spin' : ''}`} />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {isLoadingZones ? (
                    <div className="flex items-center justify-center p-6">
                      <Loader2 className="h-6 w-6 animate-spin text-blue-900" />
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                        <div>
                          <div className="text-sm text-gray-600">Zones totales</div>
                          <div className="text-2xl font-bold text-blue-900">{zones.length}</div>
                        </div>
                        <MapPin className="h-8 w-8 text-blue-600" />
                      </div>
                      
                      <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                        <div>
                          <div className="text-sm text-gray-600">Zones actives</div>
                          <div className="text-2xl font-bold text-green-900">
                            {zones.filter(z => z.isActive).length}
                          </div>
                        </div>
                        <Circle className="h-8 w-8 text-green-600" />
                      </div>
                      
                      <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                        <div>
                          <div className="text-sm text-gray-600">Livreurs assignés</div>
                          <div className="text-2xl font-bold text-purple-900">
                            {zones.filter(z => z.deliveryPerson).length}
                          </div>
                        </div>
                        <Truck className="h-8 w-8 text-purple-600" />
                      </div>

                      <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                        <div>
                          <div className="text-sm text-gray-600">Commandes en cours</div>
                          <div className="text-2xl font-bold text-orange-900">
                            {zones.reduce((sum, z) => sum + (z.storeOrders?.length || 0), 0)}
                          </div>
                        </div>
                        <ShoppingCart className="h-8 w-8 text-orange-600" />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Commandes en Temps Réel */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    Commandes en Cours
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoadingZones ? (
                    <div className="flex items-center justify-center p-6">
                      <Loader2 className="h-6 w-6 animate-spin text-blue-900" />
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[400px] overflow-y-auto">
                      {filteredZones.filter(z => z.storeOrders && z.storeOrders.length > 0).length === 0 ? (
                        <div className="text-center p-6 text-gray-500 text-sm">
                          <ShoppingCart className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                          <p>Aucune commande en cours</p>
                        </div>
                      ) : (
                        filteredZones.map((zone) => (
                          zone.storeOrders && zone.storeOrders.length > 0 && (
                            <div key={zone.id} className="space-y-2">
                              <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: zone.color }} />
                                {zone.name} ({zone.storeOrders.length})
                              </div>
                              {zone.storeOrders.map((order) => {
                                const contactName = order.contact 
                                  ? `${order.contact.firstName || ''} ${order.contact.lastName || ''}`.trim() || 'Client'
                                  : 'Client'
                                return (
                                <div key={order.id} className="ml-4 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                                  <div className="flex items-start justify-between">
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2">
                                        <span className="font-medium text-sm">{order.number}</span>
                                        <Badge 
                                          variant="outline" 
                                          className={`text-xs ${
                                            order.status === "DELIVERED" ? "bg-green-50 text-green-700 border-green-200" :
                                            order.status === "DELIVERING" ? "bg-blue-50 text-blue-700 border-blue-200" :
                                            order.status === "PREPARING" ? "bg-orange-50 text-orange-700 border-orange-200" :
                                            "bg-gray-50 text-gray-700 border-gray-200"
                                          }`}
                                        >
                                          {order.status}
                                        </Badge>
                                      </div>
                                      {order.contact && (
                                        <div className="text-xs text-gray-600 mt-1">
                                          {contactName} {order.contact.phone && `• ${order.contact.phone}`}
                                        </div>
                                      )}
                                      <div className="flex items-center gap-2 mt-1">
                                        <span className="text-xs font-semibold text-blue-900">
                                          {order.total.toLocaleString()} FCFA
                                        </span>
                                        <span className="text-xs text-gray-500">•</span>
                                        <span className="text-xs text-gray-500 flex items-center gap-1">
                                          <Clock className="h-3 w-3" />
                                          {new Date(order.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )})}
                            </div>
                          )
                        ))
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        ) : (
          /* Vue Liste */
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Liste des Zones de Livraison</span>
                {!isLoadingZones && (
                  <Badge variant="outline" className="text-sm">
                    {filteredZones.length} zone{filteredZones.length > 1 ? 's' : ''}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {isLoadingZones ? (
                <div className="flex items-center justify-center p-12">
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-900" />
                    <p className="text-gray-600">Chargement des zones...</p>
                  </div>
                </div>
              ) : filteredZones.length === 0 ? (
                <div className="text-center p-12">
                  <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600 font-medium">Aucune zone de livraison</p>
                  <p className="text-gray-500 text-sm mt-1">Créez votre première zone pour commencer</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead className="font-semibold">Zone</TableHead>
                      <TableHead className="font-semibold">Couverture</TableHead>
                      <TableHead className="font-semibold">Livreur assigné</TableHead>
                      <TableHead className="font-semibold">Commandes</TableHead>
                      <TableHead className="font-semibold">Frais</TableHead>
                      <TableHead className="font-semibold">Temps estimé</TableHead>
                      <TableHead className="font-semibold">Statut</TableHead>
                      <TableHead className="font-semibold">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredZones.map((zone) => (
                      <TableRow key={zone.id} className="hover:bg-gray-50">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div 
                              className="w-4 h-4 rounded-full" 
                              style={{ backgroundColor: zone.color }}
                            />
                            <div>
                              <div className="font-medium">{zone.name}</div>
                              <div className="text-xs text-gray-500">
                                {zone.coordinates.length} point{zone.coordinates.length > 1 ? 's' : ''}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm text-gray-600">
                            {zone.coverage || <span className="text-gray-400 italic">Non spécifié</span>}
                          </div>
                        </TableCell>
                        <TableCell>
                          {zone.deliveryPerson ? (
                            <div className="text-sm">
                              <div className="font-medium">{zone.deliveryPerson.name}</div>
                              <div className="text-xs text-gray-500">{zone.deliveryPerson.phone}</div>
                            </div>
                          ) : (
                            <Badge variant="outline" className="text-gray-500">
                              Non assigné
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {zone.storeOrders && zone.storeOrders.length > 0 ? (
                            <div className="flex items-center gap-2">
                              <ShoppingCart className="h-4 w-4 text-orange-600" />
                              <span className="font-semibold text-orange-900">
                                {zone.storeOrders.length}
                              </span>
                              <span className="text-xs text-gray-500">en cours</span>
                            </div>
                          ) : (
                            <span className="text-gray-400 text-sm">Aucune</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="font-semibold text-gray-900">
                            {zone.deliveryFee.toLocaleString()} FCFA
                          </span>
                        </TableCell>
                        <TableCell>
                          {zone.estimatedTime ? (
                            <span className="text-sm text-gray-600">
                              {zone.estimatedTime} min
                            </span>
                          ) : (
                            <span className="text-gray-400 text-sm italic">N/A</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={zone.isActive ? "default" : "outline"}
                            className={zone.isActive ? "bg-green-100 text-green-700" : "text-gray-500"}
                          >
                            {zone.isActive ? 'Actif' : 'Inactif'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button variant="ghost" size="sm" title="Voir">
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" title="Modifier">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm" 
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
        )}
      </div>

      {/* Dialogue de création de zone */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="min-w-[65vw] w-full h-[95vh] flex flex-col p-0 z-[1000]">
          <DialogHeader className="p-6 pb-4 border-b">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-2xl">Créer une nouvelle zone de livraison</DialogTitle>
                <DialogDescription className="mt-2">
                  Étape {currentStep} sur 2 : {currentStep === 1 ? "Informations de base" : "Dessin de la zone"}
                </DialogDescription>
              </div>
              {/* Indicateur d'étapes */}
              <div className="flex items-center gap-3">
                <div className={`flex items-center justify-center w-10 h-10 rounded-full ${
                  currentStep >= 1 ? "bg-blue-900 text-white" : "bg-gray-200 text-gray-600"
                }`}>
                  <Info className="h-5 w-5" />
                </div>
                <div className={`w-16 h-1 ${
                  currentStep >= 2 ? "bg-blue-900" : "bg-gray-200"
                }`} />
                <div className={`flex items-center justify-center w-10 h-10 rounded-full ${
                  currentStep >= 2 ? "bg-blue-900 text-white" : "bg-gray-200 text-gray-600"
                }`}>
                  <MapPin className="h-5 w-5" />
                </div>
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-6">
            {/* Étape 1: Informations de base */}
            {currentStep === 1 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="zone-name">Nom de la zone *</Label>
                <Input
                  id="zone-name"
                  placeholder="Ex: Libreville Centre"
                  value={newZoneName}
                  onChange={(e) => setNewZoneName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="zone-color">Couleur</Label>
                <div className="flex gap-2">
                  <Input
                    id="zone-color"
                    type="color"
                    value={newZoneColor}
                    onChange={(e) => setNewZoneColor(e.target.value)}
                    className="w-20"
                  />
                  <Input
                    value={newZoneColor}
                    onChange={(e) => setNewZoneColor(e.target.value)}
                    placeholder="#3B82F6"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="zone-delivery-fee">Frais de livraison (FCFA)</Label>
                <Input
                  id="zone-delivery-fee"
                  type="number"
                  placeholder="Ex: 1000"
                  value={newZoneDeliveryFee}
                  onChange={(e) => setNewZoneDeliveryFee(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="zone-estimated-time">Temps de livraison estimé (min)</Label>
                <Input
                  id="zone-estimated-time"
                  type="number"
                  placeholder="Ex: 30"
                  value={newZoneEstimatedTime}
                  onChange={(e) => setNewZoneEstimatedTime(e.target.value)}
                />
              </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="zone-coverage">Description de la couverture</Label>
                  <Input
                    id="zone-coverage"
                    placeholder="Ex: Centre-ville, Montagne Sainte, Louis"
                    value={newZoneCoverage}
                    onChange={(e) => setNewZoneCoverage(e.target.value)}
                  />
                </div>
              </div>
            )}

            {/* Étape 2: Dessiner la zone */}
            {currentStep === 2 && (
              <div className="space-y-6">
               
                {/* Points ajoutés */}
                {newZoneCoordinates.length > 0 && (
                  <div className="space-y-2">
                    <Label>Points ajoutés ({newZoneCoordinates.length})</Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-40 overflow-y-auto p-2 border rounded-lg bg-gray-50">
                      {newZoneCoordinates.map((coord, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-2 bg-white rounded border text-sm"
                        >
                          <span className="text-gray-700">
                            Point {index + 1}: {coord.lat.toFixed(5)}, {coord.lng.toFixed(5)}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemovePoint(index)}
                            className="h-6 w-6 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Carte pour visualiser la zone */}
                <div className="space-y-2">
                  <Label>Carte de prévisualisation *</Label>
                  <div className="text-sm text-gray-600 mb-2">
                    Utilisez la recherche ci-dessus pour ajouter des points, ou cliquez sur "Dessiner" pour ajouter des points manuellement sur la carte.
                  </div>
                  <DeliveryZoneMap
                    initialCoordinates={newZoneCoordinates}
                    onSave={handleZoneCoordinatesSave}
                    onCancel={() => setNewZoneCoordinates([])}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Footer fixe avec boutons de navigation */}
          <div className="border-t bg-gray-50 p-4">
            <div className="grid grid-cols-2 gap-3">
              {/* Bouton gauche */}
              {currentStep === 1 ? (
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsCreateDialogOpen(false)
                    resetCreateForm()
                  }}
                  disabled={isCreating}
                  className="w-full"
                >
                  Annuler
                </Button>
              ) : (
                <Button
                  variant="outline"
                  onClick={handlePreviousStep}
                  disabled={isCreating}
                  className="w-full"
                >
                  <ChevronLeft className="h-4 w-4 mr-2" />
                  Précédent
                </Button>
              )}

              {/* Bouton droit */}
              {currentStep === 1 ? (
                <Button
                  onClick={handleNextStep}
                  className="bg-blue-900 hover:bg-blue-800 w-full"
                >
                  Suivant
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              ) : (
                <Button
                  onClick={handleCreateZone}
                  disabled={isCreating || !newZoneName.trim() || newZoneCoordinates.length < 3}
                  className="bg-blue-900 hover:bg-blue-800 w-full"
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Création en cours...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      Créer la zone
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
