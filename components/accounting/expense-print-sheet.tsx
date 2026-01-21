"use client"

import { useState, useRef, useEffect } from "react"
import { useReactToPrint } from "react-to-print"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Loader2, Printer } from "lucide-react"
import { format } from "date-fns"
import { fr } from "date-fns/locale"

interface Payment {
  id: string
  amount: number
  paymentDate: string
  paymentMode: string
  reference: string | null
  notes: string | null
  paidBy: {
    id: string
    name: string | null
    firstName: string | null
    lastName: string | null
  }
}

interface ExpenseDetail {
  id: string
  title: string
  description?: string | null
  amount: number
  paidAmount: number
  remainingAmount: number
  status: string
  dueDate: string
  supplierName?: string | null
  supplierPhone?: string | null
  category: {
    id: string
    name: string
  }
  store?: {
    id: string
    name: string
    logo?: string | null
    address?: string | null
    phone?: string | null
    email?: string | null
  } | null
  createdBy: {
    id: string
    name: string | null
    firstName: string | null
    lastName: string | null
  }
}

interface ExpensePrintSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  expenseId: string | null
}

const getPaymentModeLabel = (mode: string) => {
  switch (mode) {
    case "CASH":
      return "Espèces"
    case "BANK":
      return "Virement bancaire"
    case "MOBILE_MONEY":
      return "Mobile Money"
    case "CHECK":
      return "Chèque"
    default:
      return mode
  }
}

const getStatusLabel = (status: string) => {
  switch (status) {
    case "PENDING":
      return "En attente"
    case "PARTIALLY_PAID":
      return "Partiellement payé"
    case "PAID":
      return "Payé"
    default:
      return status
  }
}

const getUserDisplayName = (user: { name: string | null; firstName: string | null; lastName: string | null }) => {
  if (user.firstName && user.lastName) {
    return `${user.firstName} ${user.lastName}`
  }
  return user.name || "N/A"
}

