"use client"

import { useState, useEffect } from "react"
import { PermissionGuard } from "@/components/auth/permission-guard"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Package, Plus, Search, Grid3X3, List, MoreHorizontal, Edit, Trash2, Eye } from "lucide-react"
import { CreateProductSheet } from "@/components/products/create-product-sheet"
import { EditProductSheet } from "@/components/products/edit-product-sheet"
import { DeleteProductDialog } from "@/components/products/delete-product-dialog"
import { ProductFilters } from "@/components/products/product-filters"
import type { Product, ProductCategory, ProductFilters as ProductFiltersType } from "@/types/products"
import { usePermissions } from "@/hooks/use-permissions"

type ViewMode = "grid" | "table"

export default function ProductsListPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<ProductCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<ViewMode>("grid")
  const [filters, setFilters] = useState<ProductFiltersType>({})
  const [showCreateSheet, setShowCreateSheet] = useState(false)
  const [showEditSheet, setShowEditSheet] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const { hasPermission } = usePermissions()

  const canCreate = hasPermission("products.create")
  const canEdit = hasPermission("products.edit")
  const canDelete = hasPermission("products.delete")

  useEffect(() => {
    fetchProducts()
    fetchCategories()
  }, [filters])

  const fetchProducts = async () => {
    try {
      const params = new URLSearchParams()
      if (filters.search) params.append("search", filters.search)
      if (filters.categoryId) params.append("categoryId", filters.categoryId)
      if (filters.minPrice) params.append("minPrice", filters.minPrice.toString())
      if (filters.maxPrice) params.append("maxPrice", filters.maxPrice.toString())
      if (filters.inStock) params.append("inStock", "true")

      const response = await fetch(`/api/products?${params}`)
      if (response.ok) {
        const data = await response.json()
        setProducts(data)
      }
    } catch (error) {
      console.error("Error fetching products:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchCategories = async () => {
    try {
      const response = await fetch("/api/categories")
      if (response.ok) {
        const data = await response.json()
        setCategories(data)
      }
    } catch (error) {
      console.error("Error fetching categories:", error)
    }
  }

  const handleCreateProduct = () => {
    setShowCreateSheet(true)
  }

  const handleEditProduct = (product: Product) => {
    setSelectedProduct(product)
    setShowEditSheet(true)
  }

  const handleDeleteProduct = (product: Product) => {
    setSelectedProduct(product)
    setShowDeleteDialog(true)
  }

  const handleProductCreated = () => {
    fetchProducts()
    setShowCreateSheet(false)
  }

  const handleProductUpdated = () => {
    fetchProducts()
    setShowEditSheet(false)
    setSelectedProduct(null)
  }

  const handleProductDeleted = () => {
    fetchProducts()
    setShowDeleteDialog(false)
    setSelectedProduct(null)
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
    }).format(price)
  }

  const getStockStatus = (stock: number) => {
    if (stock === 0) return { label: "Rupture", variant: "destructive" as const }
    if (stock < 10) return { label: "Stock faible", variant: "secondary" as const }
    return { label: "En stock", variant: "default" as const }
  }

  if (loading) {
    return (
      <PermissionGuard permission="products.view">
        <div className="p-6">
          <div className="animate-pulse space-y-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-lg" />
            ))}
          </div>
        </div>
      </PermissionGuard>
    )
  }

  return (
    <PermissionGuard permission="products.view">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Produits</h1>
            <p className="text-gray-600">Gérez votre catalogue de produits</p>
          </div>
          {canCreate && (
            <Button onClick={handleCreateProduct}>
              <Plus className="mr-2 h-4 w-4" />
              Nouveau produit
            </Button>
          )}
        </div>

        {/* Filters and View Toggle */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Rechercher un produit..."
                value={filters.search || ""}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="pl-10 w-64"
              />
            </div>
            <ProductFilters filters={filters} onFiltersChange={setFilters} categories={categories} />
          </div>
          <div className="flex items-center space-x-2">
            <Button variant={viewMode === "grid" ? "default" : "outline"} size="sm" onClick={() => setViewMode("grid")}>
              <Grid3X3 className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "table" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("table")}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        {products.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Package className="h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun produit trouvé</h3>
              <p className="text-gray-500 text-center mb-6">
                {filters.search || filters.categoryId
                  ? "Aucun produit ne correspond à vos critères de recherche."
                  : "Commencez par créer votre premier produit."}
              </p>
              {canCreate && !filters.search && !filters.categoryId && (
                <Button onClick={handleCreateProduct}>
                  <Plus className="mr-2 h-4 w-4" />
                  Créer un produit
                </Button>
              )}
            </CardContent>
          </Card>
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6">
            {products.map((product) => {
              const stockStatus = getStockStatus(product.stock)
              return (
                <Card key={product.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg font-semibold text-gray-900 line-clamp-2">
                          {product.name}
                        </CardTitle>
                        {product.category && (
                          <Badge variant="secondary" className="mt-2">
                            {product.category.name}
                          </Badge>
                        )}
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            <Eye className="mr-2 h-4 w-4" />
                            Voir détails
                          </DropdownMenuItem>
                          {canEdit && (
                            <DropdownMenuItem onClick={() => handleEditProduct(product)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Modifier
                            </DropdownMenuItem>
                          )}
                          {canDelete && (
                            <DropdownMenuItem onClick={() => handleDeleteProduct(product)} className="text-red-600">
                              <Trash2 className="mr-2 h-4 w-4" />
                              Supprimer
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {product.description && (
                      <p className="text-sm text-gray-600 mb-4 line-clamp-2">{product.description}</p>
                    )}
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-500">Prix de vente</span>
                        <span className="font-semibold text-green-600">{formatPrice(product.prixVente)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-500">Stock</span>
                        <div className="flex items-center space-x-2">
                          <span className="font-medium">{product.stock}</span>
                          <Badge variant={stockStatus.variant} className="text-xs">
                            {stockStatus.label}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-500">TVA</span>
                        <span className="text-sm">{product.tva}%</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        ) : (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produit</TableHead>
                  <TableHead>Catégorie</TableHead>
                  <TableHead>Prix de vente</TableHead>
                  <TableHead>Prix d'achat</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead>TVA</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((product) => {
                  const stockStatus = getStockStatus(product.stock)
                  return (
                    <TableRow key={product.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium text-gray-900">{product.name}</div>
                          {product.description && (
                            <div className="text-sm text-gray-500 line-clamp-1">{product.description}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {product.category ? (
                          <Badge variant="secondary">{product.category.name}</Badge>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell className="font-semibold text-green-600">{formatPrice(product.prixVente)}</TableCell>
                      <TableCell>{formatPrice(product.prixAchat)}</TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <span className="font-medium">{product.stock}</span>
                          <Badge variant={stockStatus.variant} className="text-xs">
                            {stockStatus.label}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>{product.tva}%</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>
                              <Eye className="mr-2 h-4 w-4" />
                              Voir détails
                            </DropdownMenuItem>
                            {canEdit && (
                              <DropdownMenuItem onClick={() => handleEditProduct(product)}>
                                <Edit className="mr-2 h-4 w-4" />
                                Modifier
                              </DropdownMenuItem>
                            )}
                            {canDelete && (
                              <DropdownMenuItem onClick={() => handleDeleteProduct(product)} className="text-red-600">
                                <Trash2 className="mr-2 h-4 w-4" />
                                Supprimer
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </Card>
        )}

        {/* Modales */}
        <CreateProductSheet
          open={showCreateSheet}
          onOpenChange={setShowCreateSheet}
          onProductCreated={handleProductCreated}
          categories={categories}
        />

        {selectedProduct && (
          <>
            <EditProductSheet
              open={showEditSheet}
              onOpenChange={setShowEditSheet}
              product={selectedProduct}
              onProductUpdated={handleProductUpdated}
              categories={categories}
            />
            <DeleteProductDialog
              open={showDeleteDialog}
              onOpenChange={setShowDeleteDialog}
              product={selectedProduct}
              onProductDeleted={handleProductDeleted}
            />
          </>
        )}
      </div>
    </PermissionGuard>
  )
}
