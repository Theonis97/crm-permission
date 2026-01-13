"use client"

import { useState, useEffect, useCallback, use } from "react"
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
} from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import { cn } from "@/lib/utils"
import { ExpenseCard } from "@/components/accounting/expense-card"
import { ExpenseForm } from "@/components/accounting/expense-form"
import { ExpensePaymentForm } from "@/components/accounting/expense-payment-form"
import { toast } from "sonner"
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

  const fetchCategories = useCallback(async () => {
    try {
      const response = await fetch("/api/accounting/categories")
      if (response.ok) {
        const data = await response.json()
        setCategories(data.categories || [])
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
      setExpenses(data.expenses || [])
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
                  onSelect={(date) => date && setStartDate(date)}
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
                  onSelect={(date) => date && setEndDate(date)}
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

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-gray-100 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : expenses.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Receipt className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Aucune dépense</h3>
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
          <div className="space-y-4">
            {expenses.map((expense) => (
              <ExpenseCard
                key={expense.id}
                expense={expense}
                onView={(id) => {
                  const exp = expenses.find(e => e.id === id)
                  if (exp) {
                    setSelectedExpense(exp)
                    setShowDetailSheet(true)
                  }
                }}
                onEdit={(id) => {
                  const exp = expenses.find(e => e.id === id)
                  if (exp) {
                    setSelectedExpense(exp)
                    setShowEditSheet(true)
                  }
                }}
                onPay={(id) => {
                  const exp = expenses.find(e => e.id === id)
                  if (exp) {
                    setSelectedExpense(exp)
                    setShowPaymentSheet(true)
                  }
                }}
                onDelete={handleDeleteExpense}
              />
            ))}
          </div>
        )}

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
