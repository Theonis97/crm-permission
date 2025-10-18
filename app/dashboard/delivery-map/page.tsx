"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { MapPin, Truck, Package, Filter, RefreshCw, Map as MapIcon } from "lucide-react"
import dynamic from 'next/dynamic'
import { useRouter } from "next/navigation"

// Importer la carte de manière dynamique pour éviter les erreurs SSR
const DeliveryMap = dynamic(() => import('@/components/delivery').then(mod => ({ default: mod.DeliveryMap })), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-[600px] bg-gray-100 rounded-lg">
      <div className="text-center">
        <MapIcon className="h-12 w-12 text-gray-400 mx-auto mb-2" />
        <p className="text-gray-500">Chargement de la carte...</p>
      </div>
    </div>
  ),
})

interface Order {
  id: string
  number: string
  status: string
  customerName: string
  customerPhone: string
  deliveryAddress: string
  coordinates: { lat: number; lng: number }
  total: number
  priority: string
  deliveryZone: { id: string; name: string; color: string } | null
  deliveryPerson: { id: string; name: string } | null
  store: { id: string; name: string }
  createdAt: string
}

interface Zone {
  id: string
  name: string
  color: string
  coordinates: Array<{ lat: number; lng: number }>
  center: { lat: number; lng: number } | null
  deliveryFee: number
  estimatedTime: number | null
  deliveryPerson: { id: string; name: string; phone: string } | null
  store: { id: string; name: string }
  activeOrders: number
}

interface Driver {
  id: string
  name: string
  phone: string
  coordinates: { lat: number; lng: number }
  zone: { id: string; name: string; color: string }
  activeOrders: Array<{ id: string; number: string; status: string }>
}

interface MapData {
  orders: Order[]
  zones: Zone[]
  drivers: Driver[]
  stats: {
    totalOrders: number
    pendingOrders: number
    confirmedOrders: number
    preparingOrders: number
    readyOrders: number
    deliveringOrders: number
    totalZones: number
    activeDrivers: number
  }
}

export default function DeliveryMapPage() {
  const router = useRouter()
  const [mapData, setMapData] = useState<MapData | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedZone, setSelectedZone] = useState<string>("all")
  const [refreshing, setRefreshing] = useState(false)

  const fetchMapData = async (zoneId: string = "all") => {
    try {
      setRefreshing(true)
      const url = zoneId === "all" 
        ? '/api/delivery/map'
        : `/api/delivery/map?zoneId=${zoneId}`
      
      const response = await fetch(url)
      const data = await response.json()

      if (data.success) {
        setMapData(data.data)
      }
    } catch (error) {
      console.error('Erreur chargement carte:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchMapData(selectedZone)
  }, [selectedZone])

  const handleRefresh = () => {
    fetchMapData(selectedZone)
  }

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      PENDING: { label: "En attente", variant: "secondary" },
      CONFIRMED: { label: "Confirmée", variant: "default" },
      PREPARING: { label: "En préparation", variant: "outline" },
      READY: { label: "Prête", variant: "default" },
      DELIVERING: { label: "En livraison", variant: "default" },
    }
    const config = statusConfig[status] || { label: status, variant: "outline" }
    return <Badge variant={config.variant}>{config.label}</Badge>
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <MapIcon className="h-16 w-16 text-gray-400 mx-auto mb-4 animate-pulse" />
          <p className="text-gray-500">Chargement de la carte de livraison...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Carte des Livraisons</h1>
          <p className="text-gray-500 mt-1">
            Vue globale des commandes, zones et livreurs
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={selectedZone} onValueChange={setSelectedZone}>
            <SelectTrigger className="w-[200px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Filtrer par zone" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les zones</SelectItem>
              {mapData?.zones.map(zone => (
                <SelectItem key={zone.id} value={zone.id}>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: zone.color }}
                    />
                    {zone.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="icon"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Commandes Actives
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-3xl font-bold">{mapData?.stats.totalOrders}</span>
              <Package className="h-8 w-8 text-blue-500" />
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {mapData?.stats.pendingOrders} en attente
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              En Livraison
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-3xl font-bold">{mapData?.stats.deliveringOrders}</span>
              <Truck className="h-8 w-8 text-purple-500" />
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {mapData?.stats.readyOrders} prêtes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Zones Actives
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-3xl font-bold">{mapData?.stats.totalZones}</span>
              <MapPin className="h-8 w-8 text-green-500" />
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Zones de livraison
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Livreurs Actifs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-3xl font-bold">{mapData?.stats.activeDrivers}</span>
              <Truck className="h-8 w-8 text-orange-500" />
            </div>
            <p className="text-xs text-gray-500 mt-2">
              En service
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Carte */}
      <Card>
        <CardHeader>
          <CardTitle>Carte Interactive</CardTitle>
          <CardDescription>
            Points bleus = Commandes | Polygones colorés = Zones | Icônes camion = Livreurs
          </CardDescription>
        </CardHeader>
        <CardContent>
          {mapData && (
            <DeliveryMap
              orders={mapData.orders}
              zones={mapData.zones}
              drivers={mapData.drivers}
            />
          )}
        </CardContent>
      </Card>

      {/* Légende */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Légende</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center">
                <MapPin className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="font-medium">Point de commande</p>
                <p className="text-sm text-gray-500">Adresse de livraison</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-orange-500 flex items-center justify-center">
                <Truck className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="font-medium">Livreur</p>
                <p className="text-sm text-gray-500">Position actuelle</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 border-4 border-green-500 rounded"></div>
              <div>
                <p className="font-medium">Zone de livraison</p>
                <p className="text-sm text-gray-500">Polygone de couverture</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
