"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
import { StorePageHeader } from "@/components/stores/store-page-header"
import { ProductFormDialog } from "@/components/products/product-form-dialog"
import { StoreProductDetailsSheet } from "@/components/stores/store-product-details-sheet"
import { RestockingRequestDialog } from "@/components/stores/restocking-request-dialog"
import {
  Package,
  Search,
  Plus,
  AlertTriangle,
  TrendingUp,
  Loader2,
  XCircle,
  CheckCircle,
  CheckCircle2,
  Eye,
  Edit,
  Trash2,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  Truck,
} from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

interface ProductsPageProps {
  params: Promise<{
    id: string
  }>
}

interface Product {
  id: string
  storeProductId: string
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
  brand: {
    id: string
    name: string
  } | null
}

export default function ProductsPage({ params }: ProductsPageProps) {
  const [storeId, setStoreId] = useState<string>("")
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [brands, setBrands] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [categoryFilter, setCategoryFilter] = useState<string>("all")
  const [brandFilter, setBrandFilter] = useState<string>("all")
  const [stockFilter, setStockFilter] = useState<string>("all")
  const [currentPage, setCurrentPage] = useState(1)
  const [createProductDialogOpen, setCreateProductDialogOpen] = useState(false)
  const [restockingDialogOpen, setRestockingDialogOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [storeName, setStoreName] = useState<string>("")
  const itemsPerPage = 10

  useEffect(() => {
    params.then((p) => {
      setStoreId(p.id)
      loadProducts(p.id)
      loadFilters()
      loadStoreInfo(p.id)
    })
  }, [])

  const loadStoreInfo = async (id: string) => {
    try {
      const response = await fetch(`/api/stores/${id}`)
      if (response.ok) {
        const store = await response.json()
        setStoreName(store.name)
      }
    } catch (error) {
      console.error("Error loading store info:", error)
    }
  }

  const loadProducts = async (id: string) => {
    try {
      setLoading(true)
      const response = await fetch(`/api/stores/${id}/products`)
      if (!response.ok) throw new Error("Erreur")
      const data = await response.json()
      setProducts(data)
    } catch (error) {
      console.error("Error loading products:", error)
      toast.error("Erreur lors du chargement des produits")
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

  const handleViewProduct = (id: string) => {
    setSelectedProductId(id)
    setDetailsOpen(true)
  }

  const handleEditProduct = async (product: Product) => {
    setEditingProduct(product)
    setCreateProductDialogOpen(true)
  }

  const handleDeleteProduct = async (product: Product) => {
    if (!confirm(`Voulez-vous vraiment supprimer "${product.name}" de ce magasin ?`)) return

    try {
      const response = await fetch(`/api/stores/${storeId}/products/${product.storeProductId}`, {
        method: "DELETE",
      })

      if (!response.ok) throw new Error("Erreur lors de la suppression")

      toast.success("Produit retiré du magasin avec succès")
      loadProducts(storeId)
    } catch (error) {
      console.error("Error deleting product:", error)
      toast.error("Erreur lors de la suppression")
    }
  }

  const handleResetFilters = () => {
    setCategoryFilter("all")
    setBrandFilter("all")
    setStockFilter("all")
  }

  const handleFilterChange = () => {
    setCurrentPage(1)
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

  // Pagination
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedProducts = filteredProducts.slice(startIndex, endIndex)

  const lowStockProducts = products.filter(p => p.stock <= p.minStock)
  const stockValue = products.reduce((sum, p) => sum + (p.prixVente * p.stock), 0)
  const uniqueCategories = new Set(products.map(p => p.category.name))
  const stockOk = products.filter(p => getStockStatus(p) === "ok").length
  const stockOut = products.filter(p => getStockStatus(p) === "out").length

  const getStatusBadge = (product: Product) => {
    const status = getStockStatus(product)
    const config = {
      ok: { icon: CheckCircle2, className: "border-green-200 text-green-700 bg-green-50", label: "Stock OK" },
      low: { icon: AlertTriangle, className: "border-amber-200 text-amber-700 bg-amber-50", label: "Stock faible" },
      out: { icon: XCircle, className: "border-red-200 text-red-700 bg-red-50", label: "Rupture" },
      high: { icon: TrendingUp, className: "border-blue-200 text-blue-700 bg-blue-50", label: "Surstock" },
    }
    const { icon: Icon, className, label } = config[status as keyof typeof config]
    return (
      <Badge variant="outline" className={cn("text-xs", className)}>
        <Icon className="h-3 w-3 mr-1" />
        {label}
      </Badge>
    )
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "XAF",
    }).format(price)
  }

  return (
    <>
      <div className="border-b bg-white">
        <div className="flex items-center justify-between px-8 py-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Produits</h1>
            <p className="text-sm text-gray-500 mt-1">Gérer les produits du magasin</p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={() => setRestockingDialogOpen(true)}
              className="bg-blue-900 hover:bg-blue-800"
            >
              <Truck className="h-4 w-4 mr-2" />
              Demander un approvisionnement
            </Button>
            <Button
              onClick={() => setCreateProductDialogOpen(true)}
              variant="outline"
            >
              <Plus className="h-4 w-4 mr-2" />
              Créer un produit
            </Button>
          </div>
        </div>
      </div>

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
                <div className="text-2xl font-bold text-green-600">{stockOk}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Stock faible</CardTitle>
                <AlertTriangle className="h-4 w-4 text-amber-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-amber-600">{lowStockProducts.length}</div>
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
                <CardTitle className="text-sm font-medium text-gray-600">Valeur stock</CardTitle>
                <TrendingUp className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">
                  {(stockValue / 1000000).toFixed(1)}M XAF
                </div>
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
          ) : (
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
                {filteredProducts.length === 0 ? (
                  <div className="text-center py-12">
                    <Package className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-4 text-lg font-semibold text-gray-900">
                      {products.length === 0 ? "Aucun produit" : "Aucun produit trouvé"}
                    </h3>
                    <p className="text-gray-500 mt-2">
                      {products.length === 0
                        ? "Les produits commandés apparaîtront ici"
                        : "Aucun produit ne correspond à vos critères."}
                    </p>
                    {products.length === 0 && (
                      <div className="flex gap-3 mt-4">
                        <Button onClick={() => setRestockingDialogOpen(true)} className="flex-1 bg-blue-900 hover:bg-blue-800">
                          <Truck className="h-4 w-4 mr-2" />
                          Demander un approvisionnement
                        </Button>
                        <Button onClick={() => setCreateProductDialogOpen(true)} variant="outline" className="flex-1">
                          <Plus className="h-4 w-4 mr-2" />
                          Créer un produit
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
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
                                  Retirer du magasin
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
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
          )}
        </div>
      </main>

      <RestockingRequestDialog
        open={restockingDialogOpen}
        onOpenChange={setRestockingDialogOpen}
        storeId={storeId}
        storeName={storeName}
        onSuccess={() => {
          loadProducts(storeId)
          toast.success("Demande envoyée ! Les produits seront ajoutés une fois la commande confirmée.")
        }}
      />

      <ProductFormDialog
        open={createProductDialogOpen}
        onOpenChange={setCreateProductDialogOpen}
        onSuccess={() => loadProducts(storeId)}
        product={editingProduct}
      />

      <StoreProductDetailsSheet
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        productId={selectedProductId}
        storeId={storeId}
        onUpdated={() => loadProducts(storeId)}
      />
    </>
  )
}
