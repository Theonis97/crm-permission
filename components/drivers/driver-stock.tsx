"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import {
  Package,
  Loader2,
  Search,
  Box,
  DollarSign,
  AlertCircle,
  ImageIcon,
  MinusCircle,
} from "lucide-react"
import { toast } from "@/lib/app-toast"

interface StockItem {
  id: string
  productId: string
  variantId: string | null
  quantity: number
  reserved: number
  declaredQtyToday?: number
  declarationWindowOpen?: boolean
  quantityDisplay?: number
  reservedDisplay?: number
  product: {
    id: string
    name: string
    sku: string | null
    prixVente: number
    photos?: string[]
  }
  variant: {
    id: string
    name: string | null
    sku: string
    prixVente: number | null
  } | null
}

interface StockSummary {
  totalItems: number
  totalValue: number
  totalProducts: number
  lowStockCount: number
}

interface StockMetaDeclaration {
  windowOpen: boolean
  dayStart: string
  deadline: string
  now: string
  businessDateKey?: string
  yesterdayDateKey?: string
  oldestBackfillDateKey?: string
  maxBackfillDays?: number
}

interface DriverStockData {
  items: StockItem[]
  summary: StockSummary
  declaration?: StockMetaDeclaration
}

interface DriverStockProps {
  driverId: string
}

