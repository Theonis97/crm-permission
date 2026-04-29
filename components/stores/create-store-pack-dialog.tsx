"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ImageIcon, Loader2, Plus, Search, Trash2, ChevronDown } from "lucide-react"
import { toast } from "@/lib/app-toast"
import { cn } from "@/lib/utils"

interface StoreProductRow {
  id: string
  name: string
  sku: string | null
  stock: number
  photos: string[]
}

interface PackLine {
  id: string
  productId: string
  quantity: string
}

interface CreateStorePackDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  storeId: string
  onSuccess?: () => void
}

function newLineId() {
  return `line-${Math.random().toString(36).slice(2)}`
}

export function CreateStorePackDialog({
  open,
  onOpenChange,
  storeId,
  onSuccess,
}: CreateStorePackDialogProps) {
  const [loading, setLoading] = useState(false)
  const [loadingProducts, setLoadingProducts] = useState(false)
  const [products, setProducts] = useState<StoreProductRow[]>([])
  const [name, setName] = useState("")
  const [assembleCount, setAssembleCount] = useState("1")
  const [salePrice, setSalePrice] = useState("")
  const [lines, setLines] = useState<PackLine[]>(() => [
    { id: newLineId(), productId: "", quantity: "1" },
    { id: newLineId(), productId: "", quantity: "1" },
  ])
  const [productSearch, setProductSearch] = useState("")
  const [openProductPickerLineId, setOpenProductPickerLineId] = useState<string | null>(null)
  const packLinesRef = useRef<HTMLDivElement>(null)

  const filteredProducts = useMemo(() => {
    const q = productSearch.trim().toLowerCase()
    if (!q) return products
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.sku?.toLowerCase().includes(q) ?? false),
    )
  }, [products, productSearch])

  useEffect(() => {
    if (!open || !storeId) return
    const load = async () => {
      try {
        setLoadingProducts(true)
        const res = await fetch(`/api/stores/${storeId}/products`, {
          credentials: "include",
          cache: "no-store",
        })
        if (!res.ok) throw new Error("Erreur chargement produits")
        const data = await res.json()
        const rawList = Array.isArray(data)
          ? data
          : data && typeof data === "object" && Array.isArray((data as { products?: unknown }).products)
            ? (data as { products: unknown[] }).products
            : []
        setProducts(
          (
            rawList as {
              id: string
              name: string
              sku: string | null
              stock: number
              photos?: unknown
            }[]
          ).map((p) => ({
            id: String(p.id),
            name: String(p.name ?? ""),
            sku: p.sku ?? null,
            stock: typeof p.stock === "number" ? p.stock : Math.floor(Number(p.stock) || 0),
            photos: Array.isArray(p.photos)
              ? p.photos.filter((u): u is string => typeof u === "string" && u.length > 0)
              : [],
          }))
        )
      } catch {
        toast.error("Impossible de charger les produits du magasin")
      } finally {
        setLoadingProducts(false)
      }
    }
    load()
  }, [open, storeId])

  useEffect(() => {
    if (!openProductPickerLineId) return
    const down = (e: MouseEvent) => {
      const el = packLinesRef.current
      if (el && !el.contains(e.target as Node)) {
        setOpenProductPickerLineId(null)
      }
    }
    document.addEventListener("mousedown", down)
    return () => document.removeEventListener("mousedown", down)
  }, [openProductPickerLineId])

  const resetForm = () => {
    setName("")
    setAssembleCount("1")
    setSalePrice("")
    setProductSearch("")
    setOpenProductPickerLineId(null)
    setLines([
      { id: newLineId(), productId: "", quantity: "1" },
      { id: newLineId(), productId: "", quantity: "1" },
    ])
  }

  const handleClose = (v: boolean) => {
    if (!v) resetForm()
    onOpenChange(v)
  }

  const addLine = () => {
    setLines((prev) => [...prev, { id: newLineId(), productId: "", quantity: "1" }])
  }

  const removeLine = (id: string) => {
    setLines((prev) => (prev.length <= 2 ? prev : prev.filter((l) => l.id !== id)))
  }

  const updateLine = (id: string, patch: Partial<Pick<PackLine, "productId" | "quantity">>) => {
    setLines((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)))
  }

  const submit = async () => {
    const trimmed = name.trim()
    if (!trimmed) {
      toast.error("Indiquez un nom pour le pack")
      return
    }

    const ac = Math.max(1, Math.floor(Number(assembleCount) || 1))
    const items = lines
      .filter((l) => l.productId)
      .map((l) => ({
        productId: l.productId,
        quantity: Math.max(1, Math.floor(Number(l.quantity) || 1)),
      }))

    if (items.length < 2) {
      toast.error("Sélectionnez au moins deux produits")
      return
    }

    const ids = new Set(items.map((i) => i.productId))
    if (ids.size < 2) {
      toast.error("Le pack doit contenir au moins deux produits différents")
      return
    }

    try {
      setLoading(true)
      const body: Record<string, unknown> = {
        name: trimmed,
        assembleCount: ac,
        items,
      }
      if (salePrice.trim() !== "") {
        const sp = Number(salePrice.replace(",", "."))
        if (!Number.isNaN(sp)) body.salePrice = sp
      }

      const res = await fetch(`/api/stores/${storeId}/packs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(typeof data.error === "string" ? data.error : "Création impossible")
        return
      }
      const merged =
        typeof data === "object" && data !== null && (data as { mergedIntoExisting?: boolean }).mergedIntoExisting === true
      toast.success(
        merged
          ? "Même composition : stock du pack augmenté (caisse), composants débités."
          : "Pack créé — article caisse ajouté, composants débités."
      )
      handleClose(false)
      onSuccess?.()
    } catch {
      toast.error("Erreur réseau")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[90vh] flex flex-col gap-0 overflow-hidden p-6 sm:max-w-lg [&>button]:z-10">
        <DialogHeader className="shrink-0 space-y-3 pr-8">
          <DialogTitle>Créer un pack</DialogTitle>
          <DialogDescription asChild>
            <div className="space-y-2 text-muted-foreground text-sm">
              <p>
                Associez au moins deux produits du magasin. À l&apos;enregistrement, le stock de chaque
                produit est <strong>diminué</strong> (vous retirez les pièces du rayon pour constituer le ou
                les packs).
              </p>
              <p>
                Le nombre de packs assemblés indiqué est enregistré comme <strong>packs prêts</strong> à la
                vente. La liste affiche aussi combien d&apos;autres packs vous pourriez encore assembler avec
                le stock restant des produits.
              </p>
            </div>
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain space-y-4 py-2 pr-1 -mr-1">
          <div className="space-y-2">
            <Label htmlFor="pack-name">Nom du pack</Label>
            <Input
              id="pack-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex. Pack découverte"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="assemble-count">Nombre de packs assemblés (stock caisse)</Label>
              <Input
                id="assemble-count"
                type="number"
                min={1}
                value={assembleCount}
                onChange={(e) => setAssembleCount(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Par défaut 1 : un pack créé = 1 unité en stock (composants débités en conséquence).
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="sale-price">Prix de vente du pack (optionnel)</Label>
              <Input
                id="sale-price"
                type="text"
                inputMode="decimal"
                value={salePrice}
                onChange={(e) => setSalePrice(e.target.value)}
                placeholder="FCFA"
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <Label>Produits du pack</Label>
              <Button type="button" variant="outline" size="sm" onClick={addLine}>
                <Plus className="h-4 w-4 mr-1" />
                Ligne
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Cliquez sur une ligne pour ouvrir la liste : recherche par nom ou SKU, puis choisissez un produit.
              Le défilement reste dans la fenêtre.
            </p>
            {loadingProducts ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                <Loader2 className="h-4 w-4 animate-spin" />
                Chargement des produits…
              </div>
            ) : (
              <div ref={packLinesRef} className="space-y-3">
                {lines.map((line) => {
                  const selectedProduct = products.find((p) => p.id === line.productId)
                  const pickerOpen = openProductPickerLineId === line.id
                  return (
                  <div key={line.id} className="rounded-lg border border-border/80 bg-card/30 p-2 sm:p-3 space-y-2">
                    <div className="flex gap-2 items-end">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-muted">
                        {selectedProduct?.photos[0] ? (
                          <img
                            src={selectedProduct.photos[0]}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <ImageIcon className="h-4 w-4 text-muted-foreground" aria-hidden />
                        )}
                      </div>
                      <div className="flex-1 min-w-0 space-y-1">
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full min-w-0 justify-between font-normal h-10 px-3"
                          onClick={() => {
                            setOpenProductPickerLineId((cur) => {
                              const next = cur === line.id ? null : line.id
                              if (next !== cur && next === line.id) setProductSearch("")
                              return next
                            })
                          }}
                        >
                          <span className="truncate text-left">
                            {selectedProduct
                              ? `${selectedProduct.name}${selectedProduct.sku ? ` (${selectedProduct.sku})` : ""}`
                              : "Choisir un produit"}
                          </span>
                          <ChevronDown
                            className={cn(
                              "h-4 w-4 shrink-0 opacity-50 transition-transform",
                              pickerOpen && "rotate-180",
                            )}
                          />
                        </Button>
                      </div>
                      <div className="w-24 space-y-1">
                        <Input
                          type="number"
                          min={1}
                          value={line.quantity}
                          onChange={(e) => updateLine(line.id, { quantity: e.target.value })}
                        />
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="shrink-0"
                        disabled={lines.length <= 2}
                        onClick={() => removeLine(line.id)}
                        aria-label="Supprimer la ligne"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    {pickerOpen ? (
                      <div className="rounded-md border bg-background shadow-sm overflow-hidden">
                        <div className="p-2 border-b border-border">
                          <div className="relative">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                            <Input
                              className="pl-8 h-9"
                              placeholder="Nom ou SKU…"
                              value={productSearch}
                              onChange={(e) => setProductSearch(e.target.value)}
                              autoComplete="off"
                              autoFocus
                            />
                          </div>
                        </div>
                        <div
                          className="max-h-[min(240px,40dvh)] overflow-y-auto overscroll-contain touch-pan-y py-1 px-1"
                          data-scroll="pack-product-list"
                        >
                          {products.length === 0 ? (
                            <p className="px-2 py-3 text-sm text-muted-foreground">
                              Aucun produit dans ce magasin
                            </p>
                          ) : filteredProducts.length === 0 ? (
                            <p className="px-2 py-3 text-sm text-muted-foreground">
                              Aucun résultat pour « {productSearch.trim() || "…"} »
                            </p>
                          ) : (
                            <ul className="space-y-0.5">
                              {filteredProducts.map((p) => (
                                <li key={p.id}>
                                  <button
                                    type="button"
                                    className="flex w-full cursor-pointer gap-2 rounded-sm px-2 py-2 text-left text-sm hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                    onClick={() => {
                                      updateLine(line.id, { productId: p.id })
                                      setOpenProductPickerLineId(null)
                                    }}
                                  >
                                    <span className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted">
                                      {p.photos[0] ? (
                                        <img
                                          src={p.photos[0]}
                                          alt=""
                                          className="h-full w-full object-cover"
                                        />
                                      ) : (
                                        <ImageIcon className="h-4 w-4 text-muted-foreground" aria-hidden />
                                      )}
                                    </span>
                                    <span className="min-w-0 flex-1">
                                      <span className="line-clamp-2 font-medium leading-tight">{p.name}</span>
                                      <span className="block text-xs text-muted-foreground">
                                        {p.sku ? `${p.sku} · ` : ""}
                                        {p.stock} en stock
                                      </span>
                                    </span>
                                  </button>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </div>
                    ) : null}
                  </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="shrink-0 gap-2 border-t pt-4 mt-4">
          <Button type="button" variant="outline" onClick={() => handleClose(false)} disabled={loading}>
            Annuler
          </Button>
          <Button type="button" onClick={submit} disabled={loading || loadingProducts}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Créer le pack"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
