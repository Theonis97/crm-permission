"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import {
  Warehouse,
  Loader2,
  CheckCircle2,
  Search,
  X,
  Package,
  ArrowRight,
  RotateCcw,
} from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

interface StoreProduct {
  id: string
  productId: string
  stock: number
  product: {
    id: string
    name: string
    sku: string | null
    photos: string[]
    prixVente: number
  }
}

interface ReturnItem {
  productId: string
  productName: string
  sku: string | null
  availableStock: number
  requestedQuantity: number
  notes: string
}

interface StoreReturnWarehouseDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  storeId: string
  onSuccess?: () => void
}

export function StoreReturnWarehouseDialog({
  open,
  onOpenChange,
  storeId,
  onSuccess,
}: StoreReturnWarehouseDialogProps) {
  const [currentStep, setCurrentStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [loadingProducts, setLoadingProducts] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const [storeProducts, setStoreProducts] = useState<StoreProduct[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedItems, setSelectedItems] = useState<ReturnItem[]>([])
  const [reason, setReason] = useState("")
  const [generalNotes, setGeneralNotes] = useState("")

  useEffect(() => {
    if (open) {
      loadStoreProducts()
      resetForm()
    }
  }, [open, storeId])

  const resetForm = () => {
    setCurrentStep(1)
    setSelectedItems([])
    setReason("")
    setGeneralNotes("")
    setSearchQuery("")
  }

  const loadStoreProducts = async () => {
    setLoadingProducts(true)
    try {
      const res = await fetch(`/api/stores/${storeId}/products?limit=500`)
      if (!res.ok) throw new Error("Erreur")
      const data = await res.json()
      const rawProducts: any[] = data.products || data || []

      const products: StoreProduct[] = rawProducts
        .filter((p: any) => p.name && (p.stock ?? p.stockMagasin ?? 0) > 0)
        .map((p: any) => ({
          id: p.storeProductId || p.id,
          productId: p.id,
          stock: p.stock ?? p.stockMagasin ?? 0,
          product: {
            id: p.id,
            name: p.name,
            sku: p.sku ?? null,
            photos: p.photos || [],
            prixVente: p.prixVente ?? 0,
          },
        }))

      setStoreProducts(products)
    } catch {
      toast.error("Erreur lors du chargement des produits")
    } finally {
      setLoadingProducts(false)
    }
  }

  const normalize = (str: string) =>
    str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()

  const filteredProducts = storeProducts.filter((p) => {
    if (!p.product) return false
    if (!searchQuery) return true
    const q = normalize(searchQuery)
    return (
      normalize(p.product.name).includes(q) ||
      (p.product.sku && normalize(p.product.sku).includes(q))
    )
  })

  const toggleProduct = (sp: StoreProduct) => {
    const stock = sp.stock
    const existing = selectedItems.find((i) => i.productId === sp.productId)
    if (existing) {
      setSelectedItems((prev) => prev.filter((i) => i.productId !== sp.productId))
    } else {
      setSelectedItems((prev) => [
        ...prev,
        {
          productId: sp.productId,
          productName: sp.product.name,
          sku: sp.product.sku,
          availableStock: stock,
          requestedQuantity: 1,
          notes: "",
        },
      ])
    }
  }

  const updateQuantity = (productId: string, qty: number) => {
    setSelectedItems((prev) =>
      prev.map((i) =>
        i.productId === productId
          ? { ...i, requestedQuantity: Math.max(1, Math.min(i.availableStock, qty)) }
          : i
      )
    )
  }

  const updateItemNotes = (productId: string, notes: string) => {
    setSelectedItems((prev) =>
      prev.map((i) => (i.productId === productId ? { ...i, notes } : i))
    )
  }

  const totalItems = selectedItems.length
  const totalQty = selectedItems.reduce((s, i) => s + i.requestedQuantity, 0)

  const handleSubmit = async () => {
    if (selectedItems.length === 0) {
      toast.error("Sélectionnez au moins un produit")
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch(`/api/stores/${storeId}/return-requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reason: reason || undefined,
          notes: generalNotes || undefined,
          items: selectedItems.map((i) => ({
            productId: i.productId,
            requestedQuantity: i.requestedQuantity,
            notes: i.notes || undefined,
          })),
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        toast.error(json.error || "Erreur lors de la création")
        return
      }
      toast.success(json.message || "Demande de retour créée avec succès")
      onSuccess?.()
      onOpenChange(false)
      resetForm()
    } catch {
      toast.error("Erreur réseau")
    } finally {
      setSubmitting(false)
    }
  }

  const steps = ["Produits", "Détails", "Confirmation"]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="min-w-[860px] h-[90vh] p-0 flex flex-col gap-0">
        {/* Header */}
        <DialogHeader className="px-6 py-4 border-b shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center">
                <Warehouse className="h-5 w-5 text-white" />
              </div>
              <div>
                <DialogTitle>Retour à l'entrepôt</DialogTitle>
                <DialogDescription>
                  Étape {currentStep}/3 · {steps[currentStep - 1]}
                </DialogDescription>
              </div>
            </div>
            {/* Indicateur étapes */}
            <div className="flex items-center gap-2">
              {[1, 2, 3].map((step, idx) => (
                <div key={step} className="flex items-center gap-2">
                  <div
                    className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors",
                      step < currentStep
                        ? "bg-green-500 text-white"
                        : step === currentStep
                        ? "bg-indigo-600 text-white"
                        : "bg-gray-200 text-gray-500"
                    )}
                  >
                    {step < currentStep ? <CheckCircle2 className="h-5 w-5" /> : step}
                  </div>
                  {idx < 2 && (
                    <div
                      className={cn(
                        "w-8 h-0.5 transition-colors",
                        step < currentStep ? "bg-green-500" : "bg-gray-200"
                      )}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        </DialogHeader>

        {/* Contenu scrollable */}
        <div className="flex-1 overflow-y-auto px-6 py-5">

          {/* ── Étape 1 : Sélection des produits ─────────────────────── */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Rechercher un produit..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {selectedItems.length > 0 && (
                <div className="bg-indigo-50 border border-indigo-200 rounded-lg px-4 py-2 text-sm text-indigo-700">
                  <strong>{totalItems}</strong> produit{totalItems > 1 ? "s" : ""} sélectionné{totalItems > 1 ? "s" : ""} ·{" "}
                  <strong>{totalQty}</strong> unité{totalQty > 1 ? "s" : ""} au total
                </div>
              )}

              {loadingProducts ? (
                <div className="flex justify-center py-16">
                  <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="text-center py-16">
                  <Package className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                  <p className="text-gray-500 text-sm">
                    {searchQuery ? "Aucun produit trouvé" : "Aucun produit en stock"}
                  </p>
                </div>
              ) : (
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50">
                        <TableHead className="w-10"></TableHead>
                        <TableHead>Produit</TableHead>
                        <TableHead className="text-center">Stock dispo</TableHead>
                        <TableHead className="text-center">À retourner</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredProducts.map((sp) => {
                        const selected = selectedItems.find((i) => i.productId === sp.productId)
                        return (
                          <TableRow
                            key={sp.id}
                            className={cn(
                              "cursor-pointer transition-colors",
                              selected ? "bg-indigo-50 hover:bg-indigo-50" : "hover:bg-gray-50"
                            )}
                            onClick={() => toggleProduct(sp)}
                          >
                            <TableCell>
                              <div
                                className={cn(
                                  "w-5 h-5 rounded border-2 flex items-center justify-center transition-colors",
                                  selected
                                    ? "bg-indigo-600 border-indigo-600"
                                    : "border-gray-300"
                                )}
                              >
                                {selected && <CheckCircle2 className="h-3 w-3 text-white" />}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="font-medium text-sm">{sp.product.name}</div>
                              {sp.product.sku && (
                                <Badge variant="outline" className="text-xs mt-0.5">
                                  {sp.product.sku}
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-center font-semibold text-gray-700">
                              {sp.stock}
                            </TableCell>
                            <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                              {selected ? (
                                <div className="flex items-center justify-center gap-2">
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="h-7 w-7 p-0"
                                    onClick={() => updateQuantity(sp.productId, selected.requestedQuantity - 1)}
                                    disabled={selected.requestedQuantity <= 1}
                                  >
                                    −
                                  </Button>
                                  <span className="w-8 text-center font-semibold">
                                    {selected.requestedQuantity}
                                  </span>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="h-7 w-7 p-0"
                                    onClick={() => updateQuantity(sp.productId, selected.requestedQuantity + 1)}
                                    disabled={selected.requestedQuantity >= sp.stock}
                                  >
                                    +
                                  </Button>
                                </div>
                              ) : (
                                <span className="text-gray-400 text-xs">—</span>
                              )}
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          )}

          {/* ── Étape 2 : Motif et notes ──────────────────────────────── */}
          {currentStep === 2 && (
            <div className="space-y-5 max-w-2xl mx-auto">
              <div className="space-y-2">
                <Label htmlFor="reason">Motif du retour <span className="text-red-500">*</span></Label>
                <Input
                  id="reason"
                  placeholder="Ex : produits défectueux, surplus de stock, date de péremption..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes générales (optionnel)</Label>
                <Textarea
                  id="notes"
                  placeholder="Informations complémentaires pour le gestionnaire entrepôt..."
                  value={generalNotes}
                  onChange={(e) => setGeneralNotes(e.target.value)}
                  rows={3}
                />
              </div>

              {/* Notes par produit */}
              <div className="space-y-3">
                <Label>Notes par produit (optionnel)</Label>
                {selectedItems.map((item) => (
                  <div key={item.productId} className="flex items-center gap-3 p-3 border rounded-lg bg-gray-50">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{item.productName}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Quantité : <strong>{item.requestedQuantity}</strong>
                      </p>
                    </div>
                    <Input
                      placeholder="Note spécifique..."
                      value={item.notes}
                      onChange={(e) => updateItemNotes(item.productId, e.target.value)}
                      className="w-52 h-8 text-sm"
                    />
                  </div>
                ))}
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
                <strong>Important :</strong> La demande sera envoyée au gestionnaire de stock de l'entrepôt.
                Le stock de votre magasin ne sera modifié qu'après validation.
              </div>
            </div>
          )}

          {/* ── Étape 3 : Confirmation ─────────────────────────────────── */}
          {currentStep === 3 && (
            <div className="max-w-2xl mx-auto space-y-5">
              <Card>
                <CardContent className="p-4 space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Motif :</span>
                    <span className="font-medium">{reason || "—"}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Produits :</span>
                    <span className="font-medium">{totalItems}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Unités totales :</span>
                    <span className="font-medium">{totalQty}</span>
                  </div>
                  {generalNotes && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Notes :</span>
                      <span className="font-medium max-w-xs text-right">{generalNotes}</span>
                    </div>
                  )}
                </CardContent>
              </Card>

              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead>Produit</TableHead>
                      <TableHead className="text-center">Qté à retourner</TableHead>
                      <TableHead>Note</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedItems.map((item) => (
                      <TableRow key={item.productId}>
                        <TableCell>
                          <div className="font-medium text-sm">{item.productName}</div>
                          {item.sku && (
                            <Badge variant="outline" className="text-xs mt-0.5">
                              {item.sku}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge className="bg-indigo-100 text-indigo-700">
                            {item.requestedQuantity}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-gray-500">
                          {item.notes || "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
                <Warehouse className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                <p className="text-sm text-blue-800">
                  La demande sera soumise au gestionnaire de stock de l'entrepôt.
                  Après validation, <strong>{totalQty} unité{totalQty > 1 ? "s" : ""}</strong> seront retirée{totalQty > 1 ? "s" : ""} de votre stock
                  et ajoutée{totalQty > 1 ? "s" : ""} à l'entrepôt.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0 border-t bg-white px-6 py-4">
          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => {
                if (currentStep === 1) {
                  onOpenChange(false)
                } else {
                  setCurrentStep((s) => s - 1)
                }
              }}
              disabled={submitting}
            >
              {currentStep === 1 ? "Annuler" : "Précédent"}
            </Button>

            {currentStep < 3 ? (
              <Button
                type="button"
                className="flex-1 bg-indigo-600 hover:bg-indigo-700"
                disabled={
                  (currentStep === 1 && selectedItems.length === 0) ||
                  (currentStep === 2 && !reason.trim())
                }
                onClick={() => setCurrentStep((s) => s + 1)}
              >
                Suivant
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button
                type="button"
                className="flex-1 bg-indigo-600 hover:bg-indigo-700"
                disabled={submitting}
                onClick={handleSubmit}
              >
                {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                <RotateCcw className="h-4 w-4 mr-2" />
                Envoyer la demande
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
