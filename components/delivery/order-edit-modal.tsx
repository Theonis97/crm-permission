"use client"

import { useState, useEffect } from "react"
import { Save, X, Plus, Trash2, Calendar, Phone, Package, DollarSign, User, Truck } from "lucide-react"
import useSWR, { useSWRConfig } from 'swr'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useToast } from "@/hooks/use-toast"

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
  deliveryPerson?: {
    id: string
    name: string
    phone: string
  }
  deliveryPersonId?: string
}

interface DeliveryPerson {
  id: string
  name: string
  phone: string
}

interface DeliveryZone {
  id: string
  name: string
  color: string
}

interface EditingOrder {
  id: string
  customerName: string
  customerPhone: string
  deliveryAddress: string
  requestedDeliveryDate: string
  status: string
  deliveryPersonId: string
  deliveryZoneId: string
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
  const { mutate } = useSWRConfig()
  const { toast } = useToast()

  // Récupérer les livreurs disponibles
  const { data: deliveryPersons } = useSWR<DeliveryPerson[]>(
    '/api/delivery/persons',
    fetcher
  )

  // Récupérer les zones de livraison
  const { data: deliveryZones } = useSWR<DeliveryZone[]>(
    '/api/delivery/zones',
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
        deliveryPersonId: order.deliveryPersonId || order.deliveryPerson?.id || 'none',
        deliveryZoneId: (order as any).deliveryZoneId || (order as any).deliveryZone?.id || 'none',
        items: [...order.items],
        total: order.total
      })
    }
  }, [order])

  const handleSaveOrder = async () => {
    if (!editingOrder) return

    setIsSaving(true)

    const payload = {
      customerName: editingOrder.customerName,
      customerPhone: editingOrder.customerPhone,
      deliveryAddress: editingOrder.deliveryAddress,
      requestedDeliveryDate: editingOrder.requestedDeliveryDate || null,
      status: editingOrder.status,
      deliveryPersonId: editingOrder.deliveryPersonId === "none" ? null : editingOrder.deliveryPersonId || null,
      deliveryZoneId: editingOrder.deliveryZoneId === "none" ? null : editingOrder.deliveryZoneId || null,
      items: editingOrder.items,
      total: editingOrder.total
    }

    console.log('🔄 ======= DÉBUT MODIFICATION COMMANDE =======')
    console.log('📦 Commande ID:', editingOrder.id)
    console.log('📍 Adresse:', payload.deliveryAddress)
    console.log('🗺️ Zone manuelle:', payload.deliveryZoneId || 'Aucune (géocodage auto)')
    console.log('📋 Payload complet:', payload)

    try {
      const response = await fetch(`/api/orders/${editingOrder.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      console.log('📡 Statut HTTP:', response.status, response.statusText)

      const data = await response.json()
      console.log('📥 Réponse serveur:', data)

      if (response.ok && data.success) {
        console.log('✅ ======= MODIFICATION RÉUSSIE =======')
        console.log('📊 Données retournées:', data.data)
        console.log('💬 Message:', data.message)
        
        toast({
          title: "✅ Succès",
          description: data.message || "La commande a été modifiée avec succès",
          variant: "default",
        })
        
        console.log('🔄 Revalidation des caches en cours...')
        // Revalider tous les caches pour récupérer les données à jour (avec la nouvelle zone si trouvée)
        await Promise.all([
          mutate('/api/delivery/map'),
          mutate('/api/delivery/driver-map'),
          mutate('/api/orders/unassigned')
        ])
        console.log('✅ Caches revalidés')
        console.log('🏁 ======= FIN MODIFICATION =======')
        
        onOrderSaved()
      } else {
        console.error('❌ ======= ERREUR MODIFICATION =======')
        console.error('❌ Erreur:', data.error)
        console.error('📥 Réponse complète:', data)
        toast({
          title: "❌ Erreur",
          description: data.error || 'Impossible de sauvegarder la commande',
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('❌ ======= ERREUR RÉSEAU =======')
      console.error('❌ Erreur réseau:', error)
      toast({
        title: "❌ Erreur réseau",
        description: 'Impossible de sauvegarder la commande',
        variant: "destructive",
      })
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
      <SheetContent side="right" className="!w-[35vw] !max-w-[35vw] z-[2000] p-0">
        {/* Header simple et propre */}
        <div className="bg-white border-b p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Commande #{order.number}</h1>
              <p className="text-sm text-gray-500 mt-1">Modification des détails</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-6 w-6" />
            </Button>
          </div>
        </div>
        
        <ScrollArea className="h-[calc(100vh-180px)] px-6">
          <div className="py-6 space-y-8">
            {/* Informations client */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-900 border-b pb-2">Client</h2>
              <div className="grid grid-cols-3 gap-6">
                <div>
                  <Label htmlFor="customerName" className="text-sm font-medium text-gray-700">
                    Nom du client
                  </Label>
                  <Input
                    id="customerName"
                    value={editingOrder.customerName}
                    onChange={(e) => setEditingOrder({
                      ...editingOrder,
                      customerName: e.target.value
                    })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="customerPhone" className="text-sm font-medium text-gray-700">
                    Téléphone
                  </Label>
                  <Input
                    id="customerPhone"
                    value={editingOrder.customerPhone}
                    onChange={(e) => setEditingOrder({
                      ...editingOrder,
                      customerPhone: e.target.value
                    })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="status" className="text-sm font-medium text-gray-700">
                    Statut
                  </Label>
                  <Select
                    value={editingOrder.status}
                    onValueChange={(value) => setEditingOrder({
                      ...editingOrder,
                      status: value
                    })}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Choisir un statut" />
                    </SelectTrigger>
                    <SelectContent className="z-[9999]" position="popper" sideOffset={5}>
                      <SelectItem value="PENDING">En attente</SelectItem>
                      <SelectItem value="CONFIRMED">Confirmée</SelectItem>
                      <SelectItem value="PREPARING">En préparation</SelectItem>
                      <SelectItem value="READY">Prête</SelectItem>
                      <SelectItem value="DELIVERING">En livraison</SelectItem>
                      <SelectItem value="DELIVERED">Livrée</SelectItem>
                      <SelectItem value="CANCELLED">Annulée</SelectItem>
                      <SelectItem value="REPORTED">Reportée</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Livraison */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-900 border-b pb-2">Livraison</h2>
              <div className="grid grid-cols-3 gap-6">
                <div className="col-span-2">
                  <Label htmlFor="deliveryAddress" className="text-sm font-medium text-gray-700">
                    Adresse de livraison
                  </Label>
                  <Textarea
                    id="deliveryAddress"
                    value={editingOrder.deliveryAddress}
                    onChange={(e) => setEditingOrder({
                      ...editingOrder,
                      deliveryAddress: e.target.value
                    })}
                    rows={3}
                    className="mt-1"
                    placeholder="Adresse complète..."
                  />
                </div>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="requestedDeliveryDate" className="text-sm font-medium text-gray-700">
                      Date souhaitée
                    </Label>
                    <Input
                      id="requestedDeliveryDate"
                      type="date"
                      value={editingOrder.requestedDeliveryDate}
                      onChange={(e) => setEditingOrder({
                        ...editingOrder,
                        requestedDeliveryDate: e.target.value
                      })}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="deliveryPerson" className="text-sm font-medium text-gray-700">
                      Livreur
                    </Label>
                    <Select
                      value={editingOrder.deliveryPersonId}
                      onValueChange={(value) => setEditingOrder({
                        ...editingOrder,
                        deliveryPersonId: value
                      })}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Choisir un livreur" />
                      </SelectTrigger>
                      <SelectContent className="z-[9999]" position="popper" sideOffset={5}>
                        <SelectItem value="none">Aucun livreur</SelectItem>
                        {deliveryPersons?.map((person) => (
                          <SelectItem key={person.id} value={person.id}>
                            {person.name} - {person.phone}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="deliveryZone" className="text-sm font-medium text-gray-700">
                      Zone de livraison (manuel)
                    </Label>
                    <Select
                      value={editingOrder.deliveryZoneId}
                      onValueChange={(value) => setEditingOrder({
                        ...editingOrder,
                        deliveryZoneId: value
                      })}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Choisir une zone" />
                      </SelectTrigger>
                      <SelectContent className="z-[9999]" position="popper" sideOffset={5}>
                        <SelectItem value="none">Aucune zone (géocodage auto)</SelectItem>
                        {deliveryZones?.map((zone) => (
                          <SelectItem key={zone.id} value={zone.id}>
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: zone.color }} />
                              {zone.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-gray-500 mt-1">
                      Si une zone est sélectionnée, elle remplacera le géocodage automatique
                    </p>
                  </div>
                </div>
              </div>
            </div>


            {/* Produits */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900 border-b pb-2">Produits</h2>
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
                  <div key={item.id} className="grid grid-cols-12 gap-4 items-center p-4 border rounded-lg bg-gray-50">
                    <div className="col-span-5">
                      <Input
                        placeholder="Nom du produit"
                        value={item.productName}
                        onChange={(e) => updateItem(index, 'productName', e.target.value)}
                      />
                    </div>
                    <div className="col-span-2">
                      <Input
                        type="number"
                        placeholder="Qté"
                        value={item.quantity}
                        onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 0)}
                        className="text-center"
                      />
                    </div>
                    <div className="col-span-2">
                      <Input
                        type="number"
                        placeholder="Prix"
                        value={item.unitPrice}
                        onChange={(e) => updateItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                        className="text-center"
                      />
                    </div>
                    <div className="col-span-2 text-right font-semibold">
                      {item.total.toLocaleString()} FCFA
                    </div>
                    <div className="col-span-1 text-center">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeItem(index)}
                        className="text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Total */}
              <div className="flex justify-end pt-4 border-t">
                <div className="text-right">
                  <p className="text-sm text-gray-600">Total de la commande</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {editingOrder.total.toLocaleString()} FCFA
                  </p>
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>

        {/* Actions - Toujours visible en bas */}
        <div className="absolute bottom-0 left-0 right-0 border-t bg-gray-200 p-4">
          <div className="grid grid-cols-2 gap-3">
            <Button 
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSaving}
              className="bg-white"
            >
              Annuler
            </Button>
            <Button 
              onClick={handleSaveOrder}
              disabled={isSaving}
              className="relative"
            >
              {isSaving ? (
                <>
                  <div className="h-4 w-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Enregistrement...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Enregistrer
                </>
              )}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
