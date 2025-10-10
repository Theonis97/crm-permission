"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ModuleNavbar } from "@/components/navigation/module-navbar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  FileText,
  Search,
  Plus,
  MoreHorizontal,
  Edit,
  Trash2,
  Eye,
  Clock,
  CheckCircle2,
  Play,
  XCircle,
  Calendar,
  User,
  Warehouse,
  Package,
  AlertTriangle,
  TrendingUp,
  Download,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { Inventory, InventoryType, InventoryStatus } from "@/types/warehouse"

// Données mockées
const mockInventories: Inventory[] = [
  {
    id: "1",
    reference: "INV-2025-001",
    type: "FULL",
    status: "VALIDATED",
    warehouseId: "1",
    warehouse: { id: "1", name: "Entrepôt Principal", code: "WH-001" },
    scheduledDate: new Date("2025-10-01"),
    startedAt: new Date("2025-10-01T08:00:00"),
    completedAt: new Date("2025-10-01T17:30:00"),
    validatedAt: new Date("2025-10-01T18:00:00"),
    responsibleUserId: "user-1",
    responsibleUser: {
      id: "user-1",
      firstName: "Jean",
      lastName: "Dupont",
      email: "jean.dupont@example.com",
    },
    validatedByUserId: "user-2",
    validatedBy: {
      id: "user-2",
      firstName: "Marie",
      lastName: "Martin",
    },
    items: [],
    totalItems: 456,
    countedItems: 456,
    itemsWithDifference: 12,
    totalDifferenceValue: -2350,
    notes: "Inventaire annuel complet",
    createdAt: new Date("2025-09-25"),
    updatedAt: new Date("2025-10-01T18:00:00"),
  },
  {
    id: "2",
    reference: "INV-2025-002",
    type: "CYCLE",
    status: "IN_PROGRESS",
    warehouseId: "2",
    warehouse: { id: "2", name: "Entrepôt Lyon", code: "WH-002" },
    zoneId: "z5",
    zone: { id: "z5", name: "Zone Stockage", code: "STO" },
    scheduledDate: new Date("2025-10-08"),
    startedAt: new Date("2025-10-08T09:00:00"),
    responsibleUserId: "user-3",
    responsibleUser: {
      id: "user-3",
      firstName: "Pierre",
      lastName: "Dubois",
      email: "pierre.dubois@example.com",
    },
    items: [],
    totalItems: 145,
    countedItems: 89,
    itemsWithDifference: 3,
    notes: "Inventaire tournant Zone Stockage",
    createdAt: new Date("2025-10-05"),
    updatedAt: new Date("2025-10-08T11:30:00"),
  },
  {
    id: "3",
    reference: "INV-2025-003",
    type: "CYCLE",
    status: "PLANNED",
    warehouseId: "3",
    warehouse: { id: "3", name: "Entrepôt Marseille", code: "WH-003" },
    zoneId: "z7",
    zone: { id: "z7", name: "Zone Stockage", code: "STO" },
    scheduledDate: new Date("2025-10-12"),
    responsibleUserId: "user-4",
    responsibleUser: {
      id: "user-4",
      firstName: "Sophie",
      lastName: "Laurent",
      email: "sophie.laurent@example.com",
    },
    items: [],
    totalItems: 198,
    countedItems: 0,
    notes: "Inventaire tournant mensuel",
    createdAt: new Date("2025-10-03"),
    updatedAt: new Date("2025-10-03"),
  },
  {
    id: "4",
    reference: "INV-2025-004",
    type: "SPOT",
    status: "COMPLETED",
    warehouseId: "1",
    warehouse: { id: "1", name: "Entrepôt Principal", code: "WH-001" },
    scheduledDate: new Date("2025-10-07"),
    startedAt: new Date("2025-10-07T10:00:00"),
    completedAt: new Date("2025-10-07T11:30:00"),
    responsibleUserId: "user-1",
    responsibleUser: {
      id: "user-1",
      firstName: "Jean",
      lastName: "Dupont",
      email: "jean.dupont@example.com",
    },
    items: [],
    totalItems: 23,
    countedItems: 23,
    itemsWithDifference: 2,
    totalDifferenceValue: -150,
    notes: "Contrôle suite à alerte rupture",
    createdAt: new Date("2025-10-07"),
    updatedAt: new Date("2025-10-07T11:30:00"),
  },
  {
    id: "5",
    reference: "INV-2025-005",
    type: "FULL",
    status: "PLANNED",
    warehouseId: "2",
    warehouse: { id: "2", name: "Entrepôt Lyon", code: "WH-002" },
    scheduledDate: new Date("2025-10-15"),
    responsibleUserId: "user-3",
    responsibleUser: {
      id: "user-3",
      firstName: "Pierre",
      lastName: "Dubois",
      email: "pierre.dubois@example.com",
    },
    items: [],
    totalItems: 342,
    countedItems: 0,
    notes: "Inventaire trimestriel",
    createdAt: new Date("2025-10-02"),
    updatedAt: new Date("2025-10-02"),
  },
  {
    id: "6",
    reference: "INV-2025-006",
    type: "CYCLE",
    status: "VALIDATED",
    warehouseId: "1",
    warehouse: { id: "1", name: "Entrepôt Principal", code: "WH-001" },
    zoneId: "z3",
    zone: { id: "z3", name: "Zone Picking", code: "PICK" },
    scheduledDate: new Date("2025-09-28"),
    startedAt: new Date("2025-09-28T08:30:00"),
    completedAt: new Date("2025-09-28T12:00:00"),
    validatedAt: new Date("2025-09-28T14:00:00"),
    responsibleUserId: "user-2",
    responsibleUser: {
      id: "user-2",
      firstName: "Marie",
      lastName: "Martin",
      email: "marie.martin@example.com",
    },
    validatedByUserId: "user-1",
    validatedBy: {
      id: "user-1",
      firstName: "Jean",
      lastName: "Dupont",
    },
    items: [],
    totalItems: 87,
    countedItems: 87,
    itemsWithDifference: 5,
    totalDifferenceValue: 420,
    createdAt: new Date("2025-09-25"),
    updatedAt: new Date("2025-09-28T14:00:00"),
  },
]

