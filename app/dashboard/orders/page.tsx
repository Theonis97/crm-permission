"use client"

import { useState, useEffect } from "react"
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
  Eye,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { CreateOrderDialog } from "@/components/orders/create-order-dialog"
import { usePermissions } from "@/hooks/use-permissions"

export default function OrdersPage() {
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const { hasPermission } = usePermissions()

  useEffect(() => {
    loadOrders()
  }, [statusFilter])

  const loadOrders = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      
      if (statusFilter !== "all") {
        params.append("status", statusFilter)
      }

      const response = await fetch(`/api/orders?${params}`)
      
      if (!response.ok) {
        throw new Error("Erreur lors du chargement")
      }

      const data = await response.json()
      setOrders(data)
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

    return matchesSearch
  })

  const getStatusBadge = (status: string) => {
    const config: Record<string, any> = {
      PENDING: {
        icon: Clock,
        className: "border-amber-200 text-amber-700 bg-amber-50",
        label: "En attente",
      },
      CONFIRMED: {
        icon: CheckCircle2,
        className: "border-blue-200 text-blue-700 bg-blue-50",
        label: "Confirmée",
      },
      PREPARING: {
        icon: Package,
        className: "border-purple-200 text-purple-700 bg-purple-50",
        label: "En préparation",
      },
      READY: {
        icon: CheckCircle2,
        className: "border-green-200 text-green-700 bg-green-50",
        label: "Prête",
      },
      DELIVERING: {
        icon: Package,
        className: "border-cyan-200 text-cyan-700 bg-cyan-50",
        label: "En livraison",
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
    }

    const statusConfig = config[status] || config.PENDING
    return (
      <Badge variant="outline" className={cn("text-xs", statusConfig.className)}>
        <statusConfig.icon className="h-3 w-3 mr-1" />
        {statusConfig.label}
      </Badge>
    )
  }

  const getPriorityBadge = (priority: string) => {
    const config: Record<string, any> = {
      NORMAL: { className: "border-gray-200 text-gray-700 bg-gray-50", label: "Normale" },
      HIGH: { className: "border-orange-200 text-orange-700 bg-orange-50", label: "Haute" },
      URGENT: { className: "border-red-200 text-red-700 bg-red-50", label: "Urgente" },
    }

    const priorityConfig = config[priority] || config.NORMAL
    return (
      <Badge variant="outline" className={cn("text-xs", priorityConfig.className)}>
        {priorityConfig.label}
      </Badge>
    )
  }

  const formatDateTime = (date: string) => {
    return new Date(date).toLocaleString("fr-FR", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  return (
    <>
      <ModuleNavbar
        title="Mes commandes"
        description="Gestion des commandes d'approvisionnement"
        icon={ShoppingCart}
        primaryAction={
          hasPermission("orders.create")
            ? {
                label: "Nouvelle commande",
                onClick: () => setCreateDialogOpen(true),
                icon: Plus,
              }
            : undefined
        }
      />

      <div className="py-8">
        <div className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8">
          <Card className="py-0 gap-0">
            {/* Barre de recherche et filtres */}
            <div className="p-4 border-b flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="relative w-[400px]">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Rechercher une commande..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>

                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Statut" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les statuts</SelectItem>
                    <SelectItem value="PENDING">En attente</SelectItem>
                    <SelectItem value="CONFIRMED">Confirmées</SelectItem>
                    <SelectItem value="PREPARING">En préparation</SelectItem>
                    <SelectItem value="READY">Prêtes</SelectItem>
                    <SelectItem value="DELIVERING">En livraison</SelectItem>
                    <SelectItem value="DELIVERED">Livrées</SelectItem>
                    <SelectItem value="CANCELLED">Annulées</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

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
                  <p className="text-gray-500 mt-2">Créez votre première commande d'approvisionnement</p>
                  {hasPermission("orders.create") && (
                    <Button onClick={() => setCreateDialogOpen(true)} className="mt-4">
                      <Plus className="h-4 w-4 mr-2" />
                      Nouvelle commande
                    </Button>
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
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
                      {filteredOrders.map((order) => {
                        const totalItems = order.items?.length || 0
                        return (
                          <TableRow key={order.id} className="hover:bg-gray-50">
                            <TableCell>
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
                              {order.total?.toLocaleString("fr-FR")} XAF
                            </TableCell>
                            <TableCell>{getStatusBadge(order.status)}</TableCell>
                            <TableCell>{getPriorityBadge(order.priority)}</TableCell>
                            <TableCell className="text-sm text-gray-600">
                              {formatDateTime(order.createdAt)}
                            </TableCell>
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
            </CardContent>
          </Card>
        </div>
      </div>

      <CreateOrderDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={loadOrders}
      />
    </>
  )
}
