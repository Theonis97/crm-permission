"use client"

import { useState } from "react"
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
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet"
import { Warehouse, Loader2 } from "lucide-react"

interface CreateWarehouseSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onWarehouseCreated?: () => void
}

export function CreateWarehouseSheet({
  open,
  onOpenChange,
  onWarehouseCreated,
}: CreateWarehouseSheetProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    address: "",
    city: "",
    postalCode: "",
    country: "France",
    capacityValue: "",
    capacityUnit: "m²",
    responsibleUserId: "",
    status: "ACTIVE",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // TODO: Appel API pour créer l'entrepôt
      console.log("Create warehouse:", formData)
      
      // Simulation
      await new Promise((resolve) => setTimeout(resolve, 1000))

      onWarehouseCreated?.()
      onOpenChange(false)
      
      // Reset form
      setFormData({
        name: "",
        code: "",
        address: "",
        city: "",
        postalCode: "",
        country: "France",
        capacityValue: "",
        capacityUnit: "m²",
        responsibleUserId: "",
        status: "ACTIVE",
      })
    } catch (error) {
      console.error("Error creating warehouse:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-[600px] overflow-y-auto">
        <SheetHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-950 rounded-lg flex items-center justify-center">
              <Warehouse className="h-5 w-5 text-white" />
            </div>
            <div>
              <SheetTitle>Nouvel entrepôt</SheetTitle>
              <SheetDescription>Créer un nouveau site de stockage</SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-6">
          {/* Informations générales */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900">Informations générales</h3>
            
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Nom de l'entrepôt *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Entrepôt Principal"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="code">Code *</Label>
                <Input
                  id="code"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  placeholder="WH-001"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Adresse *</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="123 Rue de la République"
                required
              />
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="city">Ville *</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  placeholder="Paris"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="postalCode">Code postal *</Label>
                <Input
                  id="postalCode"
                  value={formData.postalCode}
                  onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                  placeholder="75001"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="country">Pays *</Label>
                <Input
                  id="country"
                  value={formData.country}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                  placeholder="France"
                  required
                />
              </div>
            </div>
          </div>

          {/* Capacité */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900">Capacité</h3>
            
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="capacityValue">Valeur *</Label>
                <Input
                  id="capacityValue"
                  type="number"
                  value={formData.capacityValue}
                  onChange={(e) => setFormData({ ...formData, capacityValue: e.target.value })}
                  placeholder="5000"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="capacityUnit">Unité *</Label>
                <Select
                  value={formData.capacityUnit}
                  onValueChange={(value) => setFormData({ ...formData, capacityUnit: value })}
                >
                  <SelectTrigger id="capacityUnit">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="m²">m² (Surface)</SelectItem>
                    <SelectItem value="m³">m³ (Volume)</SelectItem>
                    <SelectItem value="unités">Unités</SelectItem>
                    <SelectItem value="palettes">Palettes</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Responsable */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900">Responsable</h3>
            
            <div className="space-y-2">
              <Label htmlFor="responsibleUserId">Utilisateur responsable *</Label>
              <Select
                value={formData.responsibleUserId}
                onValueChange={(value) => setFormData({ ...formData, responsibleUserId: value })}
              >
                <SelectTrigger id="responsibleUserId">
                  <SelectValue placeholder="Sélectionner un utilisateur" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user-1">Jean Dupont</SelectItem>
                  <SelectItem value="user-2">Marie Martin</SelectItem>
                  <SelectItem value="user-3">Pierre Dubois</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Statut */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900">Statut</h3>
            
            <div className="space-y-2">
              <Label htmlFor="status">Statut de l'entrepôt *</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData({ ...formData, status: value })}
              >
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">Actif</SelectItem>
                  <SelectItem value="INACTIVE">Inactif</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <SheetFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Créer l'entrepôt
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}
