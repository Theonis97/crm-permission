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
import { Sheet, SheetContent } from "@/components/ui/sheet"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { RotateCcw, Search, Plus, Package, Loader2, Eye, CheckCircle, XCircle, MoreHorizontal, Clock, ArrowLeftRight, Banknote, Minus, Trash2, User, X, Image as ImageIcon } from "lucide-react"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import { toast } from "sonner"
import { StorePageHeader } from "@/components/stores/store-page-header"

interface SAVPageProps { params: Promise<{ id: string }> }

type ReturnReason = "DEFECTIVE" | "BROKEN" | "NOT_SATISFIED" | "NON_FUNCTIONAL" | "WRONG_PRODUCT" | "EXPIRED" | "QUALITY_ISSUE" | "OTHER"
type ProductCondition = "NEW" | "GOOD" | "USED" | "DAMAGED" | "DEFECTIVE"

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
  
  const [returnedProduct, setReturnedProduct] = useState<any>(null)
  const [exchangeProduct, setExchangeProduct] = useState<any>(null)
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
      const res = await fetch(`/api/stores/${storeId}/products`)
      if (res.ok) {
        const data = await res.json()
        setStoreProducts((data.products || data || []).map((p: any) => ({
          id: p.id, productId: p.productId || p.id, name: p.product?.name || p.name,
          sku: p.product?.sku || p.sku, prixVente: p.product?.prixVente || p.prixVente,
          stock: p.stock, photos: p.product?.photos || p.photos || [],
        })))
      }
    } catch (e) { toast.error("Erreur produits") } finally { setLoadingProducts(false) }
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

  const handleProcess = async (id: string, action: string) => {
    try {
      setProcessingId(id)
      const res = await fetch(`/api/stores/${storeId}/sav/${id}/process`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }) })
      if (res.ok) { toast.success(action === "APPROVED" ? "Approuvé" : "Rejeté"); loadReturns() }
    } catch (e) { toast.error("Erreur") } finally { setProcessingId(null) }
  }

  const openCreateSheet = () => {
    setReturnedProduct(null); setExchangeProduct(null); setReturnNotes(""); setCustomerName(""); setCustomerPhone("")
    setProductSearch(""); setSelectionMode("return"); loadStoreProducts(); setShowCreateSheet(true)
  }

  const selectProduct = (product: any) => {
    const item = { productId: product.productId, productName: product.name, productSku: product.sku, unitPrice: product.prixVente, quantity: 1, reason: "DEFECTIVE" as ReturnReason, reasonDetails: "", condition: "GOOD" as ProductCondition, photos: product.photos }
    if (selectionMode === "return") { setReturnedProduct(item); toast.success("Produit retourné sélectionné") }
    else { setExchangeProduct(item); toast.success("Produit d'échange sélectionné") }
  }

  const createReturn = async () => {
    if (!returnedProduct) { toast.error("Sélectionnez un produit"); return }
    try {
      setCreatingReturn(true)
      // Préparer l'item avec les données d'échange si présent
      const itemData: any = {
        productId: returnedProduct.productId,
        quantity: returnedProduct.quantity,
        unitPrice: returnedProduct.unitPrice,
        reason: returnedProduct.reason,
        reasonDetails: returnedProduct.reasonDetails,
        condition: returnedProduct.condition,
      }
      // Ajouter le produit d'échange si sélectionné
      if (exchangeProduct) {
        itemData.exchangeProductId = exchangeProduct.productId
        itemData.exchangeDiscount = 0 // Remise par défaut
      }
      const res = await fetch(`/api/stores/${storeId}/sav`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: [itemData], notes: returnNotes, customerName, customerPhone })
      })
      if (res.ok) { toast.success("Retour créé"); setShowCreateSheet(false); loadReturns() }
      else { const err = await res.json(); throw new Error(err.error) }
    } catch (e: any) { toast.error(e.message || "Erreur") } finally { setCreatingReturn(false) }
  }

  const calcTotal = () => returnedProduct ? returnedProduct.quantity * returnedProduct.unitPrice : 0
  const calcDiff = () => { if (!returnedProduct || !exchangeProduct) return 0; return (exchangeProduct.quantity * exchangeProduct.unitPrice) - (returnedProduct.quantity * returnedProduct.unitPrice) }

  // Fonction pour envoyer à la caisse
  const handleSendToCashier = async () => {
    if (!selectedReturn) return
    try {
      setSendingToCashier(true)
      const returnItem = selectedReturn.items?.[0]
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
    if (!selectedReturn) return { amount: 0, type: "none" as const }
    const returnItem = selectedReturn.items?.[0]
    if (!returnItem) return { amount: 0, type: "none" as const }
    
    // Valeur de reprise = prix du produit retourné
    const returnValue = returnItem.quantity * returnItem.unitPrice
    // Valeur du produit d'échange
    const exchangeValue = (returnItem.exchangeProduct?.prixVente || returnItem.exchangeProductPrice || returnItem.unitPrice) * returnItem.quantity
    // Différence = prix échange - valeur reprise - remise additionnelle
    const difference = exchangeValue - returnValue - discountAmount
    
    if (difference > 0) {
      return { amount: difference, type: "pay" as const } // Client paie
    } else if (difference < 0) {
      return { amount: Math.abs(difference), type: "refund" as const } // Caisse rend
    }
    return { amount: 0, type: "none" as const } // Même valeur
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
                const returnedItem = r.items?.[0]
                const exchangedItem = r.items?.find((i: any) => i.exchangeProductId || i.exchangeProductName)
                return (
                <TableRow key={r.id}><TableCell className="font-medium text-xs">{r.number}</TableCell><TableCell><div className="font-medium text-sm">{r.customerName || "-"}</div><div className="text-xs text-muted-foreground">{r.customerPhone || "-"}</div></TableCell><TableCell><div className="font-medium text-sm">{returnedItem?.productName || "-"}</div><div className="text-xs text-muted-foreground">{returnedItem?.quantity || 0} x {returnedItem?.unitPrice?.toLocaleString() || 0} F</div></TableCell><TableCell>{exchangedItem?.exchangeProductName ? <><div className="font-medium text-sm text-purple-600">{exchangedItem.exchangeProductName}</div>{exchangedItem.exchangeDiscount > 0 && <div className="text-xs text-muted-foreground">Remise: {exchangedItem.exchangeDiscount?.toLocaleString()} F</div>}</> : <span className="text-muted-foreground text-xs">-</span>}</TableCell><TableCell>{returnedItem?.condition ? getConditionBadge(returnedItem.condition) : "-"}</TableCell><TableCell>{getStatusBadge(r.status)}</TableCell><TableCell className="text-xs">{format(new Date(r.createdAt), "dd/MM/yy HH:mm", { locale: fr })}</TableCell>
                  <TableCell className="text-right"><DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="sm"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => { setSelectedReturn(r); setDiscountAmount(0); setShowDetailsDialog(true) }}><Eye className="h-4 w-4 mr-2" />Détails</DropdownMenuItem>
                    {r.status === "PENDING" && <><DropdownMenuItem onClick={() => handleProcess(r.id, "APPROVED")}><CheckCircle className="h-4 w-4 mr-2" />Approuver</DropdownMenuItem><DropdownMenuItem onClick={() => handleProcess(r.id, "REJECTED")} className="text-red-600"><XCircle className="h-4 w-4 mr-2" />Rejeter</DropdownMenuItem></>}
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

      <Sheet open={showCreateSheet} onOpenChange={setShowCreateSheet}><SheetContent side="right" className="w-full sm:max-w-[100vw] p-0">
        <div className="flex h-screen bg-gray-50">
          <div className="flex-1 flex flex-col">
            <div className="bg-white border-b p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3"><Button variant="ghost" size="icon" onClick={() => setShowCreateSheet(false)}><X className="h-5 w-5" /></Button><div><h2 className="text-lg font-semibold">Nouveau Retour SAV</h2><p className="text-sm text-muted-foreground">{selectionMode === "return" ? "Sélectionnez le produit retourné" : "Sélectionnez le produit d'échange"}</p></div></div>
                {returnedProduct && <div className="flex gap-2"><Button variant={selectionMode === "return" ? "default" : "outline"} size="sm" onClick={() => setSelectionMode("return")}><RotateCcw className="h-4 w-4 mr-1" />Retourné</Button><Button variant={selectionMode === "exchange" ? "default" : "outline"} size="sm" onClick={() => setSelectionMode("exchange")}><ArrowLeftRight className="h-4 w-4 mr-1" />Échange</Button></div>}
              </div>
              <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Rechercher un produit..." value={productSearch} onChange={(e) => setProductSearch(e.target.value)} className="pl-9" /></div>
            </div>
            <div className="flex-1 p-4 overflow-y-auto">
              {loadingProducts ? <div className="flex justify-center py-16"><Loader2 className="h-12 w-12 animate-spin text-blue-600" /></div> : (
                <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                  {filteredProducts.map((p) => (
                    <div key={p.id} className="bg-white rounded-lg border p-3 hover:shadow-md hover:border-blue-300 cursor-pointer group" onClick={() => selectProduct(p)}>
                      {p.photos?.[0] ? <img src={p.photos[0]} alt={p.name} className="w-full h-16 object-contain mb-2" /> : <div className="w-full h-16 bg-gray-100 rounded flex items-center justify-center mb-2"><Package className="h-8 w-8 text-gray-300" /></div>}
                      <h3 className="font-medium text-xs line-clamp-2">{p.name}</h3>
                      <div className="flex justify-between mt-1"><span className="text-blue-600 font-bold text-sm">{p.prixVente?.toLocaleString()} F</span><span className="text-[10px] text-gray-500">Stock: {p.stock}</span></div>
                      <div className="absolute top-1 right-1 w-6 h-6 bg-blue-500 text-white rounded-full items-center justify-center opacity-0 group-hover:opacity-100 hidden group-hover:flex"><Plus className="h-3 w-3" /></div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="w-96 bg-white border-l flex flex-col shadow-xl">
            <div className="p-4 border-b bg-gray-50"><h3 className="font-semibold">Détails du retour</h3></div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div className="space-y-2"><h4 className="text-sm font-medium flex items-center gap-2"><User className="h-4 w-4" />Client</h4><Input placeholder="Nom" value={customerName} onChange={(e) => setCustomerName(e.target.value)} /><Input placeholder="Téléphone" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} /></div>
              <Separator />
              <div className="space-y-2"><h4 className="text-sm font-medium flex items-center gap-2"><RotateCcw className="h-4 w-4 text-red-500" />Produit retourné</h4>
                {!returnedProduct ? <div className="border-2 border-dashed rounded-lg p-6 text-center"><Package className="h-8 w-8 mx-auto mb-2 text-gray-300" /><p className="text-sm text-gray-500">Sélectionnez un produit</p></div> : (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 space-y-3">
                    <div className="flex items-start gap-3">{returnedProduct.photos?.[0] ? <img src={returnedProduct.photos[0]} className="w-12 h-12 object-contain bg-white rounded" /> : <div className="w-12 h-12 bg-white rounded flex items-center justify-center"><Package className="h-6 w-6 text-gray-300" /></div>}<div className="flex-1"><h4 className="font-medium text-sm truncate">{returnedProduct.productName}</h4><p className="text-sm font-semibold text-red-600">{returnedProduct.unitPrice?.toLocaleString()} F</p></div><Button variant="ghost" size="icon" className="h-6 w-6 text-red-500" onClick={() => { setReturnedProduct(null); setExchangeProduct(null) }}><Trash2 className="h-4 w-4" /></Button></div>
                    <div className="flex items-center gap-2"><Label className="text-xs w-16">Qté</Label><Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setReturnedProduct((p: any) => ({ ...p, quantity: Math.max(1, p.quantity - 1) }))}><Minus className="h-3 w-3" /></Button><span className="w-8 text-center">{returnedProduct.quantity}</span><Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setReturnedProduct((p: any) => ({ ...p, quantity: p.quantity + 1 }))}><Plus className="h-3 w-3" /></Button></div>
                    <div className="grid grid-cols-2 gap-2">
                      <div><Label className="text-xs">État</Label><Select value={returnedProduct.condition} onValueChange={(v) => setReturnedProduct((p: any) => ({ ...p, condition: v }))}><SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger><SelectContent className="z-[9999]">{PRODUCT_CONDITIONS.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent></Select></div>
                      <div><Label className="text-xs">Motif *</Label><Select value={returnedProduct.reason} onValueChange={(v) => setReturnedProduct((p: any) => ({ ...p, reason: v }))}><SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger><SelectContent className="z-[9999]">{RETURN_REASONS.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent></Select></div>
                    </div>
                    <div><Label className="text-xs">Détails</Label><Textarea value={returnedProduct.reasonDetails} onChange={(e) => setReturnedProduct((p: any) => ({ ...p, reasonDetails: e.target.value }))} placeholder="Précisions..." rows={2} className="text-xs" /></div>
                  </div>
                )}
              </div>
              {returnedProduct && <><Separator /><div className="space-y-2"><h4 className="text-sm font-medium flex items-center gap-2"><ArrowLeftRight className="h-4 w-4 text-purple-500" />Échange (optionnel)</h4>
                {!exchangeProduct ? <div className="border-2 border-dashed border-purple-200 rounded-lg p-4 text-center cursor-pointer hover:bg-purple-50" onClick={() => setSelectionMode("exchange")}><ArrowLeftRight className="h-6 w-6 mx-auto mb-2 text-purple-300" /><p className="text-xs text-purple-500">Sélectionner produit d'échange</p></div> : (
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                    <div className="flex items-start gap-3">{exchangeProduct.photos?.[0] ? <img src={exchangeProduct.photos[0]} className="w-12 h-12 object-contain bg-white rounded" /> : <div className="w-12 h-12 bg-white rounded flex items-center justify-center"><Package className="h-6 w-6 text-gray-300" /></div>}<div className="flex-1"><h4 className="font-medium text-sm truncate">{exchangeProduct.productName}</h4><p className="text-sm font-semibold text-purple-600">{exchangeProduct.unitPrice?.toLocaleString()} F</p></div><Button variant="ghost" size="icon" className="h-6 w-6 text-purple-500" onClick={() => setExchangeProduct(null)}><Trash2 className="h-4 w-4" /></Button></div>
                    <div className="flex items-center gap-2 mt-2"><Label className="text-xs w-16">Qté</Label><Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setExchangeProduct((p: any) => ({ ...p, quantity: Math.max(1, p.quantity - 1) }))}><Minus className="h-3 w-3" /></Button><span className="w-8 text-center">{exchangeProduct.quantity}</span><Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setExchangeProduct((p: any) => ({ ...p, quantity: p.quantity + 1 }))}><Plus className="h-3 w-3" /></Button></div>
                  </div>
                )}
              </div></>}
              {returnedProduct && <><Separator /><div><Label className="text-xs">Notes</Label><Textarea value={returnNotes} onChange={(e) => setReturnNotes(e.target.value)} placeholder="Notes..." rows={2} className="text-xs" /></div></>}
            </div>
            {returnedProduct && <div className="border-t p-4 space-y-3 bg-gray-50">
              <div className="space-y-2 text-sm"><div className="flex justify-between"><span className="text-gray-600">Valeur retour</span><span className="font-medium text-red-600">-{calcTotal().toLocaleString()} F</span></div>
                {exchangeProduct && <><div className="flex justify-between"><span className="text-gray-600">Valeur échange</span><span className="font-medium text-purple-600">+{(exchangeProduct.quantity * exchangeProduct.unitPrice).toLocaleString()} F</span></div><Separator /><div className="flex justify-between font-semibold"><span>Différence</span><span className={calcDiff() >= 0 ? "text-green-600" : "text-red-600"}>{calcDiff() >= 0 ? "+" : ""}{calcDiff().toLocaleString()} F</span></div></>}
              </div>
              <Button className="w-full" onClick={createReturn} disabled={creatingReturn}>{creatingReturn ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-2" />}Valider le retour</Button>
            </div>}
          </div>
        </div>
      </SheetContent></Sheet>
    </div>
  )
}
