"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
  ShoppingCart,
  Package,
  Store,
  Calendar,
  User,
  CheckCircle2,
  Loader2,
  AlertTriangle,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

interface OrderDetailsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  orderId: string | null
  onValidated?: () => void
}

export function OrderDetailsDialog({
  open,
  onOpenChange,
  orderId,
  onValidated,
}: OrderDetailsDialogProps) {
  const [order, setOrder] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [validating, setValidating] = useState(false)

  // Charger les détails de la commande
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

  const handleValidate = async () => {
    if (!orderId) return

    if (!confirm("Êtes-vous sûr de vouloir valider cette commande ? Le stock sera automatiquement mis à jour.")) {
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
      onValidated?.()
      onOpenChange(false)
    } catch (error: any) {
      console.error("Error validating order:", error)
      toast.error(error.message || "Erreur lors de la validation")
    } finally {
      setValidating(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const config: any = {
      PENDING: {
        className: "bg-amber-50 text-amber-700 border-amber-200",
        label: "En attente",
      },
      CONFIRMED: {
        className: "bg-blue-50 text-blue-700 border-blue-200",
        label: "Confirmée",
      },
      PREPARING: {
        className: "bg-purple-50 text-purple-700 border-purple-200",
        label: "En préparation",
      },
      READY: {
        className: "bg-green-50 text-green-700 border-green-200",
        label: "Prête",
      },
      DELIVERING: {
        className: "bg-cyan-50 text-cyan-700 border-cyan-200",
        label: "En livraison",
      },
      DELIVERED: {
        className: "bg-green-50 text-green-700 border-green-200",
        label: "Livrée",
      },
      CANCELLED: {
        className: "bg-red-50 text-red-700 border-red-200",
        label: "Annulée",
      },
    }

    const { className, label } = config[status] || config.PENDING
    return (
      <Badge variant="outline" className={cn("text-xs", className)}>
        {label}
      </Badge>
    )
  }

  const getPriorityBadge = (priority: string) => {
    const config: any = {
      NORMAL: {
        className: "bg-gray-50 text-gray-700 border-gray-200",
        label: "Normal",
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

    const { className, label } = config[priority] || config.NORMAL
    return (
      <Badge variant="outline" className={cn("text-xs", className)}>
        {label}
      </Badge>
    )
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-950 rounded-lg flex items-center justify-center">
              <ShoppingCart className="h-5 w-5 text-white" />
            </div>
            <div>
              <DialogTitle>Détails de la commande</DialogTitle>
              <DialogDescription>
                {order?.number || "Chargement..."}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        ) : !order ? (
          <div className="text-center py-12">
            <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">Commande introuvable</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Informations générales */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <Store className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-600">Magasin:</span>
                  <span className="font-medium">{order.store.name}</span>
                </div>

                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-600">Créé par:</span>
                  <span className="font-medium">
                    {order.createdBy.firstName && order.createdBy.lastName
                      ? `${order.createdBy.firstName} ${order.createdBy.lastName}`
                      : order.createdBy.email}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-600">Créée le:</span>
                  <span className="font-medium">{formatDateTime(order.createdAt)}</span>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-600">Statut:</span>
                  {getStatusBadge(order.status)}
                </div>

                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-600">Priorité:</span>
                  {getPriorityBadge(order.priority)}
                </div>

                <div className="flex items-center gap-2 text-sm">
                  <Package className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-600">Articles:</span>
                  <span className="font-medium">{order.items.length} produit(s)</span>
                </div>
              </div>
            </div>

            {/* Liste des produits */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Produits commandés</h3>
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Produit</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead className="text-center">Qté commandée</TableHead>
                      <TableHead className="text-center">Stock disponible</TableHead>
                      <TableHead className="text-right">Prix unitaire</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {order.items.map((item: any) => {
                      const insufficientStock = item.product.stock < item.quantity
                      return (
                        <TableRow key={item.id} className={insufficientStock ? "bg-red-50" : ""}>
                          <TableCell className="font-medium">{item.name}</TableCell>
                          <TableCell>
                            {item.sku && (
                              <Badge variant="outline" className="text-xs">
                                {item.sku}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-center font-semibold">
                            {item.quantity}
                          </TableCell>
                          <TableCell className="text-center">
                            <span
                              className={cn(
                                "font-medium",
                                insufficientStock ? "text-red-600" : "text-green-600"
                              )}
                            >
                              {item.product.stock}
                            </span>
                            {insufficientStock && (
                              <AlertTriangle className="inline-block h-4 w-4 ml-1 text-red-600" />
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {item.unitPrice.toLocaleString("fr-FR")} XAF
                          </TableCell>
                          <TableCell className="text-right font-semibold">
                            {item.total.toLocaleString("fr-FR")} XAF
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
                <div className="w-64 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Sous-total:</span>
                    <span className="font-medium">{order.subtotal.toLocaleString("fr-FR")} XAF</span>
                  </div>
                  {order.totalTax > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">TVA:</span>
                      <span className="font-medium">{order.totalTax.toLocaleString("fr-FR")} XAF</span>
                    </div>
                  )}
                  {order.deliveryFee > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Frais de livraison:</span>
                      <span className="font-medium">{order.deliveryFee.toLocaleString("fr-FR")} XAF</span>
                    </div>
                  )}
                  <div className="flex justify-between text-base font-semibold border-t pt-2">
                    <span>Total:</span>
                    <span className="text-blue-950">{order.total.toLocaleString("fr-FR")} XAF</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Avertissement stock insuffisant */}
            {order.items.some((item: any) => item.product.stock < item.quantity) && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
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
        )}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={validating}
          >
            Fermer
          </Button>
          {canValidate && (
            <Button
              onClick={handleValidate}
              disabled={validating || order.items.some((item: any) => item.product.stock < item.quantity)}
            >
              {validating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Valider la commande
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
