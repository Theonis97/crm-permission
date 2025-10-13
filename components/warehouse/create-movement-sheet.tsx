"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
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
  const [products, setProducts] = useState<any[]>([])
  const [loadingProducts, setLoadingProducts] = useState(true)
  const [formData, setFormData] = useState({
    type: defaultType,
    subtype: "ENTRY",
    productId: "",
    quantity: "",
    note: "",
  })

  useEffect(() => {
    if (open) {
      loadProducts()
      // Reset form when opening
      setFormData({
        type: defaultType,
        subtype: getInitialSubtype(defaultType),
        productId: "",
        quantity: "",
        note: "",
      })
    }
  }, [open, defaultType])

  const getInitialSubtype = (type: string) => {
    switch (type) {
      case "IN":
        return "ENTRY"
      case "OUT":
        return "EXIT"
      case "TRANSFER":
        return "ENTRY"
      default:
        return "ADJUSTMENT"
    }
  }

  const loadProducts = async () => {
    try {
      setLoadingProducts(true)
      const response = await fetch("/api/products")
      if (!response.ok) throw new Error("Erreur lors du chargement")
      const data = await response.json()
      setProducts(data)
    } catch (error) {
      console.error("Error loading products:", error)
      toast.error("Erreur lors du chargement des produits")
    } finally {
      setLoadingProducts(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.productId || !formData.quantity) {
      toast.error("Veuillez remplir tous les champs requis")
      return
    }

    setLoading(true)

    try {
      const response = await fetch("/api/stock-movements", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          productId: formData.productId,
          quantity: parseInt(formData.quantity),
          type: formData.subtype,
          note: formData.note || null,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Erreur lors de la création")
      }

      toast.success("Mouvement créé avec succès")
      onMovementCreated?.()
      onOpenChange(false)
    } catch (error: any) {
      console.error("Error creating movement:", error)
      toast.error(error.message || "Erreur lors de la création du mouvement")
    } finally {
      setLoading(false)
    }
  }

  const getSubtypeOptions = () => {
    switch (formData.type) {
      case "IN":
        return [
          { value: "ENTRY", label: "Entrée (Achat, réception)" },
          { value: "RETURN", label: "Retour client" },
        ]
      case "OUT":
        return [
          { value: "SALE", label: "Vente" },
          { value: "EXIT", label: "Sortie (Livraison, perte)" },
        ]
      case "ADJUSTMENT":
        return [
          { value: "ADJUSTMENT", label: "Ajustement inventaire" },
        ]
      default:
        return [
          { value: "ENTRY", label: "Entrée" },
        ]
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
                  setFormData({ ...formData, type: "IN", subtype: "ENTRY" })
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
                  setFormData({ ...formData, type: "ADJUSTMENT", subtype: "ADJUSTMENT" })
                }}
                className={cn(
                  "flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all",
                  formData.type === "ADJUSTMENT"
                    ? "border-amber-600 bg-amber-50"
                    : "border-gray-200 hover:border-gray-300"
                )}
              >
                <TrendingUp className={cn("h-6 w-6", formData.type === "ADJUSTMENT" ? "text-amber-600" : "text-gray-400")} />
                <span className={cn("text-sm font-medium", formData.type === "ADJUSTMENT" ? "text-amber-900" : "text-gray-600")}>
                  Ajustement
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
                  {loadingProducts ? (
                    <SelectItem value="loading" disabled>
                      Chargement...
                    </SelectItem>
                  ) : products.length === 0 ? (
                    <SelectItem value="empty" disabled>
                      Aucun produit
                    </SelectItem>
                  ) : (
                    products.map((product) => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.sku ? `${product.sku} - ` : ""}{product.name} (Stock: {product.stock})
                      </SelectItem>
                    ))
                  )}
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


          {/* Informations complémentaires */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900">Informations complémentaires</h3>
            
            <div className="space-y-2">
              <Label htmlFor="note">Note</Label>
              <Textarea
                id="note"
                value={formData.note}
                onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                placeholder="Raison du mouvement, observations..."
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
