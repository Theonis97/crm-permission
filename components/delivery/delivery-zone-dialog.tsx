"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
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
} from "@/components/ui/dialog"
import { Loader2, MapPin } from "lucide-react"
import { toast } from "sonner"
import { DeliveryZoneMap } from "./delivery-zone-map"

interface Coordinate {
  lat: number
  lng: number
}

interface DeliveryZone {
  id: string
  name: string
  color: string
  coverage?: string
  coordinates: Coordinate[]
  deliveryFee: number
  estimatedTime?: number
  deliveryPersonId?: string
}

interface DeliveryZoneDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  storeId: string
  zone?: DeliveryZone | null
  onSuccess?: () => void
}

const COLORS = [
  { value: "#3B82F6", label: "Bleu" },
  { value: "#10B981", label: "Vert" },
  { value: "#F59E0B", label: "Orange" },
  { value: "#EF4444", label: "Rouge" },
  { value: "#8B5CF6", label: "Violet" },
  { value: "#EC4899", label: "Rose" },
  { value: "#06B6D4", label: "Cyan" },
  { value: "#84CC16", label: "Lime" },
]

export function DeliveryZoneDialog({
  open,
  onOpenChange,
  storeId,
  zone,
  onSuccess,
}: DeliveryZoneDialogProps) {
  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(true)
  const [deliveryPersons, setDeliveryPersons] = useState<any[]>([])
  const [currentStep, setCurrentStep] = useState(1)
  const [coordinates, setCoordinates] = useState<Coordinate[]>([])
  
  const [formData, setFormData] = useState({
    name: "",
    color: "#3B82F6",
    coverage: "",
    deliveryFee: "",
    estimatedTime: "",
    deliveryPersonId: "",
  })

  useEffect(() => {
    if (open) {
      loadDeliveryPersons()
      if (zone) {
        setFormData({
          name: zone.name,
          color: zone.color,
          coverage: zone.coverage || "",
          deliveryFee: zone.deliveryFee.toString(),
          estimatedTime: zone.estimatedTime?.toString() || "",
          deliveryPersonId: zone.deliveryPersonId || "",
        })
        setCoordinates(zone.coordinates)
        setCurrentStep(2) // Aller directement aux détails si on édite
      } else {
        resetForm()
      }
    }
  }, [open, zone])

  const resetForm = () => {
    setFormData({
      name: "",
      color: "#3B82F6",
      coverage: "",
      deliveryFee: "",
      estimatedTime: "",
      deliveryPersonId: "",
    })
    setCoordinates([])
    setCurrentStep(1)
  }

  const loadDeliveryPersons = async () => {
    try {
      setLoadingData(true)
      const response = await fetch(`/api/delivery-persons?storeId=${storeId}`)
      
      if (response.ok) {
        const data = await response.json()
        setDeliveryPersons(data)
      }
    } catch (error) {
      console.error("Error loading delivery persons:", error)
    } finally {
      setLoadingData(false)
    }
  }

  const handleMapSave = (coords: Coordinate[]) => {
    setCoordinates(coords)
    setCurrentStep(2)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name) {
      toast.error("Le nom de la zone est requis")
      return
    }

    if (coordinates.length < 3) {
      toast.error("Veuillez dessiner une zone avec au moins 3 points")
      return
    }

    setLoading(true)

    try {
      const url = zone
        ? `/api/delivery-zones/${zone.id}`
        : "/api/delivery-zones"
      
      const method = zone ? "PATCH" : "POST"

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeId,
          name: formData.name,
          color: formData.color,
          coverage: formData.coverage || null,
          coordinates,
          deliveryFee: parseFloat(formData.deliveryFee) || 0,
          estimatedTime: formData.estimatedTime ? parseInt(formData.estimatedTime) : null,
          deliveryPersonId: formData.deliveryPersonId || null,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Erreur lors de l'enregistrement")
      }

      toast.success(zone ? "Zone mise à jour avec succès" : "Zone créée avec succès")
      onSuccess?.()
      onOpenChange(false)
      resetForm()
    } catch (error: any) {
      console.error("Error saving zone:", error)
      toast.error(error.message || "Erreur lors de l'enregistrement")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[95vh] p-0 flex flex-col gap-0">
        {/* Header */}
        <DialogHeader className="px-6 py-4 border-b shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-950 rounded-lg flex items-center justify-center">
              <MapPin className="h-5 w-5 text-white" />
            </div>
            <div>
              <DialogTitle>{zone ? "Modifier la zone" : "Nouvelle zone de livraison"}</DialogTitle>
              <DialogDescription>
                Étape {currentStep}/2 : {
                  currentStep === 1 ? "Dessiner la zone sur la carte" : "Détails et configuration"
                }
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Contenu */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto px-6 py-6">
            {/* Étape 1 : Carte */}
            {currentStep === 1 && (
              <DeliveryZoneMap
                initialCoordinates={coordinates}
                onSave={handleMapSave}
                onCancel={() => onOpenChange(false)}
              />
            )}

            {/* Étape 2 : Détails */}
            {currentStep === 2 && (
              <div className="max-w-2xl mx-auto space-y-6">
                <div className="text-center mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">Informations de la zone</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Zone avec {coordinates.length} points définis
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 space-y-2">
                    <Label htmlFor="name">
                      Nom de la zone <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Ex: Centre-ville, Zone Nord..."
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="color">Couleur</Label>
                    <Select
                      value={formData.color}
                      onValueChange={(value) => setFormData({ ...formData, color: value })}
                    >
                      <SelectTrigger id="color">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-4 h-4 rounded-full"
                            style={{ backgroundColor: formData.color }}
                          />
                          <span>{COLORS.find((c) => c.value === formData.color)?.label}</span>
                        </div>
                      </SelectTrigger>
                      <SelectContent>
                        {COLORS.map((color) => (
                          <SelectItem key={color.value} value={color.value}>
                            <div className="flex items-center gap-2">
                              <div
                                className="w-4 h-4 rounded-full"
                                style={{ backgroundColor: color.value }}
                              />
                              <span>{color.label}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="deliveryPerson">Livreur assigné</Label>
                    <Select
                      value={formData.deliveryPersonId}
                      onValueChange={(value) => setFormData({ ...formData, deliveryPersonId: value })}
                    >
                      <SelectTrigger id="deliveryPerson">
                        <SelectValue placeholder="Aucun livreur" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Aucun livreur</SelectItem>
                        {deliveryPersons.map((person) => (
                          <SelectItem key={person.id} value={person.id}>
                            {person.name} - {person.phone}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="deliveryFee">Frais de livraison (XAF)</Label>
                    <Input
                      id="deliveryFee"
                      type="number"
                      min="0"
                      value={formData.deliveryFee}
                      onChange={(e) => setFormData({ ...formData, deliveryFee: e.target.value })}
                      placeholder="0"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="estimatedTime">Temps estimé (minutes)</Label>
                    <Input
                      id="estimatedTime"
                      type="number"
                      min="0"
                      value={formData.estimatedTime}
                      onChange={(e) => setFormData({ ...formData, estimatedTime: e.target.value })}
                      placeholder="30"
                    />
                  </div>

                  <div className="col-span-2 space-y-2">
                    <Label htmlFor="coverage">Description / Couverture</Label>
                    <Textarea
                      id="coverage"
                      value={formData.coverage}
                      onChange={(e) => setFormData({ ...formData, coverage: e.target.value })}
                      placeholder="Décrivez la zone couverte..."
                      rows={3}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="shrink-0 border-t bg-white px-6 py-4">
            <div className="grid grid-cols-2 gap-4">
              {currentStep === 1 ? (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => onOpenChange(false)}
                    disabled={loading}
                  >
                    Annuler
                  </Button>
                  <Button
                    type="button"
                    disabled={coordinates.length < 3}
                    onClick={() => setCurrentStep(2)}
                  >
                    Suivant
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setCurrentStep(1)}
                    disabled={loading}
                  >
                    Retour à la carte
                  </Button>
                  <Button type="submit" disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {zone ? "Mettre à jour" : "Créer la zone"}
                  </Button>
                </>
              )}
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
