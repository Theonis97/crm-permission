"use client"

import { useState, useEffect } from "react"
import { MapIcon, User, Package, Phone, ChevronRight } from "lucide-react"
import dynamic from 'next/dynamic'
import { DriverStatsModal } from "@/components/delivery/driver-stats-modal"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"

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
  const [mapData, setMapData] = useState<MapData | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedDriver, setSelectedDriver] = useState<{ id: string; name: string } | null>(null)
  const [isStatsModalOpen, setIsStatsModalOpen] = useState(false)

  // Récupérer uniquement les commandes du jour
  const fetchMapData = async () => {
    try {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      
      const response = await fetch(`/api/delivery/map?date=${today.toISOString()}`)
      const data = await response.json()

      if (data.success) {
        // Filtrer côté client pour s'assurer qu'on a uniquement les commandes du jour
        const todayOrders = data.data.orders.filter((order: Order) => {
          const orderDate = new Date(order.createdAt)
          orderDate.setHours(0, 0, 0, 0)
          return orderDate.getTime() === today.getTime()
        })
        
        setMapData({
          ...data.data,
          orders: todayOrders
        })
      }
    } catch (error) {
      console.error('Erreur chargement carte:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMapData()
    // Rafraîchir toutes les 30 secondes
    const interval = setInterval(fetchMapData, 30000)
    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <MapIcon className="h-16 w-16 text-gray-400 mx-auto mb-4 animate-pulse" />
          <p className="text-gray-600 font-medium">Chargement de la carte de livraison...</p>
        </div>
      </div>
    )
  }

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
    <div className="h-screen w-full flex">
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
        />
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
    </div>
  )
}
