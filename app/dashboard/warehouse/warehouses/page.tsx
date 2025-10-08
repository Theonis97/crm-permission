"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ModuleNavbar } from "@/components/navigation/module-navbar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
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
  Warehouse,
  Search,
  Plus,
  MapPin,
  User,
  Package,
  MoreHorizontal,
  Edit,
  Trash2,
  Eye,
  Grid3X3,
  List,
  Building2,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { Warehouse as WarehouseType, WarehouseStatus } from "@/types/warehouse"

// Données mockées
const mockWarehouses: WarehouseType[] = [
  {
    id: "1",
    name: "Entrepôt Principal",
    code: "WH-001",
    address: "125 Avenue des Champs-Élysées",
    city: "Paris",
    postalCode: "75008",
    country: "France",
    gpsLocation: { lat: 48.8566, lng: 2.3522 },
    responsibleUserId: "user-1",
    responsibleUser: {
      id: "user-1",
      firstName: "Jean",
      lastName: "Dupont",
      email: "jean.dupont@example.com",
    },
    capacity: {
      type: "AREA",
      value: 5000,
      unit: "m²",
    },
    currentOccupation: 3500,
    status: "ACTIVE",
    zones: [
      {
        id: "z1",
        name: "Zone Réception",
        code: "REC",
        type: "RECEPTION",
        locations: [],
      },
      {
        id: "z2",
        name: "Zone Stockage A",
        code: "STO-A",
        type: "STORAGE",
        locations: [],
      },
      {
        id: "z3",
        name: "Zone Picking",
        code: "PICK",
        type: "PICKING",
        locations: [],
      },
    ],
    createdAt: new Date("2024-01-15"),
    updatedAt: new Date("2025-09-20"),
  },
  {
    id: "2",
    name: "Entrepôt Lyon",
    code: "WH-002",
    address: "45 Rue de la République",
    city: "Lyon",
    postalCode: "69002",
    country: "France",
    gpsLocation: { lat: 45.7640, lng: 4.8357 },
    responsibleUserId: "user-2",
    responsibleUser: {
      id: "user-2",
      firstName: "Marie",
      lastName: "Martin",
      email: "marie.martin@example.com",
    },
    capacity: {
      type: "AREA",
      value: 3500,
      unit: "m²",
    },
    currentOccupation: 2800,
    status: "ACTIVE",
    zones: [
      {
        id: "z4",
        name: "Zone Réception",
        code: "REC",
        type: "RECEPTION",
        locations: [],
      },
      {
        id: "z5",
        name: "Zone Stockage",
        code: "STO",
        type: "STORAGE",
        locations: [],
      },
    ],
    createdAt: new Date("2024-03-10"),
    updatedAt: new Date("2025-09-18"),
  },
  {
    id: "3",
    name: "Entrepôt Marseille",
    code: "WH-003",
    address: "78 Boulevard Michelet",
    city: "Marseille",
    postalCode: "13008",
    country: "France",
    gpsLocation: { lat: 43.2965, lng: 5.3698 },
    responsibleUserId: "user-3",
    responsibleUser: {
      id: "user-3",
      firstName: "Pierre",
      lastName: "Dubois",
      email: "pierre.dubois@example.com",
    },
    capacity: {
      type: "AREA",
      value: 4200,
      unit: "m²",
    },
    currentOccupation: 2900,
    status: "ACTIVE",
    zones: [
      {
        id: "z6",
        name: "Zone Réception",
        code: "REC",
        type: "RECEPTION",
        locations: [],
      },
      {
        id: "z7",
        name: "Zone Stockage",
        code: "STO",
        type: "STORAGE",
        locations: [],
      },
      {
        id: "z8",
        name: "Zone Expédition",
        code: "EXP",
        type: "SHIPPING",
        locations: [],
      },
    ],
    createdAt: new Date("2024-06-20"),
    updatedAt: new Date("2025-10-01"),
  },
]

