"use client"

import { useState } from "react"
import { MapIcon, User, Package, Phone, ChevronRight, RefreshCw, AlertCircle, ArrowLeft, AlertTriangle } from "lucide-react"
import dynamic from 'next/dynamic'
import useSWR from 'swr'
import { DriverStatsModal } from "@/components/delivery/driver-stats-modal"
import { FailedOrdersSheet } from "@/components/delivery/failed-orders-sheet"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useRouter } from "next/navigation"

// Fetcher pour SWR
const fetcher = async (url: string) => {
  console.log('🗺️ SWR fetching map data from:', url)
  const response = await fetch(url)
  const data = await response.json()
  
  if (!data.success) {
    throw new Error(data.error || 'Erreur lors du chargement des données')
  }
  
  console.log('🗺️ SWR map data loaded:', {
    ordersCount: data.data.orders.length,
    zonesCount: data.data.zones.length,
    driversCount: data.data.drivers.length,
  })
  
  return data.data
}

// Importer la carte V2 de manière dynamique pour éviter les erreurs SSR
const DeliveryMapV2 = dynamic(() => import('@/components/delivery').then(mod => ({ default: mod.DeliveryMapV2 })), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-screen bg-gray-100">
      <div className="text-center">
        <MapIcon className="h-16 w-16 text-gray-400 mx-auto mb-4 animate-pulse" />
        <p className="text-gray-600 font-medium">Chargement de la carte...</p>
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
  coordinates: { lat: number; lng: number } | null
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
  const [selectedDriver, setSelectedDriver] = useState<{ id: string; name: string } | null>(null)
  const [isStatsModalOpen, setIsStatsModalOpen] = useState(false)
  const [isFailedOrdersOpen, setIsFailedOrdersOpen] = useState(false)
  const router = useRouter()

  // Utiliser SWR pour la récupération en temps réel
  const { 
    data: mapData, 
    error, 
    isLoading, 
    mutate,
    isValidating 
  } = useSWR<MapData>(
    '/api/delivery/driver-map',
    fetcher,
    {
      refreshInterval: 10000, // Rafraîchir toutes les 10 secondes
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      dedupingInterval: 5000, // Éviter les requêtes dupliquées
      errorRetryCount: 3,
      errorRetryInterval: 5000,
    }
  )

  // Récupérer le nombre de commandes échouées
  const { data: failedOrdersData } = useSWR(
    '/api/orders/failed-whatsapp?status=PENDING',
    fetcher,
    {
      refreshInterval: 30000, // Rafraîchir toutes les 30 secondes
      revalidateOnFocus: true,
    }
  )

  const failedOrdersCount = failedOrdersData?.count || 0

  // Affichage du loading initial uniquement
  if (isLoading && !mapData) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <MapIcon className="h-16 w-16 text-gray-400 mx-auto mb-4 animate-pulse" />
          <p className="text-gray-600 font-medium">Chargement de la carte de livraison...</p>
        </div>
      </div>
    )
  }

  // Affichage d'erreur
  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <AlertCircle className="h-16 w-16 text-red-400 mx-auto mb-4" />
          <p className="text-red-600 font-medium">Erreur de chargement</p>
          <p className="text-gray-500 text-sm mt-2">{error.message}</p>
          <Button 
            onClick={() => mutate()} 
            className="mt-4"
            variant="outline"
          >
            Réessayer
          </Button>
        </div>
      </div>
    )
  }

  // Affichage si aucune donnée
  if (!mapData) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <MapIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Aucune donnée disponible</p>
        </div>
      </div>
    )
  }

  const handleDriverClick = (driver: Driver) => {
    setSelectedDriver({ id: driver.id, name: driver.name })
    setIsStatsModalOpen(true)
  }

  return (
    <div className="h-screen w-full flex flex-col">
      {/* Header avec informations de debug */}
      <div className="bg-white border-b px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-lg font-semibold">Carte de livraison</h1>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            {isValidating && (
              <div className="flex items-center gap-1">
                <RefreshCw className="h-3 w-3 animate-spin" />
                <span>Mise à jour...</span>
              </div>
            )}
            <span>Auto-refresh: 10s</span>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Bouton commandes échouées */}
          {failedOrdersCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsFailedOrdersOpen(true)}
              className="flex items-center gap-2 border-orange-500 text-orange-600 hover:bg-orange-50"
            >
              <AlertTriangle className="h-4 w-4" />
              Erreurs WhatsApp
              <Badge variant="destructive" className="ml-1">
                {failedOrdersCount}
              </Badge>
            </Button>
          )}
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => mutate()}
            disabled={isValidating}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isValidating ? 'animate-spin' : ''}`} />
            Rafraîchir
          </Button>
        </div>
      </div>

      <div className="flex-1 flex">
        {/* Sidebar liste des livreurs */}
        <div className="w-80 border-r bg-white flex flex-col shadow-lg">
          <div className="p-4 border-b bg-gray-50">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <User className="h-5 w-5" />
            Livreurs actifs
            <Badge variant="secondary" className="ml-auto">
              {mapData.drivers.length}
            </Badge>
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Cliquez sur un livreur pour voir ses statistiques
          </p>
          
          {/* Statistiques des commandes */}
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
            <div className="bg-blue-50 p-2 rounded">
              <div className="font-medium text-blue-800">Total</div>
              <div className="text-blue-600">{mapData.orders.length}</div>
            </div>
            <div className="bg-orange-50 p-2 rounded">
              <div className="font-medium text-orange-800">En attente</div>
              <div className="text-orange-600">
                {mapData.orders.filter(o => o.status === 'PENDING').length}
              </div>
            </div>
            <div className="bg-green-50 p-2 rounded">
              <div className="font-medium text-green-800">Confirmées</div>
              <div className="text-green-600">
                {mapData.orders.filter(o => o.status === 'CONFIRMED').length}
              </div>
            </div>
            <div className="bg-purple-50 p-2 rounded">
              <div className="font-medium text-purple-800">En cours</div>
              <div className="text-purple-600">
                {mapData.orders.filter(o => o.status === 'DELIVERING').length}
              </div>
            </div>
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-2 space-y-2">
            {mapData.drivers.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <User className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                <p className="text-sm">Aucun livreur actif</p>
              </div>
            ) : (
              mapData.drivers.map((driver) => (
                <Button
                  key={driver.id}
                  variant="ghost"
                  className="w-full justify-start text-left p-3 h-auto hover:bg-gray-50"
                  onClick={() => handleDriverClick(driver)}
                >
                  <div className="flex items-start gap-3 w-full">
                    {/* Avatar avec couleur de zone */}
                    <div
                      className="h-10 w-10 rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0"
                      style={{ backgroundColor: driver.zone.color }}
                    >
                      {driver.name.charAt(0).toUpperCase()}
                    </div>

                    {/* Infos livreur */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-medium truncate">{driver.name}</p>
                        <ChevronRight className="h-4 w-4 text-gray-400 flex-shrink-0" />
                      </div>
                      
                      <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                        <Phone className="h-3 w-3" />
                        <span className="truncate">{driver.phone}</span>
                      </div>

                      {/* Zone assignée */}
                      <Badge
                        variant="outline"
                        className="mt-2 text-xs"
                        style={{
                          borderColor: driver.zone.color,
                          backgroundColor: `${driver.zone.color}15`,
                          color: driver.zone.color,
                        }}
                      >
                        {driver.zone.name}
                      </Badge>

                      {/* Commandes actives */}
                      {driver.activeOrders.length > 0 && (
                        <div className="flex items-center gap-1 mt-2 text-xs">
                          <Package className="h-3 w-3 text-orange-500" />
                          <span className="text-orange-600 font-medium">
                            {driver.activeOrders.length} commande(s) en cours
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </Button>
              ))
            )}
          </div>
        </ScrollArea>
        </div>

        {/* Carte */}
        <div className="flex-1">
          <DeliveryMapV2
            orders={mapData.orders}
            zones={mapData.zones}
            drivers={mapData.drivers}
            onOrderUpdated={() => mutate()}
          />
        </div>
      </div>

      {/* Modal des statistiques */}
      {selectedDriver && (
        <DriverStatsModal
          driverId={selectedDriver.id}
          driverName={selectedDriver.name}
          open={isStatsModalOpen}
          onOpenChange={setIsStatsModalOpen}
        />
      )}

      {/* Sheet des commandes échouées */}
      <FailedOrdersSheet
        open={isFailedOrdersOpen}
        onOpenChange={setIsFailedOrdersOpen}
        onOrderResolved={() => {
          // Rafraîchir les données après résolution d'une commande
          mutate()
        }}
      />
    </div>
  )
}
