"use client"

import { useState } from "react"
import { ModuleNavbar } from "@/components/navigation/module-navbar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Tags,
  Search,
  Plus,
  MoreHorizontal,
  Edit,
  Trash2,
  Package,
  TrendingUp,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface Category {
  id: string
  name: string
  description: string
  productCount: number
  color: string
  icon: string
}

const mockCategories: Category[] = [
  {
    id: "1",
    name: "Informatique",
    description: "Ordinateurs, périphériques et accessoires informatiques",
    productCount: 156,
    color: "bg-blue-100 text-blue-800 border-blue-200",
    icon: "💻",
  },
  {
    id: "2",
    name: "Audio & Vidéo",
    description: "Équipements audio, vidéo et multimédia",
    productCount: 89,
    color: "bg-purple-100 text-purple-800 border-purple-200",
    icon: "🎧",
  },
  {
    id: "3",
    name: "Téléphonie",
    description: "Smartphones, accessoires et équipements téléphoniques",
    productCount: 124,
    color: "bg-green-100 text-green-800 border-green-200",
    icon: "📱",
  },
  {
    id: "4",
    name: "Réseau",
    description: "Équipements réseau, câbles et connectivité",
    productCount: 67,
    color: "bg-amber-100 text-amber-800 border-amber-200",
    icon: "🌐",
  },
  {
    id: "5",
    name: "Bureautique",
    description: "Fournitures et équipements de bureau",
    productCount: 203,
    color: "bg-pink-100 text-pink-800 border-pink-200",
    icon: "📝",
  },
  {
    id: "6",
    name: "Consommables",
    description: "Cartouches, toners et autres consommables",
    productCount: 178,
    color: "bg-gray-100 text-gray-800 border-gray-200",
    icon: "🖨️",
  },
  {
    id: "7",
    name: "Accessoires",
    description: "Divers accessoires et petits équipements",
    productCount: 245,
    color: "bg-cyan-100 text-cyan-800 border-cyan-200",
    icon: "🔌",
  },
  {
    id: "8",
    name: "Gaming",
    description: "Équipements et accessoires gaming",
    productCount: 92,
    color: "bg-red-100 text-red-800 border-red-200",
    icon: "🎮",
  },
]

export default function CategoriesPage() {
  const [categories] = useState<Category[]>(mockCategories)
  const [searchTerm, setSearchTerm] = useState("")

  const filteredCategories = categories.filter(
    (category) =>
      category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      category.description.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const totalProducts = categories.reduce((sum, cat) => sum + cat.productCount, 0)

  return (
    <>
      <ModuleNavbar
        title="Catégories de produits"
        description="Organisez vos produits par catégorie"
        icon={Tags}
        primaryAction={{
          label: "Nouvelle catégorie",
          onClick: () => console.log("Create category"),
          icon: Plus,
        }}
      />

      <div className="py-8">
        <div className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8 space-y-6">

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total catégories</CardTitle>
              <Tags className="h-4 w-4 text-gray-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{categories.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total produits</CardTitle>
              <Package className="h-4 w-4 text-gray-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{totalProducts.toLocaleString()}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Moyenne par catégorie</CardTitle>
              <TrendingUp className="h-4 w-4 text-gray-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">
                {Math.round(totalProducts / categories.length)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recherche */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Rechercher une catégorie..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Liste des catégories */}
        {filteredCategories.length === 0 ? (
          <div className="text-center py-12">
            <Tags className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-4 text-lg font-semibold text-gray-900">Aucune catégorie trouvée</h3>
            <p className="text-gray-500 mt-2">Aucune catégorie ne correspond à vos critères.</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredCategories.map((category) => (
              <Card
                key={category.id}
                className="hover:shadow-lg transition-all cursor-pointer border-gray-200"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center text-2xl border border-gray-200">
                        {category.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-base font-semibold text-gray-900 truncate">
                          {category.name}
                        </CardTitle>
                        <Badge variant="outline" className={cn("text-xs mt-1", category.color)}>
                          {category.productCount} produits
                        </Badge>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
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
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 line-clamp-2">{category.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
        </div>
      </div>
    </>
  )
}