export function ExpensePrintSheet({ open, onOpenChange, expenseId }: ExpensePrintSheetProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [expense, setExpense] = useState<ExpenseDetail | null>(null)
  const [payments, setPayments] = useState<Payment[]>([])
  const [error, setError] = useState<string | null>(null)
  const printRef = useRef<HTMLDivElement>(null)

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: expense ? `Bon_Paiement_${expense.title.replace(/\s+/g, "_")}` : "Bon_Paiement",
  })

  useEffect(() => {
    if (open && expenseId) {
      fetchExpenseDetails()
    } else {
      setExpense(null)
      setPayments([])
      setError(null)
    }
  }, [open, expenseId])

  const fetchExpenseDetails = async () => {
    if (!expenseId) return

    setIsLoading(true)
    setError(null)

    try {
      const [expenseRes, paymentsRes] = await Promise.all([
        fetch(`/api/accounting/expenses/${expenseId}`),
        fetch(`/api/accounting/expenses/${expenseId}/payments`),
      ])

      if (!expenseRes.ok) {
        throw new Error("Erreur lors du chargement de la dépense")
      }

      const expenseData = await expenseRes.json()
      
      let storeWithLogo = expenseData.expense.store
      if (expenseData.expense.store?.id) {
        try {
          const storeRes = await fetch(`/api/stores/${expenseData.expense.store.id}`)
          if (storeRes.ok) {
            const storeData = await storeRes.json()
            storeWithLogo = storeData.store || storeData
          }
        } catch (e) {
          console.error("Error fetching store details:", e)
        }
      }

      setExpense({
        ...expenseData.expense,
        store: storeWithLogo,
      })

      if (paymentsRes.ok) {
        const paymentsData = await paymentsRes.json()
        setPayments(paymentsData.payments || [])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue")
    } finally {
      setIsLoading(false)
    }
  }

  const today = new Date()
  const voucherNumber = expense ? `BP-${format(today, "yyyyMMdd")}-${expense.id.slice(-6).toUpperCase()}` : ""

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-2xl w-full p-0 flex flex-col">
        {/* Header sticky avec bouton imprimer */}
        <div className="sticky top-0 z-10 bg-white border-b px-6 py-4 flex items-center justify-between">
          <SheetTitle className="text-lg font-semibold">Bon de paiement</SheetTitle>
          <Button 
            onClick={() => handlePrint()} 
            disabled={isLoading || !expense}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Printer className="h-4 w-4 mr-2" />
            Imprimer
          </Button>
        </div>

        {/* Contenu scrollable */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              <span className="ml-3 text-gray-500">Chargement...</span>
            </div>
          ) : error ? (
            <div className="text-center py-20">
              <p className="text-red-500">{error}</p>
              <Button variant="outline" className="mt-4" onClick={fetchExpenseDetails}>
                Réessayer
              </Button>
            </div>
          ) : expense ? (
            <div 
              ref={printRef} 
              className="bg-white p-6"
              style={{ fontFamily: "Arial, sans-serif" }}
            >
              {/* En-tête avec logo */}
              <div className="flex justify-between items-start border-b-2 border-gray-800 pb-4 mb-6">
                <div className="flex items-center gap-4">
                  {expense.store?.logo ? (
                    <img 
                      src={expense.store.logo} 
                      alt={expense.store.name} 
                      className="h-16 w-16 object-contain"
                    />
                  ) : (
                    <div className="h-16 w-16 bg-gray-200 rounded flex items-center justify-center text-gray-500 text-xs">
                      Logo
                    </div>
                  )}
                  <div>
                    <h1 className="text-xl font-bold text-gray-900">
                      {expense.store?.name || "Entreprise"}
                    </h1>
                    {expense.store?.address && (
                      <p className="text-sm text-gray-600">{expense.store.address}</p>
                    )}
                    {expense.store?.phone && (
                      <p className="text-sm text-gray-600">Tél: {expense.store.phone}</p>
                    )}
                    {expense.store?.email && (
                      <p className="text-sm text-gray-600">{expense.store.email}</p>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <h2 className="text-2xl font-bold text-gray-900 uppercase">Bon de Paiement</h2>
                  <p className="text-sm text-gray-600 mt-1">N° <span className="font-mono font-semibold">{voucherNumber}</span></p>
                  <p className="text-sm text-gray-600">Date: {format(today, "dd MMMM yyyy", { locale: fr })}</p>
                </div>
              </div>

              {/* Informations de la dépense */}
              <div className="mb-6">
                <h3 className="text-base font-semibold text-gray-800 border-b border-gray-300 pb-2 mb-3">
                  Informations de la dépense
                </h3>
                <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                  <div>
                    <p className="text-xs text-gray-500 uppercase">Désignation</p>
                    <p className="font-medium text-gray-900">{expense.title}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase">Catégorie</p>
                    <p className="font-medium text-gray-900">{expense.category.name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase">Date d'échéance</p>
                    <p className="font-medium text-gray-900">
                      {format(new Date(expense.dueDate), "dd MMMM yyyy", { locale: fr })}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase">Statut</p>
                    <p className={`font-semibold ${
                      expense.status === "PAID" ? "text-green-600" : 
                      expense.status === "PARTIALLY_PAID" ? "text-orange-600" : "text-red-600"
                    }`}>
                      {getStatusLabel(expense.status)}
                    </p>
                  </div>
                  {expense.supplierName && (
                    <div>
                      <p className="text-xs text-gray-500 uppercase">Fournisseur</p>
                      <p className="font-medium text-gray-900">{expense.supplierName}</p>
                    </div>
                  )}
                  {expense.supplierPhone && (
                    <div>
                      <p className="text-xs text-gray-500 uppercase">Téléphone fournisseur</p>
                      <p className="font-medium text-gray-900">{expense.supplierPhone}</p>
                    </div>
                  )}
                </div>
                {expense.description && (
                  <div className="mt-3">
                    <p className="text-xs text-gray-500 uppercase">Description</p>
                    <p className="text-sm text-gray-700 mt-1">{expense.description}</p>
                  </div>
                )}
              </div>

              {/* Récapitulatif financier */}
              <div className="mb-6 bg-gray-50 p-4 rounded-lg border border-gray-200">
                <h3 className="text-base font-semibold text-gray-800 border-b border-gray-300 pb-2 mb-3">
                  Récapitulatif financier
                </h3>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="bg-white p-3 rounded border">
                    <p className="text-xs text-gray-500 uppercase">Montant total</p>
                    <p className="text-lg font-bold text-gray-900 mt-1">
                      {expense.amount.toLocaleString("fr-FR")} <span className="text-xs">FCFA</span>
                    </p>
                  </div>
                  <div className="bg-white p-3 rounded border">
                    <p className="text-xs text-gray-500 uppercase">Montant payé</p>
                    <p className="text-lg font-bold text-green-600 mt-1">
                      {expense.paidAmount.toLocaleString("fr-FR")} <span className="text-xs">FCFA</span>
                    </p>
                  </div>
                  <div className="bg-white p-3 rounded border">
                    <p className="text-xs text-gray-500 uppercase">Reste à payer</p>
                    <p className={`text-lg font-bold mt-1 ${expense.remainingAmount > 0 ? "text-orange-600" : "text-gray-400"}`}>
                      {expense.remainingAmount.toLocaleString("fr-FR")} <span className="text-xs">FCFA</span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Historique des paiements */}
              <div className="mb-6">
                <h3 className="text-base font-semibold text-gray-800 border-b border-gray-300 pb-2 mb-3">
                  Historique des paiements
                </h3>
                {payments.length > 0 ? (
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="text-left py-2 px-3 font-semibold border-b-2 border-gray-300 text-xs">Date</th>
                        <th className="text-left py-2 px-3 font-semibold border-b-2 border-gray-300 text-xs">Mode</th>
                        <th className="text-left py-2 px-3 font-semibold border-b-2 border-gray-300 text-xs">Référence</th>
                        <th className="text-left py-2 px-3 font-semibold border-b-2 border-gray-300 text-xs">Payé par</th>
                        <th className="text-right py-2 px-3 font-semibold border-b-2 border-gray-300 text-xs">Montant</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payments.map((payment, index) => (
                        <tr key={payment.id} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                          <td className="py-2 px-3 border-b border-gray-200 text-xs">
                            {format(new Date(payment.paymentDate), "dd/MM/yyyy", { locale: fr })}
                          </td>
                          <td className="py-2 px-3 border-b border-gray-200 text-xs">{getPaymentModeLabel(payment.paymentMode)}</td>
                          <td className="py-2 px-3 border-b border-gray-200 text-xs">{payment.reference || "-"}</td>
                          <td className="py-2 px-3 border-b border-gray-200 text-xs">{getUserDisplayName(payment.paidBy)}</td>
                          <td className="py-2 px-3 text-right font-medium border-b border-gray-200 text-xs">
                            {payment.amount.toLocaleString("fr-FR")} FCFA
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-gray-100">
                        <td colSpan={4} className="py-2 px-3 font-bold text-right border-t-2 border-gray-300 text-xs">Total payé:</td>
                        <td className="py-2 px-3 text-right font-bold text-green-600 border-t-2 border-gray-300 text-xs">
                          {expense.paidAmount.toLocaleString("fr-FR")} FCFA
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                ) : (
                  <p className="text-gray-500 text-center py-4 italic text-sm border rounded-lg bg-gray-50">
                    Aucun paiement enregistré
                  </p>
                )}
              </div>

              {/* Notes */}
              {payments.some(p => p.notes) && (
                <div className="mb-6">
                  <h3 className="text-base font-semibold text-gray-800 border-b border-gray-300 pb-2 mb-3">
                    Notes
                  </h3>
                  <div className="space-y-1 bg-gray-50 p-3 rounded-lg text-sm">
                    {payments.filter(p => p.notes).map(payment => (
                      <div key={payment.id}>
                        <span className="text-gray-500 font-medium text-xs">
                          {format(new Date(payment.paymentDate), "dd/MM/yyyy")}:
                        </span>{" "}
                        <span className="text-gray-700 text-xs">{payment.notes}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Signatures */}
              <div className="mt-8 pt-6 border-t-2 border-gray-300">
                <div className="grid grid-cols-2 gap-8">
                  <div className="text-center">
                    <p className="text-sm font-medium text-gray-700 mb-16">Le Responsable</p>
                    <div className="border-t-2 border-gray-400 pt-2 mx-6">
                      <p className="text-xs text-gray-500">Signature et cachet</p>
                    </div>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-gray-700 mb-16">Le Bénéficiaire</p>
                    <div className="border-t-2 border-gray-400 pt-2 mx-6">
                      <p className="text-xs text-gray-500">Signature</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Pied de page */}
              <div className="mt-8 pt-3 border-t border-gray-200 text-center text-xs text-gray-400">
                <p>Document généré le {format(today, "dd MMMM yyyy 'à' HH:mm", { locale: fr })}</p>
                <p className="mt-1">Ce document fait foi de preuve de paiement</p>
              </div>
            </div>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  )
}
