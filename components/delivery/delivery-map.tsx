"use client"

import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { MapPin, Truck, Package } from 'lucide-react'
import { renderToStaticMarkup } from 'react-dom/server'

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

interface DeliveryMapProps {
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
  }
  return colors[status] || '#6b7280'
}

export default function DeliveryMap({ orders, zones, drivers }: DeliveryMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<L.Map | null>(null)

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
          fillOpacity: 0.2,
          weight: 3,
        }).addTo(map)

        // Popup pour la zone
        const popupContent = `
          <div style="padding: 8px;">
            <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: bold; color: ${zone.color};">
              ${zone.name}
            </h3>
            <p style="margin: 4px 0; font-size: 13px;">
              <strong>Livreur:</strong> ${zone.deliveryPerson?.name || 'Non assigné'}
            </p>
            <p style="margin: 4px 0; font-size: 13px;">
              <strong>Frais:</strong> ${zone.deliveryFee.toLocaleString()} FCFA
            </p>
            <p style="margin: 4px 0; font-size: 13px;">
              <strong>Temps estimé:</strong> ${zone.estimatedTime || 'N/A'} min
            </p>
            <p style="margin: 4px 0; font-size: 13px;">
              <strong>Commandes actives:</strong> ${zone.activeOrders}
            </p>
          </div>
        `
        polygon.bindPopup(popupContent)
      }
    })

    // 2. Ajouter les markers de commandes
    orders.forEach(order => {
      const marker = L.marker(
        [order.coordinates.lat, order.coordinates.lng],
        { icon: createCustomIcon(getStatusColor(order.status), 'pin') }
      ).addTo(map)

      // Popup pour la commande
      const popupContent = `
        <div style="padding: 8px; min-width: 200px;">
          <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: bold;">
            ${order.number}
          </h3>
          <p style="margin: 4px 0; font-size: 13px;">
            <strong>Client:</strong> ${order.customerName}
          </p>
          <p style="margin: 4px 0; font-size: 13px;">
            <strong>Téléphone:</strong> ${order.customerPhone || 'N/A'}
          </p>
          <p style="margin: 4px 0; font-size: 13px;">
            <strong>Adresse:</strong> ${order.deliveryAddress}
          </p>
          <p style="margin: 4px 0; font-size: 13px;">
            <strong>Total:</strong> ${order.total.toLocaleString()} FCFA
          </p>
          <p style="margin: 4px 0; font-size: 13px;">
            <strong>Statut:</strong> <span style="color: ${getStatusColor(order.status)}; font-weight: 600;">${order.status}</span>
          </p>
          ${order.deliveryZone ? `
            <p style="margin: 4px 0; font-size: 13px;">
              <strong>Zone:</strong> ${order.deliveryZone.name}
            </p>
          ` : ''}
          ${order.deliveryPerson ? `
            <p style="margin: 4px 0; font-size: 13px;">
              <strong>Livreur:</strong> ${order.deliveryPerson.name}
            </p>
          ` : ''}
        </div>
      `
      marker.bindPopup(popupContent)
    })

    // 3. Ajouter les markers des livreurs
    drivers.forEach(driver => {
      const marker = L.marker(
        [driver.coordinates.lat, driver.coordinates.lng],
        { icon: createCustomIcon('#ff6b35', 'truck') }
      ).addTo(map)

      // Popup pour le livreur
      const popupContent = `
        <div style="padding: 8px;">
          <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: bold; color: #ff6b35;">
            🚚 ${driver.name}
          </h3>
          <p style="margin: 4px 0; font-size: 13px;">
            <strong>Téléphone:</strong> ${driver.phone || 'N/A'}
          </p>
          <p style="margin: 4px 0; font-size: 13px;">
            <strong>Zone:</strong> ${driver.zone.name}
          </p>
          <p style="margin: 4px 0; font-size: 13px;">
            <strong>Commandes en cours:</strong> ${driver.activeOrders.length}
          </p>
          ${driver.activeOrders.length > 0 ? `
            <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #e5e7eb;">
              ${driver.activeOrders.map(order => `
                <p style="margin: 2px 0; font-size: 12px;">
                  • ${order.number} (${order.status})
                </p>
              `).join('')}
            </div>
          ` : ''}
        </div>
      `
      marker.bindPopup(popupContent)
    })

    // Ajuster les bounds pour afficher tous les éléments
    if (orders.length > 0 || zones.length > 0 || drivers.length > 0) {
      const bounds = L.latLngBounds([])
      
      orders.forEach(order => {
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
  }, [orders, zones, drivers])

  return (
    <div 
      ref={mapRef} 
      className="w-full h-[600px] rounded-lg border border-gray-200"
      style={{ zIndex: 0 }}
    />
  )
}
