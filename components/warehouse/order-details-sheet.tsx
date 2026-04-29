"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  ShoppingCart,
  Package,
  Store,
  Calendar,
  User,
  CheckCircle2,
  Loader2,
  AlertTriangle,
  Printer,
  Clock,
  Truck,
  XCircle,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "@/lib/app-toast"
import { useReactToPrint } from "react-to-print"
import { usePermissions } from "@/hooks/use-permissions"
import { Textarea } from "@/components/ui/textarea"

interface OrderDetailsSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  orderId: string | null
  onUpdated?: () => void
}

export function OrderDetailsSheet({
  open,
  onOpenChange,
  orderId,
  onUpdated,
}: OrderDetailsSheetProps) {
  const { hasPermission, loading: permsLoading } = usePermissions()
  const [order, setOrder] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [validating, setValidating] = useState(false)
  const [savingEdits, setSavingEdits] = useState(false)
  const [qtyDraft, setQtyDraft] = useState<Record<string, string>>({})
  const [notesDraft, setNotesDraft] = useState("")
  const printRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open && orderId) {
      loadOrder()
    } else {
      setOrder(null)
    }
  }, [open, orderId])

  const loadOrder = async () => {
    if (!orderId) return

    try {
      setLoading(true)
      const response = await fetch(`/api/warehouse-orders/${orderId}`)
      
      if (!response.ok) {
        throw new Error("Erreur lors du chargement")
      }

      const data = await response.json()
      setOrder(data)
    } catch (error) {
      console.error("Error loading order:", error)
      toast.error("Erreur lors du chargement de la commande")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!order?.items) return
    const d: Record<string, string> = {}
    for (const it of order.items) {
      const q = it.requestedQuantity ?? it.quantity ?? 1
      d[it.id] = String(q)
    }
    setQtyDraft(d)
    setNotesDraft(order.notes ?? "")
  }, [order])

  const canEditDemand =
    !permsLoading && order?.status === "PENDING" && hasPermission("warehouse.orders.update")

  const previewTotals = useMemo(() => {
    if (!order?.items || !canEditDemand) return null
    let totalQuantity = 0
    let totalCost = 0
    for (const it of order.items) {
      const rq = Math.max(1, Math.floor(Number(qtyDraft[it.id]) || 1))
      const u = Number(it.unitCost ?? it.unitPrice ?? 0)
      totalQuantity += rq
      totalCost += u * rq
    }
    return { totalQuantity, totalCost }
  }, [order?.items, qtyDraft, canEditDemand])

  const handleSaveDemandEdits = async () => {
    if (!orderId || !order || !canEditDemand) return

    try {
      setSavingEdits(true)
      const items = order.items.map((it: { id: string }) => ({
        id: it.id,
        requestedQuantity: Math.max(1, Math.floor(Number(qtyDraft[it.id]) || 1)),
      }))
      const response = await fetch(`/api/warehouse-orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items,
          notes: notesDraft.trim() === "" ? null : notesDraft.trim(),
        }),
      })

      if (!response.ok) {
        const err = await response.json().catch(() => ({}))
        throw new Error(typeof err.error === "string" ? err.error : "Erreur lors de l'enregistrement")
      }

      toast.success("Demande mise à jour (quantités / notes)")
      await loadOrder()
      onUpdated?.()
    } catch (error: unknown) {
      console.error("Error saving demand edits:", error)
      toast.error(error instanceof Error ? error.message : "Erreur lors de l'enregistrement")
    } finally {
      setSavingEdits(false)
    }
  }

  const handleStatusChange = async (newStatus: string) => {
    if (!orderId) return

    try {
      setUpdatingStatus(true)
      const response = await fetch(`/api/warehouse-orders/${orderId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Erreur lors de la mise à jour")
      }

      toast.success("Statut mis à jour avec succès")
      await loadOrder()
      onUpdated?.()
    } catch (error: any) {
      console.error("Error updating status:", error)
      toast.error(error.message || "Erreur lors de la mise à jour")
    } finally {
      setUpdatingStatus(false)
    }
  }

  const handleValidate = async () => {
    if (!orderId) return

    if (
      !confirm(
        "Valider cette commande côté entrepôt ? Le stock entrepôt ne sera débité et le magasin crédité qu’une fois le magasin aura marqué la commande comme livrée.",
      )
    ) {
      return
    }

    try {
      setValidating(true)
      const response = await fetch(`/api/warehouse-orders/${orderId}/validate`, {
        method: "POST",
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Erreur lors de la validation")
      }

      const result = await response.json()
      toast.success(result.message || "Commande validée avec succès")
      await loadOrder()
      onUpdated?.()
    } catch (error: any) {
      console.error("Error validating order:", error)
      toast.error(error.message || "Erreur lors de la validation")
    } finally {
      setValidating(false)
    }
  }

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Commande_${order?.number || 'commande'}`,
  })

  const getStatusConfig = (status: string) => {
    const config: any = {
      PENDING: {
        icon: Clock,
        className: "bg-amber-50 text-amber-700 border-amber-200",
        label: "En attente",
      },
      APPROVED: {
        icon: CheckCircle2,
        className: "bg-blue-50 text-blue-700 border-blue-200",
        label: "Approuvée",
      },
      PREPARING: {
        icon: Package,
        className: "bg-purple-50 text-purple-700 border-purple-200",
        label: "En préparation",
      },
      SHIPPED: {
        icon: Truck,
        className: "bg-cyan-50 text-cyan-700 border-cyan-200",
        label: "Expédiée",
      },
      DELIVERED: {
        icon: CheckCircle2,
        className: "bg-green-50 text-green-700 border-green-200",
        label: "Livrée",
      },
      CANCELLED: {
        icon: XCircle,
        className: "bg-red-50 text-red-700 border-red-200",
        label: "Annulée",
      },
      REJECTED: {
        icon: XCircle,
        className: "bg-red-50 text-red-700 border-red-200",
        label: "Rejetée",
      },
    }

    return config[status] || config.PENDING
  }

  const getPriorityConfig = (priority: string) => {
    const config: any = {
      NORMAL: {
        className: "bg-gray-50 text-gray-700 border-gray-200",
        label: "Normale",
      },
      HIGH: {
        className: "bg-orange-50 text-orange-700 border-orange-200",
        label: "Haute",
      },
      URGENT: {
        className: "bg-red-50 text-red-700 border-red-200",
        label: "Urgente",
      },
    }

    return config[priority] || config.NORMAL
  }

  const formatDateTime = (date: string) => {
    return new Date(date).toLocaleString("fr-FR", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const canValidate = order && order.status === "PENDING"
  const hasInsufficientStock = order?.items?.some((item: any) => {
    const requestedQty = canEditDemand
      ? Math.max(1, Math.floor(Number(qtyDraft[item.id]) || 1))
      : item.requestedQuantity || item.quantity || 0
    return item.product.stock < requestedQty
  })

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl p-0 flex flex-col gap-0">
        {/* Header toujours présent pour l'accessibilité */}
        <SheetHeader className="p-6 pb-4 border-b shrink-0 bg-white sticky top-0 z-10">
          {loading ? (
            <>
              <SheetTitle>Chargement...</SheetTitle>
              <SheetDescription>Chargement des détails de la commande</SheetDescription>
            </>
          ) : !order ? (
            <>
              <SheetTitle>Erreur</SheetTitle>
              <SheetDescription>Commande introuvable</SheetDescription>
            </>
          ) : (
            <>
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 flex-1">
                  <div className="w-12 h-12 bg-blue-950 rounded-lg flex items-center justify-center shrink-0">
                    <ShoppingCart className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <SheetTitle className="text-xl font-bold">
                      {order.number}
                    </SheetTitle>
                    <SheetDescription className="text-sm mt-1">
                      Créée le {formatDateTime(order.createdAt)}
                    </SheetDescription>
                  </div>
                </div>
              </div>
            </>
          )}
        </SheetHeader>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        ) : !order ? (
          <div className="flex flex-col items-center justify-center py-20">
            <AlertTriangle className="h-12 w-12 text-gray-400 mb-4" />
            <p className="text-gray-500">Commande introuvable</p>
          </div>
        ) : (
          <>
            {/* Changement de statut */}
            <div className="px-6 pb-4 border-b shrink-0 bg-white">
              <div className="flex items-center gap-3">
                <label className="text-sm font-medium text-gray-700 shrink-0">
                  Statut:
                </label>
                <Select
                  value={order.status}
                  onValueChange={handleStatusChange}
                  disabled={updatingStatus || order.status === "DELIVERED" || order.status === "CANCELLED"}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PENDING">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-amber-600" />
                        <span>En attente</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="APPROVED">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-blue-600" />
                        <span>Approuvée</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="PREPARING">
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-purple-600" />
                        <span>En préparation</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="SHIPPED">
                      <div className="flex items-center gap-2">
                        <Truck className="h-4 w-4 text-cyan-600" />
                        <span>Expédiée</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="DELIVERED">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                        <span>Livrée</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="CANCELLED">
                      <div className="flex items-center gap-2">
                        <XCircle className="h-4 w-4 text-red-600" />
                        <span>Annulée</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="REJECTED">
                      <div className="flex items-center gap-2">
                        <XCircle className="h-4 w-4 text-red-600" />
                        <span>Rejetée</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Contenu scrollable */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6" ref={printRef}>
              {/* En-tête pour impression */}
              <div className="print:block hidden mb-6">
                <h1 className="text-2xl font-bold">{order.number}</h1>
                <p className="text-gray-600">Créée le {formatDateTime(order.createdAt)}</p>
              </div>

              {/* Informations générales */}
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <h3 className="font-semibold text-gray-900 mb-3">Informations</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div className="flex items-start gap-2">
                      <Store className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <div className="text-xs text-gray-600">Magasin</div>
                        <div className="font-medium text-sm truncate">{order.store.name}</div>
                      </div>
                    </div>

                    <div className="flex items-start gap-2">
                      <User className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <div className="text-xs text-gray-600">Demandé par</div>
                        <div className="font-medium text-sm">
                          {order.requester?.firstName && order.requester?.lastName
                            ? `${order.requester.firstName} ${order.requester.lastName}`
                            : order.requester?.email || "Non spécifié"}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-start gap-2">
                      <Package className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <div className="text-xs text-gray-600">Articles</div>
                        <div className="font-medium text-sm">{order.items.length} produit(s)</div>
                      </div>
                    </div>

                    <div className="flex items-start gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="text-xs text-gray-600">Priorité</div>
                        <Badge variant="outline" className={cn("text-xs mt-1", getPriorityConfig(order.priority).className)}>
                          {getPriorityConfig(order.priority).label}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Produits commandés */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Produits commandés</h3>
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50">
                        <TableHead className="font-semibold">Produit</TableHead>
                        <TableHead className="text-center font-semibold">Qté</TableHead>
                        <TableHead className="text-center font-semibold">Stock</TableHead>
                        <TableHead className="text-right font-semibold">Prix unit.</TableHead>
                        <TableHead className="text-right font-semibold">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {order.items.map((item: any) => {
                        const requestedQty = canEditDemand
                          ? Math.max(1, Math.floor(Number(qtyDraft[item.id]) || 1))
                          : item.requestedQuantity || item.quantity || 0
                        const insufficientStock = item.product.stock < requestedQty
                        return (
                          <TableRow key={item.id} className={insufficientStock ? "bg-red-50" : ""}>
                            <TableCell>
                              <div className="font-medium text-sm">{item.name}</div>
                              {item.sku && (
                                <Badge variant="outline" className="text-xs mt-1">
                                  {item.sku}
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-center">
                              {canEditDemand ? (
                                <Input
                                  type="number"
                                  min={1}
                                  className="h-9 w-20 mx-auto text-center tabular-nums"
                                  value={qtyDraft[item.id] ?? String(requestedQty)}
                                  onChange={(e) =>
                                    setQtyDraft((prev) => ({ ...prev, [item.id]: e.target.value }))
                                  }
                                />
                              ) : (
                                <span className="font-semibold text-sm">{requestedQty}</span>
                              )}
                            </TableCell>
                            <TableCell className="text-center">
                              <span
                                className={cn(
                                  "font-medium text-sm",
                                  insufficientStock ? "text-red-600" : "text-green-600"
                                )}
                              >
                                {item.product.stock}
                              </span>
                              {insufficientStock && (
                                <AlertTriangle className="inline-block h-3.5 w-3.5 ml-1 text-red-600" />
                              )}
                            </TableCell>
                            <TableCell className="text-right text-sm">
                              {(item.unitCost || item.unitPrice || 0).toLocaleString("fr-FR")} XAF
                            </TableCell>
                            <TableCell className="text-right font-semibold text-sm">
                              {(
                                (item.unitCost || item.unitPrice || 0) * requestedQty
                              ).toLocaleString("fr-FR")}{" "}
                              XAF
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Totaux */}
              <div className="border-t pt-4">
                <div className="flex justify-end">
                  <div className="w-72 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Quantité totale:</span>
                      <span className="font-medium">
                        {(previewTotals?.totalQuantity ?? order.totalQuantity ?? 0).toLocaleString("fr-FR")}{" "}
                        articles
                        {canEditDemand && previewTotals ? (
                          <span className="text-xs font-normal text-amber-700 ml-1">(aperçu)</span>
                        ) : null}
                      </span>
                    </div>
                    <div className="flex justify-between text-lg font-bold border-t pt-2">
                      <span>Coût total:</span>
                      <span className="text-blue-950">
                        {(previewTotals?.totalCost ?? order.totalCost ?? 0).toLocaleString("fr-FR")} XAF
                        {canEditDemand && previewTotals ? (
                          <span className="text-xs font-normal text-amber-700 ml-2">(aperçu)</span>
                        ) : null}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Notes + enregistrement (demande modifiable seulement en attente) */}
              {canEditDemand ? (
                <div className="space-y-2">
                  <h4 className="font-semibold text-gray-900 text-sm">Notes (magasin / entrepôt)</h4>
                  <Textarea
                    value={notesDraft}
                    onChange={(e) => setNotesDraft(e.target.value)}
                    placeholder="Commentaire visible sur la commande…"
                    rows={3}
                    className="resize-y min-h-[72px]"
                  />
                </div>
              ) : order.notes ? (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-semibold text-blue-900 text-sm mb-2">Notes</h4>
                  <p className="text-sm text-blue-800">{order.notes}</p>
                </div>
              ) : null}

              {canEditDemand && (
                <div className="rounded-lg border border-amber-200 bg-amber-50/80 p-4 space-y-3">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-5 w-5 text-amber-700 shrink-0 mt-0.5" />
                    <div className="text-sm text-amber-950">
                      <p className="font-medium">Modifier la demande (gestionnaire entrepôt)</p>
                      <p className="mt-1 text-amber-900/90">
                        Ajustez les quantités dans le tableau ci-dessus et les notes, puis enregistrez. La
                        validation utilisera ces quantités.
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    className="w-full sm:w-auto bg-amber-700 hover:bg-amber-800 text-white"
                    disabled={savingEdits}
                    onClick={handleSaveDemandEdits}
                  >
                    {savingEdits ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Enregistrer les modifications de la demande
                  </Button>
                </div>
              )}

              {/* Avertissement stock insuffisant */}
              {hasInsufficientStock && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5 shrink-0" />
                  <div className="text-sm text-red-900">
                    <p className="font-medium">Stock insuffisant</p>
                    <p className="mt-1">
                      Certains produits n'ont pas assez de stock disponible pour cette commande.
                      La validation sera impossible tant que le stock ne sera pas réapprovisionné.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Footer fixe avec boutons d'action */}
            <div className="shrink-0 border-t bg-white p-6 sticky bottom-0 z-10">
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  onClick={handlePrint}
                  className="flex-1"
                >
                  <Printer className="h-4 w-4 mr-2" />
                  Imprimer
                </Button>
                
                {canValidate && (
                  <Button
                    onClick={handleValidate}
                    disabled={validating || hasInsufficientStock}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                  >
                    {validating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Valider la commande
                  </Button>
                )}
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