export default function InventoriesPage() {
  const router = useRouter()
  const [inventories] = useState<Inventory[]>(mockInventories)
  const [searchTerm, setSearchTerm] = useState("")
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [warehouseFilter, setWarehouseFilter] = useState<string>("all")

  const filteredInventories = inventories.filter((inventory) => {
    const matchesSearch =
      inventory.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inventory.warehouse?.name.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesType = typeFilter === "all" || inventory.type === typeFilter
    const matchesStatus = statusFilter === "all" || inventory.status === statusFilter
    const matchesWarehouse = warehouseFilter === "all" || inventory.warehouseId === warehouseFilter

    return matchesSearch && matchesType && matchesStatus && matchesWarehouse
  })

  const getTypeLabel = (type: InventoryType) => {
    const labels = {
      FULL: "Complet",
      CYCLE: "Tournant",
      SPOT: "Ponctuel",
    }
    return labels[type]
  }

  const getTypeBadge = (type: InventoryType) => {
    const config = {
      FULL: "border-purple-200 text-purple-700 bg-purple-50",
      CYCLE: "border-blue-200 text-blue-700 bg-blue-50",
      SPOT: "border-amber-200 text-amber-700 bg-amber-50",
    }
    return (
      <Badge variant="outline" className={cn("text-xs", config[type])}>
        {getTypeLabel(type)}
      </Badge>
    )
  }

  const getStatusBadge = (status: InventoryStatus) => {
    const config = {
      PLANNED: {
        icon: Calendar,
        className: "border-gray-200 text-gray-700 bg-gray-50",
        label: "Planifié",
      },
      IN_PROGRESS: {
        icon: Play,
        className: "border-blue-200 text-blue-700 bg-blue-50",
        label: "En cours",
      },
      COMPLETED: {
        icon: Clock,
        className: "border-amber-200 text-amber-700 bg-amber-50",
        label: "Terminé",
      },
      VALIDATED: {
        icon: CheckCircle2,
        className: "border-green-200 text-green-700 bg-green-50",
        label: "Validé",
      },
      CANCELLED: {
        icon: XCircle,
        className: "border-red-200 text-red-700 bg-red-50",
        label: "Annulé",
      },
    }
    const { icon: Icon, className, label } = config[status]
    return (
      <Badge variant="outline" className={cn("text-xs", className)}>
        <Icon className="h-3 w-3 mr-1" />
        {label}
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

  const getProgressPercentage = (inventory: Inventory) => {
    if (!inventory.totalItems || !inventory.countedItems) return 0
    return Math.round((inventory.countedItems / inventory.totalItems) * 100)
  }

  const getAccuracyColor = (value: number) => {
    if (value >= 0) return "text-green-600"
    return "text-red-600"
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <ModuleNavbar
        title="Inventaires"
        description="Comptage et ajustements de stock"
        icon={FileText}
        primaryAction={{
          label: "Nouvel inventaire",
          onClick: () => console.log("Create inventory"),
          icon: Plus,
        }}
        secondaryActions={
          <Button variant="outline" size="sm" className="h-9">
            <Download className="h-4 w-4 mr-2" />
            Exporter
          </Button>
        }
      />

      <main className="py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-6">
          {/* Stats */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Total inventaires</CardTitle>
                <FileText className="h-4 w-4 text-gray-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">{inventories.length}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Planifiés</CardTitle>
                <Calendar className="h-4 w-4 text-gray-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-600">
                  {inventories.filter((i) => i.status === "PLANNED").length}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">En cours</CardTitle>
                <Play className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {inventories.filter((i) => i.status === "IN_PROGRESS").length}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Validés</CardTitle>
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {inventories.filter((i) => i.status === "VALIDATED").length}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filtres */}
          <div className="grid gap-4 md:grid-cols-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Rechercher un inventaire..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les types</SelectItem>
                <SelectItem value="FULL">Complet</SelectItem>
                <SelectItem value="CYCLE">Tournant</SelectItem>
                <SelectItem value="SPOT">Ponctuel</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="PLANNED">Planifiés</SelectItem>
                <SelectItem value="IN_PROGRESS">En cours</SelectItem>
                <SelectItem value="COMPLETED">Terminés</SelectItem>
                <SelectItem value="VALIDATED">Validés</SelectItem>
              </SelectContent>
            </Select>
            <Select value={warehouseFilter} onValueChange={setWarehouseFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Entrepôt" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les entrepôts</SelectItem>
                <SelectItem value="1">Entrepôt Principal</SelectItem>
                <SelectItem value="2">Entrepôt Lyon</SelectItem>
                <SelectItem value="3">Entrepôt Marseille</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Liste des inventaires */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredInventories.length === 0 ? (
              <div className="col-span-full text-center py-12">
                <FileText className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-4 text-lg font-semibold text-gray-900">Aucun inventaire trouvé</h3>
                <p className="text-gray-500 mt-2">Aucun inventaire ne correspond à vos critères.</p>
              </div>
            ) : (
              filteredInventories.map((inventory) => {
                const progressPercentage = getProgressPercentage(inventory)
                return (
                  <Card
                    key={inventory.id}
                    className="hover:shadow-lg transition-all cursor-pointer border-gray-200"
                    onClick={() => router.push(`/dashboard/warehouse/inventories/${inventory.id}`)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center border border-gray-200">
                            <FileText className="h-6 w-6 text-gray-600" />
                          </div>
                          <div>
                            <CardTitle className="text-base font-semibold text-gray-900">
                              {inventory.reference}
                            </CardTitle>
                            <p className="text-sm text-gray-500">{formatDate(inventory.scheduledDate)}</p>
                          </div>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={(e) => e.stopPropagation()}>
                              <Eye className="mr-2 h-4 w-4" />
                              Voir les détails
                            </DropdownMenuItem>
                            {inventory.status === "PLANNED" && (
                              <>
                                <DropdownMenuItem onClick={(e) => e.stopPropagation()}>
                                  <Edit className="mr-2 h-4 w-4" />
                                  Modifier
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={(e) => e.stopPropagation()}>
                                  <Play className="mr-2 h-4 w-4" />
                                  Démarrer
                                </DropdownMenuItem>
                              </>
                            )}
                            <DropdownMenuItem onClick={(e) => e.stopPropagation()} className="text-red-600">
                              <Trash2 className="mr-2 h-4 w-4" />
                              Supprimer
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Badges */}
                      <div className="flex flex-wrap gap-2">
                        {getTypeBadge(inventory.type)}
                        {getStatusBadge(inventory.status)}
                      </div>

                      {/* Entrepôt et zone */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm text-gray-700">
                          <Warehouse className="h-4 w-4 text-gray-400" />
                          <span>{inventory.warehouse?.name}</span>
                        </div>
                        {inventory.zone && (
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Package className="h-4 w-4 text-gray-400" />
                            <span>{inventory.zone.name}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <User className="h-4 w-4 text-gray-400" />
                          <span>
                            {inventory.responsibleUser?.firstName} {inventory.responsibleUser?.lastName}
                          </span>
                        </div>
                      </div>

                      {/* Progression */}
                      {inventory.status !== "PLANNED" && inventory.totalItems && inventory.totalItems > 0 && (
                        <div className="pt-3 border-t border-gray-200">
                          <div className="flex items-center justify-between text-sm mb-2">
                            <span className="text-gray-600">Progression</span>
                            <span className="font-semibold text-gray-900">
                              {inventory.countedItems} / {inventory.totalItems}
                            </span>
                          </div>
                          <Progress value={progressPercentage} className="h-2" />
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-xs text-gray-500">{progressPercentage}% complété</span>
                            {inventory.itemsWithDifference! > 0 && (
                              <Badge variant="outline" className="text-xs border-amber-200 text-amber-700">
                                <AlertTriangle className="h-3 w-3 mr-1" />
                                {inventory.itemsWithDifference} écarts
                              </Badge>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Écarts financiers */}
                      {inventory.status === "VALIDATED" && inventory.totalDifferenceValue !== undefined && (
                        <div className="pt-3 border-t border-gray-200">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">Écart total</span>
                            <span className={cn("font-bold", getAccuracyColor(inventory.totalDifferenceValue))}>
                              {inventory.totalDifferenceValue >= 0 ? "+" : ""}
                              {inventory.totalDifferenceValue.toLocaleString()} €
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Notes */}
                      {inventory.notes && (
                        <p className="text-xs text-gray-500 italic pt-2 border-t border-gray-200">
                          {inventory.notes}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                )
              })
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
