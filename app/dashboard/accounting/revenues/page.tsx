"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { usePermissions } from "@/hooks/use-permissions"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { 
  TrendingUp, 
  TrendingDown,
  Loader2,
  AlertCircle,
  Store,
  CalendarIcon,
  DollarSign,
  RefreshCw,
  Plus,
  Eye,
  Trash2,
  Receipt,
  Wallet,
  Calculator,
  ChevronRight,
  Building2,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  Download,
  FileText,
  FileSpreadsheet,
} from "lucide-react"
import { format, isToday, isYesterday, parseISO } from "date-fns"
import { fr } from "date-fns/locale"
import { cn } from "@/lib/utils"
import { toast } from "@/lib/app-toast"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { exportToExcel, exportToPdf } from "@/lib/export-utils"

interface DailyRevenue {
  id: string
  storeId: string
  date: string
  totalDayCloses: number
  totalExpenses: number
  countedRevenue: number | null
  notes: string | null
  store: { id: string; name: string }
  createdBy?: { id: string; name: string; firstName?: string; lastName?: string }
}

interface DayClose {
  id: string
  totalRevenue: number
  totalSales: number
  totalItems: number
  user: { id: string; name: string; firstName?: string; lastName?: string }
  createdAt: string
}

interface Expense {
  id: string
  description: string
  amount: number
  category: { id: string; name: string; color?: string; icon?: string }
  createdBy?: { id: string; name: string }
  createdAt: string
}

interface DailyRevenueDetail extends DailyRevenue {
  dayCloses: DayClose[]
  expenses: Expense[]
  netRevenue: number
}

interface RevenueData {
  dailyRevenues: DailyRevenue[]
  totals: {
    totalDayCloses: number
    totalExpenses: number
    totalCountedRevenue: number
    totalNetRevenue: number
  }
  period: {
    startDate: string
    endDate: string
  }
}

