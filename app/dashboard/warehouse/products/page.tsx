"use client"

import { useState, useEffect } from "react"
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
  Download,
  Upload,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { ProductFormDialog } from "@/components/products/product-form-dialog"
import { ProductDetailsSheet } from "@/components/warehouse/product-details-sheet"
import { toast } from "sonner"

interface Product {
  id: string
  name: string
  sku: string | null
  description: string | null
  photos: string[]
  prixVente: number
  prixAchat: number
  tva: number
  stock: number
  minStock: number
  maxStock: number | null
  categoryId: string
  brandId: string | null
  category: {
    id: string
    name: string
  }
  brand?: {
    id: string
    name: string
  } | null
  createdAt: string
  updatedAt: string
}

interface Category {
  id: string
  name: string
}

interface Brand {
  id: string
  name: string
}

export default function ProductsPage() {
  const router = useRouter()
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [brands, setBrands] = useState<Brand[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [categoryFilter, setCategoryFilter] = useState<string>("all")
  const [brandFilter, setBrandFilter] = useState<string>("all")
  const [stockFilter, setStockFilter] = useState<string>("all")
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const itemsPerPage = 10

  useEffect(() => {
    loadProducts()
    loadFilters()
  }, [])

  const loadProducts = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/products")
      if (response.ok) {
        const data = await response.json()
        setProducts(data)
      } else {
        toast.error("Erreur lors du chargement des produits")
      }
    } catch (error) {
      console.error("Error loading products:", error)
      toast.error("Erreur lors du chargement")
    } finally {
      setLoading(false)
    }
  }

  const loadFilters = async () => {
    try {
      const [categoriesRes, brandsRes] = await Promise.all([
        fetch("/api/categories"),
        fetch("/api/brands"),
      ])
      
      if (categoriesRes.ok) {
        const categoriesData = await categoriesRes.json()
        setCategories(categoriesData)
      }
      
      if (brandsRes.ok) {
        const brandsData = await brandsRes.json()
        setBrands(brandsData)
      }
    } catch (error) {
      console.error("Error loading filters:", error)
    }
  }

  const getStockStatus = (product: Product) => {
    if (product.stock === 0) return "out"
    if (product.stock <= product.minStock) return "low"
    if (product.maxStock && product.stock >= product.maxStock) return "high"
    return "ok"
  }

  const filteredProducts = products.filter((product) => {
    const matchesSearch =
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (product.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false)

    const matchesCategory = categoryFilter === "all" || product.categoryId === categoryFilter
    const matchesBrand = brandFilter === "all" || product.brandId === brandFilter
    
    const status = getStockStatus(product)
    const matchesStock = stockFilter === "all" || status === stockFilter

    return matchesSearch && matchesCategory && matchesBrand && matchesStock
  })

  const hasActiveFilters = categoryFilter !== "all" || brandFilter !== "all" || stockFilter !== "all"

  const handleResetFilters = () => {
    setCategoryFilter("all")
    setBrandFilter("all")
    setStockFilter("all")
  }

  const handleFilterChange = () => {
    setCurrentPage(1)
  }

  // Pagination
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedProducts = filteredProducts.slice(startIndex, endIndex)

  const getStatusBadge = (product: Product) => {
    const status = getStockStatus(product)
    const config = {
      ok: { icon: CheckCircle2, className: "border-green-200 text-green-700 bg-green-50", label: "Stock OK" },
      low: { icon: AlertTriangle, className: "border-amber-200 text-amber-700 bg-amber-50", label: "Stock faible" },
      out: { icon: XCircle, className: "border-red-200 text-red-700 bg-red-50", label: "Rupture" },
      high: { icon: TrendingUp, className: "border-blue-200 text-blue-700 bg-blue-50", label: "Surstock" },
    }
    const { icon: Icon, className, label } = config[status]
    return (
      <Badge variant="outline" className={cn("text-xs", className)}>
        <Icon className="h-3 w-3 mr-1" />
        {label}
      </Badge>
    )
  }

  const handleViewProduct = (id: string) => {
    setSelectedProductId(id)
    setDetailsOpen(true)
  }

  const handleCreateProduct = () => {
    setEditingProduct(null)
    setDialogOpen(true)
  }

  const handleEditProduct = async (product: Product) => {
    setEditingProduct(product)
    setDialogOpen(true)
  }

  const handleDeleteProduct = async (product: Product) => {
    if (!confirm(`Voulez-vous vraiment supprimer "${product.name}" ?`)) return

    try {
      const response = await fetch(`/api/products/${product.id}`, {
        method: "DELETE",
      })

      if (!response.ok) throw new Error("Erreur lors de la suppression")

      toast.success("Produit supprimé avec succès")
      loadProducts()
    } catch (error) {
      console.error("Error deleting product:", error)
      toast.error("Erreur lors de la suppression")
    }
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "XAF",
    }).format(price)
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
            <Select value={stockFilter} onValueChange={(value) => { setStockFilter(value); handleFilterChange(); }}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="ok">Stock OK</SelectItem>
                <SelectItem value="low">Stock faible</SelectItem>
                <SelectItem value="out">Rupture</SelectItem>
                <SelectItem value="high">Surstock</SelectItem>
              </SelectContent>
            </Select>

            <Select value={categoryFilter} onValueChange={(value) => { setCategoryFilter(value); handleFilterChange(); }}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Catégorie" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les catégories</SelectItem>
                {categories.map((category) => (
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
                {brands.map((brand) => (
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
                Marque
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-600 uppercase tracking-wider">
                Prix vente
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-600 uppercase tracking-wider">
                Stock
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
                      {product.sku && <div className="text-sm text-gray-500">{product.sku}</div>}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="text-sm text-gray-700">{product.category.name}</span>
                </td>
                <td className="px-6 py-4">
                  <span className="text-sm text-gray-700">{product.brand?.name || "-"}</span>
                </td>
                <td className="px-6 py-4 text-right">
                  <span className="font-semibold text-gray-900">{formatPrice(product.prixVente)}</span>
                </td>
                <td className="px-6 py-4 text-right">
                  <span className="font-semibold text-gray-900">{product.stock}</span>
                  <span className="text-xs text-gray-500 ml-1">/ {product.minStock} min</span>
                </td>
                <td className="px-6 py-4">{getStatusBadge(product)}</td>
                <td className="px-6 py-4 text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleViewProduct(product.id); }}>
                        <Eye className="mr-2 h-4 w-4" />
                        Voir les détails
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleEditProduct(product); }}>
                        <Edit className="mr-2 h-4 w-4" />
                        Modifier
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={(e) => { e.stopPropagation(); handleDeleteProduct(product); }} 
                        className="text-red-600"
                      >
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

  // Calcul des stats
  const totalProducts = products.length
  const stockOk = products.filter(p => getStockStatus(p) === "ok").length
  const stockLow = products.filter(p => getStockStatus(p) === "low").length
  const stockOut = products.filter(p => getStockStatus(p) === "out").length
  const stockHigh = products.filter(p => getStockStatus(p) === "high").length

  return (
    <>
      <ModuleNavbar
        title="Produits"
        description="Gestion du catalogue de produits"
        icon={Package}
        primaryAction={{
          label: "Nouveau produit",
          onClick: handleCreateProduct,
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
                <div className="text-2xl font-bold text-gray-900">{totalProducts}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Stock OK</CardTitle>
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{stockOk}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Stock faible</CardTitle>
                <AlertTriangle className="h-4 w-4 text-amber-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-amber-600">{stockLow}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Rupture</CardTitle>
                <XCircle className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{stockOut}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Surstock</CardTitle>
                <TrendingUp className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">{stockHigh}</div>
              </CardContent>
            </Card>
          </div>

          {/* Tableau */}
          {loading ? (
            <Card className="py-12">
              <CardContent className="flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              </CardContent>
            </Card>
          ) : filteredProducts.length === 0 ? (
            <Card className="py-0">
              <CardContent className="py-12">
                <div className="text-center">
                  <Package className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-4 text-lg font-semibold text-gray-900">
                    {products.length === 0 ? "Aucun produit" : "Aucun produit trouvé"}
                  </h3>
                  <p className="text-gray-500 mt-2">
                    {products.length === 0
                      ? "Commencez par créer votre premier produit"
                      : "Aucun produit ne correspond à vos critères."}
                  </p>
                  {products.length === 0 && (
                    <Button onClick={handleCreateProduct} className="mt-4">
                      <Plus className="h-4 w-4 mr-2" />
                      Créer un produit
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : (
            renderTableView()
          )}
        </div>
      </main>

      <ProductFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSuccess={loadProducts}
        product={editingProduct}
      />

      <ProductDetailsSheet
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        productId={selectedProductId}
        onUpdated={loadProducts}
      />
    </>
  )
}
