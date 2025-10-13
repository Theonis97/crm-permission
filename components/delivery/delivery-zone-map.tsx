"use client"

import { useState, useEffect, useRef } from "react"
import dynamic from "next/dynamic"
import { useMapEvents } from "react-leaflet"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { MapPin, Trash2, Undo, Check, X } from "lucide-react"
import { toast } from "sonner"
import "leaflet/dist/leaflet.css"

// Import dynamique pour éviter les erreurs SSR avec Leaflet
const MapContainer = dynamic(
  () => import("react-leaflet").then((mod) => mod.MapContainer),
  { ssr: false }
)
const TileLayer = dynamic(
  () => import("react-leaflet").then((mod) => mod.TileLayer),
  { ssr: false }
)
const Polygon = dynamic(
  () => import("react-leaflet").then((mod) => mod.Polygon),
  { ssr: false }
)
const Marker = dynamic(
  () => import("react-leaflet").then((mod) => mod.Marker),
  { ssr: false }
)
const Popup = dynamic(
  () => import("react-leaflet").then((mod) => mod.Popup),
  { ssr: false }
)

interface Coordinate {
  lat: number
  lng: number
}

interface DeliveryZoneMapProps {
  initialCoordinates?: Coordinate[]
  initialZones?: Array<{
    id: string
    name: string
    color: string
    coordinates: Coordinate[]
  }>
  onSave: (coordinates: Coordinate[]) => void
  onCancel?: () => void
  readonly?: boolean
}

function MapClickHandler({
  isDrawing,
  coordinates,
  onAddPoint,
}: {
  isDrawing: boolean
  coordinates: Coordinate[]
  onAddPoint: (lat: number, lng: number) => void
}) {
  useMapEvents({
    click(e) {
      if (isDrawing) {
        onAddPoint(e.latlng.lat, e.latlng.lng)
      }
    },
  })
  return null
}

