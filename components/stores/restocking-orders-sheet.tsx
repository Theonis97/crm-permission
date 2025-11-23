"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
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
import { Input } from "@/components/ui/input"
import {
  Clock,
  CheckCircle2,
  XCircle,
  Truck,
  Package,
  Search,
  Loader2,
  RefreshCw,
  Eye,
  AlertTriangle,
  ImageIcon,
} from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

interface RestockingOrder {
  id: string
  number: string
  status: "PENDING" | "APPROVED" | "PREPARING" | "SHIPPED" | "DELIVERED" | "CANCELLED" | "REJECTED"
  priority: "LOW" | "NORMAL" | "HIGH" | "URGENT"
  totalQuantity: number
  totalCost: number
  notes?: string
  store: {
    id: string
    name: string
  }
  requester: {
    id: string
    name: string
    email: string
  }
  approver?: {
    id: string
    name: string
    email: string
  }
  itemsCount: number
  items: Array<{
    id: string
    productName: string
    sku?: string
    requestedQuantity: number
    approvedQuantity?: number
    unitCost: number
    total: number
    product?: {
      id: string
      name: string
      sku?: string
      photos?: string[]
    }
  }>
  createdAt: string
  updatedAt: string
  approvedAt?: string
  deliveredAt?: string
  rejectionReason?: string
}

interface RestockingOrdersSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  storeId: string
  storeName: string
}