export default function RevenuesPage() {
  const { hasPermission, loading: permissionsLoading } = usePermissions()
  
  const [stores, setStores] = useState<Array<{ id: string; name: string }>>([])
  const [selectedStoreId, setSelectedStoreId] = useState<string>("all")
  const [startDate, setStartDate] = useState<Date>(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })
  const [endDate, setEndDate] = useState<Date>(new Date())
  
  const [revenueData, setRevenueData] = useState<RevenueData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // États pour les accordéons et détails
  const [expandedRevenues, setExpandedRevenues] = useState<Set<string>>(new Set())
  const [revenueDetails, setRevenueDetails] = useState<{ [key: string]: DailyRevenueDetail }>({})
  const [loadingDetails, setLoadingDetails] = useState<Set<string>>(new Set())
  
  // États pour le dialog de détails (conservé pour édition)
  const [selectedRevenue, setSelectedRevenue] = useState<DailyRevenueDetail | null>(null)
  const [showDetailDialog, setShowDetailDialog] = useState(false)
  const [loadingDetail, setLoadingDetail] = useState(false)
  
  // États pour le dialog de création/édition
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [createStoreId, setCreateStoreId] = useState<string>("")
  const [createDate, setCreateDate] = useState<Date>(new Date())
  const [editCountedRevenue, setEditCountedRevenue] = useState<string>("")
  const [editNotes, setEditNotes] = useState<string>("")
  const [isSaving, setIsSaving] = useState(false)

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
      
      const response = await fetch(`/api/accounting/daily-revenues?${params}`)
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

  const fetchRevenueDetail = async (id: string) => {
    setLoadingDetail(true)
    try {
      const response = await fetch(`/api/accounting/daily-revenues/${id}`)
      if (!response.ok) throw new Error("Erreur lors du chargement des détails")
      const data = await response.json()
      setSelectedRevenue(data)
      setEditCountedRevenue(data.countedRevenue?.toString() || "")
      setEditNotes(data.notes || "")
      setShowDetailDialog(true)
    } catch (err) {
      toast.error("Erreur lors du chargement des détails")
    } finally {
      setLoadingDetail(false)
    }
  }

  const toggleAccordion = async (id: string) => {
    const newExpanded = new Set(expandedRevenues)
    
    if (newExpanded.has(id)) {
      newExpanded.delete(id)
      setExpandedRevenues(newExpanded)
    } else {
      newExpanded.add(id)
      setExpandedRevenues(newExpanded)
      
      // Charger les détails si pas encore en cache
      if (!revenueDetails[id]) {
        setLoadingDetails(prev => new Set(prev).add(id))
        try {
          const response = await fetch(`/api/accounting/daily-revenues/${id}`)
          if (response.ok) {
            const data = await response.json()
            setRevenueDetails(prev => ({ ...prev, [id]: data }))
          }
        } catch (err) {
          console.error("Erreur chargement détails:", err)
        } finally {
          setLoadingDetails(prev => {
            const next = new Set(prev)
            next.delete(id)
            return next
          })
        }
      }
    }
  }

  const openEditDialog = (detail: DailyRevenueDetail) => {
    setSelectedRevenue(detail)
    setEditCountedRevenue(detail.countedRevenue?.toString() || "")
    setEditNotes(detail.notes || "")
    setShowDetailDialog(true)
  }

  const handleCreateRevenue = async () => {
    if (!createStoreId) {
      toast.error("Veuillez sélectionner un magasin")
      return
    }
    setIsSaving(true)
    try {
      const response = await fetch("/api/accounting/daily-revenues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeId: createStoreId,
          date: format(createDate, "yyyy-MM-dd"),
          countedRevenue: editCountedRevenue ? parseFloat(editCountedRevenue) : null,
          notes: editNotes || null,
        }),
      })
      if (!response.ok) throw new Error("Erreur lors de la création")
      toast.success("Recette journalière créée")
      setShowCreateDialog(false)
      fetchRevenues()
    } catch (err) {
      toast.error("Erreur lors de la création")
    } finally {
      setIsSaving(false)
    }
  }

  const handleUpdateCountedRevenue = async () => {
    if (!selectedRevenue) return
    setIsSaving(true)
    try {
      const response = await fetch(`/api/accounting/daily-revenues/${selectedRevenue.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          countedRevenue: editCountedRevenue ? parseFloat(editCountedRevenue) : null,
          notes: editNotes || null,
        }),
      })
      if (!response.ok) throw new Error("Erreur lors de la mise à jour")
      toast.success("Recette comptée mise à jour")
      setShowDetailDialog(false)
      fetchRevenues()
    } catch (err) {
      toast.error("Erreur lors de la mise à jour")
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteRevenue = async (id: string) => {
    if (!confirm("Supprimer cette recette journalière ?")) return
    try {
      const response = await fetch(`/api/accounting/daily-revenues/${id}`, {
        method: "DELETE",
      })
      if (!response.ok) throw new Error("Erreur lors de la suppression")
      toast.success("Recette supprimée")
      setShowDetailDialog(false)
      fetchRevenues()
    } catch (err) {
      toast.error("Erreur lors de la suppression")
    }
  }

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

  const formatCurrencyShort = (amount: number) => {
    if (amount >= 1000000) {
      return (amount / 1000000).toFixed(1) + "M"
    }
    if (amount >= 1000) {
      return (amount / 1000).toFixed(0) + "K"
    }
    return amount.toLocaleString("fr-FR")
  }

  const getPeriodLabel = () => {
    const start = format(startDate, "d MMM yyyy", { locale: fr })
    const end = format(endDate, "d MMM yyyy", { locale: fr })
    if (start === end) return start
    return `${start} - ${end}`
  }

  const getNetRevenue = (dr: DailyRevenue) => {
    return (dr.countedRevenue || dr.totalDayCloses) - dr.totalExpenses
  }

  const getActiveFiltersLabel = () => {
    if (selectedStoreId !== "all") {
      const store = stores.find((s) => s.id === selectedStoreId)
      return store ? `Magasin: ${store.name}` : "Filtre magasin"
    }
    return "Tous les magasins"
  }

  const getRevenueExportData = () => {
    if (!revenueData?.dailyRevenues) return []
    return revenueData.dailyRevenues.map((dr) => ({
      date: dr.date,
      store: dr.store?.name || "",
      totalDayCloses: dr.totalDayCloses,
      totalExpenses: dr.totalExpenses,
      countedRevenue: dr.countedRevenue || 0,
      netRevenue: getNetRevenue(dr),
    }))
  }

  const revenueExportColumns = [
    { header: "Date", key: "date", format: "date" as const, align: "left" as const },
    { header: "Magasin", key: "store", format: "text" as const, align: "left" as const },
    { header: "Clôtures caisse", key: "totalDayCloses", format: "currency" as const, align: "right" as const },
    { header: "Dépenses", key: "totalExpenses", format: "currency" as const, align: "right" as const },
    { header: "Recette comptée", key: "countedRevenue", format: "currency" as const, align: "right" as const },
    { header: "Résultat net", key: "netRevenue", format: "currency" as const, align: "right" as const },
  ]

  const handleExportPdf = () => {
    const data = getRevenueExportData()
    exportToPdf({
      filename: `recettes-${format(startDate, "yyyy-MM-dd")}-${format(endDate, "yyyy-MM-dd")}`,
      title: "Rapport des Recettes",
      subtitle: `${data.length} recette(s) journalière(s)`,
      period: `${format(startDate, "dd/MM/yyyy")} — ${format(endDate, "dd/MM/yyyy")}`,
      filters: getActiveFiltersLabel(),
      columns: revenueExportColumns,
      data,
      totals: {
        totalDayCloses: revenueData?.totals?.totalDayCloses || 0,
        totalExpenses: revenueData?.totals?.totalExpenses || 0,
        countedRevenue: revenueData?.totals?.totalCountedRevenue || 0,
        netRevenue: revenueData?.totals?.totalNetRevenue || 0,
      },
    })
  }

  const handleExportExcel = () => {
    const data = getRevenueExportData()
    exportToExcel({
      filename: `recettes-${format(startDate, "yyyy-MM-dd")}-${format(endDate, "yyyy-MM-dd")}`,
      title: "Rapport des Recettes",
      subtitle: `Période: ${format(startDate, "dd/MM/yyyy")} — ${format(endDate, "dd/MM/yyyy")} | ${getActiveFiltersLabel()}`,
      columns: revenueExportColumns,
      data,
      totals: {
        totalDayCloses: revenueData?.totals?.totalDayCloses || 0,
        totalExpenses: revenueData?.totals?.totalExpenses || 0,
        countedRevenue: revenueData?.totals?.totalCountedRevenue || 0,
        netRevenue: revenueData?.totals?.totalNetRevenue || 0,
      },
    })
  }

  const getDateLabel = (dateStr: string) => {
    const date = new Date(dateStr)
    if (isToday(date)) return "Aujourd'hui"
    if (isYesterday(date)) return "Hier"
    return format(date, "EEEE d MMMM", { locale: fr })
  }

  // Grouper les recettes par date
  const revenuesByDate = useMemo(() => {
    if (!revenueData?.dailyRevenues) return []
    
    const grouped: { [key: string]: DailyRevenue[] } = {}
    revenueData.dailyRevenues.forEach(dr => {
      const dateKey = dr.date.split('T')[0]
      if (!grouped[dateKey]) grouped[dateKey] = []
      grouped[dateKey].push(dr)
    })
    
    return Object.entries(grouped)
      .sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime())
      .map(([date, revenues]) => ({
        date,
        revenues,
        totalCloses: revenues.reduce((sum, r) => sum + r.totalDayCloses, 0),
        totalExpenses: revenues.reduce((sum, r) => sum + r.totalExpenses, 0),
        totalNet: revenues.reduce((sum, r) => sum + getNetRevenue(r), 0),
      }))
  }, [revenueData])

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
                onSelect={(date: Date | undefined) => date && setStartDate(date)}
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
                onSelect={(date: Date | undefined) => date && setEndDate(date)}
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

          {/* Export */}
          {revenueData?.dailyRevenues && revenueData.dailyRevenues.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Exporter
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="z-[100]">
                <DropdownMenuItem onClick={() => handleExportPdf()}>
                  <FileText className="h-4 w-4 mr-2" />
                  Exporter en PDF
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExportExcel()}>
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Exporter en Excel
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
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

      {/* Summary Cards - Design moderne pour décideurs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {/* Clôtures caisse */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 p-5 text-white shadow-lg">
          <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-white/10" />
          <div className="absolute bottom-0 left-0 -mb-4 -ml-4 h-16 w-16 rounded-full bg-white/10" />
          <div className="relative">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 rounded-xl bg-white/20">
                <Wallet className="h-5 w-5" />
              </div>
              <span className="text-xs font-medium bg-white/20 px-2 py-1 rounded-full">
                {revenuesByDate.length} jours
              </span>
            </div>
            <p className="text-blue-100 text-sm mb-1">Clôtures caisse</p>
            <p className="text-2xl font-bold">
              {isLoading ? "..." : formatCurrencyShort(revenueData?.totals?.totalDayCloses || 0)}
              <span className="text-sm font-normal ml-1">FCFA</span>
            </p>
          </div>
        </div>

        {/* Dépenses */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-red-500 to-rose-600 p-5 text-white shadow-lg">
          <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-white/10" />
          <div className="absolute bottom-0 left-0 -mb-4 -ml-4 h-16 w-16 rounded-full bg-white/10" />
          <div className="relative">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 rounded-xl bg-white/20">
                <Receipt className="h-5 w-5" />
              </div>
              <div className="flex items-center gap-1 text-xs font-medium bg-white/20 px-2 py-1 rounded-full">
                <ArrowDownRight className="h-3 w-3" />
                Sorties
              </div>
            </div>
            <p className="text-red-100 text-sm mb-1">Dépenses</p>
            <p className="text-2xl font-bold">
              {isLoading ? "..." : formatCurrencyShort(revenueData?.totals?.totalExpenses || 0)}
              <span className="text-sm font-normal ml-1">FCFA</span>
            </p>
          </div>
        </div>

        {/* Recette comptée */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-500 to-violet-600 p-5 text-white shadow-lg">
          <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-white/10" />
          <div className="absolute bottom-0 left-0 -mb-4 -ml-4 h-16 w-16 rounded-full bg-white/10" />
          <div className="relative">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 rounded-xl bg-white/20">
                <Calculator className="h-5 w-5" />
              </div>
              <span className="text-xs font-medium bg-white/20 px-2 py-1 rounded-full">
                Manuel
              </span>
            </div>
            <p className="text-purple-100 text-sm mb-1">Recette comptée</p>
            <p className="text-2xl font-bold">
              {isLoading ? "..." : formatCurrencyShort(revenueData?.totals?.totalCountedRevenue || 0)}
              <span className="text-sm font-normal ml-1">FCFA</span>
            </p>
          </div>
        </div>

        {/* Résultat net - Card principale */}
        <div className={cn(
          "relative overflow-hidden rounded-2xl p-5 text-white shadow-lg",
          (revenueData?.totals?.totalNetRevenue || 0) >= 0 
            ? "bg-gradient-to-br from-emerald-500 to-teal-600" 
            : "bg-gradient-to-br from-orange-500 to-red-600"
        )}>
          <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-white/10" />
          <div className="absolute bottom-0 left-0 -mb-4 -ml-4 h-16 w-16 rounded-full bg-white/10" />
          <div className="relative">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 rounded-xl bg-white/20">
                {(revenueData?.totals?.totalNetRevenue || 0) >= 0 ? (
                  <TrendingUp className="h-5 w-5" />
                ) : (
                  <TrendingDown className="h-5 w-5" />
                )}
              </div>
              <div className="flex items-center gap-1 text-xs font-medium bg-white/20 px-2 py-1 rounded-full">
                {(revenueData?.totals?.totalNetRevenue || 0) >= 0 ? (
                  <>
                    <ArrowUpRight className="h-3 w-3" />
                    Bénéfice
                  </>
                ) : (
                  <>
                    <ArrowDownRight className="h-3 w-3" />
                    Perte
                  </>
                )}
              </div>
            </div>
            <p className="text-white/80 text-sm mb-1">Résultat net</p>
            <p className="text-3xl font-bold">
              {isLoading ? "..." : (
                <>
                  {(revenueData?.totals?.totalNetRevenue || 0) >= 0 ? "+" : ""}
                  {formatCurrencyShort(revenueData?.totals?.totalNetRevenue || 0)}
                  <span className="text-sm font-normal ml-1">FCFA</span>
                </>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Timeline des recettes journalières */}
      <div className="space-y-6">
        {/* Header de la section */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Clock className="h-5 w-5 text-indigo-600" />
              Timeline des recettes
            </h2>
            <p className="text-sm text-gray-500">Vue chronologique par magasin</p>
          </div>
          <Button 
            onClick={() => {
              setCreateStoreId("")
              setCreateDate(new Date())
              setEditCountedRevenue("")
              setEditNotes("")
              setShowCreateDialog(true)
            }}
            className="bg-indigo-600 hover:bg-indigo-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nouvelle recette
          </Button>
        </div>

        {isLoading ? (
          <div className="space-y-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-6 w-32 bg-gray-200 rounded mb-3" />
                <div className="h-24 bg-gray-100 rounded-xl" />
              </div>
            ))}
          </div>
        ) : !revenuesByDate.length ? (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                <CalendarIcon className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-1">Aucune recette</h3>
              <p className="text-gray-500 mb-4">Aucune recette enregistrée pour cette période</p>
              <Button variant="outline" onClick={() => setShowCreateDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Créer une recette
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="relative">
            {/* Ligne verticale de la timeline */}
            <div className="absolute left-[19px] top-8 bottom-8 w-0.5 bg-gradient-to-b from-indigo-200 via-indigo-100 to-transparent" />
            
            {revenuesByDate.map((dayGroup, dayIndex) => (
              <div key={dayGroup.date} className="relative mb-8 last:mb-0">
                {/* Point de la timeline */}
                <div className="absolute left-0 top-0 z-10">
                  <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center shadow-md",
                    isToday(new Date(dayGroup.date)) 
                      ? "bg-gradient-to-br from-indigo-500 to-purple-600 text-white" 
                      : "bg-white border-2 border-indigo-200 text-indigo-600"
                  )}>
                    <span className="text-sm font-bold">
                      {format(new Date(dayGroup.date), "d", { locale: fr })}
                    </span>
                  </div>
                </div>

                {/* Contenu du jour */}
                <div className="ml-14">
                  {/* Header du jour */}
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-gray-900 capitalize">
                        {getDateLabel(dayGroup.date)}
                      </h3>
                      <p className="text-xs text-gray-500">
                        {format(new Date(dayGroup.date), "yyyy", { locale: fr })} • {dayGroup.revenues.length} magasin{dayGroup.revenues.length > 1 ? 's' : ''}
                      </p>
                    </div>
                    {/* Résumé du jour */}
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-xs text-gray-500">Total jour</p>
                        <p className={cn(
                          "text-lg font-bold",
                          dayGroup.totalNet >= 0 ? "text-emerald-600" : "text-red-600"
                        )}>
                          {dayGroup.totalNet >= 0 ? "+" : ""}{formatCurrencyShort(dayGroup.totalNet)} FCFA
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Cards des magasins avec accordéon */}
                  <div className="space-y-2">
                    {dayGroup.revenues.map((dr) => {
                      const netRevenue = getNetRevenue(dr)
                      const isPositive = netRevenue >= 0
                      const isExpanded = expandedRevenues.has(dr.id)
                      const detail = revenueDetails[dr.id]
                      const isLoadingThis = loadingDetails.has(dr.id)
                      
                      return (
                        <Collapsible
                          key={dr.id}
                          open={isExpanded}
                          onOpenChange={() => toggleAccordion(dr.id)}
                        >
                          <div className="border border-gray-200 rounded-lg bg-white overflow-hidden">
                            {/* Header cliquable */}
                            <CollapsibleTrigger asChild>
                              <div className="p-4 cursor-pointer hover:bg-gray-50 transition-colors">
                                <div className="flex items-center justify-between">
                                  {/* Info magasin */}
                                  <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center">
                                      <Building2 className="h-4 w-4 text-gray-600" />
                                    </div>
                                    <div>
                                      <h4 className="font-medium text-gray-900">{dr.store.name}</h4>
                                      {dr.countedRevenue && (
                                        <span className="text-xs text-purple-600">Recette comptée</span>
                                      )}
                                    </div>
                                  </div>

                                  {/* Métriques résumées */}
                                  <div className="flex items-center gap-6">
                                    <div className="text-right hidden sm:block">
                                      <p className="text-xs text-gray-500">Clôtures</p>
                                      <p className="font-medium text-gray-900">{formatCurrencyShort(dr.totalDayCloses)}</p>
                                    </div>
                                    <div className="text-right hidden sm:block">
                                      <p className="text-xs text-gray-500">Dépenses</p>
                                      <p className="font-medium text-gray-900">{formatCurrencyShort(dr.totalExpenses)}</p>
                                    </div>
                                    <div className="text-right min-w-[80px]">
                                      <p className="text-xs text-gray-500">Résultat</p>
                                      <p className={cn(
                                        "font-bold",
                                        isPositive ? "text-emerald-600" : "text-red-600"
                                      )}>
                                        {isPositive ? "+" : ""}{formatCurrencyShort(netRevenue)}
                                      </p>
                                    </div>
                                    <ChevronRight className={cn(
                                      "h-5 w-5 text-gray-400 transition-transform",
                                      isExpanded && "rotate-90"
                                    )} />
                                  </div>
                                </div>
                              </div>
                            </CollapsibleTrigger>

                            {/* Contenu déroulé */}
                            <CollapsibleContent>
                              <div className="border-t border-gray-100 bg-gray-50/50">
                                {isLoadingThis ? (
                                  <div className="p-6 flex items-center justify-center">
                                    <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                                  </div>
                                ) : detail ? (
                                  <div className="p-4 space-y-4">
                                    {/* Grille des informations */}
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                      {/* Clôtures de caisse */}
                                      <div className="bg-white rounded-lg p-3 border border-gray-100">
                                        <div className="flex items-center gap-2 mb-2">
                                          <Wallet className="h-4 w-4 text-blue-600" />
                                          <span className="text-sm font-medium text-gray-700">Clôtures de caisse</span>
                                        </div>
                                        {detail.dayCloses?.length ? (
                                          <div className="space-y-1.5">
                                            {detail.dayCloses.map((dc) => (
                                              <div key={dc.id} className="flex justify-between text-sm">
                                                <span className="text-gray-600">{dc.user?.firstName || dc.user?.name}</span>
                                                <span className="font-medium">{formatCurrency(dc.totalRevenue)}</span>
                                              </div>
                                            ))}
                                            <div className="pt-1.5 mt-1.5 border-t border-gray-100 flex justify-between text-sm font-medium">
                                              <span>Total</span>
                                              <span className="text-blue-600">{formatCurrency(detail.totalDayCloses)}</span>
                                            </div>
                                          </div>
                                        ) : (
                                          <p className="text-sm text-gray-400">Aucune clôture</p>
                                        )}
                                      </div>

                                      {/* Dépenses */}
                                      <div className="bg-white rounded-lg p-3 border border-gray-100">
                                        <div className="flex items-center gap-2 mb-2">
                                          <Receipt className="h-4 w-4 text-red-500" />
                                          <span className="text-sm font-medium text-gray-700">Dépenses du jour</span>
                                        </div>
                                        {detail.expenses?.length ? (
                                          <div className="space-y-1.5">
                                            {detail.expenses.map((exp) => (
                                              <div key={exp.id} className="flex justify-between text-sm">
                                                <span className="text-gray-600 truncate max-w-[120px]">{exp.category?.name}</span>
                                                <span className="font-medium">{formatCurrency(exp.amount)}</span>
                                              </div>
                                            ))}
                                            <div className="pt-1.5 mt-1.5 border-t border-gray-100 flex justify-between text-sm font-medium">
                                              <span>Total</span>
                                              <span className="text-red-600">{formatCurrency(detail.totalExpenses)}</span>
                                            </div>
                                          </div>
                                        ) : (
                                          <p className="text-sm text-gray-400">Aucune dépense</p>
                                        )}
                                      </div>

                                      {/* Résumé */}
                                      <div className="bg-white rounded-lg p-3 border border-gray-100">
                                        <div className="flex items-center gap-2 mb-2">
                                          <Calculator className="h-4 w-4 text-gray-600" />
                                          <span className="text-sm font-medium text-gray-700">Résumé</span>
                                        </div>
                                        <div className="space-y-1.5 text-sm">
                                          <div className="flex justify-between">
                                            <span className="text-gray-600">Clôtures</span>
                                            <span className="font-medium">{formatCurrency(detail.totalDayCloses)}</span>
                                          </div>
                                          <div className="flex justify-between">
                                            <span className="text-gray-600">Dépenses</span>
                                            <span className="font-medium text-red-600">-{formatCurrency(detail.totalExpenses)}</span>
                                          </div>
                                          {detail.countedRevenue && (
                                            <div className="flex justify-between">
                                              <span className="text-gray-600">Comptée</span>
                                              <span className="font-medium text-purple-600">{formatCurrency(detail.countedRevenue)}</span>
                                            </div>
                                          )}
                                          <div className="pt-1.5 mt-1.5 border-t border-gray-200 flex justify-between font-medium">
                                            <span>Résultat net</span>
                                            <span className={isPositive ? "text-emerald-600" : "text-red-600"}>
                                              {isPositive ? "+" : ""}{formatCurrency(detail.netRevenue)}
                                            </span>
                                          </div>
                                        </div>
                                      </div>
                                    </div>

                                    {/* Notes */}
                                    {detail.notes && (
                                      <div className="bg-white rounded-lg p-3 border border-gray-100">
                                        <p className="text-sm text-gray-500">Notes: {detail.notes}</p>
                                      </div>
                                    )}

                                    {/* Actions */}
                                    <div className="flex items-center justify-end gap-2 pt-2">
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => openEditDialog(detail)}
                                      >
                                        <Calculator className="h-4 w-4 mr-1" />
                                        Modifier recette comptée
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                        onClick={() => handleDeleteRevenue(dr.id)}
                                      >
                                        <Trash2 className="h-4 w-4 mr-1" />
                                        Supprimer
                                      </Button>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="p-6 text-center text-gray-500">
                                    Erreur de chargement
                                  </div>
                                )}
                              </div>
                            </CollapsibleContent>
                          </div>
                        </Collapsible>
                      )
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Dialog d'édition de la recette comptée */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Modifier la recette comptée</DialogTitle>
            {selectedRevenue && (
              <p className="text-sm text-gray-500">
                {format(new Date(selectedRevenue.date), "EEEE d MMMM yyyy", { locale: fr })} - {selectedRevenue.store.name}
              </p>
            )}
          </DialogHeader>
          
          {selectedRevenue && (
            <div className="space-y-4">
              <div>
                <Label>Montant compté (FCFA)</Label>
                <Input
                  type="number"
                  value={editCountedRevenue}
                  onChange={(e) => setEditCountedRevenue(e.target.value)}
                  placeholder="Saisir le montant compté..."
                />
                <p className="text-xs text-gray-500 mt-1">
                  Clôtures caisse: {formatCurrency(selectedRevenue.totalDayCloses)}
                </p>
              </div>
              <div>
                <Label>Notes</Label>
                <Input
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Notes optionnelles..."
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDetailDialog(false)}>
              Annuler
            </Button>
            <Button onClick={handleUpdateCountedRevenue} disabled={isSaving}>
              {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de création */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nouvelle recette journalière</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label>Magasin</Label>
              <Select value={createStoreId} onValueChange={setCreateStoreId}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un magasin" />
                </SelectTrigger>
                <SelectContent className="z-[2100]">
                  {stores.map((store) => (
                    <SelectItem key={store.id} value={store.id}>
                      {store.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(createDate, "dd/MM/yyyy")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 z-[2100]">
                  <Calendar
                    mode="single"
                    selected={createDate}
                    onSelect={(date: Date | undefined) => date && setCreateDate(date)}
                    locale={fr}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <Label>Recette comptée (FCFA) - optionnel</Label>
              <Input
                type="number"
                value={editCountedRevenue}
                onChange={(e) => setEditCountedRevenue(e.target.value)}
                placeholder="Montant compté manuellement..."
              />
            </div>

            <div>
              <Label>Notes - optionnel</Label>
              <Input
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                placeholder="Notes..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Annuler
            </Button>
            <Button onClick={handleCreateRevenue} disabled={isSaving || !createStoreId}>
              {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Créer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
