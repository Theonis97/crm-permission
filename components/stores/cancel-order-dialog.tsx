"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { XCircle, Loader2, AlertTriangle, Package } from "lucide-react"
import { toast } from "sonner"

interface Order {
  id: string
  number: string
  customerName: string
  total: number
  status: string
  items: Array<{
    id: string
    productId: string
    name: string
    quantity: number
    product: {
      name: string
      sku: string | null
    }
  }>
}

interface CancelOrderDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  order: Order | null
  onSuccess?: () => void
}

export function CancelOrderDialog({
  open,
  onOpenChange,
  order,
  onSuccess,
}: CancelOrderDialogProps) {
  const [loading, setLoading] = useState(false)
  const [cancellationNote, setCancellationNote] = useState("")

  const handleCancel = async () => {
    if (!order) return

    if (!cancellationNote.trim()) {
      toast.error("Veuillez indiquer la raison de l'annulation")
      return
    }

    setLoading(true)

    try {
      const response = await fetch(`/api/store-orders/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "CANCELLED",
          cancelReason: cancellationNote.trim(),
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Erreur lors de l'annulation")
      }

      const result = await response.json()
      
      toast.success(result.message || "Commande annulée avec succès")
      onSuccess?.()
      onOpenChange(false)
      setCancellationNote("")
    } catch (error: any) {
      console.error("Error cancelling order:", error)
      toast.error(error.message || "Erreur lors de l'annulation de la commande")
    } finally {
      setLoading(false)
    }
  }

  if (!order) return null

  // Vérifier si la commande peut être annulée
  const canBeCancelled = !["DELIVERED", "CANCELLED"].includes(order.status)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <XCircle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <DialogTitle>Annuler la commande</DialogTitle>
              <DialogDescription>
                Commande {order.number} - {order.customerName}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {!canBeCancelled ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
                <div>
                  <p className="font-medium text-red-900">
                    Cette commande ne peut pas être annulée
                  </p>
                  <p className="text-sm text-red-700 mt-1">
                    {order.status === "DELIVERED" 
                      ? "La commande a déjà été livrée. Utilisez plutôt la fonction de retour."
                      : "La commande est déjà annulée."}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Informations sur les produits qui seront retournés */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Package className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium text-blue-900">
                      Retour automatique en stock
                    </p>
                    <p className="text-sm text-blue-700 mt-1">
                      Les produits suivants seront automatiquement retournés en stock :
                    </p>
                    <ul className="mt-3 space-y-2">
                      {order.items.map((item) => (
                        <li key={item.id} className="flex items-center justify-between text-sm">
                          <span className="font-medium text-blue-900">
                            {item.product.name}
                            {item.product.sku && (
                              <Badge variant="outline" className="ml-2 text-xs">
                                {item.product.sku}
                              </Badge>
                            )}
                          </span>
                          <Badge className="bg-blue-600 text-white">
                            +{item.quantity}
                          </Badge>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              {/* Raison de l'annulation */}
              <div className="space-y-2">
                <Label htmlFor="cancellationNote" className="text-base font-semibold">
                  Raison de l'annulation <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="cancellationNote"
                  value={cancellationNote}
                  onChange={(e) => setCancellationNote(e.target.value)}
                  placeholder="Expliquez pourquoi cette commande est annulée (client absent, produit indisponible, erreur de commande, etc.)"
                  rows={4}
                  className="resize-none"
                />
                <p className="text-xs text-gray-500">
                  Cette note sera enregistrée dans l'historique de la commande
                </p>
              </div>

              {/* Récapitulatif */}
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Commande:</span>
                  <span className="font-medium">{order.number}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Client:</span>
                  <span className="font-medium">{order.customerName}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Montant:</span>
                  <span className="font-medium">{order.total.toLocaleString()} FCFA</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Produits à retourner:</span>
                  <span className="font-medium">{order.items.length}</span>
                </div>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Fermer
          </Button>
          {canBeCancelled && (
            <Button
              type="button"
              variant="destructive"
              onClick={handleCancel}
              disabled={loading || !cancellationNote.trim()}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Annuler la commande
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
