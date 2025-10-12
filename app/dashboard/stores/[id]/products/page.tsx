"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { StorePageHeader } from "@/components/stores/store-page-header"
import {
  Package,
  Search,
  Plus,
  AlertTriangle,
  TrendingUp,
} from "lucide-react"

interface ProductsPageProps {
  params: Promise<{
    id: string
  }>
}

const mockProducts = [
  { id: "1", name: "Laptop Dell XPS 15", sku: "LAP-DELL-001", stock: 15, minStock: 10, price: 750000, category: "Électronique", image: "https://images.unsplash.com/photo-1593642632823-8f785ba67e45?w=100&h=100&fit=crop" },
  { id: "2", name: "iPhone 14 Pro", sku: "PHN-APP-014", stock: 8, minStock: 15, price: 850000, category: "Téléphones", image: "https://images.unsplash.com/photo-1678652197831-2d180705cd2c?w=100&h=100&fit=crop" },
  { id: "3", name: "Samsung Galaxy S23", sku: "PHN-SAM-023", stock: 22, minStock: 10, price: 680000, category: "Téléphones", image: "https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=100&h=100&fit=crop" },
  { id: "4", name: "MacBook Air M2", sku: "LAP-APP-M02", stock: 5, minStock: 8, price: 920000, category: "Électronique", image: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=100&h=100&fit=crop" },
  { id: "5", name: "AirPods Pro", sku: "AUD-APP-PRO", stock: 45, minStock: 20, price: 180000, category: "Audio", image: "https://images.unsplash.com/photo-1606841837239-c5a1a4a07af7?w=100&h=100&fit=crop" },
  { id: "6", name: "Sony PS5", sku: "GAM-SON-005", stock: 3, minStock: 10, price: 450000, category: "Gaming", image: "https://images.unsplash.com/photo-1606813907291-d86efa9b94db?w=100&h=100&fit=crop" },
]

export default function ProductsPage({ params }: ProductsPageProps) {
  const lowStockProducts = mockProducts.filter(p => p.stock < p.minStock)

  return (
    <>
      <StorePageHeader
        title="Produits"
        description="Gérer les produits du magasin"
        action={{
          label: "Nouveau produit",
          onClick: () => {},
          icon: Plus,
        }}
      />

      <div className="p-8 space-y-6">

      {/* Statistiques */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Produits</CardTitle>
            <Package className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{mockProducts.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Stock Faible</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{lowStockProducts.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Valeur Stock</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {(mockProducts.reduce((sum, p) => sum + (p.price * p.stock), 0) / 1000000).toFixed(1)}M
            </div>
            <p className="text-xs text-gray-500 mt-1">FCFA</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Catégories</CardTitle>
            <Package className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {new Set(mockProducts.map(p => p.category)).size}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Barre de recherche */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input placeholder="Rechercher un produit..." className="pl-9" />
          </div>
        </CardContent>
      </Card>

      {/* Liste des produits */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {mockProducts.map((product) => (
          <Card key={product.id} className="overflow-hidden hover:shadow-lg transition-shadow">
            <CardContent className="p-0">
              <div className="flex gap-4 p-4">
                <img 
                  src={product.image} 
                  alt={product.name} 
                  className="w-20 h-20 rounded-lg object-cover"
                />
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 truncate">{product.name}</h3>
                  <p className="text-sm text-gray-500 mt-1">{product.sku}</p>
                  <Badge variant="secondary" className="mt-2 text-xs">
                    {product.category}
                  </Badge>
                </div>
              </div>
              <div className="px-4 pb-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Prix</span>
                  <span className="font-semibold text-gray-900">{(product.price / 1000).toFixed(0)}k FCFA</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Stock</span>
                  <div className="flex items-center gap-2">
                    <span className={`font-semibold ${product.stock < product.minStock ? 'text-red-600' : 'text-green-600'}`}>
                      {product.stock}
                    </span>
                    {product.stock < product.minStock && (
                      <AlertTriangle className="h-4 w-4 text-red-500" />
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      </div>
    </>
  )
}