export function RestockingOrdersSheet({
  open,
  onOpenChange,
  storeId,
  storeName,
}: RestockingOrdersSheetProps) {
  const [orders, setOrders] = useState<RestockingOrder[]>([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [selectedOrder, setSelectedOrder] = useState<RestockingOrder | null>(null)
  const [showDetails, setShowDetails] = useState(false)

  useEffect(() => {
    if (open) {
      loadOrders()
    }
  }, [open, storeId])

  const loadOrders = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      
      if (statusFilter !== "all") {
        params.append("status", statusFilter)
      }
      
      params.append("storeId", storeId)

      const response = await fetch(`/api/restocking-orders?${params}`)
      
      if (!response.ok) {
        throw new Error("Erreur lors du chargement")
      }

      const data = await response.json()
      setOrders(data || [])
    } catch (error) {
      console.error("Error loading restocking orders:", error)
      toast.error("Erreur lors du chargement des demandes")
    } finally {
      setLoading(false)
    }
  }

  const getStatusConfig = (status: string) => {
    const config: Record<string, any> = {
      PENDING: {
        icon: Clock,
        className: "border-amber-200 text-amber-700 bg-amber-50",
        label: "En attente",
      },
      APPROVED: {
        icon: CheckCircle2,
        className: "border-blue-200 text-blue-700 bg-blue-50",
        label: "Approuvée",
      },
      PREPARING: {
        icon: Package,
        className: "border-blue-200 text-blue-700 bg-blue-50",
        label: "En préparation",
      },
      SHIPPED: {
        icon: Truck,
        className: "border-purple-200 text-purple-700 bg-purple-50",
        label: "Expédiée",
      },
      DELIVERED: {
        icon: CheckCircle2,
        className: "border-green-200 text-green-700 bg-green-50",
        label: "Livrée",
      },
      CANCELLED: {
        icon: XCircle,
        className: "border-red-200 text-red-700 bg-red-50",
        label: "Annulée",
      },
      REJECTED: {
        icon: XCircle,
        className: "border-red-200 text-red-700 bg-red-50",
        label: "Rejetée",
      },
    }
    return config[status] || config.PENDING
  }

  const getPriorityConfig = (priority: string) => {
    const config: Record<string, any> = {
      LOW: { className: "border-gray-200 text-gray-700 bg-gray-50", label: "Basse" },
      NORMAL: { className: "border-blue-200 text-blue-700 bg-blue-50", label: "Normale" },
      HIGH: { className: "border-orange-200 text-orange-700 bg-orange-50", label: "Haute" },
      URGENT: { className: "border-red-200 text-red-700 bg-red-50", label: "Urgente" },
    }
    return config[priority] || config.NORMAL
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = getStatusConfig(status)
    return (
      <Badge variant="outline" className={cn("text-xs", statusConfig.className)}>
        <statusConfig.icon className="h-3 w-3 mr-1" />
        {statusConfig.label}
      </Badge>
    )
  }

  const getPriorityBadge = (priority: string) => {
    const priorityConfig = getPriorityConfig(priority)
    return (
      <Badge variant="outline" className={cn("text-xs", priorityConfig.className)}>
        {priorityConfig.label}
      </Badge>
    )
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "XAF",
    }).format(price)
  }

  const filteredOrders = orders.filter((order) => {
    const matchesSearch = order.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.notes?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === "all" || order.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const handleViewDetails = (order: RestockingOrder) => {
    setSelectedOrder(order)
    setShowDetails(true)
  }

  const stats = {
    total: orders.length,
    pending: orders.filter(o => o.status === "PENDING").length,
    approved: orders.filter(o => o.status === "APPROVED").length,
    delivered: orders.filter(o => o.status === "DELIVERED").length,
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="min-w-[900px] max-w-[95vw] p-0">
        <SheetHeader className="px-6 py-4 border-b">
          <div className="flex items-center justify-between">
            <div>
              <SheetTitle className="flex items-center gap-2">
                <Package className="h-5 w-5 text-blue-600" />
                Demandes d'approvisionnement
              </SheetTitle>
              <SheetDescription>
                {storeName} • {stats.total} demande(s) au total
              </SheetDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={loadOrders}
              disabled={loading}
            >
              <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
              Actualiser
            </Button>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-hidden">
          {/* Stats rapides */}
          <div className="grid grid-cols-4 gap-4 p-6 border-b bg-gray-50">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
              <div className="text-sm text-gray-600">Total</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-amber-600">{stats.pending}</div>
              <div className="text-sm text-gray-600">En attente</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.approved}</div>
              <div className="text-sm text-gray-600">Approuvées</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{stats.delivered}</div>
              <div className="text-sm text-gray-600">Livrées</div>
            </div>
          </div>

          {/* Filtres */}
          <div className="p-6 border-b space-y-4">
            <div className="flex items-center gap-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Rechercher par numéro..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Filtrer par statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les statuts</SelectItem>
                  <SelectItem value="PENDING">En attente</SelectItem>
                  <SelectItem value="APPROVED">Approuvées</SelectItem>
                  <SelectItem value="PREPARING">En préparation</SelectItem>
                  <SelectItem value="SHIPPED">Expédiées</SelectItem>
                  <SelectItem value="DELIVERED">Livrées</SelectItem>
                  <SelectItem value="CANCELLED">Annulées</SelectItem>
                  <SelectItem value="REJECTED">Rejetées</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Liste des demandes */}
          <div className="flex-1 overflow-auto">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                <span className="ml-2 text-gray-600">Chargement...</span>
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Package className="h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Aucune demande trouvée
                </h3>
                <p className="text-gray-600 text-center">
                  {orders.length === 0 
                    ? "Aucune demande d'approvisionnement pour ce magasin"
                    : "Aucune demande ne correspond à vos critères"
                  }
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>N° Demande</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Priorité</TableHead>
                    <TableHead className="text-center">Articles</TableHead>
                    <TableHead className="text-right">Montant</TableHead>
                    <TableHead>Créée le</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.map((order) => (
                    <TableRow key={order.id} className="hover:bg-gray-50">
                      <TableCell>
                        <div>
                          <div className="font-mono text-sm font-medium">{order.number}</div>
                          {order.notes && (
                            <div className="text-xs text-gray-500 mt-1 truncate max-w-[200px]">
                              {order.notes}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(order.status)}</TableCell>
                      <TableCell>{getPriorityBadge(order.priority)}</TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Package className="h-4 w-4 text-gray-400" />
                          <span className="text-sm font-medium">
                            {order.itemsCount || order.items?.length || 0}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {formatPrice(order.totalCost)}
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {formatDate(order.createdAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewDetails(order)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </div>

        {/* Modal de détails */}
        {selectedOrder && showDetails && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full mx-4 max-h-[85vh] overflow-hidden">
              <div className="p-6 border-b">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">Détails de la demande</h3>
                    <p className="text-sm text-gray-600">{selectedOrder.number}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowDetails(false)}
                  >
                    <XCircle className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              <div className="p-6 overflow-auto max-h-[70vh]">
                <div className="space-y-6">
                  {/* Informations générales */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-600">Statut</label>
                      <div className="mt-1">{getStatusBadge(selectedOrder.status)}</div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Priorité</label>
                      <div className="mt-1">{getPriorityBadge(selectedOrder.priority)}</div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Demandeur</label>
                      <div className="mt-1 text-sm">{selectedOrder.requester.name}</div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Montant total</label>
                      <div className="mt-1 text-sm font-semibold">{formatPrice(selectedOrder.totalCost)}</div>
                    </div>
                  </div>

                  {/* Notes */}
                  {selectedOrder.notes && (
                    <div>
                      <label className="text-sm font-medium text-gray-600">Notes</label>
                      <div className="mt-1 text-sm bg-gray-50 p-3 rounded-md">{selectedOrder.notes}</div>
                    </div>
                  )}

                  {/* Articles */}
                  <div>
                    <label className="text-sm font-medium text-gray-600 mb-3 block">
                      Articles ({selectedOrder.items.length})
                    </label>
                    <div className="border rounded-md">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-20">Image</TableHead>
                            <TableHead>Produit</TableHead>
                            <TableHead className="text-center">Qté demandée</TableHead>
                            <TableHead className="text-center">Qté approuvée</TableHead>
                            <TableHead className="text-right">Prix unitaire</TableHead>
                            <TableHead className="text-right">Total</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {selectedOrder.items.map((item) => (
                            <TableRow key={item.id}>
                              <TableCell className="w-20">
                                <div className="w-16 h-16 rounded-md overflow-hidden bg-gray-100 flex items-center justify-center">
                                  {item.product?.photos && item.product.photos.length > 0 ? (
                                    <img
                                      src={item.product.photos[0]}
                                      alt={item.productName}
                                      className="w-full h-full object-contain"
                                    />
                                  ) : (
                                    <ImageIcon className="h-8 w-8 text-gray-400" />
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div>
                                  <div className="font-medium text-sm">
                                    {item.product?.name || item.productName}
                                  </div>
                                  {(item.product?.sku || item.sku) && (
                                    <div className="text-xs text-gray-500">
                                      SKU: {item.product?.sku || item.sku}
                                    </div>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="text-center">
                                <span className="font-medium">{item.requestedQuantity}</span>
                              </TableCell>
                              <TableCell className="text-center">
                                <span className="font-medium">
                                  {item.approvedQuantity || "-"}
                                </span>
                              </TableCell>
                              <TableCell className="text-right">{formatPrice(item.unitCost)}</TableCell>
                              <TableCell className="text-right font-semibold">
                                {formatPrice(item.total)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>

                  {/* Dates importantes */}
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-600">Créée le</label>
                      <div className="mt-1 text-sm">{formatDate(selectedOrder.createdAt)}</div>
                    </div>
                    {selectedOrder.approvedAt && (
                      <div>
                        <label className="text-sm font-medium text-gray-600">Approuvée le</label>
                        <div className="mt-1 text-sm">{formatDate(selectedOrder.approvedAt)}</div>
                      </div>
                    )}
                    {selectedOrder.deliveredAt && (
                      <div>
                        <label className="text-sm font-medium text-gray-600">Livrée le</label>
                        <div className="mt-1 text-sm">{formatDate(selectedOrder.deliveredAt)}</div>
                      </div>
                    )}
                    {selectedOrder.rejectionReason && (
                      <div>
                        <label className="text-sm font-medium text-gray-600">Raison du rejet</label>
                        <div className="mt-1 text-sm text-red-600 bg-red-50 p-2 rounded">
                          {selectedOrder.rejectionReason}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