export default function WarehousesPage() {
  const router = useRouter()
  const [warehouses] = useState<WarehouseType[]>(mockWarehouses)
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid")
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [loading] = useState(false)

  const filteredWarehouses = warehouses.filter((warehouse) => {
    const matchesSearch =
      warehouse.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      warehouse.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      warehouse.city?.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus = statusFilter === "all" || warehouse.status === statusFilter

    return matchesSearch && matchesStatus
  })

  const getOccupationRate = (warehouse: WarehouseType) => {
    if (!warehouse.currentOccupation) return 0
    return Math.round((warehouse.currentOccupation / warehouse.capacity.value) * 100)
  }

  const getOccupationColor = (rate: number) => {
    if (rate >= 90) return "text-red-600"
    if (rate >= 75) return "text-amber-600"
    return "text-green-600"
  }

  const handleViewWarehouse = (id: string) => {
    router.push(`/dashboard/warehouse/warehouses/${id}`)
  }

  const handleEditWarehouse = (warehouse: WarehouseType) => {
    console.log("Edit warehouse:", warehouse)
    // TODO: Ouvrir le sheet d'édition
  }

  const handleDeleteWarehouse = (warehouse: WarehouseType) => {
    console.log("Delete warehouse:", warehouse)
    // TODO: Ouvrir la dialog de confirmation
  }

  const renderGridView = () => (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {filteredWarehouses.map((warehouse) => {
        const occupationRate = getOccupationRate(warehouse)
        return (
          <Card
            key={warehouse.id}
            className="hover:shadow-lg transition-all cursor-pointer border-gray-200"
            onClick={() => handleViewWarehouse(warehouse.id)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-blue-950 rounded-xl flex items-center justify-center">
                    <Warehouse className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-semibold text-gray-900">{warehouse.name}</CardTitle>
                    <p className="text-sm text-gray-500">{warehouse.code}</p>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation()
                        handleViewWarehouse(warehouse.id)
                      }}
                    >
                      <Eye className="mr-2 h-4 w-4" />
                      Voir les détails
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation()
                        handleEditWarehouse(warehouse)
                      }}
                    >
                      <Edit className="mr-2 h-4 w-4" />
                      Modifier
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteWarehouse(warehouse)
                      }}
                      className="text-red-600"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Supprimer
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-start gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">
                    {warehouse.address}
                    {warehouse.city && `, ${warehouse.city}`}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  <span className="text-gray-700">
                    {warehouse.responsibleUser?.firstName} {warehouse.responsibleUser?.lastName}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Building2 className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  <span className="text-gray-700">{warehouse.zones.length} zones</span>
                </div>
              </div>

              <div className="pt-3 border-t border-gray-200">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-gray-600">Occupation</span>
                  <span className={cn("font-semibold", getOccupationColor(occupationRate))}>
                    {warehouse.currentOccupation?.toLocaleString()} / {warehouse.capacity.value.toLocaleString()}{" "}
                    {warehouse.capacity.unit}
                  </span>
                </div>
                <Progress value={occupationRate} className="h-2" />
                <div className="flex items-center justify-between mt-1">
                  <span className="text-xs text-gray-500">{occupationRate}% utilisé</span>
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-xs",
                      warehouse.status === "ACTIVE"
                        ? "border-green-200 text-green-700 bg-green-50"
                        : "border-gray-200 text-gray-700 bg-gray-50"
                    )}
                  >
                    {warehouse.status === "ACTIVE" ? "Actif" : "Inactif"}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )

  const renderTableView = () => (
    <Card>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="border-b border-gray-200 bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                Entrepôt
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                Localisation
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                Responsable
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                Occupation
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                Zones
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                Statut
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-600 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredWarehouses.map((warehouse) => {
              const occupationRate = getOccupationRate(warehouse)
              return (
                <tr
                  key={warehouse.id}
                  className="hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => handleViewWarehouse(warehouse.id)}
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-950 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Warehouse className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{warehouse.name}</div>
                        <div className="text-sm text-gray-500">{warehouse.code}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">{warehouse.city}</div>
                    <div className="text-xs text-gray-500">{warehouse.postalCode}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">
                      {warehouse.responsibleUser?.firstName} {warehouse.responsibleUser?.lastName}
                    </div>
                    <div className="text-xs text-gray-500">{warehouse.responsibleUser?.email}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="w-32">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-gray-600">{occupationRate}%</span>
                      </div>
                      <Progress value={occupationRate} className="h-2" />
                      <div className="text-xs text-gray-500 mt-1">
                        {warehouse.currentOccupation} / {warehouse.capacity.value} {warehouse.capacity.unit}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <Badge variant="outline" className="text-xs">
                      {warehouse.zones.length} zones
                    </Badge>
                  </td>
                  <td className="px-6 py-4">
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-xs",
                        warehouse.status === "ACTIVE"
                          ? "border-green-200 text-green-700 bg-green-50"
                          : "border-gray-200 text-gray-700 bg-gray-50"
                      )}
                    >
                      {warehouse.status === "ACTIVE" ? "Actif" : "Inactif"}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation()
                            handleViewWarehouse(warehouse.id)
                          }}
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          Voir les détails
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation()
                            handleEditWarehouse(warehouse)
                          }}
                        >
                          <Edit className="mr-2 h-4 w-4" />
                          Modifier
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteWarehouse(warehouse)
                          }}
                          className="text-red-600"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Supprimer
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </Card>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <ModuleNavbar
        title="Entrepôts"
        description="Gestion des sites de stockage"
        icon={Warehouse}
        primaryAction={{
          label: "Nouvel entrepôt",
          onClick: () => console.log("Create warehouse"),
          icon: Plus,
        }}
        secondaryActions={
          <div className="flex items-center gap-2 border rounded-md bg-white">
            <Button
              variant={viewMode === "grid" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("grid")}
              className="rounded-r-none h-9"
            >
              <Grid3X3 className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "table" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("table")}
              className="rounded-l-none h-9"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        }
      />

      <main className="py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-6">
          {/* Stats */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Total entrepôts</CardTitle>
                <Warehouse className="h-4 w-4 text-gray-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">{warehouses.length}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Entrepôts actifs</CardTitle>
                <Package className="h-4 w-4 text-gray-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {warehouses.filter((w) => w.status === "ACTIVE").length}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Capacité totale</CardTitle>
                <Building2 className="h-4 w-4 text-gray-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">
                  {warehouses.reduce((sum, w) => sum + w.capacity.value, 0).toLocaleString()} m²
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Taux d'occupation</CardTitle>
                <Package className="h-4 w-4 text-gray-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {Math.round(
                    (warehouses.reduce((sum, w) => sum + (w.currentOccupation || 0), 0) /
                      warehouses.reduce((sum, w) => sum + w.capacity.value, 0)) *
                      100
                  )}
                  %
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filtres */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Rechercher un entrepôt..."
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
                <SelectItem value="ACTIVE">Actif</SelectItem>
                <SelectItem value="INACTIVE">Inactif</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Liste */}
          {loading ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-12 w-12 rounded-xl" />
                    <Skeleton className="h-6 w-32 mt-3" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-4 w-full mb-2" />
                    <Skeleton className="h-4 w-2/3" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredWarehouses.length === 0 ? (
            <div className="text-center py-12">
              <Warehouse className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-4 text-lg font-semibold text-gray-900">Aucun entrepôt trouvé</h3>
              <p className="text-gray-500 mt-2">
                {searchTerm || statusFilter !== "all"
                  ? "Aucun entrepôt ne correspond à vos critères."
                  : "Commencez par créer votre premier entrepôt."}
              </p>
              {!searchTerm && statusFilter === "all" && (
                <Button onClick={() => console.log("Create")} className="mt-4">
                  <Plus className="mr-2 h-4 w-4" />
                  Créer un entrepôt
                </Button>
              )}
            </div>
          ) : viewMode === "grid" ? (
            renderGridView()
          ) : (
            renderTableView()
          )}
        </div>
      </main>
    </div>
  )
}
