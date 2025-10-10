"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { StorePageHeader } from "@/components/stores/store-page-header"
import { FolderTree, Plus, Package } from "lucide-react"

interface CategoriesPageProps {
  params: {
    id: string
  }
}

const mockCategories = [
  { id: "1", name: "Électronique", description: "Produits électroniques", productsCount: 45, color: "bg-blue-100 text-blue-700" },
  { id: "2", name: "Téléphones", description: "Smartphones et accessoires", productsCount: 67, color: "bg-purple-100 text-purple-700" },
  { id: "3", name: "Audio", description: "Casques, écouteurs et enceintes", productsCount: 32, color: "bg-green-100 text-green-700" },
  { id: "4", name: "Gaming", description: "Consoles et jeux vidéo", productsCount: 28, color: "bg-red-100 text-red-700" },
  { id: "5", name: "Accessoires", description: "Câbles, chargeurs et autres", productsCount: 89, color: "bg-amber-100 text-amber-700" },
  { id: "6", name: "PC & Laptops", description: "Ordinateurs portables et de bureau", productsCount: 41, color: "bg-indigo-100 text-indigo-700" },
]

export default function CategoriesPage({ params }: CategoriesPageProps) {
  return (
    <>
      <StorePageHeader
        title="Catégories"
        description="Organiser les produits par catégorie"
        action={{
          label: "Nouvelle catégorie",
          onClick: () => {},
          icon: Plus,
        }}
      />

      <div className="p-8 space-y-6">

      {/* Statistiques */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Catégories</CardTitle>
            <FolderTree className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{mockCategories.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Produits</CardTitle>
            <Package className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {mockCategories.reduce((sum, c) => sum + c.productsCount, 0)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Moyenne/Catégorie</CardTitle>
            <Package className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {Math.round(mockCategories.reduce((sum, c) => sum + c.productsCount, 0) / mockCategories.length)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Liste des catégories */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {mockCategories.map((category) => (
          <Card key={category.id} className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-lg ${category.color}`}>
                  <FolderTree className="h-6 w-6" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">{category.name}</h3>
                  <p className="text-sm text-gray-600 mt-1">{category.description}</p>
                  <div className="mt-4 flex items-center gap-2">
                    <Package className="h-4 w-4 text-gray-400" />
                    <span className="text-sm font-medium text-gray-900">
                      {category.productsCount} produits
                    </span>
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
