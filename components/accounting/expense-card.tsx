"use client"

import { Card, CardContent } from "@/components/ui/card"
import { ExpenseStatusBadge } from "./expense-status-badge"
import { ExpenseStoreBadge } from "./expense-store-badge"
import { Calendar, User, MoreHorizontal, Paperclip } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface ExpenseCardProps {
  expense: {
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
  }
  onView?: (id: string) => void
  onEdit?: (id: string) => void
  onPay?: (id: string) => void
  onDelete?: (id: string) => void
}

function formatCurrency(amount: number): string {
  return amount.toLocaleString("fr-FR") + " FCFA"
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

export function ExpenseCard({ expense, onView, onEdit, onPay, onDelete }: ExpenseCardProps) {
  const creatorName = expense.createdBy?.name || 
    `${expense.createdBy?.firstName || ""} ${expense.createdBy?.lastName || ""}`.trim() || 
    "Inconnu"

  return (
    <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => onView?.(expense.id)}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <ExpenseStoreBadge store={expense.store} size="sm" />
              <ExpenseStatusBadge status={expense.status} size="sm" />
            </div>
            
            <h3 className="font-semibold text-gray-900 mb-1 flex items-center gap-2">
              {expense.title}
              {expense.documentUrl && (
                <Paperclip className="h-4 w-4 text-blue-500" />
              )}
            </h3>
            
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {formatDate(expense.dueDate)}
              </span>
              <span className="flex items-center gap-1">
                <User className="h-3 w-3" />
                {creatorName}
              </span>
            </div>
            
            <div 
              className="mt-2 inline-flex items-center gap-1 px-2 py-1 rounded text-xs"
              style={{ 
                backgroundColor: expense.category.color ? `${expense.category.color}20` : "#f3f4f6",
                color: expense.category.color || "#6b7280"
              }}
            >
              {expense.category.name}
            </div>
          </div>

          <div className="text-right">
            <p className="text-lg font-bold text-gray-900">{formatCurrency(expense.amount)}</p>
            {expense.status !== "PAID" && expense.paidAmount > 0 && (
              <p className="text-sm text-gray-500">
                Payé: {formatCurrency(expense.paidAmount)}
              </p>
            )}
            {expense.status !== "PAID" && (
              <p className="text-sm text-orange-600 font-medium">
                Reste: {formatCurrency(expense.remainingAmount)}
              </p>
            )}
            
            <DropdownMenu modal={false}>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="sm" className="mt-2">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="z-[70]">
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onView?.(expense.id); }}>
                  Voir détails
                </DropdownMenuItem>
                {expense.status !== "PAID" && (
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onPay?.(expense.id); }}>
                    Enregistrer un paiement
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit?.(expense.id); }}>
                  Modifier
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={(e) => { e.stopPropagation(); onDelete?.(expense.id); }}
                  className="text-red-600"
                >
                  Supprimer
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
