"use client"

import { useState, useEffect } from "react"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ImageIcon, Loader2 } from "lucide-react"
import { toast } from "@/lib/app-toast"
import { cn } from "@/lib/utils"

export type PackDetails = {
  id: string
  storeId?: string
  name: string
  description: string | null
  salePrice: number | null
  prixVente: number
  suggestedPrice: number
  /** Packs déjà assemblés (prêts à la vente), issus de la création / ajustements futurs */
  assembledStock: number
  /** Combien d’autres packs on peut encore assembler avec le stock actuel des composants */
  assembleableStock: number
  /** Unités pack qu’on peut dissocier (stock proxy si caisse, sinon assemblé magasin) */
  dissociatableUnits?: number
  stockStatus: "ok" | "low" | "out"
  coverPhoto: string | null
  /** Affichage type inventaire produit (proxy caisse) */
  categoryId?: string
  categoryName?: string
  brandId?: string | null
  brandName?: string | null
  sku?: string | null
  minStock?: number
  maxStock?: number | null
  items: Array<{
    id: string
    quantity: number
    lineUnitPrice: number
    storeStock: number
    minStock: number
    product: {
      id: string
      name: string
      sku: string | null
      photos: string[]
    }
  }>
}

interface StorePackDetailsSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  pack: PackDetails | null
  /** Magasin (pour API d’assemblage) */
  storeId: string
  /** Peut augmenter le stock en débitant les composants */
  canAddStock?: boolean
  onStockAdded?: () => void
}

function formatPrice(n: number) {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "XAF" }).format(n)
}

