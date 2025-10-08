"use client"

import { useState } from "react"
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
} from "lucide-react"
import { cn } from "@/lib/utils"

interface Order {
  id: string
  orderNumber: string
  storeName: string
  storeId: string
  products: number
  totalQuantity: number
  status: "PENDING" | "PREPARING" | "READY" | "SHIPPED" | "DELIVERED" | "CANCELLED"
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
    status: "READY",
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

export default function OrdersPage() {
  const [orders] = useState<Order[]>(mockOrders)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [storeFilter, setStoreFilter] = useState<string>("all")
  const [priorityFilter, setPriorityFilter] = useState<string>("all")
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.storeName.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus = statusFilter === "all" || order.status === statusFilter
    const matchesStore = storeFilter === "all" || order.storeId === storeFilter
    const matchesPriority = priorityFilter === "all" || order.priority === priorityFilter

    return matchesSearch && matchesStatus && matchesStore && matchesPriority
  })

  const handleFilterChange = () => {
    setCurrentPage(1)
  }

  const handleResetFilters = () => {
    setStatusFilter("all")
    setStoreFilter("all")
    setPriorityFilter("all")
  }

  const hasActiveFilters = statusFilter !== "all" || storeFilter !== "all" || priorityFilter !== "all"

  // Pagination
  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedOrders = filteredOrders.slice(startIndex, endIndex)

  const getStatusConfig = (status: Order["status"]) => {
    const config = {
      PENDING: {
        icon: Clock,
        className: "border-amber-200 text-amber-700 bg-amber-50",
        label: "En attente",
      },
      PREPARING: {
        icon: Package,
        className: "border-blue-200 text-blue-700 bg-blue-50",
        label: "En préparation",
      },
      READY: {
        icon: CheckCircle2,
        className: "border-green-200 text-green-700 bg-green-50",
        label: "Prête",
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
    }
    return config[status]
  }

  const getPriorityConfig = (priority: Order["priority"]) => {
    const config = {
      LOW: { className: "border-gray-200 text-gray-700 bg-gray-50", label: "Basse" },
      NORMAL: { className: "border-blue-200 text-blue-700 bg-blue-50", label: "Normale" },
      HIGH: { className: "border-orange-200 text-orange-700 bg-orange-50", label: "Haute" },
      URGENT: { className: "border-red-200 text-red-700 bg-red-50", label: "Urgente" },
    }
    return config[priority]
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })
  }

  const stats = {
    total: orders.length,
    pending: orders.filter((o) => o.status === "PENDING").length,
    preparing: orders.filter((o) => o.status === "PREPARING").length,
    ready: orders.filter((o) => o.status === "READY").length,
  }

  return (
    <>
      <ModuleNavbar
        title="Commandes magasins"
        description="Suivi des commandes vers l'entrepôt"
        icon={ShoppingCart}
        primaryAction={{
          label: "Nouvelle commande",
          onClick: () => console.log("Create order"),
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
            <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setStatusFilter("READY")}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-sm text-green-600 mb-1">
                  <CheckCircle2 className="h-4 w-4" />
                  Prêtes
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
                      <SelectItem value="PREPARING">En préparation</SelectItem>
                      <SelectItem value="READY">Prêtes</SelectItem>
                      <SelectItem value="SHIPPED">Expédiées</SelectItem>
                      <SelectItem value="DELIVERED">Livrées</SelectItem>
                      <SelectItem value="CANCELLED">Annulées</SelectItem>
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

            <CardContent className="p-0 gap-0">
              {filteredOrders.length === 0 ? (
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
                        <TableHead>N° Commande</TableHead>
                        <TableHead>Magasin</TableHead>
                        <TableHead className="text-center">Produits</TableHead>
                        <TableHead className="text-center">Quantité</TableHead>
                        <TableHead>Statut</TableHead>
                        <TableHead>Priorité</TableHead>
                        <TableHead>Date demandée</TableHead>
                        <TableHead>Créée par</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedOrders.map((order) => {
                        const statusConfig = getStatusConfig(order.status)
                        const priorityConfig = getPriorityConfig(order.priority)
                        const StatusIcon = statusConfig.icon

                        return (
                          <TableRow key={order.id} className="hover:bg-gray-50">
                            <TableCell className="font-medium">{order.orderNumber}</TableCell>
                            <TableCell>{order.storeName}</TableCell>
                            <TableCell className="text-center">{order.products}</TableCell>
                            <TableCell className="text-center font-semibold">{order.totalQuantity}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className={cn("text-xs", statusConfig.className)}>
                                <StatusIcon className="h-3 w-3 mr-1" />
                                {statusConfig.label}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className={cn("text-xs", priorityConfig.className)}>
                                {priorityConfig.label}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm text-gray-600">
                              {formatDate(order.requestedDate)}
                            </TableCell>
                            <TableCell className="text-sm text-gray-600">{order.createdBy}</TableCell>
                            <TableCell className="text-right">
                              <Button variant="ghost" size="sm">
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
    </>
  )
}
