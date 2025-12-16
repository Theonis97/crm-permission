"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import {
  Sheet,
  SheetContent,
} from "@/components/ui/sheet"
import {
  Package,
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Truck,
  CheckCircle2,
  XCircle,
  Clock,
  FileText,
  Printer,
  Download,
} from "lucide-react"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import { cn } from "@/lib/utils"

interface OrderDetailsSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  order: Order | null
}

interface Order {
  id: string
  number: string
  customerName: string
  customerPhone: string
  customerEmail: string | null
  deliveryAddress: string | null
  status: string
  priority: string
  subtotal: number
  totalDiscount?: number
  totalTax: number
  deliveryFee: number
  total: number
  paymentMethod: string
  paymentStatus: string
  notes: string | null
  createdAt: string
  deliveredAt: string | null
  items: OrderItem[]
  deliveryPerson?: {
    id: string
    name: string
    phone: string
  } | null
  deliveryZone?: {
    id: string
    name: string
    color: string
    deliveryFee: number
  } | null
  createdBy?: {
    id: string
    firstName: string
    lastName: string
    email: string
  } | null
}

interface OrderItem {
  id: string
  productId: string
  name: string
  sku: string | null
  quantity: number
  unitPrice: number
  taxRate: number
  discount: number
  total: number
  product?: {
    name: string
    sku: string | null
    photos: string[] | null
  }
}

