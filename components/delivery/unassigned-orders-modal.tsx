"use client"

import { useState } from "react"
import { MapPin, Edit, Eye, Calendar, Phone, Package, DollarSign } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ScrollArea } from "@/components/ui/scroll-area"
import { OrderEditModal } from "./order-edit-modal"

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

interface UnassignedOrdersModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  orders: Order[]
  onOrderUpdated: () => void
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

export function UnassignedOrdersModal({ 
  open, 
  onOpenChange, 
  orders, 
  onOrderUpdated 
}: UnassignedOrdersModalProps) {
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)

  const getStatusInfo = (status: string) => {
    return ORDER_STATUSES.find(s => s.value === status) || ORDER_STATUSES[0]
  }

  const handleEditOrder = (order: Order) => {
    setSelectedOrder(order)
    setIsEditModalOpen(true)
  }

  const handleOrderSaved = () => {
    onOrderUpdated()
    setIsEditModalOpen(false)
    setSelectedOrder(null)
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="min-w-[100vw] w-full min-h-[100vh] z-[1999]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MapPin className="h-6 w-6 text-orange-600" />
              Commandes sans zone de livraison
              <Badge variant="secondary" className="ml-auto bg-orange-100 text-orange-800">
                {orders.length}
              </Badge>
            </DialogTitle>
          </DialogHeader>
          
          <ScrollArea className="h-[90vh]">
            {orders.length === 0 ? (
              <div className="text-center py-12">
                <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">Aucune commande sans zone de livraison</p>
              </div>
            ) : (
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
                        <TableCell className="max-w-xs">
                          <div className="truncate" title={order.deliveryAddress}>
                            {order.deliveryAddress}
                          </div>
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
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditOrder(order)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Modal de modification */}
      {selectedOrder && (
        <OrderEditModal
          open={isEditModalOpen}
          onOpenChange={setIsEditModalOpen}
          order={selectedOrder}
          onOrderSaved={handleOrderSaved}
        />
      )}
    </>
  )
}
