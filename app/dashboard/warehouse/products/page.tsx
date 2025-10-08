"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ModuleNavbar } from "@/components/navigation/module-navbar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
  Package,
  Search,
  Plus,
  MoreHorizontal,
  Edit,
  Trash2,
  Eye,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  TrendingUp,
  MapPin,
  Calendar,
  Download,
  Upload,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { StockProduct, StockStatus, ProductCategory } from "@/types/warehouse"

// Données mockées
const mockBrands = [
  { id: "1", name: "Dell" },
  { id: "2", name: "Logitech" },
  { id: "3", name: "Samsung" },
  { id: "4", name: "HP" },
  { id: "5", name: "Apple" },
  { id: "6", name: "Lenovo" },
  { id: "7", name: "Microsoft" },
  { id: "8", name: "Sony" },
]

const mockCategories = [
  { id: "1", name: "Informatique" },
  { id: "2", name: "Audio & Vidéo" },
  { id: "3", name: "Téléphonie" },
  { id: "4", name: "Réseau" },
  { id: "5", name: "Bureautique" },
  { id: "6", name: "Consommables" },
  { id: "7", name: "Accessoires" },
  { id: "8", name: "Gaming" },
]

const mockProducts: StockProduct[] = [
  {
    id: "1",
    sku: "LAP-DELL-001",
    name: "Laptop Dell XPS 15",
    description: "Ordinateur portable haute performance",
    category: "FINISHED_PRODUCT",
    unit: "PIECE",
    warehouseId: "1",
    warehouse: { id: "1", name: "Entrepôt Principal", code: "WH-001" },
    zoneId: "z2",
    zone: { id: "z2", name: "Zone Stockage A", code: "STO-A" },
    locationId: "l1",
    location: { id: "l1", code: "A-12-3" },
    quantityAvailable: 145,
    quantityReserved: 23,
    quantityTotal: 168,
    quantityMin: 50,
    quantityMax: 300,
    status: "OK",
    lastMovementDate: new Date("2025-10-07"),
    rotationRate: 45,
    createdAt: new Date("2024-01-15"),
    updatedAt: new Date("2025-10-07"),
  },
  {
    id: "2",
    sku: "MOU-LOG-003",
    name: "Souris Logitech MX Master 3",
    description: "Souris ergonomique sans fil",
    category: "FINISHED_PRODUCT",
    unit: "PIECE",
    warehouseId: "1",
    warehouse: { id: "1", name: "Entrepôt Principal", code: "WH-001" },
    zoneId: "z2",
    zone: { id: "z2", name: "Zone Stockage A", code: "STO-A" },
    quantityAvailable: 234,
    quantityReserved: 45,
    quantityTotal: 279,
    quantityMin: 100,
    quantityMax: 500,
    status: "OK",
    lastMovementDate: new Date("2025-10-08"),
    rotationRate: 67,
    createdAt: new Date("2024-02-10"),
    updatedAt: new Date("2025-10-08"),
  },
  {
    id: "3",
    sku: "ECR-SAM-002",
    name: "Écran Samsung 27\" 4K",
    description: "Moniteur professionnel UHD",
    category: "FINISHED_PRODUCT",
    unit: "PIECE",
    warehouseId: "2",
    warehouse: { id: "2", name: "Entrepôt Lyon", code: "WH-002" },
    zoneId: "z5",
    zone: { id: "z5", name: "Zone Stockage", code: "STO" },
    quantityAvailable: 78,
    quantityReserved: 12,
    quantityTotal: 90,
    quantityMin: 30,
    quantityMax: 150,
    status: "OK",
    lastMovementDate: new Date("2025-10-06"),
    rotationRate: 23,
    createdAt: new Date("2024-03-15"),
    updatedAt: new Date("2025-10-06"),
  },
  {
    id: "4",
    sku: "BAT-EXT-004",
    name: "Batterie externe 20000mAh",
    description: "Power bank USB-C",
    category: "FINISHED_PRODUCT",
    unit: "PIECE",
    warehouseId: "2",
    warehouse: { id: "2", name: "Entrepôt Lyon", code: "WH-002" },
    quantityAvailable: 0,
    quantityReserved: 0,
    quantityTotal: 0,
    quantityMin: 50,
    quantityMax: 200,
    status: "OUT_OF_STOCK",
    lastMovementDate: new Date("2025-10-05"),
    rotationRate: 89,
    createdAt: new Date("2024-04-20"),
    updatedAt: new Date("2025-10-05"),
  },
  {
    id: "5",
    sku: "ADP-USC-002",
    name: "Adaptateur USB-C vers HDMI",
    description: "Convertisseur 4K@60Hz",
    category: "FINISHED_PRODUCT",
    unit: "PIECE",
    warehouseId: "1",
    warehouse: { id: "1", name: "Entrepôt Principal", code: "WH-001" },
    quantityAvailable: 12,
    quantityReserved: 3,
    quantityTotal: 15,
    quantityMin: 50,
    quantityMax: 200,
    status: "LOW_STOCK",
    lastMovementDate: new Date("2025-10-07"),
    rotationRate: 45,
    createdAt: new Date("2024-05-10"),
    updatedAt: new Date("2025-10-07"),
  },
  {
    id: "6",
    sku: "LIC-OFF-001",
    name: "Licence Office 365",
    description: "Abonnement annuel",
    category: "CONSUMABLE",
    unit: "PIECE",
    warehouseId: "1",
    warehouse: { id: "1", name: "Entrepôt Principal", code: "WH-001" },
    quantityAvailable: 45,
    quantityReserved: 8,
    quantityTotal: 53,
    quantityMin: 20,
    quantityMax: 100,
    expirationDate: new Date("2025-10-15"),
    status: "EXPIRED",
    lastMovementDate: new Date("2025-09-30"),
    rotationRate: 12,
    createdAt: new Date("2024-06-01"),
    updatedAt: new Date("2025-09-30"),
  },
  {
    id: "7",
    sku: "TAP-SOU-001",
    name: "Tapis de souris",
    description: "Tapis gaming RGB",
    category: "FINISHED_PRODUCT",
    unit: "PIECE",
    warehouseId: "3",
    warehouse: { id: "3", name: "Entrepôt Marseille", code: "WH-003" },
    quantityAvailable: 350,
    quantityReserved: 15,
    quantityTotal: 365,
    quantityMin: 50,
    quantityMax: 200,
    status: "OVERSTOCKED",
    lastMovementDate: new Date("2025-09-20"),
    rotationRate: 8,
    createdAt: new Date("2024-07-12"),
    updatedAt: new Date("2025-09-20"),
  },
  {
    id: "8",
    sku: "CLV-MEC-005",
    name: "Clavier mécanique RGB",
    description: "Switches Cherry MX Red",
    category: "FINISHED_PRODUCT",
    unit: "PIECE",
    warehouseId: "3",
    warehouse: { id: "3", name: "Entrepôt Marseille", code: "WH-003" },
    quantityAvailable: 89,
    quantityReserved: 11,
    quantityTotal: 100,
    quantityMin: 40,
    quantityMax: 180,
    status: "OK",
    lastMovementDate: new Date("2025-10-08"),
    rotationRate: 34,
    createdAt: new Date("2024-08-05"),
    updatedAt: new Date("2025-10-08"),
  },
]

