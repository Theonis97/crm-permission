"use client"

import { useState, useEffect, useCallback } from "react"
import { usePermissions } from "@/hooks/use-permissions"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
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
} from "lucide-react"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

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
  
  // États pour le dialog de détails
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

  const getPeriodLabel = () => {
    const start = format(startDate, "d MMM yyyy", { locale: fr })
    const end = format(endDate, "d MMM yyyy", { locale: fr })
    if (start === end) return start
    return `${start} - ${end}`
  }

  const getNetRevenue = (dr: DailyRevenue) => {
    return (dr.countedRevenue || dr.totalDayCloses) - dr.totalExpenses
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100">
                <Wallet className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Clôtures caisse</p>
                <p className="text-xl font-bold text-gray-900">
                  {isLoading ? "..." : formatCurrency(revenueData?.totals?.totalDayCloses || 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-100">
                <TrendingDown className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Dépenses</p>
                <p className="text-xl font-bold text-red-600">
                  {isLoading ? "..." : formatCurrency(revenueData?.totals?.totalExpenses || 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100">
                <Calculator className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Recette comptée</p>
                <p className="text-xl font-bold text-gray-900">
                  {isLoading ? "..." : formatCurrency(revenueData?.totals?.totalCountedRevenue || 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100">
                <TrendingUp className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Résultat net</p>
                <p className={cn("text-xl font-bold", (revenueData?.totals?.totalNetRevenue || 0) >= 0 ? "text-green-600" : "text-red-600")}>
                  {isLoading ? "..." : formatCurrency(revenueData?.totals?.totalNetRevenue || 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Daily Revenues List */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <CalendarIcon className="h-5 w-5 text-gray-500" />
            Recettes journalières
          </CardTitle>
          <Button onClick={() => {
            setCreateStoreId("")
            setCreateDate(new Date())
            setEditCountedRevenue("")
            setEditNotes("")
            setShowCreateDialog(true)
          }}>
            <Plus className="h-4 w-4 mr-2" />
            Nouvelle recette
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 bg-gray-100 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : !revenueData?.dailyRevenues?.length ? (
            <div className="text-center py-8">
              <CalendarIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">Aucune recette pour cette période</p>
              <Button variant="outline" className="mt-3" onClick={() => setShowCreateDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Créer une recette
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {revenueData.dailyRevenues.map((dr) => (
                <div 
                  key={dr.id} 
                  className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => fetchRevenueDetail(dr.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-gray-100">
                        <CalendarIcon className="h-5 w-5 text-gray-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {format(new Date(dr.date), "EEEE d MMMM yyyy", { locale: fr })}
                        </p>
                        <p className="text-sm text-gray-500">
                          {dr.store.name}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <p className="text-xs text-gray-500">Clôtures</p>
                        <p className="font-medium text-blue-600">{formatCurrency(dr.totalDayCloses)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-500">Dépenses</p>
                        <p className="font-medium text-red-600">{formatCurrency(dr.totalExpenses)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-500">Comptée</p>
                        <p className="font-medium text-purple-600">
                          {dr.countedRevenue ? formatCurrency(dr.countedRevenue) : "-"}
                        </p>
                      </div>
                      <div className="text-right min-w-[120px]">
                        <p className="text-xs text-gray-500">Résultat</p>
                        <p className={cn("text-lg font-bold", getNetRevenue(dr) >= 0 ? "text-green-600" : "text-red-600")}>
                          {formatCurrency(getNetRevenue(dr))}
                        </p>
                      </div>
                      <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); fetchRevenueDetail(dr.id) }}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-700" onClick={(e) => { e.stopPropagation(); handleDeleteRevenue(dr.id) }}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog de détails */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5" />
              {selectedRevenue && format(new Date(selectedRevenue.date), "EEEE d MMMM yyyy", { locale: fr })}
              <span className="text-gray-500 font-normal">- {selectedRevenue?.store.name}</span>
            </DialogTitle>
          </DialogHeader>
          
          {loadingDetail ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : selectedRevenue && (
            <div className="space-y-6">
              {/* Clôtures de caisse */}
              <div>
                <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                  <Wallet className="h-4 w-4 text-blue-600" />
                  Clôtures de caisse ({selectedRevenue.dayCloses?.length || 0})
                </h3>
                {selectedRevenue.dayCloses?.length ? (
                  <div className="space-y-2">
                    {selectedRevenue.dayCloses.map((dc) => (
                      <div key={dc.id} className="p-3 bg-blue-50 rounded-lg flex justify-between items-center">
                        <div>
                          <p className="font-medium">{dc.user?.firstName || dc.user?.name || "Utilisateur"}</p>
                          <p className="text-sm text-gray-500">{dc.totalSales} ventes • {dc.totalItems} articles</p>
                        </div>
                        <p className="font-bold text-blue-700">{formatCurrency(dc.totalRevenue)}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm">Aucune clôture de caisse</p>
                )}
                <div className="mt-2 p-2 bg-blue-100 rounded flex justify-between">
                  <span className="font-medium">Total clôtures</span>
                  <span className="font-bold text-blue-700">{formatCurrency(selectedRevenue.totalDayCloses)}</span>
                </div>
              </div>

              {/* Dépenses */}
              <div>
                <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                  <Receipt className="h-4 w-4 text-red-600" />
                  Dépenses du jour ({selectedRevenue.expenses?.length || 0})
                </h3>
                {selectedRevenue.expenses?.length ? (
                  <div className="space-y-2">
                    {selectedRevenue.expenses.map((exp) => (
                      <div key={exp.id} className="p-3 bg-red-50 rounded-lg flex justify-between items-center">
                        <div>
                          <p className="font-medium">{exp.description}</p>
                          <p className="text-sm text-gray-500">{exp.category?.name}</p>
                        </div>
                        <p className="font-bold text-red-700">{formatCurrency(exp.amount)}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm">Aucune dépense</p>
                )}
                <div className="mt-2 p-2 bg-red-100 rounded flex justify-between">
                  <span className="font-medium">Total dépenses</span>
                  <span className="font-bold text-red-700">{formatCurrency(selectedRevenue.totalExpenses)}</span>
                </div>
              </div>

              {/* Recette comptée */}
              <div>
                <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                  <Calculator className="h-4 w-4 text-purple-600" />
                  Recette comptée (saisie manuelle)
                </h3>
                <div className="space-y-3">
                  <div>
                    <Label>Montant compté (FCFA)</Label>
                    <Input
                      type="number"
                      value={editCountedRevenue}
                      onChange={(e) => setEditCountedRevenue(e.target.value)}
                      placeholder="Saisir le montant compté..."
                    />
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
              </div>

              {/* Résultat */}
              <div className={cn("p-4 rounded-lg", selectedRevenue.netRevenue >= 0 ? "bg-green-100" : "bg-red-100")}>
                <div className="flex justify-between items-center">
                  <span className="font-medium text-lg">Résultat net</span>
                  <span className={cn("text-2xl font-bold", selectedRevenue.netRevenue >= 0 ? "text-green-700" : "text-red-700")}>
                    {formatCurrency(selectedRevenue.netRevenue)}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  = (Recette comptée ou Clôtures) - Dépenses
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDetailDialog(false)}>
              Fermer
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
                <SelectContent>
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
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={createDate}
                    onSelect={(date) => date && setCreateDate(date)}
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
