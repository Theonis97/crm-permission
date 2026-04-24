"use client"

import { useState, useMemo, useEffect } from "react"
import { useParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Search,
  Filter,
  MoreHorizontal,
  Eye,
  Truck,
  Clock,
  CheckCircle2,
  XCircle,
  Package,
  MapPin,
  Phone,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Users,
  AlertCircle,
  Plus,
  User,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "@/lib/app-toast"
import { CancelOrderDialog } from "@/components/stores/cancel-order-dialog"
import { OrderDetailsSheet } from "@/components/stores/order-details-sheet"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"

interface Order {
  id: string
  number: string
  storeId: string
  customerName: string
  customerPhone: string
  customerEmail: string | null
  deliveryAddress: string | null
  deliveryLatitude: number | null
  deliveryLongitude: number | null
  status: string
  priority: string
  subtotal: number
  totalDiscount: number
  totalTax: number
  deliveryFee: number
  total: number
  paymentMethod: string
  paymentStatus: string
  deliveryPersonId: string | null
  deliveryZoneId: string | null
  notes: string | null
  createdAt: string
  deliveredAt: string | null
  store: {
    id: string
    name: string
  }
  items: OrderItem[]
  deliveryPerson: {
    id: string
    name: string
    phone: string
    status: string
  } | null
  deliveryZone: {
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
  cancelReason?: string | null
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
  product: {
    id: string
    name: string
    sku: string | null
    photos: string[]
  }
}

interface DeliveryPerson {
  id: string
  name: string
  phone: string
  status: string
}

interface DeliveryZone {
  id: string
  name: string
  color: string
  deliveryFee: number
}


const getStatusConfig = (status: string) => {
  const configs = {
    PENDING: { label: "En attente", color: "bg-gray-100 text-gray-700", dot: "bg-gray-500" },
    CONFIRMED: { label: "Confirmée", color: "bg-blue-100 text-blue-700", dot: "bg-blue-500" },
    PREPARING: { label: "Préparation", color: "bg-yellow-100 text-yellow-700", dot: "bg-yellow-500" },
    READY: { label: "Prête", color: "bg-purple-100 text-purple-700", dot: "bg-purple-500" },
    DELIVERING: { label: "En livraison", color: "bg-orange-100 text-orange-700", dot: "bg-orange-500" },
    DELIVERED: { label: "Livrée", color: "bg-green-100 text-green-700", dot: "bg-green-500" },
    CANCELLED: { label: "Annulée", color: "bg-red-100 text-red-700", dot: "bg-red-500" },
  }
  return configs[status as keyof typeof configs] || configs.PENDING
}

const getPriorityConfig = (priority: string) => {
  const configs = {
    normal: { label: "Normale", color: "text-gray-600" },
    high: { label: "Élevée", color: "text-orange-600" },
    urgent: { label: "Urgente", color: "text-red-600" },
  }
  return configs[priority as keyof typeof configs] || configs.normal
}

const formatFCFA = (amount: number) => {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'XAF',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount).replace('XAF', 'FCFA')
}

export default function OrdersPage() {
  const params = useParams()
  const storeId = params.id as string

  // États données
  const [orders, setOrders] = useState<Order[]>([])
  const [deliveryPersons, setDeliveryPersons] = useState<DeliveryPerson[]>([])
  const [deliveryZones, setDeliveryZones] = useState<DeliveryZone[]>([])
  
  // Loading states
  const [isLoadingOrders, setIsLoadingOrders] = useState(true)
  const [isPerformingAction, setIsPerformingAction] = useState(false)
  
  // Filtres
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [zoneFilter, setZoneFilter] = useState("all")
  const [deliveryPersonFilter, setDeliveryPersonFilter] = useState("all")
  const [dateFilter, setDateFilter] = useState("all")
  
  // Sélection
  const [selectedOrders, setSelectedOrders] = useState<string[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 20
  
  // Modal d'annulation
  const [showCancelDialog, setShowCancelDialog] = useState(false)
  const [orderToCancel, setOrderToCancel] = useState<Order | null>(null)
  
  // Modal d'annulation groupée
  const [showBulkCancelDialog, setShowBulkCancelDialog] = useState(false)
  const [bulkCancelReason, setBulkCancelReason] = useState("")
  
  // Sheet de détails
  const [showOrderDetails, setShowOrderDetails] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)

  // Charger les données
  useEffect(() => {
    loadOrders()
    loadDeliveryPersons()
    loadDeliveryZones()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeId])

  const loadOrders = async () => {
    try {
      setIsLoadingOrders(true)
      const response = await fetch(`/api/store-orders?storeId=${storeId}`)
      if (!response.ok) throw new Error("Erreur")
      const data = await response.json()
      setOrders(data)
    } catch (error) {
      toast.error("Erreur lors du chargement des commandes")
    } finally {
      setIsLoadingOrders(false)
    }
  }

  const loadDeliveryPersons = async () => {
    try {
      const response = await fetch(`/api/delivery-persons?storeId=${storeId}`)
      if (!response.ok) return
      const data = await response.json()
      setDeliveryPersons(data.filter((d: any) => d.isActive))
    } catch (error) {
      console.error(error)
    }
  }

  const loadDeliveryZones = async () => {
    try {
      const response = await fetch(`/api/delivery-zones?storeId=${storeId}`)
      if (!response.ok) return
      const data = await response.json()
      setDeliveryZones(data.filter((z: any) => z.isActive))
    } catch (error) {
      console.error(error)
    }
  }

  // Filtrage des commandes
  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      const matchesSearch = order.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           order.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           order.customerPhone.includes(searchTerm) ||
                           order.deliveryAddress?.toLowerCase().includes(searchTerm.toLowerCase())
      
      const matchesStatus = statusFilter === "all" || order.status === statusFilter
      const matchesZone = zoneFilter === "all" || 
        (zoneFilter === "unassigned" && !order.deliveryZoneId) ||
        order.deliveryZoneId === zoneFilter
      const matchesDeliveryPerson = deliveryPersonFilter === "all" || 
        (deliveryPersonFilter === "unassigned" && !order.deliveryPersonId) ||
        order.deliveryPersonId === deliveryPersonFilter
      
      // Filtre par date
      let matchesDate = true
      if (dateFilter !== "all") {
        const orderDate = new Date(order.createdAt)
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        
        if (dateFilter === "today") {
          matchesDate = orderDate >= today
        } else if (dateFilter === "week") {
          const weekAgo = new Date(today)
          weekAgo.setDate(weekAgo.getDate() - 7)
          matchesDate = orderDate >= weekAgo
        }
      }
      
      return matchesSearch && matchesStatus && matchesZone && matchesDeliveryPerson && matchesDate
    })
  }, [searchTerm, statusFilter, zoneFilter, deliveryPersonFilter, dateFilter, orders])

  // Pagination
  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedOrders = filteredOrders.slice(startIndex, endIndex)

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, statusFilter, zoneFilter, deliveryPersonFilter, dateFilter])

  // Gestion de la sélection multiple
  const toggleOrderSelection = (orderId: string) => {
    setSelectedOrders(prev => 
      prev.includes(orderId) 
        ? prev.filter(id => id !== orderId)
        : [...prev, orderId]
    )
  }

  const toggleSelectAll = () => {
    if (selectedOrders.length === paginatedOrders.length) {
      setSelectedOrders([])
    } else {
      setSelectedOrders(paginatedOrders.map(order => order.id))
    }
  }

  // Actions groupées
  const handleBulkAction = async (action: string, data?: any) => {
    if (selectedOrders.length === 0) {
      toast.error("Aucune commande sélectionnée")
      return
    }

    try {
      setIsPerformingAction(true)

      const response = await fetch("/api/store-orders/bulk-actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          orderIds: selectedOrders,
          data,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Erreur lors de l'action")
      }

      const result = await response.json()
      toast.success(result.message || "Action effectuée avec succès")
      
      await loadOrders()
      setSelectedOrders([])
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de l'action groupée")
    } finally {
      setIsPerformingAction(false)
    }
  }

  // Annulation groupée avec motif obligatoire
  const handleBulkCancel = async () => {
    if (!bulkCancelReason.trim()) {
      toast.error("Le motif d'annulation est obligatoire")
      return
    }
    
    await handleBulkAction("updateStatus", { 
      status: "CANCELLED", 
      cancelReason: bulkCancelReason.trim() 
    })
    
    setShowBulkCancelDialog(false)
    setBulkCancelReason("")
  }

  const stats = useMemo(() => ({
    total: orders.length,
    pending: orders.filter(o => o.status === "PENDING").length,
    confirmed: orders.filter(o => o.status === "CONFIRMED").length,
    delivering: orders.filter(o => o.status === "DELIVERING").length,
    delivered: orders.filter(o => o.status === "DELIVERED").length,
    unassigned: orders.filter(o => !o.deliveryPersonId).length,
  }), [orders])

  return (
    <>
      <div className="border-b bg-white px-6 py-2.5 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Commandes</h1>
            <p className="text-gray-600">Gestion des commandes et assignation des livreurs</p>
          </div>
          <Button className="bg-blue-900 hover:bg-blue-900 text-white">
            <Plus className="h-4 w-4 mr-2" />
            Créer une commande
          </Button>
        </div>
      </div>

      <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
        {/* Filtres et recherche */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div className="flex flex-wrap gap-3 items-center">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <Input
                    placeholder="Rechercher par client, N°, téléphone..."
                    className="pl-10 w-80"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>

                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Statut" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les statuts</SelectItem>
                    <SelectItem value="PENDING">En attente</SelectItem>
                    <SelectItem value="CONFIRMED">Confirmée</SelectItem>
                    <SelectItem value="PREPARING">Préparation</SelectItem>
                    <SelectItem value="READY">Prête</SelectItem>
                    <SelectItem value="DELIVERING">En livraison</SelectItem>
                    <SelectItem value="DELIVERED">Livrée</SelectItem>
                    <SelectItem value="CANCELLED">Annulée</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={zoneFilter} onValueChange={setZoneFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Zone" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes les zones</SelectItem>
                    <SelectItem value="unassigned">Non assignée</SelectItem>
                    {deliveryZones.map(zone => (
                      <SelectItem key={zone.id} value={zone.id}>
                        {zone.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Filtre par Date */}
                <Select value={dateFilter} onValueChange={setDateFilter}>
                  <SelectTrigger className="w-36">
                    <SelectValue placeholder="Date" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes les dates</SelectItem>
                    <SelectItem value="today">Aujourd'hui</SelectItem>
                    <SelectItem value="week">7 derniers jours</SelectItem>
                  </SelectContent>
                </Select>

                {/* Filtre par Livreur */}
                <Select value={deliveryPersonFilter} onValueChange={setDeliveryPersonFilter}>
                  <SelectTrigger className="w-44">
                    <SelectValue placeholder="Livreur" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les livreurs</SelectItem>
                    <SelectItem value="unassigned">Non assignés</SelectItem>
                    {deliveryPersons.map(person => (
                      <SelectItem key={person.id} value={person.id}>
                        {person.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={loadOrders}
                  disabled={isLoadingOrders}
                >
                  <RefreshCw className={cn("h-4 w-4", isLoadingOrders && "animate-spin")} />
                </Button>

              </div>
            </div>
          </CardHeader>

          <CardContent className="py-0">
            {isLoadingOrders ? (
              <div className="flex items-center justify-center py-16">
                <div className="text-center">
                  <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-3" />
                  <p className="text-gray-600">Chargement des commandes...</p>
                </div>
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                <Package className="h-16 w-16 mb-4 opacity-20" />
                <p className="text-sm">Aucune commande trouvée</p>
              </div>
            ) : (
            <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="w-12">
                      <input 
                        type="checkbox" 
                        className="rounded border-gray-300"
                        checked={selectedOrders.length === paginatedOrders.length && paginatedOrders.length > 0}
                        onChange={toggleSelectAll}
                      />
                    </TableHead>
                    <TableHead className="font-semibold">N° Commande</TableHead>
                    <TableHead className="font-semibold">Client</TableHead>
                    <TableHead className="font-semibold">Montant</TableHead>
                    <TableHead className="font-semibold">Statut</TableHead>
                    <TableHead className="font-semibold">Livreur</TableHead>
                    <TableHead className="font-semibold text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedOrders.map((order) => {
                    const statusConfig = getStatusConfig(order.status)
                    const priorityConfig = getPriorityConfig(order.priority)
                    
                    return (
                      <TableRow key={order.id} className="hover:bg-gray-50">
                        <TableCell>
                          <input 
                            type="checkbox" 
                            className="rounded border-gray-300"
                            checked={selectedOrders.includes(order.id)}
                            onChange={() => toggleOrderSelection(order.id)}
                          />
                        </TableCell>
                        <TableCell className="font-medium text-blue-600">
                          <div className="flex flex-col">
                            <span>{order.number}</span>
                            <span className="text-xs text-gray-500">
                              {new Date(order.createdAt).toLocaleDateString("fr-FR")}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-xs font-medium text-blue-600">
                              {order.customerName.split(' ').map(n => n[0]).join('')}
                            </div>
                            <div>
                              <div className="font-medium">{order.customerName}</div>
                              <div className="text-xs text-gray-500 flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                {order.customerPhone}
                              </div>
                              {order.deliveryZone && (
                                <div className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                                  <MapPin className="h-3 w-3" />
                                  {order.deliveryZone.name}
                                </div>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="font-semibold">
                          <div className="flex flex-col">
                            <span>{order.total.toLocaleString()} F</span>
                            {order.totalDiscount > 0 && (
                              <span className="text-xs text-red-500">
                                -{order.totalDiscount.toLocaleString()} F remise
                              </span>
                            )}
                            {order.deliveryFee > 0 && (
                              <span className="text-xs text-gray-500">
                                +{order.deliveryFee.toLocaleString()} F livraison
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <Badge className={cn("text-xs w-fit", statusConfig.color)}>
                              <div className={cn("w-2 h-2 rounded-full mr-1", statusConfig.dot)} />
                              {statusConfig.label}
                            </Badge>
                            {order.status === "CANCELLED" && order.cancelReason && (
                              <span className="text-xs text-red-600 break-words max-w-xs">
                                {order.cancelReason}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {order.deliveryPerson ? (
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center text-xs font-medium text-green-600">
                                {order.deliveryPerson.name.split(' ').map(n => n[0]).join('')}
                              </div>
                              <div className="flex flex-col">
                                <span className="text-sm font-medium">{order.deliveryPerson.name}</span>
                                <span className="text-xs text-gray-500">{order.deliveryPerson.phone}</span>
                              </div>
                            </div>
                          ) : (
                            <Badge variant="outline" className="text-gray-400">Non assigné</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedOrder(order)
                                  setShowOrderDetails(true)
                                }}
                              >
                                <Eye className="h-4 w-4 mr-2" />
                                Voir détails
                              </DropdownMenuItem>
                              {!["DELIVERED", "CANCELLED"].includes(order.status) && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    className="text-red-600 focus:text-red-600"
                                    onClick={() => {
                                      setOrderToCancel(order)
                                      setShowCancelDialog(true)
                                    }}
                                  >
                                    <XCircle className="h-4 w-4 mr-2" />
                                    Annuler la commande
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 border-t">
                <div className="text-sm text-gray-500">
                  Affichage de {startIndex + 1} à {Math.min(endIndex, filteredOrders.length)} sur {filteredOrders.length} commandes
                </div>
                
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Précédent
                  </Button>
                  
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNumber
                      if (totalPages <= 5) {
                        pageNumber = i + 1
                      } else if (currentPage <= 3) {
                        pageNumber = i + 1
                      } else if (currentPage >= totalPages - 2) {
                        pageNumber = totalPages - 4 + i
                      } else {
                        pageNumber = currentPage - 2 + i
                      }
                      
                      return (
                        <Button
                          key={pageNumber}
                          variant={currentPage === pageNumber ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCurrentPage(pageNumber)}
                          className="w-8 h-8 p-0"
                        >
                          {pageNumber}
                        </Button>
                      )
                    })}
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                  >
                    Suivant
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}
            </>
            )}
          </CardContent>
        </Card>

        {/* Barre d'actions pour la sélection multiple */}
        {selectedOrders.length > 0 && (
          <Card className="fixed bottom-6 py-0 bg-black left-1/2 transform -translate-x-1/2 shadow-lg border-2 z-50">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-blue flex items-center justify-center">
                    <span className="font-bold text-white">{selectedOrders.length}</span>
                  </div>
                  <span className="font-medium text-white">
                     commande{selectedOrders.length > 1 ? 's' : ''} sélectionnée{selectedOrders.length > 1 ? 's' : ''}
                  </span>
                </div>

                <div className="h-8 w-px bg-gray-300" />

                {/* Changer le statut en masse */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="rounded-full">
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Changer le statut
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuLabel>Changer le statut</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => handleBulkAction("updateStatus", { status: "CONFIRMED" })}>
                      <CheckCircle2 className="h-4 w-4 mr-2 text-blue-500" />
                      Confirmer
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleBulkAction("updateStatus", { status: "PREPARING" })}>
                      <Clock className="h-4 w-4 mr-2 text-yellow-500" />
                      En préparation
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleBulkAction("updateStatus", { status: "READY" })}>
                      <Package className="h-4 w-4 mr-2 text-purple-500" />
                      Prête
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleBulkAction("updateStatus", { status: "DELIVERING" })}>
                      <Truck className="h-4 w-4 mr-2 text-orange-500" />
                      En livraison
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleBulkAction("updateStatus", { status: "DELIVERED" })}>
                      <CheckCircle2 className="h-4 w-4 mr-2 text-green-500" />
                      Livrée
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setShowBulkCancelDialog(true)} className="text-red-600">
                      <XCircle className="h-4 w-4 mr-2" />
                      Annuler
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Assigner un livreur en masse */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="rounded-full">
                      <User className="h-4 w-4 mr-2" />
                      Assigner un livreur
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuLabel>Assigner un livreur</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {deliveryPersons.map(dp => (
                      <DropdownMenuItem 
                        key={dp.id}
                        onClick={() => handleBulkAction("assignDeliveryPerson", { deliveryPersonId: dp.id })}
                        disabled={dp.status !== "AVAILABLE"}
                      >
                        <User className="h-4 w-4 mr-2" />
                        <div className="flex items-center justify-between flex-1">
                          <span>{dp.name}</span>
                          <Badge 
                            variant={dp.status === "available" ? "default" : "secondary"}
                            className="ml-2 text-xs"
                          >
                            {dp.status === "available" ? "Disponible" : "Occupé"}
                          </Badge>
                        </div>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                <div className="h-8 w-px bg-gray-300" />

                <Button 
                  variant="ghost" 
                  className="bg-red-500 hover:bg-red-600 rounded-full"
                  size="sm"
                  onClick={() => setSelectedOrders([])}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Annuler
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Modal d'annulation */}
      <CancelOrderDialog
        open={showCancelDialog}
        onOpenChange={setShowCancelDialog}
        order={orderToCancel}
        onSuccess={() => {
          loadOrders()
          setOrderToCancel(null)
        }}
      />

      {/* Sheet de détails de commande */}
      <OrderDetailsSheet
        open={showOrderDetails}
        onOpenChange={setShowOrderDetails}
        order={selectedOrder}
        onStatusChange={loadOrders}
      />

      {/* Dialog d'annulation groupée */}
      <Dialog open={showBulkCancelDialog} onOpenChange={setShowBulkCancelDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                <XCircle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <DialogTitle>Annuler les commandes</DialogTitle>
                <DialogDescription>
                  {selectedOrders.length} commande(s) sélectionnée(s)
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-700">
                <strong>Attention :</strong> Cette action annulera les commandes sélectionnées et remettra les produits en stock. Un email de notification sera envoyé aux administrateurs.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bulkCancelReason" className="text-base font-semibold">
                Motif d'annulation <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="bulkCancelReason"
                value={bulkCancelReason}
                onChange={(e) => setBulkCancelReason(e.target.value)}
                placeholder="Expliquez pourquoi ces commandes sont annulées..."
                rows={4}
                className="resize-none"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowBulkCancelDialog(false)
                setBulkCancelReason("")
              }}
              disabled={isPerformingAction}
            >
              Fermer
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleBulkCancel}
              disabled={isPerformingAction || !bulkCancelReason.trim()}
            >
              {isPerformingAction && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Annuler les commandes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
