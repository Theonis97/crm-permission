"use client"

import { useState, useEffect, use } from "react"
import { useSession } from "next-auth/react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { RotateCcw, Search, Plus, Package, Loader2, Eye, CheckCircle, XCircle, MoreHorizontal, Clock, ArrowLeftRight, Banknote, Minus, Trash2, User, X, Image as ImageIcon } from "lucide-react"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import { toast } from "@/lib/app-toast"
import { StorePageHeader } from "@/components/stores/store-page-header"
import { cn } from "@/lib/utils"

interface SAVPageProps { params: Promise<{ id: string }> }

type ReturnReason = "DEFECTIVE" | "BROKEN" | "NOT_SATISFIED" | "NON_FUNCTIONAL" | "WRONG_PRODUCT" | "EXPIRED" | "QUALITY_ISSUE" | "OTHER"
type ProductCondition = "NEW" | "GOOD" | "USED" | "DAMAGED" | "DEFECTIVE"

type ReturnLineDraft = {
  localId: string
  productId: string
  productName: string
  productSku: string | null
  unitPrice: number
  quantity: number
  reason: ReturnReason
  reasonDetails: string
  condition: ProductCondition
  photos: string[]
  exchangeProduct?: {
    productId: string
    productName: string
    productSku: string | null
    unitPrice: number
    quantity: number
    photos: string[]
  } | null
}

const RETURN_REASONS = [
  { value: "DEFECTIVE", label: "Défectueux" }, { value: "BROKEN", label: "Cassé" },
  { value: "NOT_SATISFIED", label: "Pas satisfait" }, { value: "NON_FUNCTIONAL", label: "Non fonctionnel" },
  { value: "WRONG_PRODUCT", label: "Mauvais produit" }, { value: "EXPIRED", label: "Produit périmé" },
  { value: "QUALITY_ISSUE", label: "Problème de qualité" }, { value: "OTHER", label: "Autre" },
]

const PRODUCT_CONDITIONS = [
  { value: "NEW", label: "Neuf" }, { value: "GOOD", label: "Bon état" },
  { value: "USED", label: "Utilisé" }, { value: "DAMAGED", label: "Endommagé" }, { value: "DEFECTIVE", label: "Défectueux" },
]

const getStatusBadge = (status: string) => {
  const badges: Record<string, React.ReactNode> = {
    PENDING: <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200"><Clock className="h-3 w-3 mr-1" />En attente</Badge>,
    APPROVED: <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200"><CheckCircle className="h-3 w-3 mr-1" />Approuvé</Badge>,
    AWAITING_CASHIER: <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200"><Clock className="h-3 w-3 mr-1" />En caisse</Badge>,
    REFUNDED: <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200"><Banknote className="h-3 w-3 mr-1" />Remboursé</Badge>,
    EXCHANGED: <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200"><ArrowLeftRight className="h-3 w-3 mr-1" />Échangé</Badge>,
    REJECTED: <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200"><XCircle className="h-3 w-3 mr-1" />Rejeté</Badge>,
  }
  return badges[status] || <Badge variant="outline">{status}</Badge>
}

const getConditionBadge = (condition: string) => {
  const badges: Record<string, React.ReactNode> = {
    NEW: <Badge variant="outline" className="bg-green-50 text-green-700">Neuf</Badge>,
    GOOD: <Badge variant="outline" className="bg-blue-50 text-blue-700">Bon état</Badge>,
    USED: <Badge variant="outline" className="bg-gray-50 text-gray-700">Utilisé</Badge>,
    DAMAGED: <Badge variant="outline" className="bg-orange-50 text-orange-700">Endommagé</Badge>,
    DEFECTIVE: <Badge variant="outline" className="bg-red-50 text-red-700">Défectueux</Badge>,
  }
  return badges[condition] || <Badge variant="outline">{condition}</Badge>
}