export function OrderDetailsSheet({
  open,
  onOpenChange,
  order,
}: OrderDetailsSheetProps) {
  if (!order) return null

  const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
    PENDING: { label: "En attente", color: "bg-yellow-100 text-yellow-800 border-yellow-200", icon: Clock },
    CONFIRMED: { label: "Confirmée", color: "bg-blue-100 text-blue-800 border-blue-200", icon: CheckCircle2 },
    PREPARING: { label: "En préparation", color: "bg-purple-100 text-purple-800 border-purple-200", icon: Package },
    READY: { label: "Prête", color: "bg-green-100 text-green-800 border-green-200", icon: CheckCircle2 },
    DELIVERING: { label: "En livraison", color: "bg-indigo-100 text-indigo-800 border-indigo-200", icon: Truck },
    DELIVERED: { label: "Livrée", color: "bg-green-100 text-green-800 border-green-200", icon: CheckCircle2 },
    CANCELLED: { label: "Annulée", color: "bg-red-100 text-red-800 border-red-200", icon: XCircle },
  }

  const priorityConfig: Record<string, { label: string; color: string }> = {
    LOW: { label: "Basse", color: "bg-gray-100 text-gray-700" },
    NORMAL: { label: "Normal", color: "bg-blue-100 text-blue-700" },
    HIGH: { label: "Haute", color: "bg-orange-100 text-orange-700" },
    URGENT: { label: "Urgente", color: "bg-red-100 text-red-700" },
  }

  const paymentStatusConfig: Record<string, { label: string; color: string }> = {
    PENDING: { label: "En attente", color: "bg-yellow-100 text-yellow-700" },
    PAID: { label: "Payée", color: "bg-green-100 text-green-700" },
    FAILED: { label: "Échouée", color: "bg-red-100 text-red-700" },
  }

  const currentStatus = statusConfig[order.status] || statusConfig.PENDING
  const StatusIcon = currentStatus.icon

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-3xl p-0 flex flex-col h-full">
        {/* Header fixe */}
        <div className="px-8 pt-6 pb-4 border-b bg-white shrink-0">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-3xl font-bold text-gray-900">FACTURE</h2>
              <p className="text-sm text-gray-500 mt-1">N° {order.number}</p>
            </div>
            <Badge className={cn("text-sm px-4 py-1.5 border", currentStatus.color)}>
              <StatusIcon className="h-4 w-4 mr-1.5" />
              {currentStatus.label}
            </Badge>
          </div>
          
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-gray-600">
              <Calendar className="h-4 w-4" />
              <span className="font-medium">
                {format(new Date(order.createdAt), "dd MMMM yyyy 'à' HH:mm", { locale: fr })}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="outline" className={cn("text-xs", priorityConfig[order.priority]?.color)}>
                {priorityConfig[order.priority]?.label}
              </Badge>
              <Badge variant="outline" className={cn("text-xs", paymentStatusConfig[order.paymentStatus]?.color)}>
                {paymentStatusConfig[order.paymentStatus]?.label}
              </Badge>
            </div>
          </div>
        </div>

        {/* Contenu scrollable */}
        <div className="flex-1 overflow-y-auto px-8 py-6">
          <div className="space-y-8">
            {/* Informations client et livraison */}
            <div className="grid grid-cols-2 gap-6">
              {/* Client */}
              <div className="space-y-1">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                  Facturé à
                </h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-gray-400" />
                    <span className="font-semibold text-gray-900">{order.customerName}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-700">{order.customerPhone}</span>
                  </div>
                  {order.customerEmail && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-700">{order.customerEmail}</span>
                    </div>
                  )}
                  {order.deliveryAddress && (
                    <div className="flex items-start gap-2 mt-3">
                      <MapPin className="h-4 w-4 text-gray-400 mt-0.5" />
                      <span className="text-sm text-gray-700">{order.deliveryAddress}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Livraison */}
              <div className="space-y-1">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                  Informations de livraison
                </h3>
                <div className="space-y-3">
                  {order.deliveryPerson ? (
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Livreur</p>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-xs font-semibold text-green-700">
                          {order.deliveryPerson.name.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div>
                          <p className="font-medium text-sm text-gray-900">{order.deliveryPerson.name}</p>
                          <p className="text-xs text-gray-600">{order.deliveryPerson.phone}</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 italic">Aucun livreur assigné</p>
                  )}
                  
                  {order.deliveryZone && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Zone</p>
                      <Badge 
                        style={{ backgroundColor: order.deliveryZone.color }} 
                        className="text-white text-xs"
                      >
                        <MapPin className="h-3 w-3 mr-1" />
                        {order.deliveryZone.name}
                      </Badge>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <Separator className="my-6" />

            {/* Tableau des produits */}
            <div>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">
                Détails de la commande
              </h3>
              
              {/* En-tête du tableau */}
              <div className="grid grid-cols-12 gap-4 pb-3 border-b border-gray-200 text-xs font-semibold text-gray-600 uppercase">
                <div className="col-span-5">Produit</div>
                <div className="col-span-2 text-center">Quantité</div>
                <div className="col-span-2 text-right">Prix unit.</div>
                <div className="col-span-1 text-right">TVA</div>
                <div className="col-span-2 text-right">Total</div>
              </div>

              {/* Lignes des produits */}
              <div className="divide-y divide-gray-100">
                {order.items.map((item) => (
                  <div 
                    key={item.id} 
                    className="grid grid-cols-12 gap-4 py-4 items-center"
                  >
                    <div className="col-span-5 flex items-center gap-3">
                      {item.product?.photos?.[0] ? (
                        <img
                          src={item.product.photos[0]}
                          alt={item.name}
                          className="w-12 h-12 rounded border object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-gray-100 rounded border flex items-center justify-center">
                          <Package className="h-5 w-5 text-gray-400" />
                        </div>
                      )}
                      <div>
                        <p className="font-medium text-sm text-gray-900">{item.name}</p>
                        {item.sku && (
                          <p className="text-xs text-gray-500">SKU: {item.sku}</p>
                        )}
                      </div>
                    </div>
                    <div className="col-span-2 text-center">
                      <span className="inline-flex items-center justify-center w-10 h-8 bg-gray-100 rounded font-medium text-sm">
                        {item.quantity}
                      </span>
                    </div>
                    <div className="col-span-2 text-right text-sm text-gray-700">
                      {item.unitPrice.toLocaleString()} F
                    </div>
                    <div className="col-span-1 text-right text-sm text-gray-600">
                      {item.taxRate}%
                    </div>
                    <div className="col-span-2 text-right font-semibold text-sm text-gray-900">
                      {item.total.toLocaleString()} F
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <Separator className="my-6" />

            {/* Récapitulatif */}
            <div className="flex justify-end">
              <div className="w-80 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Sous-total</span>
                  <span className="font-medium">{order.subtotal.toLocaleString()} FCFA</span>
                </div>
                {order.totalDiscount && order.totalDiscount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-red-600">Remise</span>
                    <span className="font-medium text-red-600">-{order.totalDiscount.toLocaleString()} FCFA</span>
                  </div>
                )}
                {order.totalTax > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">TVA</span>
                    <span className="font-medium">{order.totalTax.toLocaleString()} FCFA</span>
                  </div>
                )}
                {order.deliveryFee > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Frais de livraison</span>
                    <span className="font-medium">{order.deliveryFee.toLocaleString()} FCFA</span>
                  </div>
                )}
                <Separator className="my-2" />
                <div className="flex justify-between items-center py-3 bg-gray-50 px-4 rounded-lg">
                  <span className="text-base font-semibold text-gray-900">TOTAL</span>
                  <span className="text-2xl font-bold text-blue-600">
                    {order.total.toLocaleString()} F
                  </span>
                </div>
                <div className="text-xs text-gray-500 text-right">
                  Paiement: {order.paymentMethod === "CASH" ? "Espèces" : 
                             order.paymentMethod === "CARD" ? "Carte" :
                             order.paymentMethod === "MOBILE" ? "Mobile Money" : "Virement"}
                </div>
              </div>
            </div>

            {/* Notes */}
            {order.notes && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <FileText className="h-4 w-4 text-gray-500 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="text-xs font-semibold text-gray-700 uppercase mb-2">Notes</h4>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{order.notes}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Informations supplémentaires */}
            <div className="text-xs text-gray-500 space-y-1 pt-4 border-t">
              {order.createdBy && (
                <p>
                  Créée par <span className="font-medium">{order.createdBy.firstName} {order.createdBy.lastName}</span>
                </p>
              )}
              {order.deliveredAt && (
                <p>
                  Livrée le {format(new Date(order.deliveredAt), "dd MMMM yyyy 'à' HH:mm", { locale: fr })}
                </p>
              )}
            </div>

            {/* Espace pour les boutons fixes */}
            <div className="h-20"></div>
          </div>
        </div>

        {/* Footer fixe avec boutons d'action */}
        <div className="border-t bg-white px-8 py-4 shrink-0">
          <div className="grid grid-cols-2 gap-4">
            <Button 
              variant="outline" 
              className="w-full h-11"
              onClick={() => window.print()}
            >
              <Printer className="h-4 w-4 mr-2" />
              Imprimer
            </Button>
            <Button 
              className="w-full h-11 bg-blue-600 hover:bg-blue-700"
              onClick={() => {
                // Logique de téléchargement PDF à implémenter
                console.log("Télécharger PDF")
              }}
            >
              <Download className="h-4 w-4 mr-2" />
              Télécharger PDF
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
