"use client"

import { useState } from "react"
import { MapPin, Edit, Save, X, Plus, Trash2, Calendar, Phone, Package, DollarSign, User, Truck } from "lucide-react"
import useSWR from 'swr'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

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

const ORDER_STATUSES = [
  { value: 'PENDING', label: 'En attente', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'CONFIRMED', label: 'Confirmée', color: 'bg-blue-100 text-blue-800' },
  { value: 'PREPARING', label: 'En préparation', color: 'bg-purple-100 text-purple-800' },
  { value: 'READY', label: 'Prête', color: 'bg-green-100 text-green-800' },
  { value: 'DELIVERING', label: 'En livraison', color: 'bg-indigo-100 text-indigo-800' },
  { value: 'DELIVERED', label: 'Livrée', color: 'bg-green-100 text-green-800' },
  { value: 'CANCELLED', label: 'Annulée', color: 'bg-red-100 text-red-800' },
  { value: 'TOBEVALIDATED', label: 'À valider', color: 'bg-orange-100 text-orange-800' },
]

export default function UnassignedOrdersPage() {
  const [editingOrder, setEditingOrder] = useState<EditingOrder | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  // Récupérer les commandes sans zone
  const { data: orders, error, isLoading, mutate } = useSWR<Order[]>(
    '/api/orders/unassigned',
    fetcher,
    {
      refreshInterval: 30000, // Rafraîchir toutes les 30 secondes
      revalidateOnFocus: true,
    }
  )

  // Récupérer les livreurs disponibles
  const { data: deliveryPersons } = useSWR<DeliveryPerson[]>(
    '/api/delivery/persons',
    fetcher
  )

  const getStatusInfo = (status: string) => {
    return ORDER_STATUSES.find(s => s.value === status) || ORDER_STATUSES[0]
  }

  const handleEditOrder = (order: Order) => {
    setEditingOrder({
      id: order.id,
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      deliveryAddress: order.deliveryAddress,
      requestedDeliveryDate: order.requestedDeliveryDate ? 
        new Date(order.requestedDeliveryDate).toISOString().split('T')[0] : '',
      status: order.status,
      deliveryPersonId: '',
      items: [...order.items],
      total: order.total
    })
    setIsDialogOpen(true)
  }

  const handleSaveOrder = async () => {
    if (!editingOrder) return

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
          deliveryPersonId: editingOrder.deliveryPersonId || null,
          items: editingOrder.items,
          total: editingOrder.total
        }),
      })

      if (response.ok) {
        mutate() // Rafraîchir les données
        setIsDialogOpen(false)
        setEditingOrder(null)
      } else {
        console.error('Erreur lors de la sauvegarde')
      }
    } catch (error) {
      console.error('Erreur:', error)
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <MapPin className="h-16 w-16 text-gray-400 mx-auto mb-4 animate-pulse" />
          <p className="text-gray-600 font-medium">Chargement des commandes...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <MapPin className="h-16 w-16 text-red-400 mx-auto mb-4" />
          <p className="text-red-600 font-medium">Erreur de chargement</p>
          <p className="text-gray-500 text-sm mt-2">{error.message}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-6 w-6 text-orange-600" />
            Commandes sans zone de livraison
            <Badge variant="secondary" className="ml-auto bg-orange-100 text-orange-800">
              {orders?.length || 0}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!orders || orders.length === 0 ? (
            <div className="text-center py-8">
              <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">Aucune commande sans zone de livraison</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Commande</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Téléphone</TableHead>
                    <TableHead>Adresse</TableHead>
                    <TableHead>Date souhaitée</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Montant</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((order) => {
                    const statusInfo = getStatusInfo(order.status)
                    return (
                      <TableRow key={order.id}>
                        <TableCell className="font-medium">
                          {order.number}
                        </TableCell>
                        <TableCell>{order.customerName}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {order.customerPhone}
                          </div>
                        </TableCell>
                        <TableCell className="max-w-xs truncate">
                          {order.deliveryAddress}
                        </TableCell>
                        <TableCell>
                          {order.requestedDeliveryDate ? (
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {new Date(order.requestedDeliveryDate).toLocaleDateString('fr-FR')}
                            </div>
                          ) : (
                            <span className="text-gray-400">Non définie</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge className={statusInfo.color}>
                            {statusInfo.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <DollarSign className="h-3 w-3" />
                            {order.total.toLocaleString()} FCFA
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditOrder(order)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog de modification */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Modifier la commande</DialogTitle>
          </DialogHeader>
          
          {editingOrder && (
            <div className="space-y-6">
              {/* Informations client */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="customerName">Nom du client</Label>
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
                  <Label htmlFor="customerPhone">Téléphone</Label>
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
                  />
                </div>
                <div>
                  <Label htmlFor="requestedDeliveryDate">Date de livraison souhaitée</Label>
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
                  <Label htmlFor="deliveryPerson">Livreur</Label>
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
                      <SelectItem value="">Aucun livreur</SelectItem>
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
                  <Label>Produits</Label>
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
                    <div key={item.id} className="flex items-center gap-3 p-3 border rounded-lg">
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
                <div className="flex justify-end mt-4 p-3 bg-gray-50 rounded-lg">
                  <div className="text-right">
                    <p className="text-sm text-gray-600">Total de la commande</p>
                    <p className="text-xl font-bold">{editingOrder.total.toLocaleString()} FCFA</p>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  <X className="h-4 w-4 mr-2" />
                  Annuler
                </Button>
                <Button onClick={handleSaveOrder}>
                  <Save className="h-4 w-4 mr-2" />
                  Sauvegarder
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
