"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { Package, Plus, Edit, Trash2, Eye } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { StorePermissionGuard } from "@/components/auth/store-permission-guard"
import { STORE_PERMISSIONS } from "@/types/store-auth"

interface Product {
  id: string
  name: string
  sku: string
  price: number
  stock: number
  status: 'available' | 'low_stock' | 'out_of_stock'
}

export default function ProductsWithPermissionsExample() {
  const params = useParams()
  const storeId = params.id as string
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  // Simuler le chargement des produits
  useEffect(() => {
    const mockProducts: Product[] = [
      { id: '1', name: 'Produit A', sku: 'SKU001', price: 25000, stock: 50, status: 'available' },
      { id: '2', name: 'Produit B', sku: 'SKU002', price: 15000, stock: 5, status: 'low_stock' },
      { id: '3', name: 'Produit C', sku: 'SKU003', price: 35000, stock: 0, status: 'out_of_stock' },
    ]
    
    setTimeout(() => {
      setProducts(mockProducts)
      setLoading(false)
    }, 1000)
  }, [])

  const getStatusBadge = (status: string) => {
    const config = {
      available: { className: "bg-green-100 text-green-800", label: "Disponible" },
      low_stock: { className: "bg-yellow-100 text-yellow-800", label: "Stock faible" },
      out_of_stock: { className: "bg-red-100 text-red-800", label: "Rupture" },
    }
    const { className, label } = config[status as keyof typeof config]
    return <Badge className={className}>{label}</Badge>
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "XAF",
    }).format(price)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">Chargement des produits...</p>
        </div>
      </div>
    )
  }

  return (
    <StorePermissionGuard 
      storeId={storeId} 
      permission={STORE_PERMISSIONS.PRODUCTS_VIEW}
    >
      <div className="space-y-6">
        {/* Header avec permissions */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Produits</h1>
            <p className="text-muted-foreground">
              Gérez votre inventaire et vos stocks
            </p>
          </div>
          
          {/* Bouton créer avec permission */}
          <StorePermissionGuard 
            storeId={storeId} 
            permission={STORE_PERMISSIONS.PRODUCTS_CREATE}
            fallback={null}
          >
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nouveau produit
            </Button>
          </StorePermissionGuard>
        </div>

        {/* Statistiques */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total produits</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{products.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Stock faible</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {products.filter(p => p.status === 'low_stock').length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ruptures</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {products.filter(p => p.status === 'out_of_stock').length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Liste des produits */}
        <Card>
          <CardHeader>
            <CardTitle>Liste des produits</CardTitle>
            <CardDescription>
              Gérez vos produits avec des permissions granulaires
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {products.map((product) => (
                <div key={product.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                      <Package className="h-6 w-6 text-gray-500" />
                    </div>
                    
                    <div>
                      <h3 className="font-semibold">{product.name}</h3>
                      <div className="flex items-center space-x-2 text-sm text-gray-500">
                        <span>SKU: {product.sku}</span>
                        <span>•</span>
                        <span>Stock: {product.stock}</span>
                        <span>•</span>
                        <span>{formatPrice(product.price)}</span>
                      </div>
                      <div className="mt-1">
                        {getStatusBadge(product.status)}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    {/* Bouton voir - toujours visible si on peut voir les produits */}
                    <Button variant="outline" size="sm">
                      <Eye className="h-4 w-4 mr-2" />
                      Voir
                    </Button>

                    {/* Bouton modifier avec permission */}
                    <StorePermissionGuard 
                      storeId={storeId} 
                      permission={STORE_PERMISSIONS.PRODUCTS_EDIT}
                      fallback={null}
                    >
                      <Button variant="outline" size="sm">
                        <Edit className="h-4 w-4 mr-2" />
                        Modifier
                      </Button>
                    </StorePermissionGuard>

                    {/* Bouton supprimer avec permission */}
                    <StorePermissionGuard 
                      storeId={storeId} 
                      permission={STORE_PERMISSIONS.PRODUCTS_DELETE}
                      fallback={null}
                    >
                      <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                        <Trash2 className="h-4 w-4 mr-2" />
                        Supprimer
                      </Button>
                    </StorePermissionGuard>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Section gestion du stock avec permissions */}
        <StorePermissionGuard 
          storeId={storeId} 
          permission={STORE_PERMISSIONS.PRODUCTS_STOCK}
          fallback={
            <Card>
              <CardContent className="p-6">
                <div className="text-center text-gray-500">
                  <Package className="h-8 w-8 mx-auto mb-2" />
                  <p>Vous n'avez pas les permissions pour gérer le stock</p>
                </div>
              </CardContent>
            </Card>
          }
        >
          <Card>
            <CardHeader>
              <CardTitle>Gestion du stock</CardTitle>
              <CardDescription>
                Ajustez les quantités en stock
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                Cette section permet de gérer les mouvements de stock.
                Seuls les utilisateurs avec la permission "store.products.stock" peuvent y accéder.
              </p>
            </CardContent>
          </Card>
        </StorePermissionGuard>
      </div>
    </StorePermissionGuard>
  )
}
