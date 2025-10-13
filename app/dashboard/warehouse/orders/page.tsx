"use client"

import { useState, useEffect } from "react"
import { toast } from "sonner"
import { ModuleNavbar } from "@/components/navigation/module-navbar"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
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
import { Checkbox } from "@/components/ui/checkbox"
import {
  ShoppingCart,
  Search,
  Plus,
  Clock,
  Package,
  CheckCircle2,
  XCircle,
  Truck,
  Download,
  Eye,
  ChevronLeft,
  ChevronRight,
  X,
  FileDown,
  Trash2,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { OrderDetailsSheet } from "@/components/warehouse/order-details-sheet"
import { OrderFormDialog } from "@/components/warehouse/order-form-dialog"

interface Order {
  id: string
  orderNumber: string
  storeName: string
  storeId: string
  products: number
  totalQuantity: number
  status: "PENDING" | "APPROVED" | "PREPARING" | "SHIPPED" | "DELIVERED" | "CANCELLED" | "REJECTED"
  priority: "LOW" | "NORMAL" | "HIGH" | "URGENT"
  requestedDate: Date
  createdAt: Date
  createdBy: string
}

const mockOrders: Order[] = [
  {
    id: "1",
    orderNumber: "CMD-2025-001234",
    storeName: "Magasin Lyon Centre",
    storeId: "store-001",
    products: 15,
    totalQuantity: 127,
    status: "PREPARING",
    priority: "HIGH",
    requestedDate: new Date("2025-10-10"),
    createdAt: new Date("2025-10-08T10:30:00"),
    createdBy: "Marie Martin",
  },
  {
    id: "2",
    orderNumber: "CMD-2025-001235",
    storeName: "Magasin Paris Nord",
    storeId: "store-002",
    products: 8,
    totalQuantity: 45,
    status: "PENDING",
    priority: "NORMAL",
    requestedDate: new Date("2025-10-11"),
    createdAt: new Date("2025-10-08T14:15:00"),
    createdBy: "Jean Dupont",
  },
  {
    id: "3",
    orderNumber: "CMD-2025-001236",
    storeName: "Magasin Marseille",
    storeId: "store-003",
    products: 22,
    totalQuantity: 189,
    status: "SHIPPED",
    priority: "URGENT",
    requestedDate: new Date("2025-10-09"),
    createdAt: new Date("2025-10-07T16:45:00"),
    createdBy: "Sophie Laurent",
  },
  {
    id: "4",
    orderNumber: "CMD-2025-001237",
    storeName: "Magasin Toulouse",
    storeId: "store-004",
    products: 12,
    totalQuantity: 78,
    status: "SHIPPED",
    priority: "NORMAL",
    requestedDate: new Date("2025-10-09"),
    createdAt: new Date("2025-10-07T09:20:00"),
    createdBy: "Pierre Dubois",
  },
  {
    id: "5",
    orderNumber: "CMD-2025-001238",
    storeName: "Magasin Bordeaux",
    storeId: "store-005",
    products: 18,
    totalQuantity: 156,
    status: "DELIVERED",
    priority: "NORMAL",
    requestedDate: new Date("2025-10-08"),
    createdAt: new Date("2025-10-06T11:00:00"),
    createdBy: "Thomas Petit",
  },
]

const mockStores = [
  { id: "store-001", name: "Magasin Lyon Centre" },
  { id: "store-002", name: "Magasin Paris Nord" },
  { id: "store-003", name: "Magasin Marseille" },
  { id: "store-004", name: "Magasin Toulouse" },
  { id: "store-005", name: "Magasin Bordeaux" },
]

export default function WarehouseOrdersPage() {
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [stores, setStores] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [storeFilter, setStoreFilter] = useState<string>("all")
  const [priorityFilter, setPriorityFilter] = useState<string>("all")
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [selectedOrders, setSelectedOrders] = useState<string[]>([])
  const itemsPerPage = 20

  useEffect(() => {
    loadOrders()
    setSelectedOrders([]) // Réinitialiser la sélection lors du changement de filtres
  }, [statusFilter, storeFilter, priorityFilter])

  useEffect(() => {
    setSelectedOrders([]) // Réinitialiser la sélection lors du changement de page
  }, [currentPage])

  const loadOrders = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      
      if (statusFilter !== "all") {
        params.append("status", statusFilter)
      }
      
      if (storeFilter !== "all") {
        params.append("storeId", storeFilter)
      }
      
      if (priorityFilter !== "all") {
        params.append("priority", priorityFilter)
      }
      
      params.append("page", "1")
      params.append("limit", "100")

      const response = await fetch(`/api/warehouse-orders?${params}`)
      
      if (!response.ok) {
        throw new Error("Erreur lors du chargement")
      }

      const data = await response.json()
      setOrders(data.orders || [])
      
      // Extraire les magasins uniques pour les filtres
      const uniqueStores = Array.from(
        new Map(data.orders.map((o: any) => [o.store.id, o.store])).values()
      )
      setStores(uniqueStores as any[])
    } catch (error) {
      console.error("Error loading orders:", error)
      toast.error("Erreur lors du chargement des commandes")
    } finally {
      setLoading(false)
    }
  }

  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      order.number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.store?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customerName?.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStore = storeFilter === "all" || order.store.id === storeFilter

    return matchesSearch && matchesStore
  })

  const handleFilterChange = () => {
    setCurrentPage(1)
  }

  const handleResetFilters = () => {
    setStatusFilter("all")
    setStoreFilter("all")
    setPriorityFilter("all")
    setSearchTerm("")
  }

  const handleViewOrder = (orderId: string) => {
    setSelectedOrderId(orderId)
    setDetailsOpen(true)
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedOrders(paginatedOrders.map(order => order.id))
    } else {
      setSelectedOrders([])
    }
  }

  const handleSelectOrder = (orderId: string, checked: boolean) => {
    if (checked) {
      setSelectedOrders([...selectedOrders, orderId])
    } else {
      setSelectedOrders(selectedOrders.filter(id => id !== orderId))
    }
  }

  const handleBulkStatusChange = async (newStatus: string) => {
    if (selectedOrders.length === 0) return
    
    if (!confirm(`Changer le statut de ${selectedOrders.length} commande(s) ?`)) return

    try {
      const promises = selectedOrders.map(orderId =>
        fetch(`/api/warehouse-orders/${orderId}/status`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: newStatus }),
        })
      )

      await Promise.all(promises)
      toast.success(`${selectedOrders.length} commande(s) mise(s) à jour`)
      setSelectedOrders([])
      loadOrders()
    } catch (error) {
      toast.error("Erreur lors de la mise à jour")
    }
  }

  const handleBulkExport = () => {
    const selectedOrdersData = orders.filter(order => selectedOrders.includes(order.id))
    const csv = [
      ["N° Commande", "Magasin", "Statut", "Priorité", "Coût Total", "Date de création"].join(","),
      ...selectedOrdersData.map(order => [
        order.number,
        order.store?.name,
        order.status,
        order.priority,
        order.totalCost || 0,
        new Date(order.createdAt).toLocaleDateString("fr-FR")
      ].join(","))
    ].join("\n")

    const blob = new Blob([csv], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `commandes_${new Date().toISOString().split("T")[0]}.csv`
    a.click()
    toast.success(`${selectedOrders.length} commande(s) exportée(s)`)
  }

  const hasActiveFilters = statusFilter !== "all" || storeFilter !== "all" || priorityFilter !== "all" || searchTerm !== ""

  // Pagination
  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedOrders = filteredOrders.slice(startIndex, endIndex)
  
  const isAllSelected = paginatedOrders.length > 0 && selectedOrders.length === paginatedOrders.length

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
        className: "border-gray-200 text-gray-700 bg-gray-50",
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

  const getStatusBadge = (status: any) => {
    const statusConfig = getStatusConfig(status)
    return (
      <Badge variant="outline" className={cn("text-xs", statusConfig.className)}>
        <statusConfig.icon className="h-3 w-3 mr-1" />
        {statusConfig.label}
      </Badge>
    )
  }

  const getPriorityBadge = (priority: any) => {
    const priorityConfig = getPriorityConfig(priority)
    return (
      <Badge variant="outline" className={cn("text-xs", priorityConfig.className)}>
        {priorityConfig.label}
      </Badge>
    )
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("fr-FR", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    })
  }

  const formatDateTime = (date: Date) => {
    return date.toLocaleString("fr-FR", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const stats = {
    total: orders.length,
    pending: orders.filter((o) => o.status === "PENDING").length,
    preparing: orders.filter((o) => o.status === "PREPARING").length,
    ready: orders.filter((o) => o.status === "SHIPPED").length,
  }

  return (
    <>
      <ModuleNavbar
        title="Commandes magasins"
        description="Suivi des commandes vers l'entrepôt"
        icon={ShoppingCart}
        primaryAction={{
          label: "Nouvelle commande",
          onClick: () => setCreateOpen(true),
          icon: Plus,
        }}
        secondaryActions={
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Exporter
          </Button>
        }
      />

      <div className="py-8">
        <div className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8 space-y-6">
          {/* Stats rapides */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setStatusFilter("all")}>
              <CardContent className="p-4">
                <div className="text-sm text-gray-600 mb-1">Total commandes</div>
                <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
              </CardContent>
            </Card>
            <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setStatusFilter("PENDING")}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-sm text-amber-600 mb-1">
                  <Clock className="h-4 w-4" />
                  En attente
                </div>
                <div className="text-2xl font-bold text-amber-600">{stats.pending}</div>
              </CardContent>
            </Card>
            <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setStatusFilter("PREPARING")}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-sm text-blue-600 mb-1">
                  <Package className="h-4 w-4" />
                  En préparation
                </div>
                <div className="text-2xl font-bold text-blue-600">{stats.preparing}</div>
              </CardContent>
            </Card>
            <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setStatusFilter("SHIPPED")}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-sm text-green-600 mb-1">
                  <CheckCircle2 className="h-4 w-4" />
                  Expédiées
                </div>
                <div className="text-2xl font-bold text-green-600">{stats.ready}</div>
              </CardContent>
            </Card>
          </div>

          {/* Tableau des commandes */}
          <Card className="py-0 gap-0">
            {/* Barre de recherche et filtres */}
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between gap-3 mb-3">
                <div className="relative w-[400px]">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Rechercher une commande..."
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value)
                      handleFilterChange()
                    }}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Select value={statusFilter} onValueChange={(value) => { setStatusFilter(value); handleFilterChange(); }}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Statut" />
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

                  <Select value={storeFilter} onValueChange={(value) => { setStoreFilter(value); handleFilterChange(); }}>
                    <SelectTrigger className="w-[220px]">
                      <SelectValue placeholder="Magasin" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous les magasins</SelectItem>
                      {mockStores.map((store) => (
                        <SelectItem key={store.id} value={store.id}>
                          {store.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={priorityFilter} onValueChange={(value) => { setPriorityFilter(value); handleFilterChange(); }}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Priorité" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Toutes les priorités</SelectItem>
                      <SelectItem value="LOW">Basse</SelectItem>
                      <SelectItem value="NORMAL">Normale</SelectItem>
                      <SelectItem value="HIGH">Haute</SelectItem>
                      <SelectItem value="URGENT">Urgente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {hasActiveFilters && (
                  <Button variant="ghost" size="sm" onClick={handleResetFilters} className="text-gray-500 hover:text-gray-700">
                    Réinitialiser
                  </Button>
                )}
              </div>
            </div>

            {/* Barre d'actions groupées */}
            {selectedOrders.length > 0 && (
              <div className="bg-blue-50 border-y border-blue-200 px-4 py-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-blue-900">
                      {selectedOrders.length} commande(s) sélectionnée(s)
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedOrders([])}
                      className="text-blue-600 hover:text-blue-700 hover:bg-blue-100"
                    >
                      <X className="h-4 w-4 mr-1" />
                      Désélectionner tout
                    </Button>
                  </div>
                  <div className="flex items-center gap-2">
                    <Select onValueChange={handleBulkStatusChange}>
                      <SelectTrigger className="w-[200px] bg-white">
                        <SelectValue placeholder="Changer le statut" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PENDING">En attente</SelectItem>
                        <SelectItem value="APPROVED">Approuvée</SelectItem>
                        <SelectItem value="PREPARING">En préparation</SelectItem>
                        <SelectItem value="SHIPPED">Expédiée</SelectItem>
                        <SelectItem value="DELIVERED">Livrée</SelectItem>
                        <SelectItem value="CANCELLED">Annulée</SelectItem>
                        <SelectItem value="REJECTED">Rejetée</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleBulkExport}
                      className="bg-white"
                    >
                      <FileDown className="h-4 w-4 mr-2" />
                      Exporter
                    </Button>
                  </div>
                </div>
              </div>
            )}

            <CardContent className="p-0 gap-0">
              {loading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" />
                  <p className="text-gray-500 mt-4">Chargement des commandes...</p>
                </div>
              ) : filteredOrders.length === 0 ? (
                <div className="text-center py-12">
                  <ShoppingCart className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-4 text-lg font-semibold text-gray-900">Aucune commande trouvée</h3>
                  <p className="text-gray-500 mt-2">Aucune commande ne correspond à vos critères.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">
                          <Checkbox
                            checked={isAllSelected}
                            onCheckedChange={handleSelectAll}
                          />
                        </TableHead>
                        <TableHead>N° Commande</TableHead>
                        <TableHead>Magasin</TableHead>
                        <TableHead className="text-center">Articles</TableHead>
                        <TableHead className="text-right">Montant</TableHead>
                        <TableHead>Statut</TableHead>
                        <TableHead>Priorité</TableHead>
                        <TableHead>Créée le</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedOrders.map((order) => {
                        const totalItems = order.items?.length || 0
                        const isSelected = selectedOrders.includes(order.id)
                        return (
                          <TableRow 
                            key={order.id} 
                            className={cn(
                              "hover:bg-gray-50",
                              isSelected && "bg-blue-50"
                            )}
                          >
                            <TableCell onClick={(e) => e.stopPropagation()}>
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={(checked) => handleSelectOrder(order.id, checked as boolean)}
                              />
                            </TableCell>
                            <TableCell 
                              className="cursor-pointer"
                              onClick={() => handleViewOrder(order.id)}
                            >
                              <span className="font-mono text-sm font-medium">{order.number}</span>
                            </TableCell>
                            <TableCell className="font-medium">{order.store?.name}</TableCell>
                            <TableCell className="text-center">
                              <div className="flex items-center justify-center gap-1">
                                <Package className="h-4 w-4 text-gray-400" />
                                <span className="text-sm font-medium">{totalItems}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-right font-semibold">
                              {(order.totalCost || 0).toLocaleString("fr-FR")} XAF
                            </TableCell>
                            <TableCell>{getStatusBadge(order.status)}</TableCell>
                            <TableCell>{getPriorityBadge(order.priority)}</TableCell>
                            <TableCell className="text-sm text-gray-600">
                              {formatDateTime(new Date(order.createdAt))}
                            </TableCell>
                            <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => handleViewOrder(order.id)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}

              {/* Pagination */}
              {filteredOrders.length > 0 && (
                <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200">
                  <div className="text-sm text-gray-600">
                    Affichage de <span className="font-medium">{startIndex + 1}</span> à{" "}
                    <span className="font-medium">{Math.min(endIndex, filteredOrders.length)}</span> sur{" "}
                    <span className="font-medium">{filteredOrders.length}</span> commandes
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(currentPage - 1)}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Précédent
                    </Button>

                    <div className="flex items-center gap-1">
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                        if (
                          page === 1 ||
                          page === totalPages ||
                          (page >= currentPage - 1 && page <= currentPage + 1)
                        ) {
                          return (
                            <Button
                              key={page}
                              variant={currentPage === page ? "default" : "outline"}
                              size="sm"
                              onClick={() => setCurrentPage(page)}
                              className="w-9"
                            >
                              {page}
                            </Button>
                          )
                        } else if (page === currentPage - 2 || page === currentPage + 2) {
                          return <span key={page} className="px-2">...</span>
                        }
                        return null
                      })}
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(currentPage + 1)}
                      disabled={currentPage === totalPages}
                    >
                      Suivant
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <OrderDetailsSheet
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        orderId={selectedOrderId}
        onUpdated={loadOrders}
      />

      <OrderFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSuccess={loadOrders}
      />
    </>
  )
}
