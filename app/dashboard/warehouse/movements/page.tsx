"use client"

import { useState } from "react"
import { useSearchParams } from "next/navigation"
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  History,
  Search,
  ArrowDownRight,
  ArrowUpRight,
  ArrowRightLeft,
  Edit2,
  Clock,
  CheckCircle2,
  XCircle,
  User,
  Calendar,
  Download,
  Plus,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { CreateMovementSheet } from "@/components/warehouse/create-movement-sheet"

const mockMovements = [
  {
    id: "1",
    type: "IN" as const,
    subtype: "PURCHASE",
    subtypeLabel: "Achat fournisseur",
    productName: "Laptop Dell XPS 15",
    sku: "LAP-DELL-001",
    quantity: 25,
    location: "Entrepôt principal",
    user: "Jean Dupont",
    userId: "user-1",
    reason: "Réapprovisionnement fournisseur",
    documentNumber: "BR-2025-001234",
    status: "VALIDATED" as const,
    createdAt: new Date("2025-10-08T14:30:00"),
  },
  {
    id: "2",
    type: "OUT" as const,
    subtype: "SALE",
    subtypeLabel: "Vente",
    productName: "Souris Logitech MX Master 3",
    sku: "MOU-LOG-003",
    quantity: 15,
    location: "Entrepôt principal",
    user: "Marie Martin",
    userId: "user-2",
    reason: "Vente magasin Lyon",
    documentNumber: "BS-2025-000987",
    status: "VALIDATED" as const,
    createdAt: new Date("2025-10-08T13:15:00"),
  },
  {
    id: "3",
    type: "TRANSFER" as const,
    subtype: "TRANSFER",
    subtypeLabel: "Transfert interne",
    productName: "Écran Samsung 27\" 4K",
    sku: "ECR-SAM-002",
    quantity: 10,
    location: "Entrepôt principal",
    user: "Pierre Dubois",
    userId: "user-3",
    reason: "Préparation commande",
    documentNumber: "BT-2025-000345",
    status: "PENDING" as const,
    createdAt: new Date("2025-10-08T11:00:00"),
  },
  {
    id: "4",
    type: "IN" as const,
    subtype: "RETURN_CLIENT",
    subtypeLabel: "Retour client",
    productName: "Clavier mécanique RGB",
    sku: "CLV-MEC-005",
    quantity: 3,
    location: "Entrepôt principal",
    user: "Sophie Laurent",
    userId: "user-4",
    reason: "Retour client - Produit non conforme",
    documentNumber: "BR-RET-2025-156",
    status: "VALIDATED" as const,
    createdAt: new Date("2025-10-08T09:45:00"),
  },
  {
    id: "5",
    type: "ADJUSTMENT" as const,
    subtype: "ADJUSTMENT_NEGATIVE",
    subtypeLabel: "Ajustement négatif",
    productName: "Cable HDMI 2m",
    sku: "CAB-HDM-001",
    quantity: 5,
    location: "Entrepôt principal",
    user: "Thomas Petit",
    userId: "user-5",
    reason: "Ajustement inventaire - Produits endommagés",
    status: "VALIDATED" as const,
    createdAt: new Date("2025-10-08T08:30:00"),
  },
  {
    id: "6",
    type: "OUT" as const,
    subtype: "LOSS",
    subtypeLabel: "Perte/Casse",
    productName: "Souris sans fil",
    sku: "MOU-WIR-002",
    quantity: 8,
    location: "Entrepôt principal",
    user: "Jean Dupont",
    userId: "user-1",
    reason: "Produits endommagés lors du transport",
    documentNumber: "BS-LOSS-2025-012",
    status: "VALIDATED" as const,
    createdAt: new Date("2025-10-07T16:20:00"),
  },
]

const mockUsers = [
  { id: "user-1", name: "Jean Dupont" },
  { id: "user-2", name: "Marie Martin" },
  { id: "user-3", name: "Pierre Dubois" },
  { id: "user-4", name: "Sophie Laurent" },
  { id: "user-5", name: "Thomas Petit" },
]

const mockProducts = [
  { sku: "LAP-DELL-001", name: "Laptop Dell XPS 15" },
  { sku: "MOU-LOG-003", name: "Souris Logitech MX Master 3" },
  { sku: "ECR-SAM-002", name: "Écran Samsung 27\" 4K" },
  { sku: "CLV-MEC-005", name: "Clavier mécanique RGB" },
  { sku: "CAB-HDM-001", name: "Cable HDMI 2m" },
  { sku: "MOU-WIR-002", name: "Souris sans fil" },
]

