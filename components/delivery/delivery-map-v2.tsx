"use client"

import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { MapPin, Truck, Package, X, Filter, Store, CheckSquare, Square } from 'lucide-react'
import { renderToStaticMarkup } from 'react-dom/server'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'

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

interface Store {
  id: string
  name: string
  activeOrdersCount: number
}

interface DeliveryMapV2Props {
  orders: Order[]
  zones: Zone[]
  drivers: Driver[]
}

// Créer des icônes customisées
const createCustomIcon = (color: string, icon: 'pin' | 'truck') => {
  const iconMarkup = icon === 'pin' 
    ? renderToStaticMarkup(
        <div style={{
          backgroundColor: color,
          borderRadius: '50% 50% 50% 0',
          width: '30px',
          height: '30px',
          transform: 'rotate(-45deg)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '2px solid white',
          boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
        }}>
          <div style={{ transform: 'rotate(45deg)', color: 'white', fontSize: '14px' }}>📦</div>
        </div>
      )
    : renderToStaticMarkup(
        <div style={{
          backgroundColor: color,
          borderRadius: '50%',
          width: '36px',
          height: '36px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '3px solid white',
          boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
        }}>
          <div style={{ color: 'white', fontSize: '18px' }}>🚚</div>
        </div>
      )

  return L.divIcon({
    html: iconMarkup,
    className: 'custom-marker',
    iconSize: [icon === 'pin' ? 30 : 36, icon === 'pin' ? 30 : 36],
    iconAnchor: [icon === 'pin' ? 15 : 18, icon === 'pin' ? 30 : 18],
    popupAnchor: [0, icon === 'pin' ? -30 : -18],
  })
}

const getStatusColor = (status: string): string => {
  const colors: Record<string, string> = {
    PENDING: '#f59e0b',
    CONFIRMED: '#3b82f6',
    PREPARING: '#8b5cf6',
    READY: '#10b981',
    DELIVERING: '#9c27b0',
    DELIVERED: '#22c55e',
    CANCELLED: '#ef4444',
    REPORTED: '#f97316',
  }
  return colors[status] || '#6b7280'
}

const getStatusLabel = (status: string): string => {
  const labels: Record<string, string> = {
    PENDING: 'En attente',
    CONFIRMED: 'Acceptée',  // Confirmée = Acceptée
    PREPARING: 'En préparation',
    READY: 'Prête',
    DELIVERING: 'En cours de livraison',
    DELIVERED: 'Livrée',
    CANCELLED: 'Annulée',
    REPORTED: 'Reportée',
  }
  return labels[status] || status
}

