"use client"

import { forwardRef } from "react"
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

interface ExpensePaymentVoucherProps {
  expense: {
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
  payments: Payment[]
  voucherNumber?: string
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

export const ExpensePaymentVoucher = forwardRef<HTMLDivElement, ExpensePaymentVoucherProps>(
  ({ expense, payments, voucherNumber }, ref) => {
    const today = new Date()
    const generatedVoucherNumber = voucherNumber || `BP-${format(today, "yyyyMMdd")}-${expense.id.slice(-6).toUpperCase()}`

    return (
      <div ref={ref} className="bg-white p-8 max-w-[210mm] mx-auto" style={{ fontFamily: "Arial, sans-serif" }}>
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
            <p className="text-sm text-gray-600 mt-1">N° {generatedVoucherNumber}</p>
            <p className="text-sm text-gray-600">Date: {format(today, "dd MMMM yyyy", { locale: fr })}</p>
          </div>
        </div>

        {/* Informations de la dépense */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-800 border-b border-gray-300 pb-2 mb-3">
            Informations de la dépense
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">Désignation</p>
              <p className="font-medium text-gray-900">{expense.title}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Catégorie</p>
              <p className="font-medium text-gray-900">{expense.category.name}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Date d'échéance</p>
              <p className="font-medium text-gray-900">
                {format(new Date(expense.dueDate), "dd MMMM yyyy", { locale: fr })}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Statut</p>
              <p className={`font-medium ${
                expense.status === "PAID" ? "text-green-600" : 
                expense.status === "PARTIALLY_PAID" ? "text-orange-600" : "text-red-600"
              }`}>
                {getStatusLabel(expense.status)}
              </p>
            </div>
            {expense.supplierName && (
              <div>
                <p className="text-sm text-gray-500">Fournisseur</p>
                <p className="font-medium text-gray-900">{expense.supplierName}</p>
              </div>
            )}
            {expense.supplierPhone && (
              <div>
                <p className="text-sm text-gray-500">Téléphone fournisseur</p>
                <p className="font-medium text-gray-900">{expense.supplierPhone}</p>
              </div>
            )}
          </div>
          {expense.description && (
            <div className="mt-3">
              <p className="text-sm text-gray-500">Description</p>
              <p className="text-gray-700">{expense.description}</p>
            </div>
          )}
        </div>

        {/* Récapitulatif financier */}
        <div className="mb-6 bg-gray-50 p-4 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-800 border-b border-gray-300 pb-2 mb-3">
            Récapitulatif financier
          </h3>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-sm text-gray-500">Montant total</p>
              <p className="text-xl font-bold text-gray-900">
                {expense.amount.toLocaleString("fr-FR")} FCFA
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Montant payé</p>
              <p className="text-xl font-bold text-green-600">
                {expense.paidAmount.toLocaleString("fr-FR")} FCFA
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Reste à payer</p>
              <p className={`text-xl font-bold ${expense.remainingAmount > 0 ? "text-orange-600" : "text-gray-400"}`}>
                {expense.remainingAmount.toLocaleString("fr-FR")} FCFA
              </p>
            </div>
          </div>
        </div>

        {/* Historique des paiements */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-800 border-b border-gray-300 pb-2 mb-3">
            Historique des paiements
          </h3>
          {payments.length > 0 ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-100">
                  <th className="text-left py-2 px-3 font-semibold">Date</th>
                  <th className="text-left py-2 px-3 font-semibold">Mode</th>
                  <th className="text-left py-2 px-3 font-semibold">Référence</th>
                  <th className="text-left py-2 px-3 font-semibold">Payé par</th>
                  <th className="text-right py-2 px-3 font-semibold">Montant</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment, index) => (
                  <tr key={payment.id} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                    <td className="py-2 px-3">
                      {format(new Date(payment.paymentDate), "dd/MM/yyyy", { locale: fr })}
                    </td>
                    <td className="py-2 px-3">{getPaymentModeLabel(payment.paymentMode)}</td>
                    <td className="py-2 px-3">{payment.reference || "-"}</td>
                    <td className="py-2 px-3">{getUserDisplayName(payment.paidBy)}</td>
                    <td className="py-2 px-3 text-right font-medium">
                      {payment.amount.toLocaleString("fr-FR")} FCFA
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-gray-300">
                  <td colSpan={4} className="py-2 px-3 font-bold text-right">Total payé:</td>
                  <td className="py-2 px-3 text-right font-bold text-green-600">
                    {expense.paidAmount.toLocaleString("fr-FR")} FCFA
                  </td>
                </tr>
              </tfoot>
            </table>
          ) : (
            <p className="text-gray-500 text-center py-4 italic">Aucun paiement enregistré</p>
          )}
        </div>

        {/* Notes */}
        {payments.some(p => p.notes) && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-800 border-b border-gray-300 pb-2 mb-3">
              Notes
            </h3>
            <div className="space-y-2">
              {payments.filter(p => p.notes).map(payment => (
                <div key={payment.id} className="text-sm">
                  <span className="text-gray-500">
                    {format(new Date(payment.paymentDate), "dd/MM/yyyy")}:
                  </span>{" "}
                  <span className="text-gray-700">{payment.notes}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Signatures */}
        <div className="mt-10 pt-6 border-t border-gray-300">
          <div className="grid grid-cols-2 gap-8">
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-16">Le Responsable</p>
              <div className="border-t border-gray-400 pt-2">
                <p className="text-sm text-gray-500">Signature et cachet</p>
              </div>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-16">Le Bénéficiaire</p>
              <div className="border-t border-gray-400 pt-2">
                <p className="text-sm text-gray-500">Signature</p>
              </div>
            </div>
          </div>
        </div>

        {/* Pied de page */}
        <div className="mt-8 pt-4 border-t border-gray-200 text-center text-xs text-gray-400">
          <p>Document généré le {format(today, "dd MMMM yyyy 'à' HH:mm", { locale: fr })}</p>
          <p>Ce document fait foi de preuve de paiement</p>
        </div>
      </div>
    )
  }
)

ExpensePaymentVoucher.displayName = "ExpensePaymentVoucher"
