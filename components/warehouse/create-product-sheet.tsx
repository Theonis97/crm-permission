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
import { Package, Loader2 } from "lucide-react"

interface CreateProductSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onProductCreated?: () => void
}

export function CreateProductSheet({
  open,
  onOpenChange,
  onProductCreated,
}: CreateProductSheetProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    sku: "",
    name: "",
    description: "",
    category: "FINISHED_PRODUCT",
    unit: "PIECE",
    warehouseId: "",
    zoneId: "",
    quantityAvailable: "",
    quantityReserved: "0",
    quantityMin: "",
    quantityMax: "",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // TODO: Appel API pour créer le produit
      console.log("Create product:", formData)
      
      // Simulation
      await new Promise((resolve) => setTimeout(resolve, 1000))

      onProductCreated?.()
      onOpenChange(false)
      
      // Reset form
      setFormData({
        sku: "",
        name: "",
        description: "",
        category: "FINISHED_PRODUCT",
        unit: "PIECE",
        warehouseId: "",
        zoneId: "",
        quantityAvailable: "",
        quantityReserved: "0",
        quantityMin: "",
        quantityMax: "",
      })
    } catch (error) {
      console.error("Error creating product:", error)
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
              <Package className="h-5 w-5 text-white" />
            </div>
            <div>
              <SheetTitle>Nouveau produit</SheetTitle>
              <SheetDescription>Ajouter un produit à l'inventaire</SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-6">
          {/* Informations générales */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900">Informations générales</h3>
            
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="sku">SKU / Référence *</Label>
                <Input
                  id="sku"
                  value={formData.sku}
                  onChange={(e) => setFormData({ ...formData, sku: e.target.value.toUpperCase() })}
                  placeholder="PRD-001"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Catégorie *</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData({ ...formData, category: value })}
                >
                  <SelectTrigger id="category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FINISHED_PRODUCT">Produit fini</SelectItem>
                    <SelectItem value="RAW_MATERIAL">Matière première</SelectItem>
                    <SelectItem value="SEMI_FINISHED">Semi-fini</SelectItem>
                    <SelectItem value="CONSUMABLE">Consommable</SelectItem>
                    <SelectItem value="PACKAGING">Emballage</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Nom du produit *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ordinateur portable Dell XPS 15"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Description détaillée du produit..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="unit">Unité de mesure *</Label>
              <Select
                value={formData.unit}
                onValueChange={(value) => setFormData({ ...formData, unit: value })}
              >
                <SelectTrigger id="unit">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PIECE">Pièce</SelectItem>
                  <SelectItem value="KG">Kilogramme</SelectItem>
                  <SelectItem value="LITER">Litre</SelectItem>
                  <SelectItem value="METER">Mètre</SelectItem>
                  <SelectItem value="BOX">Boîte</SelectItem>
                  <SelectItem value="PALLET">Palette</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Localisation */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900">Localisation</h3>
            
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="warehouseId">Entrepôt *</Label>
                <Select
                  value={formData.warehouseId}
                  onValueChange={(value) => setFormData({ ...formData, warehouseId: value })}
                >
                  <SelectTrigger id="warehouseId">
                    <SelectValue placeholder="Sélectionner un entrepôt" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Entrepôt Principal</SelectItem>
                    <SelectItem value="2">Entrepôt Lyon</SelectItem>
                    <SelectItem value="3">Entrepôt Marseille</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="zoneId">Zone (optionnel)</Label>
                <Select
                  value={formData.zoneId}
                  onValueChange={(value) => setFormData({ ...formData, zoneId: value })}
                >
                  <SelectTrigger id="zoneId">
                    <SelectValue placeholder="Sélectionner une zone" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="z1">Zone Réception</SelectItem>
                    <SelectItem value="z2">Zone Stockage A</SelectItem>
                    <SelectItem value="z3">Zone Picking</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Quantités */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900">Quantités</h3>
            
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="quantityAvailable">Quantité disponible *</Label>
                <Input
                  id="quantityAvailable"
                  type="number"
                  min="0"
                  value={formData.quantityAvailable}
                  onChange={(e) => setFormData({ ...formData, quantityAvailable: e.target.value })}
                  placeholder="100"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="quantityReserved">Quantité réservée</Label>
                <Input
                  id="quantityReserved"
                  type="number"
                  min="0"
                  value={formData.quantityReserved}
                  onChange={(e) => setFormData({ ...formData, quantityReserved: e.target.value })}
                  placeholder="0"
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="quantityMin">Seuil minimum *</Label>
                <Input
                  id="quantityMin"
                  type="number"
                  min="0"
                  value={formData.quantityMin}
                  onChange={(e) => setFormData({ ...formData, quantityMin: e.target.value })}
                  placeholder="20"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="quantityMax">Seuil maximum *</Label>
                <Input
                  id="quantityMax"
                  type="number"
                  min="0"
                  value={formData.quantityMax}
                  onChange={(e) => setFormData({ ...formData, quantityMax: e.target.value })}
                  placeholder="500"
                  required
                />
              </div>
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
              Créer le produit
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}
