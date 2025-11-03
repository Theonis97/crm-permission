"use client"

import { useState, useEffect } from "react"
import { Save, X, Plus, Trash2, Calendar, Phone, Package, DollarSign, User, Truck } from "lucide-react"
import useSWR from 'swr'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area"

// Fetcher pour SWR
const fetcher = async (url: string) => {
  const response = await fetch(url)
  const data = await response.json()
  if (!data.success) {
    throw new Error(data.error || 'Erreur lors du chargement des données')
  }
  return data.data
}

interface OrderItem {
  id: string
  productName: string
  quantity: number
  unitPrice: number
  total: number
}

interface Order {
  id: string
  number: string
  status: string
  customerName: string
  customerPhone: string
  deliveryAddress: string
  requestedDeliveryDate?: string
  total: number
  items: OrderItem[]
  createdAt: string
  notes?: string
}

interface DeliveryPerson {
  id: string
  name: string
  phone: string
}

interface EditingOrder {
  id: string
  customerName: string
  customerPhone: string
  deliveryAddress: string
  requestedDeliveryDate: string
  status: string
  deliveryPersonId: string
  items: OrderItem[]
  total: number
}

interface OrderEditModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  order: Order
  onOrderSaved: () => void
}

const ORDER_STATUSES = [
  { value: 'PENDING', label: 'En attente' },
  { value: 'CONFIRMED', label: 'Confirmée' },
  { value: 'PREPARING', label: 'En préparation' },
  { value: 'READY', label: 'Prête' },
  { value: 'DELIVERING', label: 'En livraison' },
  { value: 'DELIVERED', label: 'Livrée' },
  { value: 'CANCELLED', label: 'Annulée' },
  { value: 'TOBEVALIDATED', label: 'À valider' },
]

