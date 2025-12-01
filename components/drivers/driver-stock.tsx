"use client"

import { useState, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { 
  Package, 
  Loader2, 
  Search,
  AlertTriangle,
  Box,
  DollarSign,
  AlertCircle,
  ImageIcon
} from "lucide-react"

interface StockItem {
  id: string
  productId: string
  variantId: string | null
  quantity: number
  reserved: number
  product: {
    id: string
    name: string
    sku: string | null
    prixVente: number
    photos?: string[]
  }
  variant: {
    id: string
    name: string | null
    sku: string
    prixVente: number | null
  } | null
}

interface StockSummary {
  totalItems: number
  totalValue: number
  totalProducts: number
  lowStockCount: number
}

interface DriverStockData {
  items: StockItem[]
  summary: StockSummary
}

interface DriverStockProps {
  driverId: string
}

export function DriverStock({ driverId }: DriverStockProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [stockData, setStockData] = useState<DriverStockData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")

  useEffect(() => {
    loadStock()
  }, [driverId])

  const loadStock = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/delivery-persons/${driverId}/stock`)
      if (!response.ok) {
        throw new Error("Erreur lors du chargement du stock")
      }
      const data = await response.json()
      setStockData(data)
    } catch (err: any) {
      console.error("Error loading stock:", err)
      setError(err.message || "Erreur lors du chargement")
    } finally {
      setIsLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("fr-FR").format(amount) + " FCFA"
  }

  const getStockStatus = (quantity: number, reserved: number) => {
    const available = quantity - reserved
    if (available <= 0) {
      return <Badge className="bg-red-100 text-red-700">Rupture</Badge>
    }
    if (available <= 5) {
      return <Badge className="bg-amber-100 text-amber-700">Stock faible</Badge>
    }
    return <Badge className="bg-green-100 text-green-700">En stock</Badge>
  }

  const filteredItems = stockData?.items.filter(item => {
    const productName = item.product.name.toLowerCase()
    const sku = (item.variant?.sku || item.product.sku || "").toLowerCase()
    const search = searchTerm.toLowerCase()
    return productName.includes(search) || sku.includes(search)
  }) || []

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <AlertCircle className="h-12 w-12 text-red-400 mb-4" />
        <p className="text-gray-600">{error}</p>
      </div>
    )
  }

  if (!stockData) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Package className="h-12 w-12 text-gray-300 mb-4" />
        <p className="text-gray-500">Aucune donnée de stock disponible</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Statistiques du stock */}
      <div className="grid grid-cols-3 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br py-0 from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-200 rounded-lg">
                <Box className="h-5 w-5 text-blue-700" />
              </div>
              <div>
                <p className="text-sm text-blue-600">Produits</p>
                <p className="text-2xl font-bold text-blue-700">{stockData.summary.totalProducts}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br py-0 from-green-50 to-green-100 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-200 rounded-lg">
                <Package className="h-5 w-5 text-green-700" />
              </div>
              <div>
                <p className="text-sm text-green-600">Unités</p>
                <p className="text-2xl font-bold text-green-700">{stockData.summary.totalItems}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br py-0 from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-200 rounded-lg">
                <DollarSign className="h-5 w-5 text-purple-700" />
              </div>
              <div>
                <p className="text-sm text-purple-600">Valeur</p>
                <p className="text-lg font-bold text-purple-700">{formatCurrency(stockData.summary.totalValue)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

      </div>

      {/* Recherche */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <Input
          placeholder="Rechercher un produit..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Tableau du stock */}
     
        <div>
          {filteredItems.length > 0 ? (
            <ScrollArea className="h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">Image</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead className="text-center">Quantité</TableHead>
                    <TableHead className="text-center">Réservé</TableHead>
                    <TableHead className="text-right">Prix unitaire</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.map((item) => {
                    const available = item.quantity - item.reserved
                    const price = item.variant?.prixVente || item.product.prixVente
                    return (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div className="w-12 h-12 rounded-md overflow-hidden bg-gray-100 flex items-center justify-center">
                            {item.product.photos && item.product.photos.length > 0 ? (
                              <img
                                src={item.product.photos[0]}
                                alt={item.product.name}
                                className="w-full h-full object-contain"
                              />
                            ) : (
                              <ImageIcon className="h-6 w-6 text-gray-400" />
                            )}
                          </div>
                        </TableCell>
                    
                        <TableCell className="text-gray-600 font-mono text-sm">
                          {item.variant?.sku || item.product.sku || "-"}
                        </TableCell>
                        <TableCell className="text-center font-medium">
                          {item.quantity}
                        </TableCell>
                        <TableCell className="text-center text-amber-600">
                          {item.reserved}
                        </TableCell>
                        
                       
                        <TableCell className="text-right font-medium">
                          {formatCurrency(price)}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </ScrollArea>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Package className="h-12 w-12 text-gray-300 mb-4" />
              <p className="text-gray-500">
                {searchTerm ? "Aucun produit trouvé" : "Aucun stock disponible"}
              </p>
            </div>
          )}
        </div>
    </div>
  )
}
