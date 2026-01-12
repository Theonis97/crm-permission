"use client"

import { useState, useEffect, useCallback } from "react"
import { usePermissions } from "@/hooks/use-permissions"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { 
  TrendingUp, 
  Loader2,
  AlertCircle,
  Store,
  CalendarIcon,
  DollarSign,
  ShoppingBag,
  RefreshCw,
} from "lucide-react"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import { cn } from "@/lib/utils"

interface StoreRevenue {
  storeId: string
  storeName: string
  totalRevenue: number
  ordersCount: number
  averageOrder: number
}

interface RevenueData {
  period: string
  startDate: string
  endDate: string
  storeId: string | null
  totalRevenue: number
  totalOrders: number
  averageOrder: number
  storeRevenues: StoreRevenue[]
}

export default function RevenuesPage() {
  const { hasPermission, loading: permissionsLoading } = usePermissions()
  
  const [stores, setStores] = useState<Array<{ id: string; name: string }>>([])
  const [selectedStoreId, setSelectedStoreId] = useState<string>("all")
  // Période par défaut: du 1er du mois en cours jusqu'à aujourd'hui
  const [startDate, setStartDate] = useState<Date>(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })
  const [endDate, setEndDate] = useState<Date>(new Date())
  
  const [revenueData, setRevenueData] = useState<RevenueData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchStores = useCallback(async () => {
    try {
      const response = await fetch("/api/stores")
      if (response.ok) {
        const data = await response.json()
        // L'API retourne directement un tableau de magasins
        setStores(Array.isArray(data) ? data : [])
      }
    } catch (err) {
      console.error("Error fetching stores:", err)
    }
  }, [])

  const fetchRevenues = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      const params = new URLSearchParams()
      params.append("startDate", format(startDate, "yyyy-MM-dd"))
      params.append("endDate", format(endDate, "yyyy-MM-dd"))
      
      if (selectedStoreId && selectedStoreId !== "all") {
        params.append("storeId", selectedStoreId)
      }
      
      const response = await fetch(`/api/accounting/revenues?${params}`)
      if (!response.ok) {
        throw new Error("Erreur lors du chargement des recettes")
      }
      const data = await response.json()
      setRevenueData(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue")
    } finally {
      setIsLoading(false)
    }
  }, [startDate, endDate, selectedStoreId])

  useEffect(() => {
    fetchStores()
  }, [fetchStores])

  useEffect(() => {
    if (!permissionsLoading) {
      fetchRevenues()
    }
  }, [fetchRevenues, permissionsLoading])

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString("fr-FR") + " FCFA"
  }

  const getPeriodLabel = () => {
    const start = format(startDate, "d MMM yyyy", { locale: fr })
    const end = format(endDate, "d MMM yyyy", { locale: fr })
    if (start === end) return start
    return `${start} - ${end}`
  }

  if (permissionsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-gray-600" />
      </div>
    )
  }

  if (!hasPermission("accounting.view")) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Accès refusé</h2>
        <p className="text-gray-500">Vous n'avez pas la permission d'accéder aux recettes.</p>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* Header avec filtres inline */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Recettes</h1>
          <p className="text-gray-500">{getPeriodLabel()}</p>
        </div>
        
        <div className="flex items-center gap-3 flex-wrap">
          {/* Date début */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn("justify-start text-left font-normal")}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                {format(startDate, "dd/MM/yyyy")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 z-[100]" align="end">
              <Calendar
                mode="single"
                selected={startDate}
                onSelect={(date) => date && setStartDate(date)}
                initialFocus
                locale={fr}
              />
            </PopoverContent>
          </Popover>

          <span className="text-gray-400">→</span>

          {/* Date fin */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn("justify-start text-left font-normal")}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                {format(endDate, "dd/MM/yyyy")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 z-[100]" align="end">
              <Calendar
                mode="single"
                selected={endDate}
                onSelect={(date) => date && setEndDate(date)}
                initialFocus
                locale={fr}
              />
            </PopoverContent>
          </Popover>

          {/* Magasin */}
          <Select value={selectedStoreId} onValueChange={setSelectedStoreId}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Tous les magasins" />
            </SelectTrigger>
            <SelectContent className="z-[100]">
              <SelectItem value="all">Tous les magasins</SelectItem>
              {stores.map((store) => (
                <SelectItem key={store.id} value={store.id}>
                  {store.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Actualiser */}
          <Button variant="outline" size="icon" onClick={fetchRevenues} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-red-500" />
          <p className="text-red-700">{error}</p>
          <Button variant="outline" size="sm" onClick={fetchRevenues}>
            Réessayer
          </Button>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100">
                <DollarSign className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Chiffre d'affaires</p>
                <p className="text-xl font-bold text-gray-900">
                  {isLoading ? "..." : formatCurrency(revenueData?.totalRevenue || 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100">
                <ShoppingBag className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Commandes</p>
                <p className="text-xl font-bold text-gray-900">
                  {isLoading ? "..." : revenueData?.totalOrders || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100">
                <TrendingUp className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Panier moyen</p>
                <p className="text-xl font-bold text-gray-900">
                  {isLoading ? "..." : formatCurrency(revenueData?.averageOrder || 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Store Revenues */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Store className="h-5 w-5 text-gray-500" />
            Recettes par magasin
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : !revenueData?.storeRevenues?.length ? (
            <div className="text-center py-8">
              <Store className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">Aucune recette pour cette période</p>
            </div>
          ) : (
            <div className="space-y-3">
              {revenueData.storeRevenues.map((store) => (
                <div 
                  key={store.storeId} 
                  className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-gray-100">
                        <Store className="h-5 w-5 text-gray-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{store.storeName}</p>
                        <p className="text-sm text-gray-500">
                          {store.ordersCount} commande(s) • Panier moyen: {formatCurrency(store.averageOrder)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-green-600">
                        {formatCurrency(store.totalRevenue)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