export function OrderEditModal({ 
  open, 
  onOpenChange, 
  order, 
  onOrderSaved 
}: OrderEditModalProps) {
  const [editingOrder, setEditingOrder] = useState<EditingOrder | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  // Récupérer les livreurs disponibles
  const { data: deliveryPersons } = useSWR<DeliveryPerson[]>(
    '/api/delivery/persons',
    fetcher
  )

  // Initialiser les données d'édition quand la commande change
  useEffect(() => {
    if (order) {
      setEditingOrder({
        id: order.id,
        customerName: order.customerName,
        customerPhone: order.customerPhone,
        deliveryAddress: order.deliveryAddress,
        requestedDeliveryDate: order.requestedDeliveryDate ? 
          new Date(order.requestedDeliveryDate).toISOString().split('T')[0] : '',
        status: order.status,
        deliveryPersonId: 'none',
        items: [...order.items],
        total: order.total
      })
    }
  }, [order])

  const handleSaveOrder = async () => {
    if (!editingOrder) return

    setIsSaving(true)
    try {
      const response = await fetch(`/api/orders/${editingOrder.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customerName: editingOrder.customerName,
          customerPhone: editingOrder.customerPhone,
          deliveryAddress: editingOrder.deliveryAddress,
          requestedDeliveryDate: editingOrder.requestedDeliveryDate || null,
          status: editingOrder.status,
          deliveryPersonId: editingOrder.deliveryPersonId === "none" ? null : editingOrder.deliveryPersonId || null,
          items: editingOrder.items,
          total: editingOrder.total
        }),
      })

      if (response.ok) {
        onOrderSaved()
      } else {
        console.error('Erreur lors de la sauvegarde')
      }
    } catch (error) {
      console.error('Erreur:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const addItem = () => {
    if (!editingOrder) return
    
    const newItem: OrderItem = {
      id: `temp-${Date.now()}`,
      productName: '',
      quantity: 1,
      unitPrice: 0,
      total: 0
    }
    
    setEditingOrder({
      ...editingOrder,
      items: [...editingOrder.items, newItem]
    })
  }

  const removeItem = (index: number) => {
    if (!editingOrder) return
    
    const newItems = editingOrder.items.filter((_, i) => i !== index)
    const newTotal = newItems.reduce((sum, item) => sum + item.total, 0)
    
    setEditingOrder({
      ...editingOrder,
      items: newItems,
      total: newTotal
    })
  }

  const updateItem = (index: number, field: keyof OrderItem, value: any) => {
    if (!editingOrder) return
    
    const newItems = [...editingOrder.items]
    newItems[index] = { ...newItems[index], [field]: value }
    
    // Recalculer le total de l'item
    if (field === 'quantity' || field === 'unitPrice') {
      newItems[index].total = newItems[index].quantity * newItems[index].unitPrice
    }
    
    // Recalculer le total de la commande
    const newTotal = newItems.reduce((sum, item) => sum + item.total, 0)
    
    setEditingOrder({
      ...editingOrder,
      items: newItems,
      total: newTotal
    })
  }

  if (!editingOrder) return null

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[800px] sm:w-[900px] z-[2000]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Modifier la commande {order.number}
          </SheetTitle>
        </SheetHeader>
        
        <ScrollArea className="h-[calc(100vh-120px)] pr-4 mt-6">
          <div className="space-y-6">
            {/* Informations client */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="customerName" className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Nom du client
                </Label>
                <Input
                  id="customerName"
                  value={editingOrder.customerName}
                  onChange={(e) => setEditingOrder({
                    ...editingOrder,
                    customerName: e.target.value
                  })}
                />
              </div>
              <div>
                <Label htmlFor="customerPhone" className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  Téléphone
                </Label>
                <Input
                  id="customerPhone"
                  value={editingOrder.customerPhone}
                  onChange={(e) => setEditingOrder({
                    ...editingOrder,
                    customerPhone: e.target.value
                  })}
                />
              </div>
            </div>

            {/* Adresse et date */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="deliveryAddress">Adresse de livraison</Label>
                <Textarea
                  id="deliveryAddress"
                  value={editingOrder.deliveryAddress}
                  onChange={(e) => setEditingOrder({
                    ...editingOrder,
                    deliveryAddress: e.target.value
                  })}
                  rows={3}
                />
              </div>
              <div>
                <Label htmlFor="requestedDeliveryDate" className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Date de livraison souhaitée
                </Label>
                <Input
                  id="requestedDeliveryDate"
                  type="date"
                  value={editingOrder.requestedDeliveryDate}
                  onChange={(e) => setEditingOrder({
                    ...editingOrder,
                    requestedDeliveryDate: e.target.value
                  })}
                />
              </div>
            </div>

            {/* Statut et livreur */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="status">Statut</Label>
                <Select
                  value={editingOrder.status}
                  onValueChange={(value) => setEditingOrder({
                    ...editingOrder,
                    status: value
                  })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ORDER_STATUSES.map((status) => (
                      <SelectItem key={status.value} value={status.value}>
                        {status.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="deliveryPerson" className="flex items-center gap-2">
                  <Truck className="h-4 w-4" />
                  Livreur
                </Label>
                <Select
                  value={editingOrder.deliveryPersonId}
                  onValueChange={(value) => setEditingOrder({
                    ...editingOrder,
                    deliveryPersonId: value
                  })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un livreur" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Aucun livreur</SelectItem>
                    {deliveryPersons?.map((person) => (
                      <SelectItem key={person.id} value={person.id}>
                        {person.name} - {person.phone}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Produits */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <Label className="flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Produits
                </Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addItem}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Ajouter un produit
                </Button>
              </div>
              
              <div className="space-y-3">
                {editingOrder.items.map((item, index) => (
                  <div key={item.id} className="flex items-center gap-3 p-3 border rounded-lg bg-gray-50">
                    <div className="flex-1">
                      <Input
                        placeholder="Nom du produit"
                        value={item.productName}
                        onChange={(e) => updateItem(index, 'productName', e.target.value)}
                      />
                    </div>
                    <div className="w-24">
                      <Input
                        type="number"
                        placeholder="Qté"
                        value={item.quantity}
                        onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 0)}
                      />
                    </div>
                    <div className="w-32">
                      <Input
                        type="number"
                        placeholder="Prix unitaire"
                        value={item.unitPrice}
                        onChange={(e) => updateItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                      />
                    </div>
                    <div className="w-32 text-right font-medium">
                      {item.total.toLocaleString()} FCFA
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeItem(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>

              {/* Total */}
              <div className="flex justify-end mt-4 p-4 bg-blue-50 rounded-lg border">
                <div className="text-right">
                  <p className="text-sm text-gray-600">Total de la commande</p>
                  <p className="text-2xl font-bold text-blue-600">
                    <DollarSign className="inline h-5 w-5 mr-1" />
                    {editingOrder.total.toLocaleString()} FCFA
                  </p>
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-6 mt-6 border-t bg-white sticky bottom-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            <X className="h-4 w-4 mr-2" />
            Annuler
          </Button>
          <Button 
            onClick={handleSaveOrder}
            disabled={isSaving}
          >
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? 'Sauvegarde...' : 'Sauvegarder'}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
