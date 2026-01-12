"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { usePermissions } from "@/hooks/use-permissions"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
  FileText,
  ExternalLink,
  User,
  Building,
  Phone,
} from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import { cn } from "@/lib/utils"
import { ExpenseCard } from "@/components/accounting/expense-card"
import { ExpenseFilters } from "@/components/accounting/expense-filters"
import { ExpenseForm } from "@/components/accounting/expense-form"
import { ExpensePaymentForm } from "@/components/accounting/expense-payment-form"
import { toast } from "sonner"

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

export default function ExpensesPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { hasPermission, loading: permissionsLoading } = usePermissions()
  
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [stores, setStores] = useState<Array<{ id: string; name: string }>>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Filters
  const [selectedStoreId, setSelectedStoreId] = useState("all")
  const [selectedCategoryId, setSelectedCategoryId] = useState("all")
  const [selectedStatus, setSelectedStatus] = useState("all")
  // Période par défaut: du 1er du mois en cours jusqu'à aujourd'hui
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
      params.append("startDate", format(startDate, "yyyy-MM-dd"))
      params.append("endDate", format(endDate, "yyyy-MM-dd"))
      if (selectedStoreId !== "all") {
        params.append("storeId", selectedStoreId)
      }
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
  }, [selectedStoreId, selectedCategoryId, selectedStatus, startDate, endDate])

  useEffect(() => {
    fetchStores()
    fetchCategories()
  }, [fetchStores, fetchCategories])

  useEffect(() => {
    if (!permissionsLoading) {
      fetchExpenses()
    }
  }, [fetchExpenses, permissionsLoading])

  // Handle URL params for category filter
  useEffect(() => {
    const categoryIdParam = searchParams.get("categoryId")
    if (categoryIdParam) {
      setSelectedCategoryId(categoryIdParam)
    }
  }, [searchParams])

  // Handle URL params for actions
  useEffect(() => {
    const action = searchParams.get("action")
    const viewId = searchParams.get("view")
    const editId = searchParams.get("edit")
    const payId = searchParams.get("pay")
    
    if (action === "new") {
      setShowCreateSheet(true)
      router.replace("/dashboard/accounting/expenses")
    } else if (editId) {
      const expense = expenses.find(e => e.id === editId)
      if (expense) {
        setSelectedExpense(expense)
        setShowEditSheet(true)
      }
    } else if (payId) {
      const expense = expenses.find(e => e.id === payId)
      if (expense) {
        setSelectedExpense(expense)
        setShowPaymentSheet(true)
      }
    }
  }, [searchParams, expenses, router])

  const handleCreateExpense = async (data: any) => {
    setIsSubmitting(true)
    try {
      const response = await fetch("/api/accounting/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
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
      router.replace("/dashboard/accounting/expenses")
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
      router.replace("/dashboard/accounting/expenses")
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
    setSelectedStoreId("all")
    setSelectedCategoryId("all")
    setSelectedStatus("all")
  }

  if (permissionsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-gray-600" />
      </div>
    )
  }

  if (!hasPermission("accounting.expenses.view")) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Accès refusé</h2>
        <p className="text-gray-500">Vous n'avez pas la permission d'accéder aux dépenses.</p>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* Header avec filtres de date */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dépenses</h1>
          <p className="text-gray-500">{expenses.length} dépense(s)</p>
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

          {/* Actualiser */}
          <Button variant="outline" size="icon" onClick={fetchExpenses} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          </Button>

          {hasPermission("accounting.expenses.create") && (
            <Button onClick={() => setShowCreateSheet(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Nouvelle dépense
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap mb-6">
        <Select value={selectedStoreId} onValueChange={setSelectedStoreId}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Magasin" />
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

        {(selectedStoreId !== "all" || selectedCategoryId !== "all" || selectedStatus !== "all") && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            Effacer les filtres
          </Button>
        )}
      </div>

        {/* Error State */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-red-500" />
            <p className="text-red-700">{error}</p>
            <Button variant="outline" size="sm" onClick={fetchExpenses}>
              Réessayer
            </Button>
          </div>
        )}

        {/* Expenses List */}
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
                {selectedStoreId !== "all" || selectedCategoryId !== "all" || selectedStatus !== "all"
                  ? "Aucune dépense ne correspond aux filtres sélectionnés."
                  : "Commencez par créer votre première dépense."}
              </p>
              {hasPermission("accounting.expenses.create") && (
                <Button onClick={() => setShowCreateSheet(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Créer une dépense
                </Button>
              )}
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

        {/* Create Sheet */}
        <Sheet open={showCreateSheet} onOpenChange={setShowCreateSheet}>
          <SheetContent className="sm:max-w-xl overflow-y-auto">
            <SheetHeader>
              <SheetTitle>Nouvelle dépense</SheetTitle>
            </SheetHeader>
            <div className="mt-6">
              <ExpenseForm
                stores={stores}
                categories={categories}
                onSubmit={handleCreateExpense}
                onCancel={() => setShowCreateSheet(false)}
                isLoading={isSubmitting}
              />
            </div>
          </SheetContent>
        </Sheet>

        {/* Edit Sheet */}
        <Sheet 
          open={showEditSheet} 
          onOpenChange={(open) => {
            setShowEditSheet(open)
            if (!open) {
              setSelectedExpense(null)
              router.replace("/dashboard/accounting/expenses")
            }
          }}
        >
          <SheetContent className="sm:max-w-xl overflow-y-auto">
            <SheetHeader>
              <SheetTitle>Modifier la dépense</SheetTitle>
            </SheetHeader>
            <div className="mt-6">
              {selectedExpense && (
                <ExpenseForm
                  stores={stores}
                  categories={categories}
                  initialData={{
                    id: selectedExpense.id,
                    storeId: selectedExpense.store?.id || null,
                    categoryId: selectedExpense.category.id,
                    title: selectedExpense.title,
                    amount: selectedExpense.amount,
                    dueDate: new Date(selectedExpense.dueDate),
                  }}
                  onSubmit={handleEditExpense}
                  onCancel={() => {
                    setShowEditSheet(false)
                    setSelectedExpense(null)
                    router.replace("/dashboard/accounting/expenses")
                  }}
                  isLoading={isSubmitting}
                />
              )}
            </div>
          </SheetContent>
        </Sheet>

        {/* Payment Sheet */}
        <Sheet 
          open={showPaymentSheet} 
          onOpenChange={(open) => {
            setShowPaymentSheet(open)
            if (!open) {
              setSelectedExpense(null)
              router.replace("/dashboard/accounting/expenses")
            }
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
                      router.replace("/dashboard/accounting/expenses")
                    }}
                    isLoading={isSubmitting}
                  />
                </>
              )}
            </div>
          </SheetContent>
        </Sheet>

        {/* Detail Sheet */}
        <Sheet 
          open={showDetailSheet} 
          onOpenChange={(open) => {
            setShowDetailSheet(open)
            if (!open) {
              setSelectedExpense(null)
            }
          }}
        >
          <SheetContent className="sm:max-w-lg overflow-y-auto">
            <SheetHeader>
              <SheetTitle>Détails de la dépense</SheetTitle>
            </SheetHeader>
            {selectedExpense && (
              <div className="mt-6 space-y-6">
                {/* Titre et montant */}
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h3 className="text-lg font-semibold text-gray-900">{selectedExpense.title}</h3>
                  <p className="text-2xl font-bold text-gray-900 mt-2">
                    {selectedExpense.amount.toLocaleString("fr-FR")} FCFA
                  </p>
                  {selectedExpense.status !== "PAID" && selectedExpense.paidAmount > 0 && (
                    <div className="mt-2 text-sm">
                      <span className="text-green-600">Payé: {selectedExpense.paidAmount.toLocaleString("fr-FR")} FCFA</span>
                      <span className="mx-2">•</span>
                      <span className="text-orange-600">Reste: {selectedExpense.remainingAmount.toLocaleString("fr-FR")} FCFA</span>
                    </div>
                  )}
                </div>

                {/* Informations */}
                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-sm">
                    <CalendarIcon className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-600">Échéance:</span>
                    <span className="font-medium">{format(new Date(selectedExpense.dueDate), "dd MMMM yyyy", { locale: fr })}</span>
                  </div>
                  
                  {selectedExpense.store && (
                    <div className="flex items-center gap-3 text-sm">
                      <Building className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-600">Magasin:</span>
                      <span className="font-medium">{selectedExpense.store.name}</span>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-3 text-sm">
                    <Receipt className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-600">Catégorie:</span>
                    <span 
                      className="px-2 py-1 rounded text-xs font-medium"
                      style={{ 
                        backgroundColor: selectedExpense.category.color ? `${selectedExpense.category.color}20` : "#f3f4f6",
                        color: selectedExpense.category.color || "#6b7280"
                      }}
                    >
                      {selectedExpense.category.name}
                    </span>
                  </div>

                  {selectedExpense.supplierName && (
                    <div className="flex items-center gap-3 text-sm">
                      <User className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-600">Fournisseur:</span>
                      <span className="font-medium">{selectedExpense.supplierName}</span>
                    </div>
                  )}

                  {selectedExpense.supplierPhone && (
                    <div className="flex items-center gap-3 text-sm">
                      <Phone className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-600">Téléphone:</span>
                      <span className="font-medium">{selectedExpense.supplierPhone}</span>
                    </div>
                  )}
                </div>

                {/* Description */}
                {selectedExpense.description && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Description</h4>
                    <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                      {selectedExpense.description}
                    </p>
                  </div>
                )}

                {/* Pièce jointe */}
                {selectedExpense.documentUrl && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Pièce jointe</h4>
                    <div className="border rounded-lg p-4 bg-gray-50">
                      {selectedExpense.documentUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i) || 
                       selectedExpense.documentUrl.includes("/api/files/") ? (
                        <div className="space-y-3">
                          <img 
                            src={selectedExpense.documentUrl} 
                            alt="Pièce jointe" 
                            className="max-w-full h-auto rounded-lg border"
                          />
                          <Button
                            variant="outline"
                            className="w-full"
                            onClick={() => window.open(selectedExpense.documentUrl!, "_blank")}
                          >
                            <ExternalLink className="h-4 w-4 mr-2" />
                            Ouvrir dans un nouvel onglet
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3">
                          <div className="p-3 bg-blue-100 rounded-lg">
                            <FileText className="h-6 w-6 text-blue-600" />
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-gray-900">Document joint</p>
                            <p className="text-sm text-gray-500">Cliquez pour ouvrir</p>
                          </div>
                          <Button
                            variant="outline"
                            onClick={() => window.open(selectedExpense.documentUrl!, "_blank")}
                          >
                            <ExternalLink className="h-4 w-4 mr-2" />
                            Ouvrir
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-3 pt-4 border-t">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setShowDetailSheet(false)
                      setShowEditSheet(true)
                    }}
                  >
                    Modifier
                  </Button>
                  {selectedExpense.status !== "PAID" && (
                    <Button
                      className="flex-1"
                      onClick={() => {
                        setShowDetailSheet(false)
                        setShowPaymentSheet(true)
                      }}
                    >
                      Enregistrer un paiement
                    </Button>
                  )}
                </div>
              </div>
            )}
          </SheetContent>
        </Sheet>
    </div>
  )
}
