"use client"

import { useState, useMemo, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { StorePageHeader } from "@/components/stores/store-page-header"
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Search,
  Filter,
  MoreHorizontal,
  Eye,
  Edit,
  Truck,
  Clock,
  CheckCircle2,
  XCircle,
  Package,
  User,
  Calendar,
  MapPin,
  Phone,
  RefreshCw,
  Plus,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface OrdersPageProps {
  params: {
    id: string
  }
}

// Données mockées pour les commandes (volume élevé)
const mockOrders = Array.from({ length: 50 }, (_, i) => ({
  id: `CMD-${String(i + 1).padStart(3, '0')}`,
  customer: [
    "Jean Dupont", "Marie Martin", "Paul Bernard", "Sophie Laurent", "Alice Durand",
    "Bob Martin", "Claire Petit", "David Moreau", "Emma Blanc", "François Leroy",
    "Gabrielle Simon", "Henri Dubois", "Isabelle Roux", "Jacques Fournier", "Karine Mercier"
  ][i % 15],
  phone: `+237 6${Math.floor(Math.random() * 90000000 + 10000000)}`,
  address: [
    "Akwa, Douala", "Bonanjo, Douala", "Bonapriso, Douala", "Deido, Douala", 
    "New Bell, Douala", "Bassa, Douala", "Makepe, Douala"
  ][i % 7],
  items: Math.floor(Math.random() * 8) + 1,
  total: Math.floor(Math.random() * 800000) + 50000,
  status: ["pending", "confirmed", "preparing", "ready", "delivering", "delivered", "cancelled"][Math.floor(Math.random() * 7)],
  priority: ["normal", "high", "urgent"][Math.floor(Math.random() * 3)],
  paymentMethod: ["cash", "card", "mobile"][Math.floor(Math.random() * 3)],
  paymentStatus: ["pending", "paid", "failed"][Math.floor(Math.random() * 3)],
  deliveryPerson: i % 3 === 0 ? null : [
    "Ahmed Kone", "Fatou Diallo", "Ibrahim Sow", "Aminata Ba", "Moussa Traore"
  ][i % 5],
  orderDate: new Date(Date.now() - Math.floor(Math.random() * 7 * 24 * 60 * 60 * 1000)).toISOString(),
  estimatedDelivery: new Date(Date.now() + Math.floor(Math.random() * 2 * 24 * 60 * 60 * 1000)).toISOString(),
}))

const deliveryPersons = [
  { id: "1", name: "Ahmed Kone", phone: "+237 677123456", status: "available" },
  { id: "2", name: "Fatou Diallo", phone: "+237 677234567", status: "busy" },
  { id: "3", name: "Ibrahim Sow", phone: "+237 677345678", status: "available" },
  { id: "4", name: "Aminata Ba", phone: "+237 677456789", status: "available" },
  { id: "5", name: "Moussa Traore", phone: "+237 677567890", status: "busy" },
]

const getStatusConfig = (status: string) => {
  const configs = {
    pending: { label: "En attente", color: "bg-gray-100 text-gray-700", dot: "bg-gray-500" },
    confirmed: { label: "Confirmée", color: "bg-blue-100 text-blue-700", dot: "bg-blue-500" },
    preparing: { label: "Préparation", color: "bg-yellow-100 text-yellow-700", dot: "bg-yellow-500" },
    ready: { label: "Prête", color: "bg-purple-100 text-purple-700", dot: "bg-purple-500" },
    delivering: { label: "En livraison", color: "bg-orange-100 text-orange-700", dot: "bg-orange-500" },
    delivered: { label: "Livrée", color: "bg-green-100 text-green-700", dot: "bg-green-500" },
    cancelled: { label: "Annulée", color: "bg-red-100 text-red-700", dot: "bg-red-500" },
  }
  return configs[status as keyof typeof configs] || configs.pending
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

export default function OrdersPage({ params }: OrdersPageProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [priorityFilter, setPriorityFilter] = useState("all")
  const [paymentFilter, setPaymentFilter] = useState("all")
  const [deliveryPersonFilter, setDeliveryPersonFilter] = useState("all")
  const [dateFilter, setDateFilter] = useState("all")
  const [deliverySearchTerm, setDeliverySearchTerm] = useState("")
  const [isDeliveryPopoverOpen, setIsDeliveryPopoverOpen] = useState(false)
  const [selectedOrders, setSelectedOrders] = useState<string[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  // Filtrage des commandes
  const filteredOrders = useMemo(() => {
    return mockOrders.filter(order => {
      const matchesSearch = order.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           order.phone.includes(searchTerm) ||
                           order.address.toLowerCase().includes(searchTerm.toLowerCase())
      
      const matchesStatus = statusFilter === "all" || order.status === statusFilter
      const matchesPriority = priorityFilter === "all" || order.priority === priorityFilter
      const matchesPayment = paymentFilter === "all" || order.paymentStatus === paymentFilter
      const matchesDeliveryPerson = deliveryPersonFilter === "all" || 
        (deliveryPersonFilter === "unassigned" && !order.deliveryPerson) ||
        order.deliveryPerson === deliveryPersonFilter
      
      // Filtre par date
      let matchesDate = true
      if (dateFilter !== "all") {
        const orderDate = new Date(order.orderDate)
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        
        if (dateFilter === "today") {
          matchesDate = orderDate >= today
        } else if (dateFilter === "yesterday") {
          const yesterday = new Date(today)
          yesterday.setDate(yesterday.getDate() - 1)
          matchesDate = orderDate >= yesterday && orderDate < today
        } else if (dateFilter === "week") {
          const weekAgo = new Date(today)
          weekAgo.setDate(weekAgo.getDate() - 7)
          matchesDate = orderDate >= weekAgo
        } else if (dateFilter === "month") {
          const monthAgo = new Date(today)
          monthAgo.setMonth(monthAgo.getMonth() - 1)
          matchesDate = orderDate >= monthAgo
        }
      }
      
      return matchesSearch && matchesStatus && matchesPriority && matchesPayment && matchesDeliveryPerson && matchesDate
    })
  }, [searchTerm, statusFilter, priorityFilter, paymentFilter, deliveryPersonFilter, dateFilter])

  // Pagination
  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedOrders = filteredOrders.slice(startIndex, endIndex)

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, statusFilter, priorityFilter, paymentFilter, deliveryPersonFilter, dateFilter])

  // Filtrer les livreurs pour la recherche
  const filteredDeliveryPersons = useMemo(() => {
    return deliveryPersons.filter(person => 
      person.name.toLowerCase().includes(deliverySearchTerm.toLowerCase())
    )
  }, [deliverySearchTerm])

  const updateOrderStatus = (orderId: string, newStatus: string) => {
    // Ici vous implémenteriez la logique de mise à jour
    console.log(`Updating order ${orderId} to status ${newStatus}`)
  }

  const assignDeliveryPerson = (orderId: string, deliveryPersonId: string) => {
    // Ici vous implémenteriez la logique d'assignation
    console.log(`Assigning delivery person ${deliveryPersonId} to order ${orderId}`)
  }

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

  const bulkUpdateStatus = (newStatus: string) => {
    console.log(`Updating ${selectedOrders.length} orders to status ${newStatus}`)
    // Ici vous implémenteriez la logique de mise à jour en masse
    setSelectedOrders([])
  }

  const bulkAssignDeliveryPerson = (deliveryPersonId: string) => {
    console.log(`Assigning delivery person ${deliveryPersonId} to ${selectedOrders.length} orders`)
    // Ici vous implémenteriez la logique d'assignation en masse
    setSelectedOrders([])
  }

  const stats = {
    total: mockOrders.length,
    pending: mockOrders.filter(o => o.status === "pending").length,
    confirmed: mockOrders.filter(o => o.status === "confirmed").length,
    delivering: mockOrders.filter(o => o.status === "delivering").length,
    delivered: mockOrders.filter(o => o.status === "delivered").length,
  }

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
                    <SelectItem value="pending">En attente</SelectItem>
                    <SelectItem value="confirmed">Confirmée</SelectItem>
                    <SelectItem value="preparing">Préparation</SelectItem>
                    <SelectItem value="ready">Prête</SelectItem>
                    <SelectItem value="delivering">En livraison</SelectItem>
                    <SelectItem value="delivered">Livrée</SelectItem>
                    <SelectItem value="cancelled">Annulée</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Priorité" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes</SelectItem>
                    <SelectItem value="normal">Normale</SelectItem>
                    <SelectItem value="high">Élevée</SelectItem>
                    <SelectItem value="urgent">Urgente</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={paymentFilter} onValueChange={setPaymentFilter}>
                  <SelectTrigger className="w-36">
                    <SelectValue placeholder="Paiement" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous</SelectItem>
                    <SelectItem value="pending">En attente</SelectItem>
                    <SelectItem value="paid">Payé</SelectItem>
                    <SelectItem value="failed">Échoué</SelectItem>
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
                    <SelectItem value="yesterday">Hier</SelectItem>
                    <SelectItem value="week">7 derniers jours</SelectItem>
                    <SelectItem value="month">30 derniers jours</SelectItem>
                  </SelectContent>
                </Select>

                {/* Filtre par Livreur avec Popover */}
                <Popover open={isDeliveryPopoverOpen} onOpenChange={setIsDeliveryPopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="w-44">
                      <User className="h-4 w-4 mr-2" />
                      {deliveryPersonFilter === "all" 
                        ? "Tous les livreurs"
                        : deliveryPersonFilter === "unassigned"
                        ? "Non assignés"
                        : deliveryPersons.find(p => p.name === deliveryPersonFilter)?.name || "Livreur"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64 p-0" align="start">
                    <div className="p-3 border-b">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                        <Input
                          placeholder="Rechercher un livreur..."
                          className="pl-10 h-9"
                          value={deliverySearchTerm}
                          onChange={(e) => setDeliverySearchTerm(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="max-h-64 overflow-y-auto">
                      <button
                        className={cn(
                          "w-full text-left px-4 py-2 hover:bg-gray-100 transition-colors text-sm",
                          deliveryPersonFilter === "all" && "bg-blue-50 text-blue-700 font-medium"
                        )}
                        onClick={() => {
                          setDeliveryPersonFilter("all")
                          setIsDeliveryPopoverOpen(false)
                          setDeliverySearchTerm("")
                        }}
                      >
                        Tous les livreurs
                      </button>
                      <button
                        className={cn(
                          "w-full text-left px-4 py-2 hover:bg-gray-100 transition-colors text-sm",
                          deliveryPersonFilter === "unassigned" && "bg-blue-50 text-blue-700 font-medium"
                        )}
                        onClick={() => {
                          setDeliveryPersonFilter("unassigned")
                          setIsDeliveryPopoverOpen(false)
                          setDeliverySearchTerm("")
                        }}
                      >
                        Non assignés
                      </button>
                      {filteredDeliveryPersons.length > 0 ? (
                        filteredDeliveryPersons.map((person) => (
                          <button
                            key={person.id}
                            className={cn(
                              "w-full text-left px-4 py-2 hover:bg-gray-100 transition-colors",
                              deliveryPersonFilter === person.name && "bg-blue-50 text-blue-700 font-medium"
                            )}
                            onClick={() => {
                              setDeliveryPersonFilter(person.name)
                              setIsDeliveryPopoverOpen(false)
                              setDeliverySearchTerm("")
                            }}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="text-sm font-medium">{person.name}</div>
                                <div className="text-xs text-gray-500">{person.phone}</div>
                              </div>
                              <Badge 
                                variant={person.status === "available" ? "default" : "secondary"}
                                className="text-xs"
                              >
                                {person.status === "available" ? "Disponible" : "Occupé"}
                              </Badge>
                            </div>
                          </button>
                        ))
                      ) : (
                        <div className="px-4 py-6 text-center text-sm text-gray-500">
                          Aucun livreur trouvé
                        </div>
                      )}
                    </div>
                  </PopoverContent>
                </Popover>

                <Button variant="outline" size="sm">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Actualiser
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="py-0">
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
                          {order.id}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-xs font-medium text-blue-600">
                              {order.customer.split(' ').map(n => n[0]).join('')}
                            </div>
                            <div>
                              <div className="font-medium">{order.customer}</div>
                              <div className="text-xs text-gray-500">{order.phone}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="font-semibold">
                          {formatFCFA(order.total)}
                        </TableCell>
                        <TableCell>
                          <Badge className={cn("text-xs", statusConfig.color)}>
                            <div className={cn("w-2 h-2 rounded-full mr-1", statusConfig.dot)} />
                            {statusConfig.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {order.deliveryPerson ? (
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center text-xs font-medium text-green-600">
                                {order.deliveryPerson.split(' ').map(n => n[0]).join('')}
                              </div>
                              <span className="text-sm">{order.deliveryPerson}</span>
                            </div>
                          ) : (
                            <span className="text-sm text-gray-400">Non assigné</span>
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
                              <DropdownMenuItem>
                                <Eye className="h-4 w-4 mr-2" />
                                Voir détails
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Edit className="h-4 w-4 mr-2" />
                                Modifier
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuLabel>Changer le statut</DropdownMenuLabel>
                              <DropdownMenuItem onClick={() => updateOrderStatus(order.id, "confirmed")}>
                                Confirmer
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => updateOrderStatus(order.id, "preparing")}>
                                En préparation
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => updateOrderStatus(order.id, "ready")}>
                                Prête
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => updateOrderStatus(order.id, "delivering")}>
                                En livraison
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => updateOrderStatus(order.id, "delivered")}>
                                Livrée
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuLabel>Assigner livreur</DropdownMenuLabel>
                              {deliveryPersons.filter(dp => dp.status === "available").map(dp => (
                                <DropdownMenuItem 
                                  key={dp.id}
                                  onClick={() => assignDeliveryPerson(order.id, dp.id)}
                                >
                                  <User className="h-4 w-4 mr-2" />
                                  {dp.name}
                                </DropdownMenuItem>
                              ))}
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
                    <DropdownMenuItem onClick={() => bulkUpdateStatus("confirmed")}>
                      <CheckCircle2 className="h-4 w-4 mr-2 text-blue-500" />
                      Confirmer
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => bulkUpdateStatus("preparing")}>
                      <Clock className="h-4 w-4 mr-2 text-yellow-500" />
                      En préparation
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => bulkUpdateStatus("ready")}>
                      <Package className="h-4 w-4 mr-2 text-purple-500" />
                      Prête
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => bulkUpdateStatus("delivering")}>
                      <Truck className="h-4 w-4 mr-2 text-orange-500" />
                      En livraison
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => bulkUpdateStatus("delivered")}>
                      <CheckCircle2 className="h-4 w-4 mr-2 text-green-500" />
                      Livrée
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => bulkUpdateStatus("cancelled")} className="text-red-600">
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
                        onClick={() => bulkAssignDeliveryPerson(dp.id)}
                        disabled={dp.status !== "available"}
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
    </>
  )
}
