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
import { TrendingUp, Loader2, ArrowDownRight, ArrowUpRight, ArrowRightLeft } from "lucide-react"
import { cn } from "@/lib/utils"

interface CreateMovementSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onMovementCreated?: () => void
  defaultType?: "IN" | "OUT" | "TRANSFER" | "ADJUSTMENT"
}

export function CreateMovementSheet({
  open,
  onOpenChange,
  onMovementCreated,
  defaultType = "IN",
}: CreateMovementSheetProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    type: defaultType,
    subtype: "PURCHASE",
    productId: "",
    quantity: "",
    fromWarehouseId: "",
    toWarehouseId: "",
    reason: "",
    notes: "",
    documentNumber: "",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // TODO: Appel API pour créer le mouvement
      console.log("Create movement:", formData)
      
      // Simulation
      await new Promise((resolve) => setTimeout(resolve, 1000))

      onMovementCreated?.()
      onOpenChange(false)
      
      // Reset form
      setFormData({
        type: "IN",
        subtype: "PURCHASE",
        productId: "",
        quantity: "",
        fromWarehouseId: "",
        toWarehouseId: "",
        reason: "",
        notes: "",
        documentNumber: "",
      })
    } catch (error) {
      console.error("Error creating movement:", error)
    } finally {
      setLoading(false)
    }
  }

  const getSubtypeOptions = () => {
    switch (formData.type) {
      case "IN":
        return [
          { value: "PURCHASE", label: "Achat fournisseur" },
          { value: "RETURN_CLIENT", label: "Retour client" },
          { value: "ADJUSTMENT_POSITIVE", label: "Ajustement positif" },
          { value: "PRODUCTION", label: "Production" },
        ]
      case "OUT":
        return [
          { value: "SALE", label: "Vente" },
          { value: "LOSS", label: "Perte" },
          { value: "DAMAGE", label: "Casse" },
          { value: "THEFT", label: "Vol" },
          { value: "ADJUSTMENT_NEGATIVE", label: "Ajustement négatif" },
          { value: "CONSUMPTION", label: "Consommation" },
        ]
      case "TRANSFER":
        return [{ value: "TRANSFER", label: "Transfert inter-entrepôts" }]
      default:
        return []
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "IN":
        return <ArrowDownRight className="h-5 w-5" />
      case "OUT":
        return <ArrowUpRight className="h-5 w-5" />
      case "TRANSFER":
        return <ArrowRightLeft className="h-5 w-5" />
      default:
        return <TrendingUp className="h-5 w-5" />
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case "IN":
        return "bg-green-600"
      case "OUT":
        return "bg-red-600"
      case "TRANSFER":
        return "bg-blue-600"
      default:
        return "bg-blue-950"
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-[600px] overflow-y-auto">
        <SheetHeader>
          <div className="flex items-center gap-3">
            <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center text-white", getTypeColor(formData.type))}>
              {getTypeIcon(formData.type)}
            </div>
            <div>
              <SheetTitle>Nouveau mouvement</SheetTitle>
              <SheetDescription>Enregistrer un mouvement de stock</SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-6">
          {/* Type de mouvement */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900">Type de mouvement</h3>
            
            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => {
                  setFormData({ ...formData, type: "IN", subtype: "PURCHASE" })
                }}
                className={cn(
                  "flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all",
                  formData.type === "IN"
                    ? "border-green-600 bg-green-50"
                    : "border-gray-200 hover:border-gray-300"
                )}
              >
                <ArrowDownRight className={cn("h-6 w-6", formData.type === "IN" ? "text-green-600" : "text-gray-400")} />
                <span className={cn("text-sm font-medium", formData.type === "IN" ? "text-green-900" : "text-gray-600")}>
                  Entrée
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setFormData({ ...formData, type: "OUT", subtype: "SALE" })
                }}
                className={cn(
                  "flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all",
                  formData.type === "OUT"
                    ? "border-red-600 bg-red-50"
                    : "border-gray-200 hover:border-gray-300"
                )}
              >
                <ArrowUpRight className={cn("h-6 w-6", formData.type === "OUT" ? "text-red-600" : "text-gray-400")} />
                <span className={cn("text-sm font-medium", formData.type === "OUT" ? "text-red-900" : "text-gray-600")}>
                  Sortie
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setFormData({ ...formData, type: "TRANSFER", subtype: "TRANSFER" })
                }}
                className={cn(
                  "flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all",
                  formData.type === "TRANSFER"
                    ? "border-blue-600 bg-blue-50"
                    : "border-gray-200 hover:border-gray-300"
                )}
              >
                <ArrowRightLeft className={cn("h-6 w-6", formData.type === "TRANSFER" ? "text-blue-600" : "text-gray-400")} />
                <span className={cn("text-sm font-medium", formData.type === "TRANSFER" ? "text-blue-900" : "text-gray-600")}>
                  Transfert
                </span>
              </button>
            </div>

            <div className="space-y-2">
              <Label htmlFor="subtype">Sous-type *</Label>
              <Select
                value={formData.subtype}
                onValueChange={(value) => setFormData({ ...formData, subtype: value })}
              >
                <SelectTrigger id="subtype">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {getSubtypeOptions().map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Produit */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900">Produit</h3>
            
            <div className="space-y-2">
              <Label htmlFor="productId">Produit *</Label>
              <Select
                value={formData.productId}
                onValueChange={(value) => setFormData({ ...formData, productId: value })}
              >
                <SelectTrigger id="productId">
                  <SelectValue placeholder="Sélectionner un produit" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">LAP-DELL-001 - Laptop Dell XPS 15</SelectItem>
                  <SelectItem value="2">MOU-LOG-003 - Souris Logitech MX Master 3</SelectItem>
                  <SelectItem value="3">ECR-SAM-002 - Écran Samsung 27" 4K</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="quantity">Quantité *</Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                placeholder="10"
                required
              />
            </div>
          </div>

          {/* Entrepôts */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900">Entrepôts</h3>
            
            {formData.type === "OUT" && (
              <div className="space-y-2">
                <Label htmlFor="fromWarehouseId">Entrepôt source *</Label>
                <Select
                  value={formData.fromWarehouseId}
                  onValueChange={(value) => setFormData({ ...formData, fromWarehouseId: value })}
                >
                  <SelectTrigger id="fromWarehouseId">
                    <SelectValue placeholder="Sélectionner un entrepôt" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Entrepôt Principal</SelectItem>
                    <SelectItem value="2">Entrepôt Lyon</SelectItem>
                    <SelectItem value="3">Entrepôt Marseille</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {formData.type === "IN" && (
              <div className="space-y-2">
                <Label htmlFor="toWarehouseId">Entrepôt destination *</Label>
                <Select
                  value={formData.toWarehouseId}
                  onValueChange={(value) => setFormData({ ...formData, toWarehouseId: value })}
                >
                  <SelectTrigger id="toWarehouseId">
                    <SelectValue placeholder="Sélectionner un entrepôt" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Entrepôt Principal</SelectItem>
                    <SelectItem value="2">Entrepôt Lyon</SelectItem>
                    <SelectItem value="3">Entrepôt Marseille</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {formData.type === "TRANSFER" && (
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="fromWarehouseId">Entrepôt source *</Label>
                  <Select
                    value={formData.fromWarehouseId}
                    onValueChange={(value) => setFormData({ ...formData, fromWarehouseId: value })}
                  >
                    <SelectTrigger id="fromWarehouseId">
                      <SelectValue placeholder="Source" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Entrepôt Principal</SelectItem>
                      <SelectItem value="2">Entrepôt Lyon</SelectItem>
                      <SelectItem value="3">Entrepôt Marseille</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="toWarehouseId">Entrepôt destination *</Label>
                  <Select
                    value={formData.toWarehouseId}
                    onValueChange={(value) => setFormData({ ...formData, toWarehouseId: value })}
                  >
                    <SelectTrigger id="toWarehouseId">
                      <SelectValue placeholder="Destination" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Entrepôt Principal</SelectItem>
                      <SelectItem value="2">Entrepôt Lyon</SelectItem>
                      <SelectItem value="3">Entrepôt Marseille</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>

          {/* Informations complémentaires */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900">Informations complémentaires</h3>
            
            <div className="space-y-2">
              <Label htmlFor="reason">Motif *</Label>
              <Input
                id="reason"
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                placeholder="Réapprovisionnement fournisseur"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="documentNumber">N° de document</Label>
              <Input
                id="documentNumber"
                value={formData.documentNumber}
                onChange={(e) => setFormData({ ...formData, documentNumber: e.target.value })}
                placeholder="BR-2025-001234"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Informations complémentaires..."
                rows={3}
              />
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
              Créer le mouvement
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}
