"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  MapPin,
  Plus,
  Eye,
  Edit,
  Trash2,
  MoreHorizontal,
  Loader2,
  Truck,
  DollarSign,
  Clock,
} from "lucide-react"
import { toast } from "sonner"
import { DeliveryZoneDialog } from "@/components/delivery/delivery-zone-dialog"
import dynamic from "next/dynamic"

// Import dynamique de la carte pour éviter les erreurs SSR
const DeliveryZoneMap = dynamic(
  () => import("@/components/delivery/delivery-zone-map").then((mod) => mod.DeliveryZoneMap),
  { ssr: false }
)

interface DeliveryZone {
  id: string
  name: string
  color: string
  coverage?: string
  coordinates: any[]
  centerLatitude?: number
  centerLongitude?: number
  deliveryFee: number
  estimatedTime?: number
  isActive: boolean
  deliveryPerson?: {
    id: string
    name: string
    phone: string
  }
  store: {
    id: string
    name: string
  }
  createdAt: string
}

export default function DeliveryZonesPage() {
  const [zones, setZones] = useState<DeliveryZone[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingZone, setEditingZone] = useState<DeliveryZone | null>(null)
  const [viewMode, setViewMode] = useState<"table" | "map">("table")

  useEffect(() => {
    loadZones()
  }, [])

  const loadZones = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/delivery-zones")
      if (!response.ok) throw new Error("Erreur")
      const data = await response.json()
      setZones(data)
    } catch (error) {
      console.error("Error loading zones:", error)
      toast.error("Erreur lors du chargement des zones")
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (zone: DeliveryZone) => {
    setEditingZone(zone)
    setDialogOpen(true)
  }

  const handleDelete = async (zone: DeliveryZone) => {
    if (!confirm(`Voulez-vous vraiment supprimer la zone "${zone.name}" ?`)) return

    try {
      const response = await fetch(`/api/delivery-zones/${zone.id}`, {
        method: "DELETE",
      })

      if (!response.ok) throw new Error("Erreur lors de la suppression")

      toast.success("Zone supprimée avec succès")
      loadZones()
    } catch (error) {
      console.error("Error deleting zone:", error)
      toast.error("Erreur lors de la suppression")
    }
  }

  const handleToggleActive = async (zone: DeliveryZone) => {
    try {
      const response = await fetch(`/api/delivery-zones/${zone.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !zone.isActive }),
      })

      if (!response.ok) throw new Error("Erreur")

      toast.success(zone.isActive ? "Zone désactivée" : "Zone activée")
      loadZones()
    } catch (error) {
      console.error("Error toggling zone:", error)
      toast.error("Erreur lors de la mise à jour")
    }
  }

  const totalZones = zones.length
  const activeZones = zones.filter((z) => z.isActive).length
  const zonesWithDelivery = zones.filter((z) => z.deliveryPerson).length

  return (
    <>
      <div className="border-b bg-white">
        <div className="flex items-center justify-between px-8 py-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Zones de livraison</h1>
            <p className="text-sm text-gray-500 mt-1">Gérer les zones de livraison et assigner des livreurs</p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant={viewMode === "table" ? "default" : "outline"}
              onClick={() => setViewMode("table")}
            >
              Liste
            </Button>
            <Button
              variant={viewMode === "map" ? "default" : "outline"}
              onClick={() => setViewMode("map")}
            >
              <MapPin className="h-4 w-4 mr-2" />
              Carte
            </Button>
            <Button
              onClick={() => {
                setEditingZone(null)
                setDialogOpen(true)
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Nouvelle zone
            </Button>
          </div>
        </div>
      </div>

      <main className="py-8">
        <div className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8 space-y-6">
          {/* Stats */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Total zones</CardTitle>
                <MapPin className="h-4 w-4 text-gray-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">{totalZones}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Zones actives</CardTitle>
                <MapPin className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{activeZones}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Avec livreur</CardTitle>
                <Truck className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">{zonesWithDelivery}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Sans livreur</CardTitle>
                <Truck className="h-4 w-4 text-amber-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-amber-600">{totalZones - zonesWithDelivery}</div>
              </CardContent>
            </Card>
          </div>

          {/* Contenu */}
          {loading ? (
            <Card className="py-12">
              <CardContent className="flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              </CardContent>
            </Card>
          ) : viewMode === "table" ? (
            /* Vue tableau */
            <Card>
              <div className="overflow-x-auto">
                {zones.length === 0 ? (
                  <div className="text-center py-12">
                    <MapPin className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-4 text-lg font-semibold text-gray-900">Aucune zone</h3>
                    <p className="text-gray-500 mt-2">Créez votre première zone de livraison</p>
                    <Button
                      onClick={() => {
                        setEditingZone(null)
                        setDialogOpen(true)
                      }}
                      className="mt-4"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Créer une zone
                    </Button>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50">
                        <TableHead>Zone</TableHead>
                        <TableHead>Magasin</TableHead>
                        <TableHead>Livreur</TableHead>
                        <TableHead className="text-right">Frais</TableHead>
                        <TableHead className="text-center">Temps estimé</TableHead>
                        <TableHead>Statut</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {zones.map((zone) => (
                        <TableRow key={zone.id} className="hover:bg-gray-50">
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div
                                className="w-4 h-4 rounded-full"
                                style={{ backgroundColor: zone.color }}
                              />
                              <div>
                                <div className="font-medium text-gray-900">{zone.name}</div>
                                {zone.coverage && (
                                  <div className="text-sm text-gray-500">{zone.coverage}</div>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-gray-700">{zone.store.name}</span>
                          </TableCell>
                          <TableCell>
                            {zone.deliveryPerson ? (
                              <div>
                                <div className="text-sm font-medium text-gray-900">
                                  {zone.deliveryPerson.name}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {zone.deliveryPerson.phone}
                                </div>
                              </div>
                            ) : (
                              <span className="text-sm text-gray-400">Non assigné</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <span className="font-semibold text-gray-900">
                              {zone.deliveryFee.toLocaleString("fr-FR")} XAF
                            </span>
                          </TableCell>
                          <TableCell className="text-center">
                            {zone.estimatedTime ? (
                              <Badge variant="outline" className="text-xs">
                                <Clock className="h-3 w-3 mr-1" />
                                {zone.estimatedTime} min
                              </Badge>
                            ) : (
                              <span className="text-sm text-gray-400">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={
                                zone.isActive
                                  ? "bg-green-50 text-green-700 border-green-200"
                                  : "bg-gray-50 text-gray-700 border-gray-200"
                              }
                            >
                              {zone.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleEdit(zone)}>
                                  <Edit className="mr-2 h-4 w-4" />
                                  Modifier
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleToggleActive(zone)}>
                                  <Eye className="mr-2 h-4 w-4" />
                                  {zone.isActive ? "Désactiver" : "Activer"}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleDelete(zone)}
                                  className="text-red-600"
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Supprimer
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            </Card>
          ) : (
            /* Vue carte */
            <Card>
              <CardContent className="p-6">
                <DeliveryZoneMap
                  initialZones={zones.map((z) => ({
                    id: z.id,
                    name: z.name,
                    color: z.color,
                    coordinates: z.coordinates,
                  }))}
                  onSave={() => {}}
                  readonly={true}
                />
              </CardContent>
            </Card>
          )}
        </div>
      </main>

      <DeliveryZoneDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open)
          if (!open) setEditingZone(null)
        }}
        storeId={zones[0]?.store.id || ""}
        zone={editingZone}
        onSuccess={loadZones}
      />
    </>
  )
}
