"use client"

import { useState, useEffect, useCallback, use, useMemo } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { 
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { 
  Receipt, 
  Plus, 
  Loader2,
  AlertCircle,
  CalendarIcon,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  Clock,
  MoreHorizontal,
  Eye,
  Pencil,
  Trash2,
  CreditCard,
} from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { format, isToday, isYesterday } from "date-fns"
import { fr } from "date-fns/locale"
import { cn } from "@/lib/utils"
import { ExpenseForm } from "@/components/accounting/expense-form"
import { ExpensePaymentForm } from "@/components/accounting/expense-payment-form"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { toast } from "@/lib/app-toast"
import { StorePermissionGuard } from "@/components/auth/store-permission-guard"
import { STORE_PERMISSIONS } from "@/types/store-auth"

interface Expense {
  id: string
  title: string
  amount: number
  paidAmount: number
  remainingAmount: number
  status: "PENDING" | "PARTIALLY_PAID" | "PAID"
  dueDate: string
  store: { id: string; name: string } | null
  category: { id: string; name: string; icon: string | null; color: string | null }
  createdBy: { id: string; name: string | null; firstName: string | null; lastName: string | null }
  documentUrl?: string | null
  description?: string | null
  supplierName?: string | null
  supplierPhone?: string | null
}

interface Category {
  id: string
  name: string
  icon: string | null
  color: string | null
}

export default function StoreExpensesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: storeId } = use(params)
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Filters
  const [selectedCategoryId, setSelectedCategoryId] = useState("all")
  const [selectedStatus, setSelectedStatus] = useState("all")
  const [startDate, setStartDate] = useState<Date>(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })
  const [endDate, setEndDate] = useState<Date>(new Date())
  
  // Sheets
  const [showCreateSheet, setShowCreateSheet] = useState(false)
  const [showEditSheet, setShowEditSheet] = useState(false)
  const [showPaymentSheet, setShowPaymentSheet] = useState(false)
  const [showDetailSheet, setShowDetailSheet] = useState(false)
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // États pour les groupes de dates repliés/dépliés
  const [collapsedDates, setCollapsedDates] = useState<Set<string>>(new Set())

  const fetchCategories = useCallback(async () => {
    try {
      const response = await fetch("/api/accounting/categories")
      if (response.ok) {
        const data = await response.json()
        const filtered = (data.categories || []).filter(
          (c: Category) => c.name !== "Salaire"
        )
        setCategories(filtered)
      }
    } catch (err) {
      console.error("Error fetching categories:", err)
    }
  }, [])

  const fetchExpenses = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      params.append("storeId", storeId) // Force storeId filter
      params.append("startDate", format(startDate, "yyyy-MM-dd"))
      params.append("endDate", format(endDate, "yyyy-MM-dd"))
      if (selectedCategoryId !== "all") {
        params.append("categoryId", selectedCategoryId)
      }
      if (selectedStatus !== "all") {
        params.append("status", selectedStatus)
      }
      
      const response = await fetch(`/api/accounting/expenses?${params}`)
      if (!response.ok) {
        throw new Error("Erreur lors du chargement des dépenses")
      }
      const data = await response.json()
      const filtered = (data.expenses || []).filter(
        (e: Expense) => e.category?.name !== "Salaire"
      )
      setExpenses(filtered)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue")
    } finally {
      setIsLoading(false)
    }
  }, [storeId, selectedCategoryId, selectedStatus, startDate, endDate])

  useEffect(() => {
    fetchCategories()
    fetchExpenses()
  }, [fetchCategories, fetchExpenses])

  const handleCreateExpense = async (data: any) => {
    setIsSubmitting(true)
    try {
      const response = await fetch("/api/accounting/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          storeId: storeId // Force storeId
        }),
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Erreur lors de la création")
      }
      
      toast.success("Dépense créée avec succès")
      setShowCreateSheet(false)
      fetchExpenses()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur inconnue")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEditExpense = async (data: any) => {
    if (!selectedExpense) return
    
    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/accounting/expenses/${selectedExpense.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Erreur lors de la modification")
      }
      
      toast.success("Dépense modifiée avec succès")
      setShowEditSheet(false)
      setSelectedExpense(null)
      fetchExpenses()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur inconnue")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handlePayment = async (data: any) => {
    if (!selectedExpense) return
    
    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/accounting/expenses/${selectedExpense.id}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Erreur lors du paiement")
      }
      
      toast.success("Paiement enregistré avec succès")
      setShowPaymentSheet(false)
      setSelectedExpense(null)
      fetchExpenses()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur inconnue")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteExpense = async (id: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cette dépense ?")) return
    
    try {
      const response = await fetch(`/api/accounting/expenses/${id}`, {
        method: "DELETE",
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Erreur lors de la suppression")
      }
      
      toast.success("Dépense supprimée")
      fetchExpenses()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur inconnue")
    }
  }

  const clearFilters = () => {
    setSelectedCategoryId("all")
    setSelectedStatus("all")
  }

  // Grouper les dépenses par date
  const expensesByDate = useMemo(() => {
    const grouped: { [key: string]: Expense[] } = {}
    expenses.forEach(expense => {
      const dateKey = expense.dueDate.split('T')[0]
      if (!grouped[dateKey]) grouped[dateKey] = []
      grouped[dateKey].push(expense)
    })
    
    return Object.entries(grouped)
      .sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime())
      .map(([date, items]) => ({
        date,
        expenses: items,
        totalAmount: items.reduce((sum, e) => sum + e.amount, 0),
        totalPaid: items.reduce((sum, e) => sum + e.paidAmount, 0),
        totalRemaining: items.reduce((sum, e) => sum + e.remainingAmount, 0),
        countPending: items.filter(e => e.status === "PENDING").length,
        countPartial: items.filter(e => e.status === "PARTIALLY_PAID").length,
        countPaid: items.filter(e => e.status === "PAID").length,
      }))
  }, [expenses])

  const getDateLabel = (dateStr: string) => {
    const date = new Date(dateStr)
    if (isToday(date)) return "Aujourd'hui"
    if (isYesterday(date)) return "Hier"
    return format(date, "EEEE d MMMM", { locale: fr })
  }

  const toggleDateGroup = (dateKey: string) => {
    setCollapsedDates(prev => {
      const next = new Set(prev)
      if (next.has(dateKey)) {
        next.delete(dateKey)
      } else {
        next.add(dateKey)
      }
      return next
    })
  }

  const formatCurrencyShort = (amount: number) => {
    if (amount >= 1000000) return (amount / 1000000).toFixed(1) + "M"
    if (amount >= 1000) return (amount / 1000).toFixed(0) + "K"
    return amount.toLocaleString("fr-FR")
  }

  return (
    <StorePermissionGuard 
      storeId={storeId} 
      permission={STORE_PERMISSIONS.EXPENSES_VIEW}
      fallback={
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Accès refusé</h2>
          <p className="text-gray-500">Vous n'avez pas la permission de voir les dépenses de ce magasin.</p>
        </div>
      }
    >
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dépenses du magasin</h1>
            <p className="text-gray-500">{expenses.length} dépense(s)</p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
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

            <Button variant="outline" size="icon" onClick={fetchExpenses} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            </Button>

            <StorePermissionGuard storeId={storeId} permission={STORE_PERMISSIONS.EXPENSES_CREATE} fallback={null}>
              <Button onClick={() => setShowCreateSheet(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Nouvelle dépense
              </Button>
            </StorePermissionGuard>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap mb-6">
          <Select value={selectedCategoryId} onValueChange={setSelectedCategoryId}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Catégorie" />
            </SelectTrigger>
            <SelectContent className="z-[100]">
              <SelectItem value="all">Toutes catégories</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>
                  {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Statut" />
            </SelectTrigger>
            <SelectContent className="z-[100]">
              <SelectItem value="all">Tous statuts</SelectItem>
              <SelectItem value="PENDING">En attente</SelectItem>
              <SelectItem value="PARTIALLY_PAID">Partiel</SelectItem>
              <SelectItem value="PAID">Payé</SelectItem>
            </SelectContent>
          </Select>

          {(selectedCategoryId !== "all" || selectedStatus !== "all") && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              Effacer les filtres
            </Button>
          )}
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-red-500" />
            <p className="text-red-700">{error}</p>
            <Button variant="outline" size="sm" onClick={fetchExpenses}>
              Réessayer
            </Button>
          </div>
        )}

        {/* Timeline des dépenses par date */}
        <div className="space-y-6">
          {/* Header de la section */}
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-gray-500" />
            <h2 className="text-lg font-semibold text-gray-900">Timeline des dépenses</h2>
          </div>

          {isLoading ? (
            <div className="space-y-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-6 w-32 bg-gray-200 rounded mb-3" />
                  <div className="h-20 bg-gray-100 rounded-lg" />
                </div>
              ))}
            </div>
          ) : expensesByDate.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                  <Receipt className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-1">Aucune dépense</h3>
                <p className="text-gray-500 mb-4">
                  Aucune dépense trouvée pour cette période et ces filtres.
                </p>
                <StorePermissionGuard storeId={storeId} permission={STORE_PERMISSIONS.EXPENSES_CREATE} fallback={null}>
                  <Button onClick={() => setShowCreateSheet(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Créer une dépense
                  </Button>
                </StorePermissionGuard>
              </CardContent>
            </Card>
          ) : (
            <div className="relative">
              {/* Ligne verticale de la timeline */}
              <div className="absolute left-[19px] top-8 bottom-8 w-0.5 bg-gradient-to-b from-gray-300 via-gray-200 to-transparent" />
              
              {expensesByDate.map((dayGroup) => {
                const isCollapsed = collapsedDates.has(dayGroup.date)
                
                return (
                  <div key={dayGroup.date} className="relative mb-6 last:mb-0">
                    {/* Point de la timeline */}
                    <div className="absolute left-0 top-0 z-10">
                      <div className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center shadow-sm",
                        isToday(new Date(dayGroup.date)) 
                          ? "bg-blue-600 text-white" 
                          : "bg-white border-2 border-gray-300 text-gray-600"
                      )}>
                        <span className="text-sm font-bold">
                          {format(new Date(dayGroup.date), "d", { locale: fr })}
                        </span>
                      </div>
                    </div>

                    {/* Contenu du jour */}
                    <div className="ml-14">
                      <Collapsible open={!isCollapsed} onOpenChange={() => toggleDateGroup(dayGroup.date)}>
                        {/* Header du jour - cliquable */}
                        <CollapsibleTrigger asChild>
                          <div className="flex items-center justify-between mb-3 cursor-pointer group">
                            <div className="flex items-center gap-3">
                              <div>
                                <h3 className="font-semibold text-gray-900 capitalize">
                                  {getDateLabel(dayGroup.date)}
                                </h3>
                                <p className="text-xs text-gray-500">
                                  {format(new Date(dayGroup.date), "yyyy", { locale: fr })} • {dayGroup.expenses.length} dépense{dayGroup.expenses.length > 1 ? 's' : ''}
                                </p>
                              </div>
                              {/* Badges de statut */}
                              <div className="flex items-center gap-1">
                                {dayGroup.countPending > 0 && (
                                  <span className="px-2 py-0.5 text-xs rounded-full bg-orange-100 text-orange-700">
                                    {dayGroup.countPending} en attente
                                  </span>
                                )}
                                {dayGroup.countPartial > 0 && (
                                  <span className="px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-700">
                                    {dayGroup.countPartial} partiel
                                  </span>
                                )}
                                {dayGroup.countPaid > 0 && (
                                  <span className="px-2 py-0.5 text-xs rounded-full bg-green-100 text-green-700">
                                    {dayGroup.countPaid} payé
                                  </span>
                                )}
                              </div>
                            </div>
                            {/* Résumé du jour + chevron */}
                            <div className="flex items-center gap-4">
                              <div className="text-right">
                                <p className="text-xs text-gray-500">Total jour</p>
                                <p className="font-bold text-gray-900">
                                  {formatCurrencyShort(dayGroup.totalAmount)} FCFA
                                </p>
                              </div>
                              <ChevronDown className={cn(
                                "h-5 w-5 text-gray-400 transition-transform",
                                isCollapsed && "-rotate-90"
                              )} />
                            </div>
                          </div>
                        </CollapsibleTrigger>

                        {/* Liste des dépenses du jour */}
                        <CollapsibleContent>
                          <div className="border border-gray-200 rounded-lg bg-white overflow-hidden">
                            <div className="divide-y divide-gray-100">
                              {dayGroup.expenses.map((expense) => (
                                <div key={expense.id} className="p-3 hover:bg-gray-50 transition-colors">
                                  <div className="flex items-start justify-between gap-4">
                                    {/* Infos de la dépense */}
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2 mb-1">
                                        <span 
                                          className="px-2 py-0.5 text-xs rounded-full font-medium"
                                          style={{ 
                                            backgroundColor: expense.category.color ? `${expense.category.color}20` : "#f3f4f6",
                                            color: expense.category.color || "#6b7280"
                                          }}
                                        >
                                          {expense.category.name}
                                        </span>
                                        <span className={cn(
                                          "px-2 py-0.5 text-xs rounded-full font-medium",
                                          expense.status === "PAID" && "bg-green-100 text-green-700",
                                          expense.status === "PARTIALLY_PAID" && "bg-blue-100 text-blue-700",
                                          expense.status === "PENDING" && "bg-orange-100 text-orange-700"
                                        )}>
                                          {expense.status === "PAID" ? "Payée" : expense.status === "PARTIALLY_PAID" ? "Partiel" : "En attente"}
                                        </span>
                                      </div>
                                      <h4 className="font-medium text-gray-900 truncate">{expense.title}</h4>
                                      <p className="text-xs text-gray-500">
                                        {expense.createdBy?.firstName || expense.createdBy?.name}
                                        {expense.supplierName && ` • Fournisseur: ${expense.supplierName}`}
                                      </p>
                                    </div>
                                    
                                    {/* Montant et actions */}
                                    <div className="flex items-center gap-3">
                                      <div className="text-right">
                                        <p className="font-bold text-gray-900">{expense.amount.toLocaleString("fr-FR")} FCFA</p>
                                        {expense.remainingAmount > 0 && expense.remainingAmount < expense.amount && (
                                          <p className="text-xs text-orange-600">Reste: {expense.remainingAmount.toLocaleString("fr-FR")}</p>
                                        )}
                                      </div>
                                      {/* Dropdown Menu des actions */}
                                      <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                            <MoreHorizontal className="h-4 w-4 text-gray-500" />
                                          </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="z-[100]">
                                          <DropdownMenuItem onClick={() => {
                                            setSelectedExpense(expense)
                                            setShowDetailSheet(true)
                                          }}>
                                            <Eye className="h-4 w-4 mr-2" />
                                            Voir les détails
                                          </DropdownMenuItem>
                                          <DropdownMenuItem onClick={() => {
                                            setSelectedExpense(expense)
                                            setShowEditSheet(true)
                                          }}>
                                            <Pencil className="h-4 w-4 mr-2" />
                                            Modifier
                                          </DropdownMenuItem>
                                          {expense.status !== "PAID" && (
                                            <DropdownMenuItem onClick={() => {
                                              setSelectedExpense(expense)
                                              setShowPaymentSheet(true)
                                            }}>
                                              <CreditCard className="h-4 w-4 mr-2" />
                                              Enregistrer un paiement
                                            </DropdownMenuItem>
                                          )}
                                          <DropdownMenuSeparator />
                                          <DropdownMenuItem 
                                            className="text-red-600"
                                            onClick={() => handleDeleteExpense(expense.id)}
                                          >
                                            <Trash2 className="h-4 w-4 mr-2" />
                                            Supprimer
                                          </DropdownMenuItem>
                                        </DropdownMenuContent>
                                      </DropdownMenu>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <Sheet open={showCreateSheet} onOpenChange={setShowCreateSheet}>
          <SheetContent className="sm:max-w-xl overflow-y-auto">
            <SheetHeader>
              <SheetTitle>Nouvelle dépense</SheetTitle>
            </SheetHeader>
            <div className="mt-6">
              <ExpenseForm
                stores={[{ id: storeId, name: "Ce magasin" }]} // Pre-select current store
                categories={categories}
                initialData={{ storeId: storeId }} // Force storeId in initial data
                onSubmit={handleCreateExpense}
                onCancel={() => setShowCreateSheet(false)}
                isLoading={isSubmitting}
              />
            </div>
          </SheetContent>
        </Sheet>

        <Sheet 
          open={showEditSheet} 
          onOpenChange={(open) => {
            setShowEditSheet(open)
            if (!open) setSelectedExpense(null)
          }}
        >
          <SheetContent className="sm:max-w-xl overflow-y-auto">
            <SheetHeader>
              <SheetTitle>Modifier la dépense</SheetTitle>
            </SheetHeader>
            <div className="mt-6">
              {selectedExpense && (
                <ExpenseForm
                  stores={[{ id: storeId, name: "Ce magasin" }]}
                  categories={categories}
                  initialData={{
                    id: selectedExpense.id,
                    storeId: selectedExpense.store?.id || storeId,
                    categoryId: selectedExpense.category.id,
                    title: selectedExpense.title,
                    description: selectedExpense.description || "",
                    amount: selectedExpense.amount,
                    supplierName: selectedExpense.supplierName || "",
                    supplierPhone: selectedExpense.supplierPhone || "",
                    dueDate: new Date(selectedExpense.dueDate),
                    documentUrl: selectedExpense.documentUrl || undefined
                  }}
                  onSubmit={handleEditExpense}
                  onCancel={() => {
                    setShowEditSheet(false)
                    setSelectedExpense(null)
                  }}
                  isLoading={isSubmitting}
                />
              )}
            </div>
          </SheetContent>
        </Sheet>

        <Sheet 
          open={showPaymentSheet} 
          onOpenChange={(open) => {
            setShowPaymentSheet(open)
            if (!open) setSelectedExpense(null)
          }}
        >
          <SheetContent className="sm:max-w-md overflow-y-auto">
            <SheetHeader>
              <SheetTitle>Enregistrer un paiement</SheetTitle>
            </SheetHeader>
            <div className="mt-6">
              {selectedExpense && (
                <>
                  <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                    <p className="font-medium text-gray-900">{selectedExpense.title}</p>
                    <p className="text-sm text-gray-500">
                      Montant total: {selectedExpense.amount.toLocaleString("fr-FR")} FCFA
                    </p>
                  </div>
                  <ExpensePaymentForm
                    expenseId={selectedExpense.id}
                    remainingAmount={selectedExpense.remainingAmount}
                    onSubmit={handlePayment}
                    onCancel={() => {
                      setShowPaymentSheet(false)
                      setSelectedExpense(null)
                    }}
                    isLoading={isSubmitting}
                  />
                </>
              )}
            </div>
          </SheetContent>
        </Sheet>

        {/* Note: Detail Sheet reuse or implementation if needed, similar to main page */}
      </div>
    </StorePermissionGuard>
  )
}