export function DeliveryZoneMap({
  initialCoordinates = [],
  initialZones = [],
  onSave,
  onCancel,
  readonly = false,
}: DeliveryZoneMapProps) {
  const [coordinates, setCoordinates] = useState<Coordinate[]>(initialCoordinates)
  const [isDrawing, setIsDrawing] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    
    // Configurer les icônes par défaut de Leaflet
    if (typeof window !== 'undefined') {
      const L = require('leaflet')
      delete (L.Icon.Default.prototype as any)._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
      })
    }
  }, [])

  // Synchroniser avec les coordonnées externes (ex: points ajoutés via recherche)
  useEffect(() => {
    if (JSON.stringify(coordinates) !== JSON.stringify(initialCoordinates)) {
      setCoordinates(initialCoordinates)
    }
  }, [initialCoordinates])

  const handleAddPoint = (lat: number, lng: number) => {
    if (readonly) return
    
    if (coordinates.length >= 10) {
      toast.error("Maximum 10 points par zone")
      return
    }

    const newCoordinates = [...coordinates, { lat, lng }]
    setCoordinates(newCoordinates)
    onSave(newCoordinates) // Mettre à jour le parent en temps réel
    toast.success(`Point ${coordinates.length + 1} ajouté`)
  }

  const handleRemoveLastPoint = () => {
    if (coordinates.length > 0) {
      setCoordinates(coordinates.slice(0, -1))
      toast.info("Dernier point supprimé")
    }
  }

  const handleClear = () => {
    setCoordinates([])
    setIsDrawing(false)
    toast.info("Zone réinitialisée")
  }

  const handleStartDrawing = () => {
    setIsDrawing(true)
    setCoordinates([])
    toast.info("Cliquez sur la carte pour ajouter des points")
  }

  const handleFinishDrawing = () => {
    if (coordinates.length < 3) {
      toast.error("Minimum 3 points requis pour créer une zone")
      return
    }
    setIsDrawing(false)
    onSave(coordinates)
  }

  const handleCancel = () => {
    setCoordinates(initialCoordinates)
    setIsDrawing(false)
    onCancel?.()
  }

  // Gérer le déplacement d'un point
  const handleMarkerDragEnd = (index: number, lat: number, lng: number) => {
    const newCoordinates = [...coordinates]
    newCoordinates[index] = { lat, lng }
    setCoordinates(newCoordinates)
    onSave(newCoordinates) // Mettre à jour le parent en temps réel
    toast.success(`Point ${index + 1} déplacé`)
  }

  if (!mounted) {
    return (
      <div className="w-full h-[600px] bg-gray-100 rounded-lg flex items-center justify-center">
        <div className="text-gray-500">Chargement de la carte...</div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Contrôles */}
      {!readonly && (
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border">
          <div className="flex items-center gap-3">
            {!isDrawing ? (
              <Button onClick={handleStartDrawing}>
                <MapPin className="h-4 w-4 mr-2" />
                Dessiner une zone
              </Button>
            ) : (
              <>
                <Button onClick={handleFinishDrawing} variant="default" disabled={coordinates.length < 3}>
                  <Check className="h-4 w-4 mr-2" />
                  Terminer ({coordinates.length} points)
                </Button>
                <Button onClick={handleRemoveLastPoint} variant="outline" disabled={coordinates.length === 0}>
                  <Undo className="h-4 w-4 mr-2" />
                  Annuler dernier point
                </Button>
                <Button onClick={handleClear} variant="outline">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Effacer
                </Button>
                <Button onClick={handleCancel} variant="ghost">
                  <X className="h-4 w-4 mr-2" />
                  Annuler
                </Button>
              </>
            )}
          </div>
          
          {isDrawing && (
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                {coordinates.length >= 3 ? "✓ Zone valide" : `${3 - coordinates.length} point(s) manquant(s)`}
              </Badge>
            </div>
          )}
        </div>
      )}

      {/* Instructions */}
      {isDrawing && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-900">
          <strong>Instructions:</strong> Cliquez sur la carte pour ajouter des points. 
          Minimum 3 points pour un triangle, 4 pour un quadrilatère. 
          La zone se fermera automatiquement.
        </div>
      )}

      {/* Carte */}
      <div className="relative w-full h-[600px] rounded-lg overflow-hidden border-2 border-gray-200">
        <MapContainer
          center={[0.4162, 9.4673]} // Libreville, Gabon par défaut
          zoom={13}
          style={{ width: "100%", height: "100%" }}
          zoomControl={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* Zones existantes */}
          {initialZones.map((zone) => (
            <Polygon
              key={zone.id}
              positions={zone.coordinates.map((c) => [c.lat, c.lng])}
              pathOptions={{
                color: zone.color,
                fillColor: zone.color,
                fillOpacity: 0.2,
                weight: 2,
              }}
            >
              <Popup>
                <div className="text-center">
                  <strong>{zone.name}</strong>
                </div>
              </Popup>
            </Polygon>
          ))}

          {/* Zone en cours de dessin */}
          {coordinates.length >= 3 && (
            <Polygon
              positions={coordinates.map((c) => [c.lat, c.lng])}
              pathOptions={{
                color: "#3B82F6",
                fillColor: "#3B82F6",
                fillOpacity: 0.3,
                weight: 3,
                dashArray: isDrawing ? "10, 10" : undefined,
              }}
            />
          )}

          {/* Points individuels */}
          {coordinates.map((coord, index) => (
            <Marker 
              key={index} 
              position={[coord.lat, coord.lng]}
              draggable={!readonly}
              eventHandlers={{
                dragend: (e) => {
                  const marker = e.target
                  const position = marker.getLatLng()
                  handleMarkerDragEnd(index, position.lat, position.lng)
                },
              }}
            >
              <Popup>
                <div className="text-center">
                  <strong>Point {index + 1}</strong>
                  <br />
                  <span className="text-xs text-gray-600">
                    {coord.lat.toFixed(6)}, {coord.lng.toFixed(6)}
                  </span>
                  {!readonly && (
                    <div className="text-xs text-blue-600 mt-1">
                      Glissez pour déplacer
                    </div>
                  )}
                </div>
              </Popup>
            </Marker>
          ))}

          {/* Gestionnaire de clics */}
          <MapClickHandler
            isDrawing={isDrawing}
            coordinates={coordinates}
            onAddPoint={handleAddPoint}
          />
        </MapContainer>
      </div>

      {/* Résumé des coordonnées */}
      {coordinates.length > 0 && !readonly && (
        <div className="p-3 bg-gray-50 rounded-lg border text-xs">
          <strong className="text-gray-700">Coordonnées ({coordinates.length} points) :</strong>
          <div className="mt-2 space-y-1 max-h-32 overflow-y-auto">
            {coordinates.map((coord, index) => (
              <div key={index} className="text-gray-600">
                Point {index + 1}: {coord.lat.toFixed(6)}, {coord.lng.toFixed(6)}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