export default function DeliveryMapV2({ orders, zones, drivers }: DeliveryMapV2Props) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<L.Map | null>(null)
  
  // États pour les filtres
  const [selectedStores, setSelectedStores] = useState<string[]>([])
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([])
  const [showStorePanel, setShowStorePanel] = useState(true)
  const [showStatusPanel, setShowStatusPanel] = useState(true)

  // Extraire les magasins uniques avec compteur de commandes
  const stores: Store[] = Array.from(
    orders.reduce((map, order) => {
      const storeId = order.store.id
      const existing = map.get(storeId)
      if (existing) {
        existing.activeOrdersCount++
      } else {
        map.set(storeId, {
          id: storeId,
          name: order.store.name,
          activeOrdersCount: 1
        })
      }
      return map
    }, new Map<string, Store>()).values()
  )

  // Tous les statuts possibles (sans PREPARING et READY)
  const statuses = [
    { value: 'PENDING', label: 'En attente', color: '#f59e0b' },
    { value: 'CONFIRMED', label: 'Acceptée', color: '#3b82f6' },
    { value: 'DELIVERING', label: 'En cours de livraison', color: '#9c27b0' },
    { value: 'DELIVERED', label: 'Livrée', color: '#22c55e' },
    { value: 'CANCELLED', label: 'Annulée', color: '#ef4444' },
    { value: 'REPORTED', label: 'Reportée', color: '#f97316' },
  ]

  // Filtrer les commandes
  const filteredOrders = orders.filter(order => {
    // Filtrer par magasin
    if (selectedStores.length > 0 && !selectedStores.includes(order.store.id)) {
      return false
    }
    // Filtrer par statut
    if (selectedStatuses.length > 0 && !selectedStatuses.includes(order.status)) {
      return false
    }
    return true
  })

  // Toggle magasin
  const toggleStore = (storeId: string) => {
    setSelectedStores(prev => 
      prev.includes(storeId) 
        ? prev.filter(id => id !== storeId)
        : [...prev, storeId]
    )
  }

  // Toggle statut
  const toggleStatus = (status: string) => {
    setSelectedStatuses(prev => 
      prev.includes(status) 
        ? prev.filter(s => s !== status)
        : [...prev, status]
    )
  }

  // Initialiser la carte
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return

    // Initialiser la carte centrée sur Abidjan, Côte d'Ivoire
    const map = L.map(mapRef.current).setView([5.3600, -4.0083], 12)

    // Ajouter la couche de tuiles OpenStreetMap
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map)

    mapInstanceRef.current = map

    return () => {
      map.remove()
      mapInstanceRef.current = null
    }
  }, [])

  // Mettre à jour les markers
  useEffect(() => {
    const map = mapInstanceRef.current
    if (!map) return

    // Nettoyer les anciens markers et polygones
    map.eachLayer((layer) => {
      if (layer instanceof L.Marker || layer instanceof L.Polygon) {
        map.removeLayer(layer)
      }
    })

    // 1. Dessiner les zones (polygones)
    zones.forEach(zone => {
      if (zone.coordinates && zone.coordinates.length >= 3) {
        const latlngs: L.LatLngExpression[] = zone.coordinates.map(coord => [coord.lat, coord.lng])
        
        const polygon = L.polygon(latlngs, {
          color: zone.color,
          fillColor: zone.color,
          fillOpacity: 0.15,
          weight: 2,
        }).addTo(map)

        // Popup pour la zone
        const popupContent = `
          <div style="padding: 12px; min-width: 220px;">
            <h3 style="margin: 0 0 10px 0; font-size: 16px; font-weight: 700; color: ${zone.color}; border-bottom: 2px solid ${zone.color}; padding-bottom: 6px;">
              📍 ${zone.name}
            </h3>
            <div style="display: flex; flex-direction: column; gap: 6px;">
              <div style="display: flex; justify-content: space-between; font-size: 13px;">
                <span style="color: #6b7280; font-weight: 500;">Livreur:</span>
                <span style="font-weight: 600; color: #111827;">${zone.deliveryPerson?.name || 'Non assigné'}</span>
              </div>
              <div style="display: flex; justify-content: space-between; font-size: 13px;">
                <span style="color: #6b7280; font-weight: 500;">Frais:</span>
                <span style="font-weight: 600; color: #059669;">${zone.deliveryFee.toLocaleString()} FCFA</span>
              </div>
              <div style="display: flex; justify-content: space-between; font-size: 13px;">
                <span style="color: #6b7280; font-weight: 500;">Temps estimé:</span>
                <span style="font-weight: 600; color: #111827;">${zone.estimatedTime || 'N/A'} min</span>
              </div>
              <div style="display: flex; justify-content: space-between; font-size: 13px;">
                <span style="color: #6b7280; font-weight: 500;">Commandes actives:</span>
                <span style="font-weight: 700; color: #dc2626;">${zone.activeOrders}</span>
              </div>
            </div>
          </div>
        `
        polygon.bindPopup(popupContent)
      }
    })

    // 2. Ajouter les markers de commandes filtrées
    filteredOrders.forEach(order => {
      const marker = L.marker(
        [order.coordinates.lat, order.coordinates.lng],
        { icon: createCustomIcon(getStatusColor(order.status), 'pin') }
      ).addTo(map)

      // Popup amélioré pour la commande
      const popupContent = `
        <div style="padding: 12px; min-width: 260px;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; border-bottom: 2px solid ${getStatusColor(order.status)}; padding-bottom: 8px;">
            <h3 style="margin: 0; font-size: 18px; font-weight: 700; color: #111827;">
              📦 ${order.number}
            </h3>
            <span style="background: ${getStatusColor(order.status)}; color: white; padding: 3px 10px; border-radius: 12px; font-size: 11px; font-weight: 600;">
              ${getStatusLabel(order.status)}
            </span>
          </div>
          
          <div style="display: flex; flex-direction: column; gap: 8px;">
            <div style="background: #f9fafb; padding: 8px; border-radius: 6px;">
              <p style="margin: 0 0 4px 0; font-size: 11px; color: #6b7280; text-transform: uppercase; font-weight: 600;">Client</p>
              <p style="margin: 0; font-size: 14px; font-weight: 600; color: #111827;">${order.customerName}</p>
              <p style="margin: 4px 0 0 0; font-size: 12px; color: #6b7280;">📞 ${order.customerPhone || 'N/A'}</p>
            </div>
            
            <div style="background: #f9fafb; padding: 8px; border-radius: 6px;">
              <p style="margin: 0 0 4px 0; font-size: 11px; color: #6b7280; text-transform: uppercase; font-weight: 600;">Adresse</p>
              <p style="margin: 0; font-size: 13px; color: #111827; line-height: 1.4;">${order.deliveryAddress}</p>
            </div>
            
            <div style="display: flex; justify-content: space-between; align-items: center; background: #ecfdf5; padding: 8px; border-radius: 6px; border-left: 3px solid #059669;">
              <span style="font-size: 12px; color: #047857; font-weight: 600;">Total</span>
              <span style="font-size: 16px; font-weight: 700; color: #059669;">${order.total.toLocaleString()} FCFA</span>
            </div>
            
            ${order.deliveryZone ? `
              <div style="background: #f0f9ff; padding: 8px; border-radius: 6px; border-left: 3px solid #3b82f6;">
                <p style="margin: 0; font-size: 12px; color: #1e40af;">
                  <strong>Zone:</strong> ${order.deliveryZone.name}
                </p>
              </div>
            ` : ''}
            
            ${order.deliveryPerson ? `
              <div style="background: #fef3c7; padding: 8px; border-radius: 6px; border-left: 3px solid #f59e0b;">
                <p style="margin: 0; font-size: 12px; color: #92400e;">
                  <strong>🚚 Livreur:</strong> ${order.deliveryPerson.name}
                </p>
              </div>
            ` : `
              <div style="background: #fee2e2; padding: 8px; border-radius: 6px; border-left: 3px solid #dc2626;">
                <p style="margin: 0; font-size: 12px; color: #991b1b;">
                  <strong>⚠️ Aucun livreur assigné</strong>
                </p>
              </div>
            `}
            
            <div style="background: #f3f4f6; padding: 6px; border-radius: 6px;">
              <p style="margin: 0; font-size: 11px; color: #6b7280;">
                <strong>Magasin:</strong> ${order.store.name}
              </p>
            </div>
          </div>
        </div>
      `
      marker.bindPopup(popupContent, { maxWidth: 300 })
    })

    // 3. Ajouter les markers des livreurs
    drivers.forEach(driver => {
      const marker = L.marker(
        [driver.coordinates.lat, driver.coordinates.lng],
        { icon: createCustomIcon('#ff6b35', 'truck') }
      ).addTo(map)

      // Popup amélioré pour le livreur
      const popupContent = `
        <div style="padding: 12px; min-width: 240px;">
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 10px; border-bottom: 2px solid #ff6b35; padding-bottom: 8px;">
            <span style="font-size: 24px;">🚚</span>
            <h3 style="margin: 0; font-size: 18px; font-weight: 700; color: #111827;">
              ${driver.name}
            </h3>
          </div>
          
          <div style="display: flex; flex-direction: column; gap: 8px;">
            <div style="background: #f9fafb; padding: 8px; border-radius: 6px;">
              <p style="margin: 0; font-size: 12px; color: #6b7280;">
                <strong>📞 Téléphone:</strong>
              </p>
              <p style="margin: 4px 0 0 0; font-size: 14px; font-weight: 600; color: #111827;">
                ${driver.phone || 'N/A'}
              </p>
            </div>
            
            <div style="background: #dbeafe; padding: 8px; border-radius: 6px; border-left: 3px solid ${driver.zone.color};">
              <p style="margin: 0; font-size: 12px; color: #1e40af;">
                <strong>📍 Zone:</strong> ${driver.zone.name}
              </p>
            </div>
            
            <div style="background: ${driver.activeOrders.length > 0 ? '#dcfce7' : '#f3f4f6'}; padding: 8px; border-radius: 6px;">
              <p style="margin: 0 0 4px 0; font-size: 12px; color: ${driver.activeOrders.length > 0 ? '#166534' : '#6b7280'}; font-weight: 600;">
                Commandes en cours: <span style="font-size: 16px; font-weight: 700;">${driver.activeOrders.length}</span>
              </p>
            </div>
            
            ${driver.activeOrders.length > 0 ? `
              <div style="background: #fff7ed; padding: 8px; border-radius: 6px; border-top: 2px solid #fed7aa;">
                <p style="margin: 0 0 6px 0; font-size: 11px; color: #92400e; font-weight: 600; text-transform: uppercase;">Détails des commandes</p>
                ${driver.activeOrders.map(order => `
                  <div style="margin: 4px 0; padding: 4px 8px; background: white; border-radius: 4px; border-left: 2px solid ${getStatusColor(order.status)};">
                    <p style="margin: 0; font-size: 12px; color: #111827; font-weight: 600;">
                      • ${order.number}
                    </p>
                    <p style="margin: 2px 0 0 0; font-size: 11px; color: ${getStatusColor(order.status)}; font-weight: 500;">
                      ${getStatusLabel(order.status)}
                    </p>
                  </div>
                `).join('')}
              </div>
            ` : ''}
          </div>
        </div>
      `
      marker.bindPopup(popupContent, { maxWidth: 300 })
    })

    // Ajuster les bounds pour afficher tous les éléments filtrés
    if (filteredOrders.length > 0 || zones.length > 0 || drivers.length > 0) {
      const bounds = L.latLngBounds([])
      
      filteredOrders.forEach(order => {
        bounds.extend([order.coordinates.lat, order.coordinates.lng])
      })
      
      zones.forEach(zone => {
        zone.coordinates.forEach(coord => {
          bounds.extend([coord.lat, coord.lng])
        })
      })
      
      drivers.forEach(driver => {
        bounds.extend([driver.coordinates.lat, driver.coordinates.lng])
      })
      
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [50, 50] })
      }
    }
  }, [filteredOrders, zones, drivers])

  return (
    <div className="relative w-full h-screen">
      {/* Map */}
      <div 
        ref={mapRef} 
        className="w-full h-full"
        style={{ zIndex: 0 }}
      />

      {/* Panel Magasins */}
      <div 
        className="absolute top-4 left-4 z-[1000] bg-white rounded-lg shadow-lg"
        style={{ maxHeight: 'calc(100vh - 200px)' }}
      >
        <Card className="w-80 border-0">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Store className="h-5 w-5 text-blue-600" />
                <h3 className="font-bold text-base">Magasins</h3>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowStorePanel(!showStorePanel)}
                className="h-6 w-6 p-0"
              >
                {showStorePanel ? <X className="h-4 w-4" /> : <Filter className="h-4 w-4" />}
              </Button>
            </div>

            {showStorePanel && (
              <ScrollArea className="max-h-64">
                <div className="space-y-2">
                  {stores.length === 0 ? (
                    <p className="text-sm text-gray-500">Aucun magasin</p>
                  ) : (
                    stores.map(store => (
                      <div
                        key={store.id}
                        className="flex items-center space-x-3 p-2 rounded-md hover:bg-gray-50 cursor-pointer transition-colors"
                        onClick={() => toggleStore(store.id)}
                      >
                        <Checkbox
                          checked={selectedStores.includes(store.id)}
                          onCheckedChange={() => toggleStore(store.id)}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{store.name}</p>
                        </div>
                        <Badge variant="secondary" className="shrink-0">
                          {store.activeOrdersCount}
                        </Badge>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            )}

            {selectedStores.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedStores([])}
                className="w-full mt-3"
              >
                Tout afficher
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Panel Statuts */}
        <Card className="w-80 border-0 mt-4">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Filter className="h-5 w-5 text-purple-600" />
                <h3 className="font-bold text-base">Statuts</h3>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowStatusPanel(!showStatusPanel)}
                className="h-6 w-6 p-0"
              >
                {showStatusPanel ? <X className="h-4 w-4" /> : <Filter className="h-4 w-4" />}
              </Button>
            </div>

            {showStatusPanel && (
              <div className="space-y-2">
                {statuses.map(status => {
                  const count = orders.filter(o => o.status === status.value).length
                  return (
                    <div
                      key={status.value}
                      className="flex items-center space-x-3 p-2 rounded-md hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => toggleStatus(status.value)}
                    >
                      <Checkbox
                        checked={selectedStatuses.includes(status.value)}
                        onCheckedChange={() => toggleStatus(status.value)}
                      />
                      <div className="flex items-center gap-2 flex-1">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: status.color }}
                        />
                        <p className="text-sm font-medium">{status.label}</p>
                      </div>
                      <Badge variant="secondary" className="shrink-0">
                        {count}
                      </Badge>
                    </div>
                  )
                })}
              </div>
            )}

            {selectedStatuses.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedStatuses([])}
                className="w-full mt-3"
              >
                Tous les statuts
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Compteur de commandes filtrées */}
      <div className="absolute bottom-4 left-4 z-[1000] bg-white rounded-lg shadow-lg px-4 py-2">
        <p className="text-sm font-semibold text-gray-700">
          <Package className="inline h-4 w-4 mr-2 text-blue-600" />
          {filteredOrders.length} commande{filteredOrders.length > 1 ? 's' : ''} affichée{filteredOrders.length > 1 ? 's' : ''}
        </p>
      </div>
    </div>
  )
}