export default function SAVPage({ params }: SAVPageProps) {
  const { id: storeId } = use(params)
  const { data: session } = useSession()

  const [returns, setReturns] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [conditionFilter, setConditionFilter] = useState("all")
  const [productFilter, setProductFilter] = useState("")
  const [selectedReturn, setSelectedReturn] = useState<any>(null)
  const [showDetailsDialog, setShowDetailsDialog] = useState(false)
  const [processingId, setProcessingId] = useState<string | null>(null)

  const [showCreateSheet, setShowCreateSheet] = useState(false)
  const [storeProducts, setStoreProducts] = useState<any[]>([])
  const [loadingProducts, setLoadingProducts] = useState(false)
  const [productSearch, setProductSearch] = useState("")
  
  const [returnLines, setReturnLines] = useState<ReturnLineDraft[]>([])
  const [exchangeTargetLineId, setExchangeTargetLineId] = useState<string | null>(null)
  const [returnNotes, setReturnNotes] = useState("")
  const [customerName, setCustomerName] = useState("")
  const [customerPhone, setCustomerPhone] = useState("")
  const [creatingReturn, setCreatingReturn] = useState(false)
  const [selectionMode, setSelectionMode] = useState<"return" | "exchange">("return")
  
  // États pour l'envoi à la caisse
  const [showSendToCashierDialog, setShowSendToCashierDialog] = useState(false)
  const [sendingToCashier, setSendingToCashier] = useState(false)
  const [resolutionType, setResolutionType] = useState<"EXCHANGE" | "REFUND">("EXCHANGE")
  const [discountAmount, setDiscountAmount] = useState(0)

  // Stats basées sur l'état des produits (condition)
  const getConditionStats = () => {
    const allItems = returns.flatMap(r => r.items || [])
    return {
      total: returns.length,
      new: allItems.filter(i => i.condition === "NEW").length,
      good: allItems.filter(i => i.condition === "GOOD").length,
      damaged: allItems.filter(i => i.condition === "DAMAGED").length,
      defective: allItems.filter(i => i.condition === "DEFECTIVE").length,
    }
  }
  const stats = getConditionStats()

  const loadReturns = async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/stores/${storeId}/sav`)
      if (res.ok) setReturns(await res.json())
    } catch (e) { toast.error("Erreur chargement") } finally { setLoading(false) }
  }

  const loadStoreProducts = async () => {
    try {
      setLoadingProducts(true)
      const res = await fetch(
        `/api/stores/${storeId}/products?includePackProxies=true`
      )
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        toast.error(
          (data && data.error) ||
            "Impossible de charger le catalogue de ce magasin (droits ou réseau)."
        )
        setStoreProducts([])
        return
      }
      const list = Array.isArray(data) ? data : data?.products || []
      setStoreProducts(
        list.map((p: any) => ({
          id: p.id,
          productId: p.productId || p.id,
          name: p.product?.name || p.name,
          sku: p.product?.sku || p.sku,
          prixVente: p.product?.prixVente ?? p.prixVente,
          stock: p.stock,
          photos: p.product?.photos || p.photos || [],
        }))
      )
    } catch (e) {
      toast.error("Erreur produits")
      setStoreProducts([])
    } finally {
      setLoadingProducts(false)
    }
  }

  useEffect(() => { loadReturns() }, [storeId])

  const filteredReturns = returns.filter(r => {
    const searchMatch = r.number?.toLowerCase().includes(searchQuery.toLowerCase()) || r.customerName?.toLowerCase().includes(searchQuery.toLowerCase())
    const statusMatch = statusFilter === "all" || r.status === statusFilter
    const conditionMatch = conditionFilter === "all" || r.items?.some((i: any) => i.condition === conditionFilter)
    const productMatch = !productFilter || r.items?.some((i: any) => i.productName?.toLowerCase().includes(productFilter.toLowerCase()))
    return searchMatch && statusMatch && conditionMatch && productMatch
  })

  const filteredProducts = storeProducts.filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase()) || p.sku?.toLowerCase().includes(productSearch.toLowerCase()))

  const returnHasExchange = (r: any) =>
    Boolean(r.items?.some((i: any) => i.exchangeProductId))

  const handleProcess = async (id: string, action: string) => {
    try {
      setProcessingId(id)
      const res = await fetch(`/api/stores/${storeId}/sav/${id}/process`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      })
      if (res.ok) {
        const labels: Record<string, string> = {
          APPROVED: "Retour approuvé",
          REJECTED: "Retour rejeté",
          EXCHANGED:
            "Échange clôturé au SAV — stock magasin débité, retours enregistrés (sans caisse)",
          REFUNDED: "Remboursement enregistré au SAV (sans caisse)",
        }
        toast.success(labels[action] || "Mis à jour")
        loadReturns()
      } else {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || "Erreur")
      }
    } catch (e: any) {
      toast.error(e.message || "Erreur")
    } finally {
      setProcessingId(null)
    }
  }

  const newLocalId = () =>
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `line-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`

  const openCreateSheet = () => {
    setReturnLines([])
    setExchangeTargetLineId(null)
    setReturnNotes("")
    setCustomerName("")
    setCustomerPhone("")
    setProductSearch("")
    setSelectionMode("return")
    loadStoreProducts()
    setShowCreateSheet(true)
  }

  const selectProduct = (product: any) => {
    if (selectionMode === "exchange") {
      if (!exchangeTargetLineId) {
        toast.error("Choisissez d’abord une ligne de retour, puis « Échange pour cette ligne ».")
        setSelectionMode("return")
        return
      }
      const ex = {
        productId: product.productId,
        productName: product.name,
        productSku: product.sku,
        unitPrice: product.prixVente,
        quantity: 1,
        photos: product.photos || [],
      }
      setReturnLines((lines) =>
        lines.map((l) =>
          l.localId === exchangeTargetLineId
            ? { ...l, exchangeProduct: ex }
            : l
        )
      )
      setExchangeTargetLineId(null)
      setSelectionMode("return")
      toast.success("Produit d’échange associé à la ligne")
      return
    }

    const line: ReturnLineDraft = {
      localId: newLocalId(),
      productId: product.productId,
      productName: product.name,
      productSku: product.sku,
      unitPrice: product.prixVente,
      quantity: 1,
      reason: "DEFECTIVE",
      reasonDetails: "",
      condition: "GOOD",
      photos: product.photos || [],
      exchangeProduct: null,
    }
    setReturnLines((prev) => [...prev, line])
    toast.success("Produit ajouté au retour — vous pouvez en ajouter d’autres pour le même client.")
  }

  const removeReturnLine = (localId: string) => {
    setReturnLines((prev) => prev.filter((l) => l.localId !== localId))
    if (exchangeTargetLineId === localId) {
      setExchangeTargetLineId(null)
      setSelectionMode("return")
    }
  }

  const updateReturnLine = (localId: string, patch: Partial<ReturnLineDraft>) => {
    setReturnLines((lines) =>
      lines.map((l) => (l.localId === localId ? { ...l, ...patch } : l))
    )
  }

  const updateLineExchangeQty = (localId: string, qty: number) => {
    setReturnLines((lines) =>
      lines.map((l) => {
        if (l.localId !== localId || !l.exchangeProduct) return l
        return {
          ...l,
          exchangeProduct: { ...l.exchangeProduct, quantity: Math.max(1, qty) },
        }
      })
    )
  }

  const startExchangeForLine = (localId: string) => {
    setExchangeTargetLineId(localId)
    setSelectionMode("exchange")
    toast.message("Sélectionnez dans la grille le produit d’échange pour cette ligne.")
  }

  const clearExchangeForLine = (localId: string) => {
    updateReturnLine(localId, { exchangeProduct: null })
    if (exchangeTargetLineId === localId) {
      setExchangeTargetLineId(null)
      setSelectionMode("return")
    }
  }

  const createReturn = async () => {
    if (returnLines.length === 0) {
      toast.error("Ajoutez au moins un produit retourné")
      return
    }
    try {
      setCreatingReturn(true)
      const itemsPayload = returnLines.map((line) => {
        const itemData: Record<string, unknown> = {
          productId: line.productId,
          quantity: line.quantity,
          unitPrice: line.unitPrice,
          reason: line.reason,
          reasonDetails: line.reasonDetails || undefined,
          condition: line.condition,
        }
        if (line.exchangeProduct) {
          itemData.exchangeProductId = line.exchangeProduct.productId
          itemData.exchangeDiscount = 0
        }
        return itemData
      })
      const res = await fetch(`/api/stores/${storeId}/sav`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: itemsPayload,
          notes: returnNotes,
          customerName,
          customerPhone,
        }),
      })
      if (res.ok) {
        toast.success(
          returnLines.length > 1
            ? `Retour créé — ${returnLines.length} articles pour ce client`
            : "Retour créé"
        )
        setShowCreateSheet(false)
        loadReturns()
      } else {
        const err = await res.json()
        throw new Error(err.error)
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erreur")
    } finally {
      setCreatingReturn(false)
    }
  }

  const calcTotal = () =>
    returnLines.reduce((s, l) => s + l.quantity * l.unitPrice, 0)

  const calcDiff = () =>
    returnLines.reduce((s, l) => {
      if (!l.exchangeProduct) return s
      return (
        s +
        (l.exchangeProduct.quantity * l.exchangeProduct.unitPrice -
          l.quantity * l.unitPrice)
      )
    }, 0)

  // Fonction pour envoyer à la caisse
  const handleSendToCashier = async () => {
    if (!selectedReturn) return
    try {
      setSendingToCashier(true)
      const items = selectedReturn.items?.map((item: any) => ({
        itemId: item.id,
        refundAmount: resolutionType === "REFUND" ? item.quantity * item.unitPrice : 0,
        exchangeProductId: item.exchangeProductId,
        exchangeProductPrice: item.exchangeProduct?.prixVente,
        exchangeDiscount: discountAmount,
      }))

      const res = await fetch(`/api/stores/${storeId}/sav/${selectedReturn.id}/send-to-cashier`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resolutionType,
          items,
          totalDiscount: discountAmount,
          notes: `${resolutionType === "REFUND" ? "Remboursement" : "Échange"} envoyé à la caisse`
        })
      })

      if (res.ok) {
        toast.success("Envoyé à la caisse avec succès")
        setShowSendToCashierDialog(false)
        setShowDetailsDialog(false)
        loadReturns()
      } else {
        const err = await res.json()
        throw new Error(err.error)
      }
    } catch (e: any) {
      toast.error(e.message || "Erreur lors de l'envoi à la caisse")
    } finally {
      setSendingToCashier(false)
    }
  }

  // Calcul du montant à payer/rendre pour un échange
  // Retourne un objet avec le montant et le type (payer ou rendre)
  const calcExchangeAmount = () => {
    if (!selectedReturn?.items?.length) return { amount: 0, type: "none" as const }

    /** Écart par ligne pour les échanges uniquement (lignes sans échange = hors ce calcul). */
    let diffSum = 0
    for (const item of selectedReturn.items) {
      if (!item.exchangeProductId) continue
      const ret = item.quantity * item.unitPrice
      const exUnit =
        item.exchangeProduct?.prixVente ??
        item.exchangeProductPrice ??
        item.unitPrice
      diffSum += item.quantity * Number(exUnit) - ret
    }

    const difference = diffSum - discountAmount

    if (difference > 0) {
      return { amount: difference, type: "pay" as const }
    }
    if (difference < 0) {
      return { amount: Math.abs(difference), type: "refund" as const }
    }
    return { amount: 0, type: "none" as const }
  }
  
  // Calcul du montant à rembourser (pour REFUND)
  const calcRefundAmount = () => {
    if (!selectedReturn) return 0
    return selectedReturn.items?.reduce((sum: number, item: any) => sum + (item.quantity * item.unitPrice), 0) || 0
  }

  return (
    <div className="flex flex-col">
      <StorePageHeader title="Service Après-Vente" description="Gérez les retours de produits" icon={RotateCcw}
        actions={<div className="flex items-center gap-3">
          <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Produit..." value={productFilter} onChange={(e) => setProductFilter(e.target.value)} className="pl-9 w-[180px] bg-white" /></div>
          <Select value={conditionFilter} onValueChange={setConditionFilter}><SelectTrigger className="w-[130px] bg-white"><SelectValue placeholder="État" /></SelectTrigger><SelectContent><SelectItem value="all">Tous états</SelectItem><SelectItem value="NEW">Neuf</SelectItem><SelectItem value="GOOD">Bon état</SelectItem><SelectItem value="USED">Utilisé</SelectItem><SelectItem value="DAMAGED">Endommagé</SelectItem><SelectItem value="DEFECTIVE">Défectueux</SelectItem></SelectContent></Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger className="w-[130px] bg-white"><SelectValue placeholder="Statut" /></SelectTrigger><SelectContent><SelectItem value="all">Tous statuts</SelectItem><SelectItem value="PENDING">En attente</SelectItem><SelectItem value="APPROVED">Approuvé</SelectItem><SelectItem value="AWAITING_CASHIER">En caisse</SelectItem><SelectItem value="REFUNDED">Remboursé</SelectItem><SelectItem value="EXCHANGED">Échangé</SelectItem><SelectItem value="REJECTED">Rejeté</SelectItem></SelectContent></Select>
          <Button onClick={openCreateSheet}><Plus className="h-4 w-4 mr-2" />Nouveau retour</Button>
        </div>} />

      <div className="px-10 py-6 flex flex-col gap-6">
        <div className="grid grid-cols-5 gap-4">
          <Card className="cursor-pointer hover:shadow-md" onClick={() => setConditionFilter("all")}><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm">Total retours</CardTitle><RotateCcw className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{stats.total}</div></CardContent></Card>
          <Card className="cursor-pointer hover:shadow-md" onClick={() => setConditionFilter("NEW")}><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm">Neuf</CardTitle><Package className="h-4 w-4 text-green-600" /></CardHeader><CardContent><div className="text-2xl font-bold text-green-600">{stats.new}</div></CardContent></Card>
          <Card className="cursor-pointer hover:shadow-md" onClick={() => setConditionFilter("GOOD")}><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm">Bon état</CardTitle><Package className="h-4 w-4 text-blue-600" /></CardHeader><CardContent><div className="text-2xl font-bold text-blue-600">{stats.good}</div></CardContent></Card>
          <Card className="cursor-pointer hover:shadow-md" onClick={() => setConditionFilter("DAMAGED")}><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm">Endommagé</CardTitle><Package className="h-4 w-4 text-orange-600" /></CardHeader><CardContent><div className="text-2xl font-bold text-orange-600">{stats.damaged}</div></CardContent></Card>
          <Card className="cursor-pointer hover:shadow-md" onClick={() => setConditionFilter("DEFECTIVE")}><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm">Défectueux</CardTitle><Package className="h-4 w-4 text-red-600" /></CardHeader><CardContent><div className="text-2xl font-bold text-red-600">{stats.defective}</div></CardContent></Card>
        </div>

        <Card><CardHeader><CardTitle>Retours ({filteredReturns.length})</CardTitle></CardHeader><CardContent>
          {loading ? <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin" /></div> : filteredReturns.length === 0 ? <div className="text-center py-8 text-muted-foreground"><RotateCcw className="h-12 w-12 mx-auto mb-4 opacity-20" /><p>Aucun retour</p></div> : (
            <Table><TableHeader><TableRow><TableHead>N°</TableHead><TableHead>Client</TableHead><TableHead>Produit retourné</TableHead><TableHead>Produit échangé</TableHead><TableHead>État</TableHead><TableHead>Statut</TableHead><TableHead>Date</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
              <TableBody>{filteredReturns.map((r) => {
                const items = r.items || []
                const returnedItem = items[0]
                const exchangedItems = items.filter((i: any) => i.exchangeProductId || i.exchangeProductName)
                const returnedCell =
                  items.length === 0 ? (
                    "-"
                  ) : items.length === 1 ? (
                    <>
                      <div className="font-medium text-sm">{returnedItem?.productName || "-"}</div>
                      <div className="text-xs text-muted-foreground">
                        {returnedItem?.quantity || 0} × {returnedItem?.unitPrice?.toLocaleString() || 0} F
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="font-medium text-sm">{items.length} articles</div>
                      <div className="text-xs text-muted-foreground line-clamp-2">
                        {items.map((i: any) => `${i.quantity}× ${i.productName}`).join(" · ")}
                      </div>
                    </>
                  )
                const exchangeCell =
                  exchangedItems.length === 0 ? (
                    <span className="text-muted-foreground text-xs">-</span>
                  ) : exchangedItems.length === 1 ? (
                    <>
                      <div className="font-medium text-sm text-purple-600">
                        {exchangedItems[0].exchangeProductName}
                      </div>
                      {exchangedItems[0].exchangeDiscount > 0 && (
                        <div className="text-xs text-muted-foreground">
                          Remise: {exchangedItems[0].exchangeDiscount?.toLocaleString()} F
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-xs text-purple-700 space-y-0.5">
                      {exchangedItems.map((i: any) => (
                        <div key={i.id}>→ {i.exchangeProductName}</div>
                      ))}
                    </div>
                  )
                return (
                <TableRow key={r.id}><TableCell className="font-medium text-xs">{r.number}</TableCell><TableCell><div className="font-medium text-sm">{r.customerName || "-"}</div><div className="text-xs text-muted-foreground">{r.customerPhone || "-"}</div></TableCell><TableCell>{returnedCell}</TableCell><TableCell>{exchangeCell}</TableCell><TableCell>{returnedItem?.condition ? getConditionBadge(returnedItem.condition) : items.length > 1 ? <Badge variant="outline" className="text-[10px]">Mixte</Badge> : "-"}</TableCell><TableCell>{getStatusBadge(r.status)}</TableCell><TableCell className="text-xs">{format(new Date(r.createdAt), "dd/MM/yy HH:mm", { locale: fr })}</TableCell>
                  <TableCell className="text-right"><DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="sm"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => { setSelectedReturn(r); setDiscountAmount(0); setShowDetailsDialog(true) }}><Eye className="h-4 w-4 mr-2" />Détails</DropdownMenuItem>
                    {r.status === "PENDING" && <><DropdownMenuItem onClick={() => handleProcess(r.id, "APPROVED")}><CheckCircle className="h-4 w-4 mr-2" />Approuver</DropdownMenuItem><DropdownMenuItem onClick={() => handleProcess(r.id, "REJECTED")} className="text-red-600"><XCircle className="h-4 w-4 mr-2" />Rejeter</DropdownMenuItem></>}
                    {r.status === "PENDING" && returnHasExchange(r) && (
                      <DropdownMenuItem
                        disabled={processingId === r.id}
                        onClick={() => handleProcess(r.id, "EXCHANGED")}
                        className="text-purple-700"
                      >
                        <ArrowLeftRight className="h-4 w-4 mr-2" />
                        Clôturer l&apos;échange ici (sans caisse)
                      </DropdownMenuItem>
                    )}
                    {r.status === "PENDING" && (
                      <DropdownMenuItem
                        disabled={processingId === r.id}
                        onClick={() => handleProcess(r.id, "REFUNDED")}
                        className="text-emerald-700"
                      >
                        <Banknote className="h-4 w-4 mr-2" />
                        Remboursement SAV seul (sans caisse)
                      </DropdownMenuItem>
                    )}
                    {r.status === "APPROVED" && returnHasExchange(r) && (
                      <DropdownMenuItem
                        disabled={processingId === r.id}
                        onClick={() => handleProcess(r.id, "EXCHANGED")}
                        className="text-purple-700"
                      >
                        <ArrowLeftRight className="h-4 w-4 mr-2" />
                        Clôturer l&apos;échange ici (sans caisse)
                      </DropdownMenuItem>
                    )}
                    {r.status === "APPROVED" && (
                      <DropdownMenuItem
                        disabled={processingId === r.id}
                        onClick={() => handleProcess(r.id, "REFUNDED")}
                        className="text-emerald-700"
                      >
                        <Banknote className="h-4 w-4 mr-2" />
                        Remboursement SAV seul (sans caisse)
                      </DropdownMenuItem>
                    )}
                    {(r.status === "PENDING" || r.status === "APPROVED") && <><DropdownMenuItem onClick={() => { setSelectedReturn(r); setResolutionType("EXCHANGE"); setDiscountAmount(0); setShowSendToCashierDialog(true) }} className="text-purple-600"><ArrowLeftRight className="h-4 w-4 mr-2" />Échange → Caisse</DropdownMenuItem><DropdownMenuItem onClick={() => { setSelectedReturn(r); setResolutionType("REFUND"); setDiscountAmount(0); setShowSendToCashierDialog(true) }} className="text-green-600"><Banknote className="h-4 w-4 mr-2" />Remboursement → Caisse</DropdownMenuItem></>}
                  </DropdownMenuContent></DropdownMenu></TableCell></TableRow>
              )})}</TableBody></Table>
          )}
        </CardContent></Card>
      </div>

      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}><DialogContent className="max-w-2xl"><DialogHeader><DialogTitle>Retour {selectedReturn?.number}</DialogTitle><DialogDescription>N° de suivi: {selectedReturn?.trackingNumber || selectedReturn?.number}</DialogDescription></DialogHeader>
        {selectedReturn && <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4"><div><p className="text-sm text-muted-foreground">Client</p><p className="font-medium">{selectedReturn.customerName || "-"}</p></div><div><p className="text-sm text-muted-foreground">Statut</p>{getStatusBadge(selectedReturn.status)}</div></div>
          <div><h4 className="font-semibold mb-2">Articles</h4><div className="border rounded-lg"><Table><TableHeader><TableRow><TableHead>Produit</TableHead><TableHead>Qté</TableHead><TableHead>Motif</TableHead></TableRow></TableHeader><TableBody>{selectedReturn.items?.map((item: any) => <TableRow key={item.id}><TableCell>{item.productName}</TableCell><TableCell>{item.quantity}</TableCell><TableCell>{RETURN_REASONS.find(r => r.value === item.reason)?.label}</TableCell></TableRow>)}</TableBody></Table></div></div>
        </div>}
        <DialogFooter><Button variant="outline" onClick={() => setShowDetailsDialog(false)}>Fermer</Button></DialogFooter>
      </DialogContent></Dialog>

      {/* Dialog pour envoyer à la caisse */}
      <Dialog open={showSendToCashierDialog} onOpenChange={setShowSendToCashierDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{resolutionType === "REFUND" ? "Remboursement" : "Échange"} → Caisse</DialogTitle>
            <DialogDescription>
              N° de suivi: {selectedReturn?.trackingNumber || selectedReturn?.number}
            </DialogDescription>
          </DialogHeader>
          {selectedReturn && (
            <div className="space-y-4">
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-muted-foreground">Client</p>
                <p className="font-medium">{selectedReturn.customerName || "Non renseigné"}</p>
              </div>
              
              {selectedReturn.items?.map((item: any) => (
                <div key={item.id} className="p-3 border rounded-lg space-y-2">
                  <div className="flex justify-between">
                    <span className="font-medium">{item.productName}</span>
                    <span className="text-sm">{item.quantity} x {item.unitPrice?.toLocaleString()} F</span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Valeur: <span className="font-medium text-red-600">{(item.quantity * item.unitPrice)?.toLocaleString()} F</span>
                  </div>
                  {item.exchangeProductName && resolutionType === "EXCHANGE" && (
                    <div className="text-sm">
                      Échange avec: <span className="font-medium text-purple-600">{item.exchangeProductName}</span>
                    </div>
                  )}
                </div>
              ))}

              {resolutionType === "EXCHANGE" && (
                <div className="space-y-3">
                  <Label>Rabais additionnel SAV (FCFA)</Label>
                  <Input 
                    type="number" 
                    value={discountAmount} 
                    onChange={(e) => setDiscountAmount(Number(e.target.value))}
                    placeholder="0"
                  />
                  {(() => {
                    const result = calcExchangeAmount()
                    if (result.type === "pay") {
                      return (
                        <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                          <div className="flex justify-between text-sm">
                            <span>💰 Client doit payer:</span>
                            <span className="font-bold text-purple-700">{result.amount.toLocaleString()} F</span>
                          </div>
                        </div>
                      )
                    } else if (result.type === "refund") {
                      return (
                        <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                          <div className="flex justify-between text-sm">
                            <span>💸 Caisse rend au client:</span>
                            <span className="font-bold text-green-700">{result.amount.toLocaleString()} F</span>
                          </div>
                        </div>
                      )
                    } else {
                      return (
                        <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                          <div className="flex justify-between text-sm">
                            <span>✅ Même valeur:</span>
                            <span className="font-bold text-gray-700">0 F</span>
                          </div>
                        </div>
                      )
                    }
                  })()}
                </div>
              )}

              {resolutionType === "REFUND" && (
                <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex justify-between text-sm">
                    <span>💸 Montant à rembourser:</span>
                    <span className="font-bold text-green-700">
                      {calcRefundAmount().toLocaleString()} F
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSendToCashierDialog(false)}>Annuler</Button>
            <Button onClick={handleSendToCashier} disabled={sendingToCashier}>
              {sendingToCashier ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : resolutionType === "REFUND" ? <Banknote className="h-4 w-4 mr-2" /> : <ArrowLeftRight className="h-4 w-4 mr-2" />}
              Envoyer à la caisse
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Sheet open={showCreateSheet} onOpenChange={setShowCreateSheet}>
        <SheetContent side="right" className="w-full sm:max-w-[100vw] p-0">
        <SheetTitle className="sr-only">Nouveau retour SAV</SheetTitle>
        <div className="flex h-screen bg-gray-50">
          <div className="flex-1 flex flex-col min-w-0">
            <div className="bg-white border-b p-4">
              <div className="flex items-center justify-between mb-4 gap-2">
                <div className="flex items-center gap-3 min-w-0">
                  <Button variant="ghost" size="icon" onClick={() => setShowCreateSheet(false)}><X className="h-5 w-5" /></Button>
                  <div className="min-w-0">
                    <h2 className="text-lg font-semibold">Nouveau retour SAV</h2>
                    <p className="text-sm text-muted-foreground truncate">
                      {selectionMode === "exchange" && exchangeTargetLineId
                        ? "Choisissez le produit d’échange (ligne surlignée à droite)"
                        : "Ajoutez plusieurs produits pour le même client — un clic = une ligne de retour"}
                    </p>
                  </div>
                </div>
                {exchangeTargetLineId ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setExchangeTargetLineId(null)
                      setSelectionMode("return")
                    }}
                  >
                    Annuler l’échange
                  </Button>
                ) : null}
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher un produit…"
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="flex-1 p-4 overflow-y-auto">
              {loadingProducts ? (
                <div className="flex justify-center py-16">
                  <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
                </div>
              ) : (
                <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                  {filteredProducts.map((p) => (
                    <div
                      key={p.id}
                      className="relative bg-white rounded-lg border p-3 hover:shadow-md hover:border-blue-300 cursor-pointer group"
                      onClick={() => selectProduct(p)}
                    >
                      {p.photos?.[0] ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={p.photos[0]} alt={p.name} className="w-full h-16 object-contain mb-2" />
                      ) : (
                        <div className="w-full h-16 bg-gray-100 rounded flex items-center justify-center mb-2">
                          <Package className="h-8 w-8 text-gray-300" />
                        </div>
                      )}
                      <h3 className="font-medium text-xs line-clamp-2">{p.name}</h3>
                      <div className="flex justify-between mt-1">
                        <span className="text-blue-600 font-bold text-sm">{p.prixVente?.toLocaleString()} F</span>
                        <span className="text-[10px] text-gray-500">Stock: {p.stock}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="w-[420px] max-w-[40vw] shrink-0 bg-white border-l flex flex-col shadow-xl">
            <div className="p-4 border-b bg-gray-50">
              <h3 className="font-semibold">Détails du retour</h3>
              <p className="text-xs text-muted-foreground mt-1">
                {returnLines.length} article{returnLines.length > 1 ? "s" : ""} · même client
              </p>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div className="space-y-2">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Client
                </h4>
                <Input placeholder="Nom" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
                <Input placeholder="Téléphone" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} />
              </div>
              <Separator />
              <div className="space-y-2">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <RotateCcw className="h-4 w-4 text-red-500" />
                  Produits retournés
                </h4>
                {returnLines.length === 0 ? (
                  <div className="border-2 border-dashed rounded-lg p-6 text-center">
                    <Package className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                    <p className="text-sm text-gray-500">
                      Cliquez sur les produits à gauche pour les ajouter un par un.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {returnLines.map((line) => (
                      <div
                        key={line.localId}
                        className={cn(
                          "rounded-lg border p-3 space-y-2",
                          line.localId === exchangeTargetLineId
                            ? "border-purple-400 bg-purple-50/50 ring-1 ring-purple-300"
                            : "border-red-200 bg-red-50/40",
                        )}
                      >
                        <div className="flex items-start gap-2">
                          {line.photos?.[0] ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={line.photos[0]} alt="" className="w-10 h-10 object-contain bg-white rounded shrink-0" />
                          ) : (
                            <div className="w-10 h-10 bg-white rounded flex items-center justify-center shrink-0">
                              <Package className="h-5 w-5 text-gray-300" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-xs truncate">{line.productName}</h4>
                            <p className="text-xs font-semibold text-red-600">{line.unitPrice?.toLocaleString()} F / u.</p>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-red-600 shrink-0"
                            onClick={() => removeReturnLine(line.localId)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                        <div className="flex items-center gap-2">
                          <Label className="text-[10px] w-10">Qté</Label>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() =>
                              updateReturnLine(line.localId, {
                                quantity: Math.max(1, line.quantity - 1),
                              })
                            }
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="w-6 text-center text-sm">{line.quantity}</span>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() =>
                              updateReturnLine(line.localId, { quantity: line.quantity + 1 })
                            }
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label className="text-[10px]">État</Label>
                            <Select
                              value={line.condition}
                              onValueChange={(v) =>
                                updateReturnLine(line.localId, { condition: v as ProductCondition })
                              }
                            >
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="z-[9999]">
                                {PRODUCT_CONDITIONS.map((c) => (
                                  <SelectItem key={c.value} value={c.value}>
                                    {c.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label className="text-[10px]">Motif</Label>
                            <Select
                              value={line.reason}
                              onValueChange={(v) =>
                                updateReturnLine(line.localId, { reason: v as ReturnReason })
                              }
                            >
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="z-[9999]">
                                {RETURN_REASONS.map((r) => (
                                  <SelectItem key={r.value} value={r.value}>
                                    {r.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div>
                          <Label className="text-[10px]">Détails</Label>
                          <Textarea
                            value={line.reasonDetails}
                            onChange={(e) =>
                              updateReturnLine(line.localId, { reasonDetails: e.target.value })
                            }
                            placeholder="Précisions…"
                            rows={2}
                            className="text-xs"
                          />
                        </div>
                        <div className="pt-1 border-t border-red-100">
                          {!line.exchangeProduct ? (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="w-full text-xs h-8 text-purple-700 border-purple-200"
                              onClick={() => startExchangeForLine(line.localId)}
                            >
                              <ArrowLeftRight className="h-3 w-3 mr-1" />
                              Échange pour cette ligne
                            </Button>
                          ) : (
                            <div className="bg-purple-50/80 border border-purple-200 rounded-md p-2 space-y-2">
                              <div className="flex items-start gap-2">
                                {line.exchangeProduct.photos?.[0] ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    src={line.exchangeProduct.photos[0]}
                                    alt=""
                                    className="w-8 h-8 object-contain bg-white rounded"
                                  />
                                ) : null}
                                <div className="flex-1 min-w-0">
                                  <p className="text-[10px] font-medium truncate">
                                    {line.exchangeProduct.productName}
                                  </p>
                                  <p className="text-[10px] text-purple-700">
                                    {line.exchangeProduct.unitPrice?.toLocaleString()} F
                                  </p>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 text-purple-600"
                                  onClick={() => clearExchangeForLine(line.localId)}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                              <div className="flex items-center gap-2">
                                <Label className="text-[10px] w-8">Qté</Label>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={() =>
                                    updateLineExchangeQty(line.localId, line.exchangeProduct!.quantity - 1)
                                  }
                                >
                                  <Minus className="h-2.5 w-2.5" />
                                </Button>
                                <span className="text-xs w-5 text-center">{line.exchangeProduct.quantity}</span>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={() =>
                                    updateLineExchangeQty(line.localId, line.exchangeProduct!.quantity + 1)
                                  }
                                >
                                  <Plus className="h-2.5 w-2.5" />
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {returnLines.length > 0 ? (
                <>
                  <Separator />
                  <div>
                    <Label className="text-xs">Notes (tout le dossier)</Label>
                    <Textarea
                      value={returnNotes}
                      onChange={(e) => setReturnNotes(e.target.value)}
                      placeholder="Notes…"
                      rows={2}
                      className="text-xs"
                    />
                  </div>
                </>
              ) : null}
            </div>
            {returnLines.length > 0 ? (
              <div className="border-t p-4 space-y-3 bg-gray-50">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total valeur retour</span>
                    <span className="font-medium text-red-600">-{calcTotal().toLocaleString()} F</span>
                  </div>
                  {returnLines.some((l) => l.exchangeProduct) ? (
                    <>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Total échanges (lignes)</span>
                        <span className="font-medium text-purple-600">
                          +
                          {returnLines
                            .filter((l) => l.exchangeProduct)
                            .reduce(
                              (s, l) =>
                                s + l.exchangeProduct!.quantity * l.exchangeProduct!.unitPrice,
                              0,
                            )
                            .toLocaleString()}{" "}
                          F
                        </span>
                      </div>
                      <Separator />
                      <div className="flex justify-between font-semibold">
                        <span>Différence nette</span>
                        <span className={calcDiff() >= 0 ? "text-green-600" : "text-red-600"}>
                          {calcDiff() >= 0 ? "+" : ""}
                          {calcDiff().toLocaleString()} F
                        </span>
                      </div>
                    </>
                  ) : null}
                </div>
                <Button className="w-full" onClick={createReturn} disabled={creatingReturn}>
                  {creatingReturn ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <CheckCircle className="h-4 w-4 mr-2" />
                  )}
                  Valider le retour ({returnLines.length} article{returnLines.length > 1 ? "s" : ""})
                </Button>
              </div>
            ) : null}
          </div>
        </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