export function DriverStock({ driverId }: DriverStockProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [stockData, setStockData] = useState<DriverStockData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")

  // États pour le dialog de retrait
  const [removeDialog, setRemoveDialog] = useState(false)
  const [removeItem, setRemoveItem] = useState<StockItem | null>(null)
  const [removeQty, setRemoveQty] = useState(1)
  const [returnToStore, setReturnToStore] = useState(true)
  const [removeNotes, setRemoveNotes] = useState("")
  const [removing, setRemoving] = useState(false)

  const loadStock = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/delivery-persons/${driverId}/stock`)
      if (!response.ok) {
        throw new Error("Erreur lors du chargement du stock")
      }
      const data = await response.json()
      setStockData({
        items: data.items ?? [],
        summary: data.summary,
        declaration: data.declaration,
      })
    } catch (err: unknown) {
      console.error("Error loading stock:", err)
      const message = err instanceof Error ? err.message : "Erreur lors du chargement"
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }, [driverId])

  useEffect(() => {
    loadStock()
  }, [loadStock])

  const openRemove = (item: StockItem) => {
    setRemoveItem(item)
    setRemoveQty(1)
    setReturnToStore(true)
    setRemoveNotes("")
    setRemoveDialog(true)
  }

  const handleRemove = async () => {
    if (!removeItem) return
    setRemoving(true)
    try {
      const res = await fetch(`/api/delivery-persons/${driverId}/stock`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stockItemId: removeItem.id,
          quantity: removeQty,
          returnToStore,
          notes: removeNotes || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || "Erreur lors du retrait")
        return
      }
      toast.success(data.message || "Stock mis à jour")
      setRemoveDialog(false)
      loadStock()
    } catch {
      toast.error("Erreur réseau")
    } finally {
      setRemoving(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("fr-FR").format(amount) + " FCFA"
  }

  const filteredItems = stockData?.items.filter(item => {
    const productName = item.product.name.toLowerCase()
    const sku = (item.variant?.sku || item.product.sku || "").toLowerCase()
    const search = searchTerm.toLowerCase()
    return productName.includes(search) || sku.includes(search)
  }) || []

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <AlertCircle className="h-12 w-12 text-red-400 mb-4" />
        <p className="text-gray-600">{error}</p>
      </div>
    )
  }

  if (!stockData) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Package className="h-12 w-12 text-gray-300 mb-4" />
        <p className="text-gray-500">Aucune donnée de stock disponible</p>
      </div>
    )
  }

  return (
    <>
    <div className="space-y-6">
      {/* Statistiques du stock */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br py-0 from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-200 rounded-lg">
                <Box className="h-5 w-5 text-blue-700" />
              </div>
              <div>
                <p className="text-sm text-blue-600">Produits</p>
                <p className="text-2xl font-bold text-blue-700">{stockData.summary.totalProducts}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br py-0 from-green-50 to-green-100 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-200 rounded-lg">
                <Package className="h-5 w-5 text-green-700" />
              </div>
              <div>
                <p className="text-sm text-green-600">Unités</p>
                <p className="text-2xl font-bold text-green-700">{stockData.summary.totalItems}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br py-0 from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-200 rounded-lg">
                <DollarSign className="h-5 w-5 text-purple-700" />
              </div>
              <div>
                <p className="text-sm text-purple-600">Valeur</p>
                <p className="text-lg font-bold text-purple-700">{formatCurrency(stockData.summary.totalValue)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {stockData.declaration ? (
        <div
          className={`flex gap-2 rounded-lg border p-3 text-sm ${
            stockData.declaration.windowOpen
              ? "border-blue-200 bg-blue-50 text-blue-900"
              : "border-amber-200 bg-amber-50 text-amber-950"
          }`}
        >
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
          <div>
            {stockData.declaration.windowOpen ? (
              <p>
                <span className="font-medium">Déclarations de ventes</span> : jusqu’au{" "}
                {new Date(stockData.declaration.deadline).toLocaleString("fr-FR", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}{" "}
                (clôture 23h59, fuseau entreprise défini sur UTC+1 par défaut — variable{" "}
                <code className="text-xs">DRIVER_DECLARATION_UTC_OFFSET_HOURS</code>).
              </p>
            ) : null}
            {!stockData.declaration.windowOpen ? (
              <p>
                <span className="font-medium">Période de déclaration terminée</span> pour cette journée. La colonne{" "}
                <strong>Qté</strong> est affichée à 0 pour faciliter le contrôle ;{" "}
                <strong>Rés.</strong> correspond au <strong>stock physique restant</strong> ;{" "}
                <strong>Déclaré</strong> indique les quantités vendues déclarées dans la journée.
              </p>
            ) : null}
          </div>
        </div>
      ) : null}

      {/* Recherche */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <Input
          placeholder="Rechercher un produit..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Tableau du stock */}
      <div>
        {filteredItems.length > 0 ? (
          <ScrollArea className="h-[400px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-14">Image</TableHead>
                  <TableHead>Produit</TableHead>
                  <TableHead className="text-center">Qté</TableHead>
                  <TableHead className="text-center">Déclaré</TableHead>
                  <TableHead
                    className="text-center"
                    title={
                      stockData?.declaration?.windowOpen
                        ? "Réservé (commandes en cours)"
                        : "Après 23h59 : stock physique restant sur le livreur"
                    }
                  >
                    Rés.
                  </TableHead>
                  <TableHead className="text-right">Prix</TableHead>
                  <TableHead className="w-24 text-center">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.map((item) => {
                  const price = item.variant?.prixVente || item.product.prixVente
                  const qty =
                    item.quantityDisplay !== undefined ? item.quantityDisplay : item.quantity
                  const res =
                    item.reservedDisplay !== undefined ? item.reservedDisplay : item.reserved
                  const declared = item.declaredQtyToday ?? 0
                  return (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div className="w-11 h-11 rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center">
                          {item.product.photos && item.product.photos.length > 0 ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={item.product.photos[0]}
                              alt={item.product.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <ImageIcon className="h-5 w-5 text-gray-400" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="font-medium text-sm text-gray-900 leading-snug">{item.product.name}</p>
                        {item.variant && (
                          <p className="text-xs text-gray-500">{item.variant.name}</p>
                        )}
                        <p className="text-xs text-gray-400 font-mono">
                          {item.variant?.sku || item.product.sku || "—"}
                        </p>
                      </TableCell>
                      <TableCell className="text-center font-semibold">{qty}</TableCell>
                      <TableCell className="text-center font-semibold text-sky-700">{declared}</TableCell>
                      <TableCell className="text-center text-amber-600">{res}</TableCell>
                      <TableCell className="text-right font-medium text-sm">{formatCurrency(price)}</TableCell>
                      <TableCell className="text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 text-red-600 hover:text-red-700 hover:bg-red-50 gap-1"
                          onClick={() => openRemove(item)}
                        >
                          <MinusCircle className="h-4 w-4" />
                          Retirer
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </ScrollArea>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Package className="h-12 w-12 text-gray-300 mb-4" />
            <p className="text-gray-500">
              {searchTerm ? "Aucun produit trouvé" : "Aucun stock disponible"}
            </p>
          </div>
        )}
      </div>
    </div>

    {/* Dialog de retrait */}
    <Dialog open={removeDialog} onOpenChange={setRemoveDialog}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MinusCircle className="h-5 w-5 text-red-500" />
            Retirer du stock
          </DialogTitle>
          <DialogDescription>
            {removeItem && (
              <span>
                Retirer des unités de <strong>{removeItem.product.name}</strong>
                {removeItem.variant ? ` — ${removeItem.variant.name}` : ""}
                {" "}(stock actuel : <strong>{removeItem?.quantity}</strong>)
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Quantité */}
          <div className="space-y-2">
            <Label htmlFor="remove-qty">Quantité à retirer</Label>
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-9 w-9 shrink-0"
                onClick={() => setRemoveQty((q) => Math.max(1, q - 1))}
                disabled={removeQty <= 1}
              >
                <span className="text-lg font-bold">−</span>
              </Button>
              <Input
                id="remove-qty"
                type="number"
                min={1}
                max={removeItem?.quantity ?? 1}
                value={removeQty}
                onChange={(e) => setRemoveQty(Math.min(removeItem?.quantity ?? 1, Math.max(1, Number(e.target.value))))}
                className="text-center font-semibold text-lg h-9"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-9 w-9 shrink-0"
                onClick={() => setRemoveQty((q) => Math.min(removeItem?.quantity ?? 1, q + 1))}
                disabled={removeQty >= (removeItem?.quantity ?? 1)}
              >
                <span className="text-lg font-bold">+</span>
              </Button>
            </div>
            {removeItem && removeQty >= removeItem.quantity && (
              <p className="text-xs text-amber-600">⚠️ Le produit sera complètement retiré du stock du livreur.</p>
            )}
          </div>

          {/* Retour en magasin */}
          <div className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-neutral-50 p-3">
            <Checkbox
              id="return-store"
              checked={returnToStore}
              onCheckedChange={(v) => setReturnToStore(Boolean(v))}
            />
            <div>
              <Label htmlFor="return-store" className="cursor-pointer font-medium">
                Retourner au stock du magasin
              </Label>
              <p className="text-xs text-gray-500 mt-0.5">
                {returnToStore
                  ? "Les unités seront réintégrées dans le stock du magasin d'attache."
                  : "Les unités seront simplement supprimées sans retour en magasin."}
              </p>
            </div>
          </div>

          {/* Note */}
          <div className="space-y-2">
            <Label htmlFor="remove-notes">Note (optionnel)</Label>
            <Input
              id="remove-notes"
              placeholder="Ex : Produit défectueux, retour d'inventaire…"
              value={removeNotes}
              onChange={(e) => setRemoveNotes(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => setRemoveDialog(false)} disabled={removing}>
            Annuler
          </Button>
          <Button
            variant="destructive"
            onClick={handleRemove}
            disabled={removing || removeQty <= 0}
            className="gap-2"
          >
            {removing ? <Loader2 className="h-4 w-4 animate-spin" /> : <MinusCircle className="h-4 w-4" />}
            Retirer {removeQty} unité{removeQty > 1 ? "s" : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  )
}
