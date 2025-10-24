"use client"

import { useState, useEffect } from "react"
import { MapIcon } from "lucide-react"
import dynamic from 'next/dynamic'

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

  return (
    <div className="h-screen w-full">
      <DeliveryMapV2
        orders={mapData.orders}
        zones={mapData.zones}
        drivers={mapData.drivers}
      />
    </div>
  )
}
