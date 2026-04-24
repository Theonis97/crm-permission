"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Loader2, TrendingUp, Package, ImageIcon, Trophy, Medal } from "lucide-react"
import { toast } from "@/lib/app-toast"

interface TopProduct {
  rank: number
  id: string
  name: string
  sku: string | null
  photos: string[]
  quantity: number
  revenue: number
  ordersCount: number
  categoryName: string
  brandName: string
  averagePrice: number
}

interface TopProductsModalProps {
  isOpen: boolean
  onClose: () => void
  storeId: string
}

const PAGE_SIZE = 30

export function TopProductsModal({ isOpen, onClose, storeId }: TopProductsModalProps) {
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [products, setProducts] = useState<TopProduct[]>([])
  const [selectedMonth, setSelectedMonth] = useState<string>("")
  const [availableMonths, setAvailableMonths] = useState<{ value: string; label: string }[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [offset, setOffset] = useState(0)
  const scrollRef = useRef<HTMLDivElement>(null)

  const hasMore = products.length < totalCount

  useEffect(() => {
    if (isOpen) {
      setProducts([])
      setOffset(0)
      loadTopProducts(0, true)
    }
  }, [isOpen, selectedMonth, storeId])

  const loadTopProducts = async (currentOffset: number, reset: boolean = false) => {
    try {
      if (reset) {
        setLoading(true)
      } else {
        setLoadingMore(true)
      }
      
      const params = new URLSearchParams()
      if (selectedMonth) params.append("month", selectedMonth)
      params.append("limit", PAGE_SIZE.toString())
      params.append("offset", currentOffset.toString())
      
      const response = await fetch(`/api/stores/${storeId}/top-products?${params.toString()}`)
      
      if (!response.ok) throw new Error("Erreur lors du chargement")
      
      const data = await response.json()
      
      if (reset) {
        setProducts(data.products)
      } else {
        setProducts(prev => [...prev, ...data.products])
      }
      
      setTotalCount(data.totalCount || data.products.length)
      setOffset(currentOffset + data.products.length)
      
      // Initialiser les mois disponibles seulement la première fois
      if (availableMonths.length === 0) {
        setAvailableMonths(data.availableMonths)
        if (!selectedMonth && data.availableMonths.length > 0) {
          setSelectedMonth(data.availableMonths[0].value)
        }
      }
    } catch (error) {
      console.error("Error loading top products:", error)
      toast.error("Erreur lors du chargement des produits")
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }

  const loadMore = useCallback(() => {
    if (!loadingMore && hasMore) {
      loadTopProducts(offset, false)
    }
  }, [loadingMore, hasMore, offset])

  const getRankBadge = (rank: number) => {
    if (rank === 1) {
      return (
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 text-white shadow-lg">
          <Trophy className="w-4 h-4" />
        </div>
      )
    }
    if (rank === 2) {
      return (
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-gray-300 to-gray-500 text-white shadow-md">
          <Medal className="w-4 h-4" />
        </div>
      )
    }
    if (rank === 3) {
      return (
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 text-white shadow-md">
          <Medal className="w-4 h-4" />
        </div>
      )
    }
    return (
      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 text-gray-600 font-semibold text-sm">
        {rank}
      </div>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0">
        <DialogHeader className="p-6 pb-4 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <TrendingUp className="w-6 h-6 text-blue-600" />
                Produits les Plus Vendus
              </DialogTitle>
              <p className="text-sm text-gray-500 mt-1">
                Classement basé sur les quantités vendues
              </p>
            </div>
            <div className="flex items-center gap-4">
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="w-[200px] bg-white">
                  <SelectValue placeholder="Sélectionner un mois" />
                </SelectTrigger>
                <SelectContent>
                  {availableMonths.map((month) => (
                    <SelectItem key={month.value} value={month.value}>
                      {month.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

        </DialogHeader>

        <div ref={scrollRef} className="h-[500px] overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              <span className="ml-3 text-gray-600">Chargement des produits...</span>
            </div>
          ) : products.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-500">
              <Package className="w-16 h-16 mb-4 text-gray-300" />
              <p className="text-lg font-medium">Aucune vente pour cette période</p>
              <p className="text-sm">Sélectionnez un autre mois pour voir les données</p>
            </div>
          ) : (
            <div className="p-4">
              <div className="space-y-2">
                {products.map((product) => (
                  <div
                    key={product.id}
                    className={`flex items-center gap-4 p-4 rounded-xl border transition-all hover:shadow-md ${
                      product.rank <= 3
                        ? "bg-gradient-to-r from-white to-blue-50 border-blue-100"
                        : "bg-white border-gray-100 hover:border-gray-200"
                    }`}
                  >
                    {/* Rang */}
                    {getRankBadge(product.rank)}

                    {/* Image du produit */}
                    <div className="w-14 h-14 rounded-lg bg-gray-100 flex items-center justify-center overflow-hidden border">
                      {product.photos && product.photos.length > 0 ? (
                        <img
                          src={product.photos[0]}
                          alt={product.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <ImageIcon className="w-6 h-6 text-gray-400" />
                      )}
                    </div>

                    {/* Informations produit */}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-gray-900 truncate">{product.name}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {product.categoryName}
                        </Badge>
                      </div>
                    </div>

                    {/* Statistiques */}
                    <div className="flex items-center text-right">
                      <div>
                        <p className="text-xs text-gray-500">Ventes</p>
                        <p className="font-bold text-lg text-blue-600">
                          {product.quantity.toLocaleString("fr-FR")}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Bouton charger plus */}
              {hasMore && (
                <div className="flex justify-center mt-4 pb-2">
                  <Button
                    variant="outline"
                    onClick={loadMore}
                    disabled={loadingMore}
                    className="w-full max-w-xs"
                  >
                    {loadingMore ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Chargement...
                      </>
                    ) : (
                      `Charger plus (${products.length}/${totalCount})`
                    )}
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
