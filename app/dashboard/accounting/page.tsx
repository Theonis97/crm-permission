"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { usePermissions } from "@/hooks/use-permissions"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { 
  Calculator, 
  Plus, 
  Receipt, 
  TrendingUp, 
  TrendingDown,
  ArrowRight,
  Loader2,
  AlertCircle,
  CalendarIcon,
  RefreshCw,
} from "lucide-react"
import { AccountingStatsCards } from "@/components/accounting/accounting-stats-cards"
import { ExpenseCard } from "@/components/accounting/expense-card"
import { ExpenseStatusBadge } from "@/components/accounting/expense-status-badge"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import { cn } from "@/lib/utils"

interface DashboardData {
  period: string
  storeId: string | null
  summary: {
    totalSales: number
    salesCount: number
    totalExpenses: number
    totalGeneralExpenses: number
    result: number
    isProfitable: boolean
    pendingExpensesAmount: number
    pendingExpensesCount: number
  }
  expensesByCategory: Array<{
    name: string
    color: string | null
    icon: string | null
    total: number
  }>
  recentExpenses: Array<any>
}

export default function AccountingDashboardPage() {
  const router = useRouter()
  const { hasPermission, loading: permissionsLoading } = usePermissions()
  
  const [storeId, setStoreId] = useState<string>("all")
  const [stores, setStores] = useState<Array<{ id: string; name: string }>>([])
  // Période par défaut: du 1er du mois en cours jusqu'à aujourd'hui
  const [startDate, setStartDate] = useState<Date>(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })
  const [endDate, setEndDate] = useState<Date>(new Date())
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
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

  const fetchDashboard = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      params.append("startDate", format(startDate, "yyyy-MM-dd"))
      params.append("endDate", format(endDate, "yyyy-MM-dd"))
      if (storeId && storeId !== "all") {
        params.append("storeId", storeId)
      }
      
      const response = await fetch(`/api/accounting/dashboard?${params}`)
      if (!response.ok) {
        throw new Error("Erreur lors du chargement des données")
      }
      const data = await response.json()
      setDashboardData(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue")
    } finally {
      setIsLoading(false)
    }
  }, [storeId, startDate, endDate])

  useEffect(() => {
    fetchStores()
  }, [fetchStores])

  useEffect(() => {
    if (!permissionsLoading) {
      fetchDashboard()
    }
  }, [fetchDashboard, permissionsLoading])

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
        <p className="text-gray-500">Vous n'avez pas la permission d'accéder à ce module.</p>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Rapport</h1>
          <p className="text-gray-500">Vue d'ensemble de la comptabilité</p>
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
          <Select value={storeId} onValueChange={setStoreId}>
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
          <Button variant="outline" size="icon" onClick={fetchDashboard} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-red-500" />
          <p className="text-red-700">{error}</p>
          <Button variant="outline" size="sm" onClick={fetchDashboard}>
            Réessayer
          </Button>
        </div>
      )}

      {/* Stats Cards */}
      <div className="mb-8">
        <AccountingStatsCards
            totalSales={dashboardData?.summary.totalSales || 0}
            totalExpenses={dashboardData?.summary.totalExpenses || 0}
            result={dashboardData?.summary.result || 0}
            isProfitable={dashboardData?.summary.isProfitable || false}
            pendingExpensesAmount={dashboardData?.summary.pendingExpensesAmount || 0}
            pendingExpensesCount={dashboardData?.summary.pendingExpensesCount || 0}
            isLoading={isLoading}
          />
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Dépenses par catégorie */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Receipt className="h-5 w-5 text-rose-500" />
                Dépenses par catégorie
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-10 bg-gray-100 rounded animate-pulse" />
                  ))}
                </div>
              ) : dashboardData?.expensesByCategory.length === 0 ? (
                <p className="text-gray-500 text-center py-4">Aucune dépense</p>
              ) : (
                <div className="space-y-3">
                  {dashboardData?.expensesByCategory.slice(0, 6).map((category, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: category.color || "#6b7280" }}
                        />
                        <span className="text-sm text-gray-700">{category.name}</span>
                      </div>
                      <span className="text-sm font-medium text-gray-900">
                        {category.total.toLocaleString("fr-FR")} FCFA
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Dernières dépenses */}
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingDown className="h-5 w-5 text-red-500" />
                Dernières dépenses
              </CardTitle>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => router.push("/dashboard/accounting/expenses")}
              >
                Voir tout
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-20 bg-gray-100 rounded animate-pulse" />
                  ))}
                </div>
              ) : dashboardData?.recentExpenses.length === 0 ? (
                <div className="text-center py-8">
                  <Receipt className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">Aucune dépense enregistrée</p>
                  <Button 
                    variant="outline" 
                    className="mt-3"
                    onClick={() => router.push("/dashboard/accounting/expenses")}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Créer une dépense
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {dashboardData?.recentExpenses.map((expense) => (
                    <ExpenseCard
                      key={expense.id}
                      expense={expense}
                      onView={(id) => router.push(`/dashboard/accounting/expenses?view=${id}`)}
                      onPay={(id) => router.push(`/dashboard/accounting/expenses?pay=${id}`)}
                      onEdit={(id) => router.push(`/dashboard/accounting/expenses?edit=${id}`)}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card 
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => router.push("/dashboard/accounting/expenses")}
          >
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-full bg-rose-100">
                <Receipt className="h-5 w-5 text-rose-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">Gérer les dépenses</p>
                <p className="text-sm text-gray-500">Voir et créer des dépenses</p>
              </div>
            </CardContent>
          </Card>

          <Card 
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => router.push("/dashboard/accounting/categories")}
          >
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-full bg-blue-100">
                <TrendingUp className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">Catégories</p>
                <p className="text-sm text-gray-500">Gérer les types de dépenses</p>
              </div>
            </CardContent>
          </Card>

          <Card 
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => router.push("/dashboard/accounting/reports")}
          >
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-full bg-green-100">
                <Calculator className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">Rapports</p>
                <p className="text-sm text-gray-500">Analyses détaillées</p>
              </div>
            </CardContent>
          </Card>
      </div>
    </div>
  )
}
