"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { StorePageHeader } from "@/components/stores/store-page-header"
import { Tag, Plus, Package, TrendingUp } from "lucide-react"

interface BrandsPageProps {
  params: {
    id: string
  }
}

const mockBrands = [
  { id: "1", name: "Apple", logo: "https://images.unsplash.com/photo-1611532736570-64e4de1a9d0e?w=100&h=100&fit=crop", productsCount: 45, totalSales: 8500000 },
  { id: "2", name: "Samsung", logo: "https://images.unsplash.com/photo-1610792516307-ea5acd9c3b00?w=100&h=100&fit=crop", productsCount: 52, totalSales: 7200000 },
  { id: "3", name: "Dell", logo: "https://images.unsplash.com/photo-1593640408182-31c70c8268f5?w=100&h=100&fit=crop", productsCount: 28, totalSales: 3400000 },
  { id: "4", name: "Sony", logo: "https://images.unsplash.com/photo-1606813907291-d86efa9b94db?w=100&h=100&fit=crop", productsCount: 38, totalSales: 4800000 },
  { id: "5", name: "HP", logo: "https://images.unsplash.com/photo-1625948515291-69613efd103f?w=100&h=100&fit=crop", productsCount: 31, totalSales: 2900000 },
  { id: "6", name: "Logitech", logo: "https://images.unsplash.com/photo-1527814050087-3793815479db?w=100&h=100&fit=crop", productsCount: 67, totalSales: 1800000 },
]

export default function BrandsPage({ params }: BrandsPageProps) {
  return (
    <>
      <StorePageHeader
        title="Marques"
        description="Gérer les marques de produits"
        action={{
          label: "Nouvelle marque",
          onClick: () => {},
          icon: Plus,
        }}
      />

      <div className="p-8 space-y-6">

      {/* Statistiques */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Marques</CardTitle>
            <Tag className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{mockBrands.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Produits</CardTitle>
            <Package className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {mockBrands.reduce((sum, b) => sum + b.productsCount, 0)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Ventes Totales</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {(mockBrands.reduce((sum, b) => sum + b.totalSales, 0) / 1000000).toFixed(1)}M
            </div>
            <p className="text-xs text-gray-500 mt-1">FCFA</p>
          </CardContent>
        </Card>
      </div>

      {/* Liste des marques */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {mockBrands.map((brand) => (
          <Card key={brand.id} className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <Avatar className="h-16 w-16 rounded-lg">
                  <AvatarImage src={brand.logo} alt={brand.name} />
                  <AvatarFallback className="rounded-lg text-lg font-semibold">
                    {brand.name.substring(0, 2)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg text-gray-900">{brand.name}</h3>
                  <div className="mt-3 space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Produits</span>
                      <span className="font-medium text-gray-900">{brand.productsCount}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Ventes</span>
                      <span className="font-medium text-gray-900">
                        {(brand.totalSales / 1000000).toFixed(1)}M FCFA
                      </span>
                    </div>
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
