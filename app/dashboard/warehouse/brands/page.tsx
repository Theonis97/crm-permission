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
  Bookmark,
  Search,
  Plus,
  MoreHorizontal,
  Edit,
  Trash2,
  Package,
  TrendingUp,
} from "lucide-react"

interface Brand {
  id: string
  name: string
  logo?: string
  productCount: number
  description: string
}

const mockBrands: Brand[] = [
  {
    id: "1",
    name: "Dell",
    productCount: 45,
    description: "Ordinateurs et périphériques professionnels",
  },
  {
    id: "2",
    name: "Logitech",
    productCount: 67,
    description: "Périphériques informatiques et accessoires",
  },
  {
    id: "3",
    name: "Samsung",
    productCount: 52,
    description: "Écrans, smartphones et électronique",
  },
  {
    id: "4",
    name: "HP",
    productCount: 38,
    description: "Imprimantes et consommables",
  },
  {
    id: "5",
    name: "Apple",
    productCount: 29,
    description: "Produits Apple et accessoires",
  },
  {
    id: "6",
    name: "Lenovo",
    productCount: 41,
    description: "Ordinateurs portables et stations de travail",
  },
  {
    id: "7",
    name: "Microsoft",
    productCount: 33,
    description: "Logiciels et périphériques Surface",
  },
  {
    id: "8",
    name: "Sony",
    productCount: 24,
    description: "Audio et accessoires multimédia",
  },
  {
    id: "9",
    name: "Cisco",
    productCount: 18,
    description: "Équipements réseau et télécommunications",
  },
  {
    id: "10",
    name: "Asus",
    productCount: 35,
    description: "Composants informatiques et périphériques",
  },
  {
    id: "11",
    name: "Canon",
    productCount: 27,
    description: "Imprimantes et scanners",
  },
  {
    id: "12",
    name: "Epson",
    productCount: 22,
    description: "Imprimantes et projecteurs",
  },
]

export default function BrandsPage() {
  const [brands] = useState<Brand[]>(mockBrands)
  const [searchTerm, setSearchTerm] = useState("")

  const filteredBrands = brands.filter(
    (brand) =>
      brand.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      brand.description.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const totalProducts = brands.reduce((sum, brand) => sum + brand.productCount, 0)

  return (
    <>
      <ModuleNavbar
        title="Marques"
        description="Gestion des marques de produits"
        icon={Bookmark}
        primaryAction={{
          label: "Nouvelle marque",
          onClick: () => console.log("Create brand"),
          icon: Plus,
        }}
      />

      <div className="py-8">
        <div className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8 space-y-6">

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total marques</CardTitle>
              <Bookmark className="h-4 w-4 text-gray-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{brands.length}</div>
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
              <CardTitle className="text-sm font-medium text-gray-600">Moyenne par marque</CardTitle>
              <TrendingUp className="h-4 w-4 text-gray-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">
                {Math.round(totalProducts / brands.length)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recherche */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Rechercher une marque..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Liste des marques */}
        {filteredBrands.length === 0 ? (
          <div className="text-center py-12">
            <Bookmark className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-4 text-lg font-semibold text-gray-900">Aucune marque trouvée</h3>
            <p className="text-gray-500 mt-2">Aucune marque ne correspond à vos critères.</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredBrands.map((brand) => (
              <Card
                key={brand.id}
                className="hover:shadow-lg transition-all cursor-pointer border-gray-200"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center border border-gray-200">
                        <Bookmark className="h-6 w-6 text-gray-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-base font-semibold text-gray-900">
                          {brand.name}
                        </CardTitle>
                        <Badge variant="outline" className="text-xs mt-1 border-blue-200 text-blue-700 bg-blue-50">
                          {brand.productCount} produits
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
                  <p className="text-sm text-gray-600">{brand.description}</p>
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