export function StorePackDetailsSheet({
  open,
  onOpenChange,
  pack,
  storeId,
  canAddStock = false,
  onStockAdded,
}: StorePackDetailsSheetProps) {
  const [addQty, setAddQty] = useState("1")
  const [adding, setAdding] = useState(false)
  const [dissociateQty, setDissociateQty] = useState("1")
  const [dissociating, setDissociating] = useState(false)

  useEffect(() => {
    if (open && pack?.id) {
      setAddQty("1")
      setDissociateQty("1")
    }
  }, [open, pack?.id])

  if (!pack) return null

  const maxDissociate = Math.max(0, Math.floor(Number(pack.dissociatableUnits) || 0))

  const statusConfig = {
    ok: {
      label: "Disponible",
      className: "border-green-200 text-green-700 bg-green-50",
    },
    low: {
      label: "Composants proches du seuil",
      className: "border-amber-200 text-amber-700 bg-amber-50",
    },
    out: {
      label: "Rupture (prêts et assemblage)",
      className: "border-red-200 text-red-700 bg-red-50",
    },
  }
  const st = statusConfig[pack.stockStatus]

  const handleAddStock = async () => {
    const n = Math.max(1, Math.floor(Number(addQty) || 1))
    try {
      setAdding(true)
      const res = await fetch(`/api/stores/${storeId}/packs/${pack.id}/assemble`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ assembleCount: n }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(typeof data.error === "string" ? data.error : "Impossible d’ajouter au stock")
        return
      }
      toast.success(typeof data.message === "string" ? data.message : "Stock pack mis à jour")
      setAddQty("1")
      onStockAdded?.()
    } catch {
      toast.error("Erreur réseau")
    } finally {
      setAdding(false)
    }
  }

  const handleDissociate = async () => {
    const n = Math.min(
      maxDissociate,
      Math.max(1, Math.floor(Number(dissociateQty) || 1)),
    )
    if (maxDissociate < 1) return
    try {
      setDissociating(true)
      const res = await fetch(`/api/stores/${storeId}/packs/${pack.id}/dissociate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ dissociateCount: n }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(typeof data.error === "string" ? data.error : "Impossible de dissocier le pack")
        return
      }
      toast.success(typeof data.message === "string" ? data.message : "Composants recrédités au magasin")
      setDissociateQty("1")
      onStockAdded?.()
    } catch {
      toast.error("Erreur réseau")
    } finally {
      setDissociating(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{pack.name}</SheetTitle>
          <SheetDescription>
            <strong>Packs prêts</strong> : unités enregistrées comme assemblées.{" "}
            <strong>Assemblables</strong> : combien d&apos;autres packs vous pouvez encore fabriquer avec
            le stock restant des produits (après déduction des pièces déjà utilisées).
          </SheetDescription>
          {pack.items.length > 0 ? (
            <div className="mt-3 pt-3 border-t border-border/60">
              <p className="text-xs font-medium text-muted-foreground mb-2">Articles du pack</p>
              <div className="flex flex-wrap gap-2">
                {pack.items.map((it) => (
                  <div
                    key={it.id}
                    className="flex flex-col items-center gap-1 w-[4.5rem]"
                    title={`${it.product.name} × ${it.quantity}`}
                  >
                    <div className="h-14 w-full rounded-lg border bg-muted overflow-hidden flex items-center justify-center shrink-0">
                      {it.product.photos[0] ? (
                        <img
                          src={it.product.photos[0]}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <ImageIcon className="h-6 w-6 text-muted-foreground" />
                      )}
                    </div>
                    <span className="text-[10px] text-center text-muted-foreground line-clamp-2 leading-tight w-full">
                      ×{it.quantity}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </SheetHeader>

        <div className="mt-6 space-y-4">
          <div
            className={cn(
              "rounded-lg border p-4 space-y-3",
              canAddStock ? "border-primary/30 bg-primary/5" : "border-amber-200/80 bg-amber-50/50"
            )}
          >
            <h4 className="text-sm font-semibold text-foreground">Ajouter au stock du pack</h4>
            {!canAddStock ? (
              <p className="text-xs text-amber-800">
                Votre rôle ne permet pas d’assembler des packs (création / édition produit ou gestion de stock
                magasin requis).
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Les produits de la composition seront débités ; le stock pack (et la caisse) augmentent.
              </p>
            )}
            <div className="flex flex-wrap items-end gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="pack-add-qty">Nombre de packs à assembler</Label>
                <Input
                  id="pack-add-qty"
                  type="number"
                  min={1}
                  className="w-28"
                  value={addQty}
                  onChange={(e) => setAddQty(e.target.value)}
                  disabled={adding || !canAddStock}
                />
              </div>
              <Button type="button" onClick={handleAddStock} disabled={adding || !canAddStock}>
                {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : "Créditer le pack (débiter les produits)"}
              </Button>
            </div>
          </div>

          {maxDissociate > 0 ? (
            <div
              className={cn(
                "rounded-lg border p-4 space-y-3",
                canAddStock ? "border-muted" : "border-amber-200/80 bg-amber-50/50",
              )}
            >
              <h4 className="text-sm font-semibold text-foreground">Dissocier le pack</h4>
              {!canAddStock ? (
                <p className="text-xs text-amber-800">
                  Votre rôle ne permet pas de dissocier des packs (création / édition produit ou gestion de
                  stock magasin requis).
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Les composants repassent au stock magasin (quantité pack × nombre de dissociations). Le
                  stock pack / caisse diminue. Maximum : <strong>{maxDissociate}</strong>.
                </p>
              )}
              <div className="flex flex-wrap items-end gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="pack-dissociate-qty">Nombre de packs à dissocier</Label>
                  <Input
                    id="pack-dissociate-qty"
                    type="number"
                    min={1}
                    max={maxDissociate}
                    className="w-28"
                    value={dissociateQty}
                    onChange={(e) => setDissociateQty(e.target.value)}
                    disabled={dissociating || !canAddStock}
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleDissociate}
                  disabled={dissociating || !canAddStock || maxDissociate < 1}
                >
                  {dissociating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Dissocier (recréditer les produits)"
                  )}
                </Button>
              </div>
            </div>
          ) : null}

          <div className="flex items-start gap-3">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-muted">
              {pack.coverPhoto ? (
                <img src={pack.coverPhoto} alt="" className="h-full w-full object-cover" />
              ) : (
                <ImageIcon className="h-8 w-8 text-muted-foreground" />
              )}
            </div>
            <div className="space-y-1 text-sm">
              <p>
                <span className="text-muted-foreground">Prix affiché :</span>{" "}
                <strong>{formatPrice(pack.prixVente)}</strong>
              </p>
              {pack.salePrice == null && (
                <p className="text-xs text-muted-foreground">
                  Somme des prix unitaires × quantités : {formatPrice(pack.suggestedPrice)}
                </p>
              )}
              <p>
                <span className="text-muted-foreground">Packs prêts :</span>{" "}
                <strong>{pack.assembledStock}</strong>
              </p>
              <p>
                <span className="text-muted-foreground">Autres packs assemblables :</span>{" "}
                <strong>{pack.assembleableStock}</strong>
              </p>
              <Badge variant="outline" className={cn("text-xs", st.className)}>
                {st.label}
              </Badge>
            </div>
          </div>

          {pack.description ? (
            <p className="text-sm text-muted-foreground border-t pt-4">{pack.description}</p>
          ) : null}

          <div className="border-t pt-4">
            <h4 className="text-sm font-semibold mb-3">Composition</h4>
            <ul className="space-y-3">
              {pack.items.map((it) => (
                <li
                  key={it.id}
                  className="flex gap-3 rounded-lg border p-3 bg-muted/30"
                >
                  <div className="h-12 w-12 shrink-0 overflow-hidden rounded-md border bg-background flex items-center justify-center">
                    {it.product.photos[0] ? (
                      <img
                        src={it.product.photos[0]}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <ImageIcon className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1 text-sm">
                    <div className="font-medium">{it.product.name}</div>
                    {it.product.sku && (
                      <div className="text-xs text-muted-foreground">{it.product.sku}</div>
                    )}
                    <div className="mt-1 text-xs text-muted-foreground">
                      Qté pack : <strong>{it.quantity}</strong> · PU {formatPrice(it.lineUnitPrice)} ·
                      Stock mag. <strong>{it.storeStock}</strong>
                      {it.minStock > 0 ? ` (seuil ${it.minStock})` : ""}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
