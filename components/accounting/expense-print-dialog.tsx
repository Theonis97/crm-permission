"use client"

import { useState, useRef, useEffect } from "react"
import { useReactToPrint } from "react-to-print"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Loader2, Printer, X } from "lucide-react"
import { ExpensePaymentVoucher } from "./expense-payment-voucher"

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
  payments?: Payment[]
}

interface ExpensePrintDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  expenseId: string | null
}

export function ExpensePrintDialog({ open, onOpenChange, expenseId }: ExpensePrintDialogProps) {
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
      
      // Récupérer les détails du magasin avec le logo si la dépense est liée à un magasin
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Bon de paiement</span>
            <div className="flex items-center gap-2">
              <Button
                variant="default"
                size="sm"
                onClick={() => handlePrint()}
                disabled={isLoading || !expense}
              >
                <Printer className="h-4 w-4 mr-2" />
                Imprimer
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="mt-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              <span className="ml-3 text-gray-500">Chargement...</span>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-red-500">{error}</p>
              <Button variant="outline" className="mt-4" onClick={fetchExpenseDetails}>
                Réessayer
              </Button>
            </div>
          ) : expense ? (
            <div className="border rounded-lg overflow-hidden bg-white shadow-sm">
              <ExpensePaymentVoucher
                ref={printRef}
                expense={expense}
                payments={payments}
              />
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  )
}