export default function ProductsPage() {
  const router = useRouter()
  const [products] = useState<StockProduct[]>(mockProducts)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [categoryFilter, setCategoryFilter] = useState<string>("all")
  const [brandFilter, setBrandFilter] = useState<string>("all")
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  const filteredProducts = products.filter((product) => {
    const matchesSearch =
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.sku.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus = statusFilter === "all" || product.status === statusFilter
    const matchesCategory = categoryFilter === "all" || product.category === categoryFilter
    const matchesBrand = brandFilter === "all" || true // TODO: ajouter brandId dans les produits mockés

    return matchesSearch && matchesStatus && matchesCategory && matchesBrand
  })

  const handleFilterChange = () => {
    setCurrentPage(1)
  }

  const handleResetFilters = () => {
    setStatusFilter("all")
    setCategoryFilter("all")
    setBrandFilter("all")
  }

  const hasActiveFilters = statusFilter !== "all" || categoryFilter !== "all" || brandFilter !== "all"

  // Pagination
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedProducts = filteredProducts.slice(startIndex, endIndex)

  const getStatusBadge = (status: StockStatus) => {
    const config = {
      OK: { icon: CheckCircle2, className: "border-green-200 text-green-700 bg-green-50", label: "Stock OK" },
      LOW_STOCK: { icon: AlertTriangle, className: "border-amber-200 text-amber-700 bg-amber-50", label: "Stock faible" },
      OUT_OF_STOCK: { icon: XCircle, className: "border-red-200 text-red-700 bg-red-50", label: "Rupture" },
      OVERSTOCKED: { icon: TrendingUp, className: "border-blue-200 text-blue-700 bg-blue-50", label: "Surstock" },
      EXPIRED: { icon: Calendar, className: "border-red-200 text-red-700 bg-red-50", label: "Expiré" },
    }
    const { icon: Icon, className, label } = config[status]
    return (
      <Badge variant="outline" className={cn("text-xs", className)}>
        <Icon className="h-3 w-3 mr-1" />
        {label}
      </Badge>
    )
  }

  const getCategoryLabel = (category: ProductCategory) => {
    const labels = {
      RAW_MATERIAL: "Matière première",
      FINISHED_PRODUCT: "Produit fini",
      SEMI_FINISHED: "Semi-fini",
      CONSUMABLE: "Consommable",
      PACKAGING: "Emballage",
    }
    return labels[category]
  }

  const handleViewProduct = (id: string) => {
    router.push(`/dashboard/warehouse/products/${id}`)
  }

  const renderTableView = () => (
    <Card className="py-0 gap-0">
      {/* Barre de recherche et filtres */}
      <div className="p-4 border-b flex justify-between items-center border-gray-200">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="relative w-[400px]">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Rechercher un produit..."
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
                <SelectItem value="OK">Stock OK</SelectItem>
                <SelectItem value="LOW_STOCK">Stock faible</SelectItem>
                <SelectItem value="OUT_OF_STOCK">Rupture</SelectItem>
                <SelectItem value="OVERSTOCKED">Surstock</SelectItem>
              </SelectContent>
            </Select>

            <Select value={categoryFilter} onValueChange={(value) => { setCategoryFilter(value); handleFilterChange(); }}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Catégorie" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les catégories</SelectItem>
                {mockCategories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={brandFilter} onValueChange={(value) => { setBrandFilter(value); handleFilterChange(); }}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Marque" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les marques</SelectItem>
                {mockBrands.map((brand) => (
                  <SelectItem key={brand.id} value={brand.id}>
                    {brand.name}
                  </SelectItem>
                ))}
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

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="border-b border-gray-200 bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                Produit
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                Catégorie
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                Entrepôt
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-600 uppercase tracking-wider">
                Disponible
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-600 uppercase tracking-wider">
                Réservé
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-600 uppercase tracking-wider">
                Total
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
            {paginatedProducts.map((product) => (
              <tr
                key={product.id}
                className="hover:bg-gray-50 cursor-pointer transition-colors"
                onClick={() => handleViewProduct(product.id)}
              >
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center border border-gray-200">
                      <Package className="h-5 w-5 text-gray-600" />
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{product.name}</div>
                      <div className="text-sm text-gray-500">{product.sku}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="text-sm text-gray-700">{getCategoryLabel(product.category)}</span>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-gray-900">{product.warehouse?.name}</div>
                  {product.location && <div className="text-xs text-gray-500">{product.location.code}</div>}
                </td>
                <td className="px-6 py-4 text-right">
                  <span className="font-semibold text-gray-900">{product.quantityAvailable}</span>
                </td>
                <td className="px-6 py-4 text-right">
                  <span className="font-medium text-amber-600">{product.quantityReserved}</span>
                </td>
                <td className="px-6 py-4 text-right">
                  <span className="font-bold text-gray-900">{product.quantityTotal}</span>
                </td>
                <td className="px-6 py-4">{getStatusBadge(product.status)}</td>
                <td className="px-6 py-4 text-right">
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
                      <DropdownMenuItem onClick={(e) => e.stopPropagation()}>
                        <Edit className="mr-2 h-4 w-4" />
                        Modifier
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={(e) => e.stopPropagation()} className="text-red-600">
                        <Trash2 className="mr-2 h-4 w-4" />
                        Supprimer
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {filteredProducts.length > 0 && (
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200">
          <div className="text-sm text-gray-600">
            Affichage de <span className="font-medium">{startIndex + 1}</span> à{" "}
            <span className="font-medium">{Math.min(endIndex, filteredProducts.length)}</span> sur{" "}
            <span className="font-medium">{filteredProducts.length}</span> produits
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
    </Card>
  )

  return (
    <>
      <ModuleNavbar
        title="Produits en stock"
        description="Gestion de l'inventaire des produits"
        icon={Package}
        primaryAction={{
          label: "Nouveau produit",
          onClick: () => console.log("Create product"),
          icon: Plus,
        }}
        secondaryActions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-9 gap-2">
              <Upload className="h-4 w-4" />
              Importer
            </Button>
            <Button variant="outline" size="sm" className="h-9 gap-2">
              <Download className="h-4 w-4" />
              Exporter
            </Button>
          </div>
        }
      />

      <main className="py-8">
        <div className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8 space-y-6">
          {/* Stats */}
          <div className="grid gap-4 md:grid-cols-5">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Total produits</CardTitle>
                <Package className="h-4 w-4 text-gray-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">{products.length}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Stock OK</CardTitle>
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {products.filter((p) => p.status === "OK").length}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Stock faible</CardTitle>
                <AlertTriangle className="h-4 w-4 text-amber-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-amber-600">
                  {products.filter((p) => p.status === "LOW_STOCK").length}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Rupture</CardTitle>
                <XCircle className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {products.filter((p) => p.status === "OUT_OF_STOCK").length}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Surstock</CardTitle>
                <TrendingUp className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {products.filter((p) => p.status === "OVERSTOCKED").length}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tableau */}
          {filteredProducts.length === 0 ? (
            <Card className="py-0">
              <CardContent className="py-12">
                <div className="text-center">
                  <Package className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-4 text-lg font-semibold text-gray-900">Aucun produit trouvé</h3>
                  <p className="text-gray-500 mt-2">Aucun produit ne correspond à vos critères.</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            renderTableView()
          )}
        </div>
      </main>
    </>
  )
}
