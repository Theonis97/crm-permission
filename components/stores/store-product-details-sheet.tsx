"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Package,
  TrendingUp,
  TrendingDown,
  Edit,
  Plus,
  Loader2,
  Box,
  DollarSign,
  Store,
  Tag,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { ProductFormDialog } from "@/components/products/product-form-dialog"

interface StoreProductDetailsSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  productId: string | null
  storeId: string
  onUpdated?: () => void
}

export function StoreProductDetailsSheet({
  open,
  onOpenChange,
  productId,
  storeId,
  onUpdated,
}: StoreProductDetailsSheetProps) {
  const [product, setProduct] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [adjustDialogOpen, setAdjustDialogOpen] = useState(false)
  const [adjustQuantity, setAdjustQuantity] = useState("")
  const [adjustNote, setAdjustNote] = useState("")
  const [adjusting, setAdjusting] = useState(false)

  useEffect(() => {
    if (open && productId) {
      loadProduct()
    } else {
      setProduct(null)
    }
  }, [open, productId])

  const loadProduct = async () => {
    if (!productId) return

    try {
      setLoading(true)
      const response = await fetch(`/api/products/${productId}`)
      
      if (!response.ok) {
        throw new Error("Erreur lors du chargement")
      }

      const data = await response.json()
      
      // Récupérer le stock spécifique du magasin
      const storeProductResponse = await fetch(`/api/stores/${storeId}/products`)
      if (storeProductResponse.ok) {
        const storeProducts = await storeProductResponse.json()
        const storeProduct = storeProducts.find((sp: any) => sp.id === productId)
        if (storeProduct) {
          data.storeStock = storeProduct.stock
          data.storeMinStock = storeProduct.minStock
          data.storeProductId = storeProduct.storeProductId
        }
      }
      
      setProduct(data)
    } catch (error) {
      console.error("Error loading product:", error)
      toast.error("Erreur lors du chargement du produit")
    } finally {
      setLoading(false)
    }
  }

  const handleAdjustStock = async () => {
    if (!productId || !adjustQuantity) {
      toast.error("Veuillez saisir une quantité")
      return
    }

    const quantity = parseInt(adjustQuantity)
    if (isNaN(quantity)) {
      toast.error("Quantité invalide")
      return
    }

    try {
      setAdjusting(true)
      
      // Mettre à jour le StoreProduct directement
      const response = await fetch(`/api/stores/${storeId}/products/${product.storeProductId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stock: (product.storeStock || 0) + quantity,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Erreur lors de l'ajustement")
      }

      toast.success(`Stock ajusté de ${quantity > 0 ? "+" : ""}${quantity} unité(s)`)
      setAdjustDialogOpen(false)
      setAdjustQuantity("")
      setAdjustNote("")
      await loadProduct()
      onUpdated?.()
    } catch (error: any) {
      console.error("Error adjusting stock:", error)
      toast.error(error.message || "Erreur lors de l'ajustement")
    } finally {
      setAdjusting(false)
    }
  }

  const getStockStatus = () => {
    if (!product) return null
    const stock = product.storeStock ?? product.stock
    const minStock = product.storeMinStock ?? product.minStock
    
    if (stock === 0) return { label: "Rupture", color: "bg-red-50 text-red-700 border-red-200" }
    if (stock <= minStock) return { label: "Stock faible", color: "bg-amber-50 text-amber-700 border-amber-200" }
    return { label: "Stock OK", color: "bg-green-50 text-green-700 border-green-200" }
  }

  const stockStatus = getStockStatus()

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-4xl p-0 flex flex-col gap-0 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
          ) : !product ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Package className="h-12 w-12 text-gray-400 mb-4" />
              <p className="text-gray-500">Produit introuvable</p>
            </div>
          ) : (
            <>
              {/* Header fixe */}
              <div className="shrink-0 border-b bg-white">
                <SheetHeader className="p-6 pb-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="w-12 h-12 bg-blue-950 rounded-lg flex items-center justify-center shrink-0">
                        <Package className="h-6 w-6 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <SheetTitle className="text-xl font-bold">
                          {product.name}
                        </SheetTitle>
                        <SheetDescription className="flex items-center gap-2 mt-1">
                          {product.sku && (
                            <Badge variant="outline" className="text-xs">
                              {product.sku}
                            </Badge>
                          )}
                          {stockStatus && (
                            <Badge variant="outline" className={cn("text-xs", stockStatus.color)}>
                              {stockStatus.label}
                            </Badge>
                          )}
                        </SheetDescription>
                      </div>
                    </div>
                  </div>
                </SheetHeader>

                {/* Infos rapides */}
                <div className="px-6 pb-4 grid grid-cols-4 gap-4">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-gray-600 text-xs mb-1">
                      <Box className="h-3.5 w-3.5" />
                      <span>Stock magasin</span>
                    </div>
                    <div className="text-xl font-bold text-gray-900">
                      {product.storeStock ?? product.stock}
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-gray-600 text-xs mb-1">
                      <DollarSign className="h-3.5 w-3.5" />
                      <span>Prix vente</span>
                    </div>
                    <div className="text-xl font-bold text-gray-900">
                      {(product.prixVente / 1000).toFixed(0)}k XAF
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-gray-600 text-xs mb-1">
                      <TrendingDown className="h-3.5 w-3.5" />
                      <span>Stock min</span>
                    </div>
                    <div className="text-xl font-bold text-gray-900">
                      {product.storeMinStock ?? product.minStock}
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-gray-600 text-xs mb-1">
                      <Store className="h-3.5 w-3.5" />
                      <span>Stock entrepôt</span>
                    </div>
                    <div className="text-xl font-bold text-gray-900">
                      {product.stock}
                    </div>
                  </div>
                </div>
              </div>

              {/* Contenu scrollable */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Informations produit */}
                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  <h3 className="font-semibold text-gray-900">Informations</h3>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-xs text-gray-600 mb-1">Catégorie</div>
                      <Badge variant="secondary">{product.category?.name || "—"}</Badge>
                    </div>
                    <div>
                      <div className="text-xs text-gray-600 mb-1">Marque</div>
                      <Badge variant="secondary">{product.brand?.name || "—"}</Badge>
                    </div>
                  </div>

                  {product.description && (
                    <div>
                      <div className="text-xs text-gray-600 mb-1">Description</div>
                      <p className="text-sm text-gray-700">{product.description}</p>
                    </div>
                  )}
                </div>

                {/* Prix et marges */}
                <div className="bg-white border rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-3">Tarification</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Prix d'achat (HT):</span>
                      <span className="font-medium">{product.prixAchat.toLocaleString("fr-FR")} XAF</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Prix de vente (HT):</span>
                      <span className="font-medium">{product.prixVente.toLocaleString("fr-FR")} XAF</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">TVA:</span>
                      <span className="font-medium">{product.tva}%</span>
                    </div>
                    <div className="flex justify-between text-sm border-t pt-3">
                      <span className="text-gray-600">Marge brute:</span>
                      <span className="font-semibold text-green-600">
                        {(product.prixVente - product.prixAchat).toLocaleString("fr-FR")} XAF
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Marge (%):</span>
                      <span className="font-semibold text-green-600">
                        {((product.prixVente - product.prixAchat) / product.prixAchat * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* Photos */}
                {product.photos && product.photos.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-3">Photos</h3>
                    <div className="grid grid-cols-3 gap-3">
                      {product.photos.map((photo: string, index: number) => (
                        <div key={index} className="aspect-square rounded-lg border overflow-hidden bg-gray-50">
                          <img src={photo} alt={`Photo ${index + 1}`} className="w-full h-full object-cover" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Footer fixe avec boutons d'action */}
              <div className="shrink-0 border-t bg-white p-6">
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setAdjustDialogOpen(true)}
                    className="flex-1"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Ajuster le stock
                  </Button>
                  <Button
                    onClick={() => setEditDialogOpen(true)}
                    className="flex-1"
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Modifier le produit
                  </Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Dialog d'ajustement de stock */}
      <Sheet open={adjustDialogOpen} onOpenChange={setAdjustDialogOpen}>
        <SheetContent className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Ajuster le stock</SheetTitle>
            <SheetDescription>
              Ajuster le stock de {product?.name} dans ce magasin
            </SheetDescription>
          </SheetHeader>

          <div className="py-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="quantity">
                Quantité <span className="text-xs text-gray-500">(+ pour ajouter, - pour retirer)</span>
              </Label>
              <Input
                id="quantity"
                type="number"
                value={adjustQuantity}
                onChange={(e) => setAdjustQuantity(e.target.value)}
                placeholder="Ex: +10 ou -5"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="note">Note (optionnel)</Label>
              <Input
                id="note"
                value={adjustNote}
                onChange={(e) => setAdjustNote(e.target.value)}
                placeholder="Ex: Inventaire, casse..."
              />
            </div>

            {product && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="text-sm text-blue-900">
                  <div className="flex justify-between mb-1">
                    <span>Stock actuel :</span>
                    <span className="font-semibold">{product.storeStock ?? product.stock}</span>
                  </div>
                  {adjustQuantity && !isNaN(parseInt(adjustQuantity)) && (
                    <div className="flex justify-between border-t border-blue-200 pt-1 mt-1">
                      <span>Nouveau stock :</span>
                      <span className={cn(
                        "font-semibold",
                        parseInt(adjustQuantity) > 0 ? "text-green-700" : "text-red-700"
                      )}>
                        {(product.storeStock ?? product.stock) + parseInt(adjustQuantity)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setAdjustDialogOpen(false)}
              className="flex-1"
              disabled={adjusting}
            >
              Annuler
            </Button>
            <Button
              onClick={handleAdjustStock}
              className="flex-1"
              disabled={adjusting || !adjustQuantity}
            >
              {adjusting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirmer
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Dialog de modification */}
      {product && (
        <ProductFormDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          product={product}
          onSuccess={() => {
            loadProduct()
            onUpdated?.()
          }}
        />
      )}
    </>
  )
}
