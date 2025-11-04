"use client"

import { useState, useEffect } from "react"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { AlertCircle, CheckCircle, XCircle, Edit, Send, Trash2, RefreshCw } from "lucide-react"
import { toast } from "sonner"
import { Separator } from "@/components/ui/separator"

interface FailedOrder {
  id: string
  rawMessage: string
  senderId: string | null
  senderPhone: string | null
  timestamp: string | null
  customerName: string | null
  customerPhone: string | null
  deliveryAddress: string | null
  totalAmount: number | null
  requestedProducts: Array<{
    productCode: string
    quantity: number
    unitPrice?: number
    total?: number
  }>
  errorType: string
  errorDetails: string
  missingProducts: string[]
  status: string
  createdAt: string
  resolvedAt: string | null
  resolvedByUser: {
    id: string
    name: string | null
    email: string
  } | null
}

interface FailedOrdersSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onOrderResolved?: () => void
}

export function FailedOrdersSheet({ open, onOpenChange, onOrderResolved }: FailedOrdersSheetProps) {
  const [failedOrders, setFailedOrders] = useState<FailedOrder[]>([])
  const [loading, setLoading] = useState(false)
  const [editingOrder, setEditingOrder] = useState<FailedOrder | null>(null)
  const [editedData, setEditedData] = useState({
    customerName: "",
    customerPhone: "",
    deliveryAddress: "",
    totalAmount: "",
    products: [] as Array<{ productCode: string; quantity: number }>
  })

  // Récupérer les commandes échouées
  const fetchFailedOrders = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/orders/failed-whatsapp?status=PENDING')
      const data = await response.json()
      
      if (data.success) {
        setFailedOrders(data.data)
        console.log(`✅ ${data.count} commandes échouées récupérées`)
      } else {
        toast.error('Erreur lors de la récupération des commandes échouées')
      }
    } catch (error) {
      console.error('❌ Erreur:', error)
      toast.error('Erreur de chargement')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (open) {
      fetchFailedOrders()
    }
  }, [open])

  // Initialiser le formulaire d'édition
  const startEditing = (order: FailedOrder) => {
    setEditingOrder(order)
    setEditedData({
      customerName: order.customerName || "",
      customerPhone: order.customerPhone || "",
      deliveryAddress: order.deliveryAddress || "",
      totalAmount: order.totalAmount?.toString() || "",
      products: order.requestedProducts.map(p => ({
        productCode: p.productCode,
        quantity: p.quantity
      }))
    })
  }

  // Annuler l'édition
  const cancelEditing = () => {
    setEditingOrder(null)
    setEditedData({
      customerName: "",
      customerPhone: "",
      deliveryAddress: "",
      totalAmount: "",
      products: []
    })
  }

  // Soumettre la commande corrigée
  const submitCorrectedOrder = async () => {
    if (!editingOrder) return

    try {
      // Créer la commande avec les données corrigées
      const response = await fetch('/api/orders/from-whatsapp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_BACKEND_API_KEY || ''}`
        },
        body: JSON.stringify({
          customerName: editedData.customerName,
          phone: editedData.customerPhone,
          deliveryAddress: editedData.deliveryAddress,
          totalAmount: parseFloat(editedData.totalAmount),
          products: editedData.products,
          orderSource: 'whatsapp_corrected',
          rawMessage: editingOrder.rawMessage,
          senderId: editingOrder.senderId,
          timestamp: editingOrder.timestamp
        })
      })

      const data = await response.json()

      if (data.success) {
        toast.success(`✅ Commande ${data.orderNumber} créée avec succès!`)
        
        // Marquer la failed order comme résolue
        await fetch(`/api/orders/failed-whatsapp?id=${editingOrder.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status: 'RESOLVED',
            resolvedOrderId: data.orderId,
            resolutionNotes: 'Commande corrigée et créée manuellement'
          })
        })

        cancelEditing()
        fetchFailedOrders()
        onOrderResolved?.()
      } else {
        toast.error(`❌ ${data.error}`)
      }
    } catch (error) {
      console.error('❌ Erreur:', error)
      toast.error('Erreur lors de la création de la commande')
    }
  }

  // Rejeter une commande
  const rejectOrder = async (orderId: string) => {
    try {
      await fetch(`/api/orders/failed-whatsapp?id=${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'REJECTED',
          resolutionNotes: 'Commande rejetée par l\'admin'
        })
      })

      toast.success('Commande rejetée')
      fetchFailedOrders()
    } catch (error) {
      toast.error('Erreur lors du rejet')
    }
  }

  // Mettre à jour un produit dans le formulaire
  const updateProduct = (index: number, field: 'productCode' | 'quantity', value: string | number) => {
    const newProducts = [...editedData.products]
    newProducts[index] = {
      ...newProducts[index],
      [field]: field === 'quantity' ? parseInt(value as string) || 0 : value
    }
    setEditedData({ ...editedData, products: newProducts })
  }

  // Supprimer un produit
  const removeProduct = (index: number) => {
    const newProducts = editedData.products.filter((_, i) => i !== index)
    setEditedData({ ...editedData, products: newProducts })
  }

  // Ajouter un produit
  const addProduct = () => {
    setEditedData({
      ...editedData,
      products: [...editedData.products, { productCode: "", quantity: 1 }]
    })
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl p-0 flex flex-col z-[2000]">
        <SheetHeader className="px-6 py-4 border-b">
          <div className="flex items-center justify-between">
            <div>
              <SheetTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-orange-500" />
                Commandes WhatsApp avec erreurs
              </SheetTitle>
              <SheetDescription>
                Produits non trouvés - Nécessitent une correction manuelle
              </SheetDescription>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={fetchFailedOrders}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1">
          <div className="p-6 space-y-4">
            {loading ? (
              <div className="text-center py-8">
                <RefreshCw className="h-8 w-8 animate-spin text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-500">Chargement...</p>
              </div>
            ) : failedOrders.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-2" />
                <p className="text-sm text-gray-500">Aucune commande en attente</p>
              </div>
            ) : editingOrder ? (
              // Formulaire d'édition
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">Modifier la commande</h3>
                  <Button variant="ghost" size="sm" onClick={cancelEditing}>
                    Annuler
                  </Button>
                </div>

                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-sm font-medium text-red-800">Produits manquants:</p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {editingOrder.missingProducts.map((product, idx) => (
                      <Badge key={idx} variant="destructive">{product}</Badge>
                    ))}
                  </div>
                </div>

                <Separator />

                <div className="space-y-3">
                  <div>
                    <Label>Nom du client</Label>
                    <Input
                      value={editedData.customerName}
                      onChange={(e) => setEditedData({ ...editedData, customerName: e.target.value })}
                      placeholder="Nom du client"
                    />
                  </div>

                  <div>
                    <Label>Téléphone</Label>
                    <Input
                      value={editedData.customerPhone}
                      onChange={(e) => setEditedData({ ...editedData, customerPhone: e.target.value })}
                      placeholder="Téléphone"
                    />
                  </div>

                  <div>
                    <Label>Adresse de livraison</Label>
                    <Textarea
                      value={editedData.deliveryAddress}
                      onChange={(e) => setEditedData({ ...editedData, deliveryAddress: e.target.value })}
                      placeholder="Adresse"
                      rows={2}
                    />
                  </div>

                  <div>
                    <Label>Montant total (FCFA)</Label>
                    <Input
                      type="number"
                      value={editedData.totalAmount}
                      onChange={(e) => setEditedData({ ...editedData, totalAmount: e.target.value })}
                      placeholder="Montant"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label>Produits</Label>
                      <Button variant="outline" size="sm" onClick={addProduct}>
                        + Ajouter
                      </Button>
                    </div>
                    <div className="space-y-2">
                      {editedData.products.map((product, idx) => (
                        <div key={idx} className="flex gap-2">
                          <Input
                            placeholder="Code ou nom produit"
                            value={product.productCode}
                            onChange={(e) => updateProduct(idx, 'productCode', e.target.value)}
                            className="flex-1"
                          />
                          <Input
                            type="number"
                            placeholder="Qté"
                            value={product.quantity}
                            onChange={(e) => updateProduct(idx, 'quantity', e.target.value)}
                            className="w-20"
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeProduct(idx)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="flex gap-2">
                  <Button onClick={submitCorrectedOrder} className="flex-1">
                    <Send className="h-4 w-4 mr-2" />
                    Créer la commande
                  </Button>
                </div>
              </div>
            ) : (
              // Liste des commandes
              failedOrders.map((order) => (
                <div key={order.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-semibold">{order.customerName || 'Client inconnu'}</p>
                      <p className="text-sm text-gray-600">{order.customerPhone}</p>
                      <p className="text-xs text-gray-500 mt-1">{order.deliveryAddress}</p>
                    </div>
                    <Badge variant="destructive" className="ml-2">
                      {order.missingProducts.length} produit(s)
                    </Badge>
                  </div>

                  <div className="bg-gray-50 rounded p-2">
                    <p className="text-xs font-medium text-gray-700 mb-1">Produits manquants:</p>
                    <div className="flex flex-wrap gap-1">
                      {order.missingProducts.map((product, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {product}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="text-xs text-gray-500">
                    <p>Total: {order.totalAmount?.toLocaleString()} FCFA</p>
                    <p>Reçue le: {new Date(order.createdAt).toLocaleString('fr-FR')}</p>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => startEditing(order)}
                      className="flex-1"
                    >
                      <Edit className="h-3 w-3 mr-1" />
                      Corriger
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => rejectOrder(order.id)}
                    >
                      <XCircle className="h-3 w-3 mr-1" />
                      Rejeter
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}
