"use client"

import { useMemo } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MoreHorizontal, Eye, Edit, Send, Trash2, FileText, Receipt } from "lucide-react"
import { formatDate } from "@/lib/utils"

interface SalesItem {
  id: string
  number: string
  type: 'quote' | 'invoice'
  status: string
  customerName: string
  customerEmail: string
  amount: number
  createdAt: string
  validUntil?: string
  dueDate?: string
}

interface SalesTableProps {
  quotes: any[]
  invoices: any[]
  loading: boolean
  searchQuery: string
  typeFilter: string
  statusFilter: string
  onView: (item: SalesItem) => void
  onEdit: (item: SalesItem) => void
  onSend: (item: SalesItem) => void
  onDelete: (item: SalesItem) => void
}

export function SalesTable({
  quotes,
  invoices,
  loading,
  searchQuery,
  typeFilter,
  statusFilter,
  onView,
  onEdit,
  onSend,
  onDelete,
}: SalesTableProps) {
  // Combiner et formater les données avec useMemo
  const items: SalesItem[] = useMemo(() => {
    return [
      ...quotes.map((quote: any) => ({
        id: quote.id,
        number: quote.number,
        type: 'quote' as const,
        status: quote.status,
        customerName: quote.customerName,
        customerEmail: quote.customerEmail,
        amount: quote.amount,
        createdAt: quote.createdAt,
        validUntil: quote.validUntil,
      })),
      ...invoices.map((invoice: any) => ({
        id: invoice.id,
        number: invoice.number,
        type: 'invoice' as const,
        status: invoice.status,
        customerName: invoice.customerName,
        customerEmail: invoice.customerEmail,
        amount: invoice.amount,
        createdAt: invoice.createdAt,
        dueDate: invoice.dueDate,
      }))
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }, [quotes, invoices])

  // Filtrer les éléments
  const filteredItems = useMemo(() => items.filter((item) => {
    const matchesSearch = 
      item.number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.customerEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.amount.toString().includes(searchQuery)

    const matchesType = typeFilter === "all" || 
      (typeFilter === "quote" && item.type === "quote") ||
      (typeFilter === "invoice" && item.type === "invoice")

    const matchesStatus = statusFilter === "all" || item.status === statusFilter

    return matchesSearch && matchesType && matchesStatus
  }), [items, searchQuery, typeFilter, statusFilter])

  const getStatusBadge = (status: string, type: 'quote' | 'invoice') => {
    const statusConfig = {
      DRAFT: { label: "Brouillon", variant: "secondary" as const },
      SENT: { label: "Envoyé", variant: "default" as const },
      ACCEPTED: { label: "Accepté", variant: "default" as const },
      REJECTED: { label: "Rejeté", variant: "destructive" as const },
      PAID: { label: "Payé", variant: "default" as const },
      OVERDUE: { label: "En retard", variant: "destructive" as const },
    }

    const config = statusConfig[status as keyof typeof statusConfig] || 
      { label: status, variant: "secondary" as const }

    return (
      <Badge variant={config.variant} className="text-xs">
        {config.label}
      </Badge>
    )
  }

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "XAF",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
      <div className="bg-white rounded-lg border shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Type</TableHead>
              <TableHead>Numéro</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Montant</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Date création</TableHead>
              <TableHead>Échéance</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                  {searchQuery || typeFilter !== "all" || statusFilter !== "all"
                    ? "Aucun résultat trouvé avec les filtres appliqués"
                    : "Aucun devis ou facture trouvé"}
                </TableCell>
              </TableRow>
            ) : (
              filteredItems.map((item) => (
                <TableRow key={`${item.type}-${item.id}`} className="hover:bg-gray-50">
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      {item.type === 'quote' ? (
                        <FileText className="h-4 w-4 text-blue-600" />
                      ) : (
                        <Receipt className="h-4 w-4 text-green-600" />
                      )}
                      <span className="text-sm font-medium">
                        {item.type === 'quote' ? 'Devis' : 'Facture'}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-sm">{item.number}</TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{item.customerName}</div>
                      <div className="text-sm text-gray-500">{item.customerEmail}</div>
                    </div>
                  </TableCell>
                  <TableCell className="font-semibold">{formatAmount(item.amount)}</TableCell>
                  <TableCell>{getStatusBadge(item.status, item.type)}</TableCell>
                  <TableCell className="text-sm text-gray-600">
                    {formatDate(item.createdAt)}
                  </TableCell>
                  <TableCell className="text-sm text-gray-600">
                    {item.validUntil && formatDate(item.validUntil)}
                    {item.dueDate && formatDate(item.dueDate)}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem onClick={() => onView(item)}>
                          <Eye className="h-4 w-4 mr-2" />
                          Voir les détails
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onEdit(item)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Modifier
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onSend(item)}>
                          <Send className="h-4 w-4 mr-2" />
                          Envoyer
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => onDelete(item)}
                          className="text-red-600"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Supprimer
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination ou informations sur les résultats */}
      {filteredItems.length > 0 && (
        <div className="mt-4 text-sm text-gray-600 text-center">
          {filteredItems.length} résultat{filteredItems.length > 1 ? 's' : ''} affiché{filteredItems.length > 1 ? 's' : ''}
          {(searchQuery || typeFilter !== "all" || statusFilter !== "all") && 
            ` sur ${items.length} au total`
          }
        </div>
      )}
    </div>
  )
}