export default function MovementsPage() {
  const searchParams = useSearchParams()
  const typeParam = searchParams.get("type")

  const [movements] = useState(mockMovements)
  const [searchTerm, setSearchTerm] = useState("")
  const [typeFilter, setTypeFilter] = useState<string>(typeParam || "all")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [userFilter, setUserFilter] = useState<string>("all")
  const [productFilter, setProductFilter] = useState<string>("all")
  const [createSheetOpen, setCreateSheetOpen] = useState(false)
  const [createType, setCreateType] = useState<"IN" | "OUT" | "TRANSFER" | "ADJUSTMENT">("IN")
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  const filteredMovements = movements.filter((movement) => {
    const matchesSearch =
      movement.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      movement.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      movement.documentNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      movement.reason.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesType = typeFilter === "all" || movement.type === typeFilter
    const matchesStatus = statusFilter === "all" || movement.status === statusFilter
    const matchesUser = userFilter === "all" || movement.userId === userFilter
    const matchesProduct = productFilter === "all" || movement.sku === productFilter

    return matchesSearch && matchesType && matchesStatus && matchesUser && matchesProduct
  })

  const getMovementIcon = (type: string) => {
    switch (type) {
      case "IN":
        return ArrowDownRight
      case "OUT":
        return ArrowUpRight
      case "TRANSFER":
        return ArrowRightLeft
      default:
        return Edit2
    }
  }

  const getMovementColor = (type: string) => {
    switch (type) {
      case "IN":
        return "text-green-600 bg-green-50 border-green-200"
      case "OUT":
        return "text-red-600 bg-red-50 border-red-200"
      case "TRANSFER":
        return "text-blue-600 bg-blue-50 border-blue-200"
      default:
        return "text-amber-600 bg-amber-50 border-amber-200"
    }
  }

  const getStatusBadge = (status: string) => {
    const config = {
      PENDING: {
        icon: Clock,
        className: "border-amber-200 text-amber-700 bg-amber-50",
        label: "En attente",
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
    const { icon: Icon, className, label } = config[status as keyof typeof config]
    return (
      <Badge variant="outline" className={cn("text-xs", className)}>
        <Icon className="h-3 w-3 mr-1" />
        {label}
      </Badge>
    )
  }

  const formatDateTime = (date: Date) => {
    return date.toLocaleString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const handleCreateMovement = (type: "IN" | "OUT" | "TRANSFER" | "ADJUSTMENT") => {
    setCreateType(type)
    setCreateSheetOpen(true)
  }

  const handleResetFilters = () => {
    setTypeFilter("all")
    setStatusFilter("all")
    setUserFilter("all")
    setProductFilter("all")
  }

  const hasActiveFilters = typeFilter !== "all" || statusFilter !== "all" || userFilter !== "all" || productFilter !== "all"

  // Pagination
  const totalPages = Math.ceil(filteredMovements.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedMovements = filteredMovements.slice(startIndex, endIndex)

  // Réinitialiser la page si on change les filtres
  const handleFilterChange = () => {
    setCurrentPage(1)
  }

  return (
    <>
      <ModuleNavbar
        title="Mouvements de stock"
        description="Gestion des entrées, sorties et transferts"
        icon={History}
        secondaryActions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Exporter
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Nouveau mouvement
                  <ChevronDown className="h-4 w-4 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem onClick={() => handleCreateMovement("IN")}>
                  <ArrowDownRight className="mr-2 h-4 w-4 text-green-600" />
                  <div>
                    <div className="font-medium">Entrée de stock</div>
                    <div className="text-xs text-gray-500">Achat, retour, ajustement+</div>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleCreateMovement("OUT")}>
                  <ArrowUpRight className="mr-2 h-4 w-4 text-red-600" />
                  <div>
                    <div className="font-medium">Sortie de stock</div>
                    <div className="text-xs text-gray-500">Vente, perte, ajustement-</div>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleCreateMovement("TRANSFER")}>
                  <ArrowRightLeft className="mr-2 h-4 w-4 text-blue-600" />
                  <div>
                    <div className="font-medium">Transfert interne</div>
                    <div className="text-xs text-gray-500">Entre zones/emplacements</div>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleCreateMovement("ADJUSTMENT")}>
                  <Edit2 className="mr-2 h-4 w-4 text-amber-600" />
                  <div>
                    <div className="font-medium">Ajustement</div>
                    <div className="text-xs text-gray-500">Régularisation inventaire</div>
                  </div>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        }
      />

      <div className="py-8">
        <div className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8">
          {/* Tableau des mouvements */}
          <Card className="py-0 gap-0">
            {/* Barre de recherche et filtres */}
            <div className="p-4 border-b flex justify-between items-center border-gray-200 space-y-3">
              <div className="flex items-center gap-3">
                <div className="relative w-[400px]">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Rechercher un mouvement..."
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value)
                      handleFilterChange()
                    }}
                    className="pl-10"
                  />
                </div>

                <Select value={typeFilter} onValueChange={(value) => { setTypeFilter(value); handleFilterChange(); }}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les types</SelectItem>
                    <SelectItem value="IN">Entrées</SelectItem>
                    <SelectItem value="OUT">Sorties</SelectItem>
                    <SelectItem value="TRANSFER">Transferts</SelectItem>
                    <SelectItem value="ADJUSTMENT">Ajustements</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={statusFilter} onValueChange={(value) => { setStatusFilter(value); handleFilterChange(); }}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Statut" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les statuts</SelectItem>
                    <SelectItem value="PENDING">En attente</SelectItem>
                    <SelectItem value="VALIDATED">Validés</SelectItem>
                    <SelectItem value="CANCELLED">Annulés</SelectItem>
                  </SelectContent>
                </Select>


              </div>
              <div className="flex items-center gap-3">
                <Select value={userFilter} onValueChange={(value) => { setUserFilter(value); handleFilterChange(); }}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Utilisateur" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les utilisateurs</SelectItem>
                    {mockUsers.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={productFilter} onValueChange={(value) => { setProductFilter(value); handleFilterChange(); }}>
                  <SelectTrigger className="w-[220px]">
                    <SelectValue placeholder="Produit" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les produits</SelectItem>
                    {mockProducts.map((product) => (
                      <SelectItem key={product.sku} value={product.sku}>
                        {product.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {hasActiveFilters && (
                  <Button variant="ghost" size="sm" onClick={handleResetFilters} className="text-gray-500 hover:text-gray-700">
                    Réinitialiser
                  </Button>
                )}
              </div>
            </div>

            <CardContent className="p-0 gap-0">
              {filteredMovements.length === 0 ? (
                <div className="text-center py-12">
                  <History className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-4 text-lg font-semibold text-gray-900">Aucun mouvement trouvé</h3>
                  <p className="text-gray-500 mt-2">Aucun mouvement ne correspond à vos critères.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Type</TableHead>
                        <TableHead>Produit</TableHead>
                        <TableHead>SKU</TableHead>
                        <TableHead className="text-center">Quantité</TableHead>
                        <TableHead>Emplacement</TableHead>
                        <TableHead>Statut</TableHead>
                        <TableHead>Utilisateur</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Document</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedMovements.map((movement) => {
                        const Icon = getMovementIcon(movement.type)
                        const typeColor = getMovementColor(movement.type)

                        return (
                          <TableRow key={movement.id} className="hover:bg-gray-50">
                            <TableCell>
                              <div className={cn("inline-flex items-center gap-2 px-2.5 py-1 rounded-md border", typeColor)}>
                                <Icon className="h-4 w-4" />
                                <span className="text-xs font-medium">{movement.subtypeLabel}</span>
                              </div>
                            </TableCell>
                            <TableCell className="font-medium">{movement.productName}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-xs">{movement.sku}</Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              <span
                                className={cn(
                                  "font-bold text-lg",
                                  movement.type === "IN"
                                    ? "text-green-600"
                                    : movement.type === "OUT"
                                      ? "text-red-600"
                                      : "text-blue-600"
                                )}
                              >
                                {movement.type === "OUT" ? "-" : movement.type === "IN" ? "+" : ""}
                                {movement.quantity}
                              </span>
                            </TableCell>
                            <TableCell className="text-sm text-gray-600">{movement.location}</TableCell>
                            <TableCell>{getStatusBadge(movement.status)}</TableCell>
                            <TableCell className="text-sm text-gray-600">{movement.user}</TableCell>
                            <TableCell className="text-sm text-gray-600">
                              {formatDateTime(movement.createdAt)}
                            </TableCell>
                            <TableCell>
                              {movement.documentNumber && (
                                <Badge variant="outline" className="text-xs">
                                  {movement.documentNumber}
                                </Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}

              {/* Pagination */}
              {filteredMovements.length > 0 && (
                <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200">
                  <div className="text-sm text-gray-600">
                    Affichage de <span className="font-medium">{startIndex + 1}</span> à{" "}
                    <span className="font-medium">{Math.min(endIndex, filteredMovements.length)}</span> sur{" "}
                    <span className="font-medium">{filteredMovements.length}</span> mouvements
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
                        // Afficher uniquement les pages autour de la page actuelle
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

      <CreateMovementSheet
        open={createSheetOpen}
        onOpenChange={setCreateSheetOpen}
        defaultType={createType}
      />
    </>
  )
}
