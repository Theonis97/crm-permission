"use client"

import { useState, use, useEffect, useMemo } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { StorePageHeader } from "@/components/stores/store-page-header"
import { CreateStorePackDialog } from "@/components/stores/create-store-pack-dialog"
import { StorePackDetailsSheet, type PackDetails } from "@/components/stores/store-pack-details-sheet"
import { EditStorePackSheet } from "@/components/stores/edit-store-pack-sheet"
import { STORE_PERMISSIONS } from "@/types/store-auth"
import { useStorePermissions } from "@/hooks/use-store-permissions"
import { usePermissions } from "@/hooks/use-permissions"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Edit,
  Eye,
  ImageIcon,
  Layers,
  Loader2,
  MoreHorizontal,
  Plus,
  Search,
  Trash2,
  TrendingUp,
  XCircle,
} from "lucide-react"
import { toast } from "@/lib/app-toast"
import { cn } from "@/lib/utils"

type Category = { id: string; name: string; description?: string | null }
type Brand = { id: string; name: string }

const PACK_FALLBACK_CATEGORY = "__pack__"

export default function StorePacksPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: storeId } = use(params)
  const { hasPermission, loading: globalPermsLoading } = usePermissions()
  const { hasStoreAccess, hasStorePermission, loading: permsLoading } = useStorePermissions(storeId)
  const [packs, setPacks] = useState<PackDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [stockFilter, setStockFilter] = useState("all")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [brandFilter, setBrandFilter] = useState("all")
  const [categories, setCategories] = useState<Category[]>([])
  const [brands, setBrands] = useState<Brand[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [selectedPack, setSelectedPack] = useState<PackDetails | null>(null)

  const itemsPerPage = 10

  const loadPacks = async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/stores/${storeId}/packs`, {
        credentials: "include",
        cache: "no-store",
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(typeof data.error === "string" ? data.error : "Erreur")
      }
      const raw = (await res.json()) as PackDetails[]
      const data = Array.isArray(raw) ? raw : []
      setPacks(
        data.map((p) => ({
          ...p,
          storeId: p.storeId ?? storeId,
          assembledStock: typeof p.assembledStock === "number" ? p.assembledStock : 0,
          assembleableStock: typeof p.assembleableStock === "number" ? p.assembleableStock : 0,
          dissociatableUnits:
            typeof p.dissociatableUnits === "number"
              ? p.dissociatableUnits
              : typeof p.assembledStock === "number"
                ? p.assembledStock
                : 0,
          items: Array.isArray(p.items) ? p.items : [],
          categoryId: p.categoryId ?? PACK_FALLBACK_CATEGORY,
          categoryName: p.categoryName ?? "Pack",
          brandId: p.brandId ?? null,
          brandName: p.brandName ?? null,
          sku: p.sku ?? null,
          minStock: typeof p.minStock === "number" ? p.minStock : 0,
          maxStock: p.maxStock ?? null,
        }))
      )
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Impossible de charger les packs")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPacks()
  }, [storeId])

  useEffect(() => {
    if (!detailsOpen) return
    setSelectedPack((prev) => {
      if (!prev) return prev
      const next = packs.find((p) => p.id === prev.id)
      return next ?? prev
    })
  }, [packs, detailsOpen])

  useEffect(() => {
    const loadFilters = async () => {
      try {
        const [catRes, brandRes] = await Promise.all([
          fetch("/api/categories"),
          fetch("/api/brands"),
        ])
        if (catRes.ok) {
          const c = await catRes.json()
          setCategories(Array.isArray(c) ? c : [])
        }
        if (brandRes.ok) {
          const b = await brandRes.json()
          setBrands(Array.isArray(b) ? b : [])
        }
      } catch {
        /* silencieux */
      }
    }
    loadFilters()
  }, [])

  const getListingStockStatus = (p: PackDetails): "ok" | "low" | "out" | "high" => {
    const stock = p.assembledStock
    const min = p.minStock ?? 0
    const max = p.maxStock
    if (stock === 0) return "out"
    if (stock <= min) return "low"
    if (max != null && max > 0 && stock >= max) return "high"
    return "ok"
  }

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase()
    return packs.filter((p) => {
      const items = Array.isArray(p.items) ? p.items : []
      const matchesSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        (p.sku?.toLowerCase().includes(q) ?? false) ||
        items.some(
          (it) =>
            (it.product?.name ?? "").toLowerCase().includes(q) ||
            (it.product?.sku?.toLowerCase().includes(q) ?? false),
        )
      const matchesCategory =
        categoryFilter === "all" || (p.categoryId ?? PACK_FALLBACK_CATEGORY) === categoryFilter
      const matchesBrand =
        brandFilter === "all" ||
        (p.brandId != null && p.brandId === brandFilter) ||
        (brandFilter === "__none__" && (p.brandId == null || p.brandId === ""))
      const st = getListingStockStatus(p)
      const matchesStock = stockFilter === "all" || st === stockFilter
      return matchesSearch && matchesCategory && matchesBrand && matchesStock
    })
  }, [packs, searchTerm, categoryFilter, brandFilter, stockFilter])

  const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage))
  const start = (currentPage - 1) * itemsPerPage
  const paginated = filtered.slice(start, start + itemsPerPage)

  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, stockFilter, categoryFilter, brandFilter])

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages)
  }, [currentPage, totalPages])

  const formatPrice = (n: number) =>
    new Intl.NumberFormat("fr-FR", { style: "currency", currency: "XAF" }).format(n)

  const getListingStatusBadge = (p: PackDetails) => {
    const status = getListingStockStatus(p)
    const config = {
      ok: { icon: CheckCircle2, className: "border-green-200 text-green-700 bg-green-50", label: "Stock OK" },
      low: { icon: AlertTriangle, className: "border-amber-200 text-amber-700 bg-amber-50", label: "Stock faible" },
      out: { icon: XCircle, className: "border-red-200 text-red-700 bg-red-50", label: "Rupture" },
      high: { icon: TrendingUp, className: "border-blue-200 text-blue-700 bg-blue-50", label: "Surstock" },
    }
    const { icon: Icon, className, label } = config[status]
    return (
      <Badge variant="outline" className={cn("text-xs", className)}>
        <Icon className="h-3 w-3 mr-1" />
        {label}
      </Badge>
    )
  }

  const hasActiveFilters =
    categoryFilter !== "all" || brandFilter !== "all" || stockFilter !== "all"

  const resetFilters = () => {
    setCategoryFilter("all")
    setBrandFilter("all")
    setStockFilter("all")
    setCurrentPage(1)
  }

  const openDetails = (p: PackDetails) => {
    setSelectedPack(p)
    setDetailsOpen(true)
  }

  const openEdit = (p: PackDetails, e?: React.MouseEvent) => {
    e?.stopPropagation()
    setSelectedPack(p)
    setEditOpen(true)
  }

  const handleDelete = async (p: PackDetails, e?: React.MouseEvent) => {
    e?.stopPropagation()
    if (!confirm(`Supprimer le pack « ${p.name} » ? Les produits en stock ne seront pas recrédités automatiquement.`)) {
      return
    }
    try {
      const res = await fetch(`/api/stores/${storeId}/packs/${p.id}`, {
        method: "DELETE",
        credentials: "include",
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(typeof data.error === "string" ? data.error : "Suppression impossible")
        return
      }
      toast.success("Pack supprimé")
      setDetailsOpen(false)
      setEditOpen(false)
      setSelectedPack(null)
      loadPacks()
    } catch {
      toast.error("Erreur réseau")
    }
  }

  const canView =
    hasPermission("products.view") || hasStorePermission(STORE_PERMISSIONS.PRODUCTS_VIEW)
  const canEdit =
    hasPermission("products.edit") ||
    hasPermission("products.create") ||
    hasStorePermission(STORE_PERMISSIONS.PRODUCTS_EDIT) ||
    hasStorePermission(STORE_PERMISSIONS.PRODUCTS_CREATE)
  const canDelete =
    hasPermission("products.delete") || hasStorePermission(STORE_PERMISSIONS.PRODUCTS_DELETE)
  const canCreatePack =
    hasPermission("products.create") ||
    hasPermission("products.edit") ||
    hasStorePermission(STORE_PERMISSIONS.PRODUCTS_CREATE) ||
    hasStorePermission(STORE_PERMISSIONS.PRODUCTS_STOCK)

  /** Aligné sur POST …/packs/[packId]/assemble (crédit stock pack + débit composants) */
  const canAssemblePack =
    hasPermission("products.create") ||
    hasPermission("products.edit") ||
    hasStorePermission(STORE_PERMISSIONS.PRODUCTS_CREATE) ||
    hasStorePermission(STORE_PERMISSIONS.PRODUCTS_EDIT) ||
    hasStorePermission(STORE_PERMISSIONS.PRODUCTS_STOCK)

  if (permsLoading || globalPermsLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    )
  }

  if (!hasStoreAccess && !hasStorePermission(STORE_PERMISSIONS.PRODUCTS_VIEW)) {
    return null
  }

  return (
    <div className="flex flex-col min-h-screen">
      <StorePageHeader
        title="Packs"
        description="Stock comme en inventaire produits — même présentation (seuil min, statut, filtres)"
        icon={Layers}
        actions={
          canCreatePack ? (
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Créer un pack
            </Button>
          ) : null
        }
      />

      <main className="flex-1 py-8 px-4 max-w-[1600px] mx-auto w-full">
        {loading ? (
          <Card className="py-12">
            <CardContent className="flex justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </CardContent>
          </Card>
        ) : (
          <Card className="py-0 gap-0">
            <div className="p-4 border-b flex flex-col gap-4 border-gray-200 lg:flex-row lg:justify-between lg:items-center">
              <div className="relative w-full max-w-[400px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Rechercher un pack, SKU ou article de la composition…"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Select value={stockFilter} onValueChange={setStockFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Statut" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les statuts</SelectItem>
                    <SelectItem value="ok">Stock OK</SelectItem>
                    <SelectItem value="low">Stock faible</SelectItem>
                    <SelectItem value="out">Rupture</SelectItem>
                    <SelectItem value="high">Surstock</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Catégorie" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes les catégories</SelectItem>
                    <SelectItem value={PACK_FALLBACK_CATEGORY}>Pack (sans fiche caisse)</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={brandFilter} onValueChange={setBrandFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Marque" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes les marques</SelectItem>
                    <SelectItem value="__none__">Sans marque</SelectItem>
                    {brands.map((brand) => (
                      <SelectItem key={brand.id} value={brand.id}>
                        {brand.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {hasActiveFilters && (
                  <Button variant="ghost" size="sm" onClick={resetFilters} className="text-gray-500">
                    Réinitialiser
                  </Button>
                )}
              </div>
            </div>

            <div className="overflow-x-auto">
              {filtered.length === 0 ? (
                <div className="text-center py-12 px-4">
                  <Layers className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-4 text-lg font-semibold text-gray-900">
                    {packs.length === 0 ? "Aucun pack" : "Aucun pack trouvé"}
                  </h3>
                  <p className="text-gray-500 mt-2 text-sm">
                    {packs.length === 0
                      ? "Créez un pack depuis le bouton ci-dessus ou la page Produits."
                      : "Aucun pack ne correspond à vos critères."}
                  </p>
                </div>
              ) : (
                <table className="w-full">
                  <thead className="border-b border-gray-200 bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                        Produit
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                        Catégorie
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                        Marque
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-600 uppercase tracking-wider">
                        Prix vente
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-600 uppercase tracking-wider">
                        Stock
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                        Statut
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-600 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {paginated.map((p) => (
                      <tr
                        key={p.id}
                        className="hover:bg-gray-50 cursor-pointer transition-colors"
                        onClick={() => openDetails(p)}
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center border border-gray-200 overflow-hidden shrink-0">
                              {p.coverPhoto ? (
                                <img
                                  src={p.coverPhoto}
                                  alt=""
                                  className="w-full h-full object-contain"
                                />
                              ) : (
                                <ImageIcon className="h-5 w-5 text-gray-400" />
                              )}
                            </div>
                            <div>
                              <div className="font-medium text-gray-900">{p.name}</div>
                              {p.sku ? (
                                <div className="text-sm text-gray-500">{p.sku}</div>
                              ) : (
                                <div className="text-sm text-gray-500">
                                  {p.items.length} article{p.items.length > 1 ? "s" : ""}
                                </div>
                              )}
                              {p.items.length > 0 && (
                                <div
                                  className="mt-2 flex flex-wrap items-center gap-1.5 max-w-[320px]"
                                  title="Articles composant le pack"
                                >
                                  {p.items.slice(0, 8).map((it) => (
                                    <div
                                      key={it.id}
                                      className="h-9 w-9 rounded-md border border-gray-200 overflow-hidden bg-gray-50 shrink-0 shadow-sm"
                                      title={`${it.product.name} × ${it.quantity}`}
                                    >
                                      {it.product.photos[0] ? (
                                        <img
                                          src={it.product.photos[0]}
                                          alt=""
                                          className="h-full w-full object-cover"
                                        />
                                      ) : (
                                        <div className="h-full w-full flex items-center justify-center">
                                          <ImageIcon className="h-4 w-4 text-gray-400" />
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                  {p.items.length > 8 ? (
                                    <span className="text-xs text-gray-500 font-medium px-1 py-0.5 rounded bg-gray-100">
                                      +{p.items.length - 8}
                                    </span>
                                  ) : null}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-gray-700">{p.categoryName ?? "Pack"}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-gray-700">{p.brandName ?? "-"}</span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="font-semibold text-gray-900">{formatPrice(p.prixVente)}</span>
                          {p.salePrice == null && (
                            <div className="text-xs text-gray-500">auto</div>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="font-semibold text-gray-900">{p.assembledStock}</span>
                          <span className="text-xs text-gray-500 ml-1">
                            / {p.minStock ?? 0} min
                          </span>
                        </td>
                        <td className="px-6 py-4">{getListingStatusBadge(p)}</td>
                        <td className="px-6 py-4 text-right">
                          {(canView || canEdit || canDelete) && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {canView && (
                                  <DropdownMenuItem
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      openDetails(p)
                                    }}
                                  >
                                    <Eye className="mr-2 h-4 w-4" />
                                    Voir les détails
                                  </DropdownMenuItem>
                                )}
                                {canEdit && (
                                  <DropdownMenuItem onClick={(e) => openEdit(p, e)}>
                                    <Edit className="mr-2 h-4 w-4" />
                                    Modifier
                                  </DropdownMenuItem>
                                )}
                                {canDelete && (
                                  <DropdownMenuItem
                                    className="text-red-600"
                                    onClick={(e) => handleDelete(p, e)}
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Supprimer
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {filtered.length > itemsPerPage && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200">
                <p className="text-sm text-gray-600">
                  Affichage de <span className="font-medium">{start + 1}</span> à{" "}
                  <span className="font-medium">{Math.min(start + itemsPerPage, filtered.length)}</span> sur{" "}
                  <span className="font-medium">{filtered.length}</span> packs
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage <= 1}
                    onClick={() => setCurrentPage((x) => x - 1)}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage((x) => x + 1)}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </Card>
        )}
      </main>

      <CreateStorePackDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        storeId={storeId}
        onSuccess={loadPacks}
      />

      <StorePackDetailsSheet
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        pack={selectedPack}
        storeId={storeId}
        canAddStock={canAssemblePack}
        onStockAdded={loadPacks}
      />

      <EditStorePackSheet
        open={editOpen}
        onOpenChange={setEditOpen}
        storeId={storeId}
        pack={selectedPack}
        onSaved={loadPacks}
      />
    </div>
  )
}
