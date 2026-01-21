"use client"

import { useState, useRef, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { useReactToPrint } from "react-to-print"
import { Button } from "@/components/ui/button"
import { Loader2, Printer, ArrowLeft, Download } from "lucide-react"
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

export default function ExpensePrintPage() {
  const params = useParams()
  const router = useRouter()
  const expenseId = params.id as string

  const [isLoading, setIsLoading] = useState(true)
  const [expense, setExpense] = useState<ExpenseDetail | null>(null)
  const [payments, setPayments] = useState<Payment[]>([])
  const [error, setError] = useState<string | null>(null)
  const printRef = useRef<HTMLDivElement>(null)

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: expense ? `Bon_Paiement_${expense.title.replace(/\s+/g, "_")}` : "Bon_Paiement",
  })

  useEffect(() => {
    if (expenseId) {
      fetchExpenseDetails()
    }
  }, [expenseId])

  const fetchExpenseDetails = async () => {
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

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="flex items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          <span className="text-gray-500">Chargement du bon de paiement...</span>
        </div>
      </div>
    )
  }

  if (error || !expense) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 gap-4">
        <p className="text-red-500">{error || "Dépense introuvable"}</p>
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour
        </Button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Barre d'actions - masquée à l'impression */}
      <div className="print:hidden sticky top-0 z-10 bg-white border-b shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <Button variant="ghost" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Button>
          <div className="flex items-center gap-2">
            <Button onClick={() => handlePrint()} className="bg-blue-600 hover:bg-blue-700">
              <Printer className="h-4 w-4 mr-2" />
              Imprimer
            </Button>
          </div>
        </div>
      </div>

      {/* Contenu du bon de paiement */}
      <div className="py-8 print:py-0">
        <div 
          ref={printRef} 
          className="bg-white max-w-[210mm] mx-auto shadow-lg print:shadow-none print:max-w-none"
          style={{ fontFamily: "Arial, sans-serif" }}
        >
          <div className="p-8 print:p-6">
            {/* En-tête avec logo */}
            <div className="flex justify-between items-start border-b-2 border-gray-800 pb-4 mb-6">
              <div className="flex items-center gap-4">
                {expense.store?.logo ? (
                  <img 
                    src={expense.store.logo} 
                    alt={expense.store.name} 
                    className="h-20 w-20 object-contain"
                  />
                ) : (
                  <div className="h-20 w-20 bg-gray-200 rounded flex items-center justify-center text-gray-500 text-xs">
                    Logo
                  </div>
                )}
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
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
                <h2 className="text-3xl font-bold text-gray-900 uppercase tracking-wide">Bon de Paiement</h2>
                <p className="text-sm text-gray-600 mt-2">N° <span className="font-mono font-semibold">{voucherNumber}</span></p>
                <p className="text-sm text-gray-600">Date: {format(today, "dd MMMM yyyy", { locale: fr })}</p>
              </div>
            </div>

            {/* Informations de la dépense */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-800 border-b border-gray-300 pb-2 mb-4">
                Informations de la dépense
              </h3>
              <div className="grid grid-cols-2 gap-x-8 gap-y-3">
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Désignation</p>
                  <p className="font-medium text-gray-900 text-lg">{expense.title}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Catégorie</p>
                  <p className="font-medium text-gray-900">{expense.category.name}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Date d'échéance</p>
                  <p className="font-medium text-gray-900">
                    {format(new Date(expense.dueDate), "dd MMMM yyyy", { locale: fr })}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Statut</p>
                  <p className={`font-semibold ${
                    expense.status === "PAID" ? "text-green-600" : 
                    expense.status === "PARTIALLY_PAID" ? "text-orange-600" : "text-red-600"
                  }`}>
                    {getStatusLabel(expense.status)}
                  </p>
                </div>
                {expense.supplierName && (
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Fournisseur</p>
                    <p className="font-medium text-gray-900">{expense.supplierName}</p>
                  </div>
                )}
                {expense.supplierPhone && (
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Téléphone fournisseur</p>
                    <p className="font-medium text-gray-900">{expense.supplierPhone}</p>
                  </div>
                )}
              </div>
              {expense.description && (
                <div className="mt-4">
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Description</p>
                  <p className="text-gray-700 mt-1">{expense.description}</p>
                </div>
              )}
            </div>

            {/* Récapitulatif financier */}
            <div className="mb-6 bg-gray-50 p-5 rounded-lg border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800 border-b border-gray-300 pb-2 mb-4">
                Récapitulatif financier
              </h3>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="bg-white p-4 rounded-lg border">
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Montant total</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {expense.amount.toLocaleString("fr-FR")} <span className="text-sm">FCFA</span>
                  </p>
                </div>
                <div className="bg-white p-4 rounded-lg border">
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Montant payé</p>
                  <p className="text-2xl font-bold text-green-600 mt-1">
                    {expense.paidAmount.toLocaleString("fr-FR")} <span className="text-sm">FCFA</span>
                  </p>
                </div>
                <div className="bg-white p-4 rounded-lg border">
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Reste à payer</p>
                  <p className={`text-2xl font-bold mt-1 ${expense.remainingAmount > 0 ? "text-orange-600" : "text-gray-400"}`}>
                    {expense.remainingAmount.toLocaleString("fr-FR")} <span className="text-sm">FCFA</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Historique des paiements */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-800 border-b border-gray-300 pb-2 mb-4">
                Historique des paiements
              </h3>
              {payments.length > 0 ? (
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="text-left py-3 px-4 font-semibold border-b-2 border-gray-300">Date</th>
                      <th className="text-left py-3 px-4 font-semibold border-b-2 border-gray-300">Mode</th>
                      <th className="text-left py-3 px-4 font-semibold border-b-2 border-gray-300">Référence</th>
                      <th className="text-left py-3 px-4 font-semibold border-b-2 border-gray-300">Payé par</th>
                      <th className="text-right py-3 px-4 font-semibold border-b-2 border-gray-300">Montant</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((payment, index) => (
                      <tr key={payment.id} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                        <td className="py-3 px-4 border-b border-gray-200">
                          {format(new Date(payment.paymentDate), "dd/MM/yyyy", { locale: fr })}
                        </td>
                        <td className="py-3 px-4 border-b border-gray-200">{getPaymentModeLabel(payment.paymentMode)}</td>
                        <td className="py-3 px-4 border-b border-gray-200">{payment.reference || "-"}</td>
                        <td className="py-3 px-4 border-b border-gray-200">{getUserDisplayName(payment.paidBy)}</td>
                        <td className="py-3 px-4 text-right font-medium border-b border-gray-200">
                          {payment.amount.toLocaleString("fr-FR")} FCFA
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gray-100">
                      <td colSpan={4} className="py-3 px-4 font-bold text-right border-t-2 border-gray-300">Total payé:</td>
                      <td className="py-3 px-4 text-right font-bold text-green-600 border-t-2 border-gray-300">
                        {expense.paidAmount.toLocaleString("fr-FR")} FCFA
                      </td>
                    </tr>
                  </tfoot>
                </table>
              ) : (
                <p className="text-gray-500 text-center py-6 italic border rounded-lg bg-gray-50">
                  Aucun paiement enregistré
                </p>
              )}
            </div>

            {/* Notes */}
            {payments.some(p => p.notes) && (
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-800 border-b border-gray-300 pb-2 mb-3">
                  Notes
                </h3>
                <div className="space-y-2 bg-gray-50 p-4 rounded-lg">
                  {payments.filter(p => p.notes).map(payment => (
                    <div key={payment.id} className="text-sm">
                      <span className="text-gray-500 font-medium">
                        {format(new Date(payment.paymentDate), "dd/MM/yyyy")}:
                      </span>{" "}
                      <span className="text-gray-700">{payment.notes}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Signatures */}
            <div className="mt-12 pt-8 border-t-2 border-gray-300">
              <div className="grid grid-cols-2 gap-12">
                <div className="text-center">
                  <p className="text-sm font-medium text-gray-700 mb-20">Le Responsable</p>
                  <div className="border-t-2 border-gray-400 pt-3 mx-8">
                    <p className="text-xs text-gray-500">Signature et cachet</p>
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-gray-700 mb-20">Le Bénéficiaire</p>
                  <div className="border-t-2 border-gray-400 pt-3 mx-8">
                    <p className="text-xs text-gray-500">Signature</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Pied de page */}
            <div className="mt-12 pt-4 border-t border-gray-200 text-center text-xs text-gray-400">
              <p>Document généré le {format(today, "dd MMMM yyyy 'à' HH:mm", { locale: fr })}</p>
              <p className="mt-1">Ce document fait foi de preuve de paiement</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
