"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Search,
  Filter,
  Eye,
  Send,
  Download,
  MoreHorizontal,
  Calendar,
  User,
  Euro,
  Receipt,
  AlertTriangle,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { type Invoice, InvoiceStatus } from "@/types/sales"
import { cn } from "@/lib/utils"
import { CreateInvoiceSheet } from "./create-invoice-sheet"

interface InvoicesListProps {
  onRefresh?: () => void
}

const statusConfig = {
  [InvoiceStatus.DRAFT]: {
    label: "Brouillon",
    color: "bg-gray-100 text-gray-800",
    icon: "📝",
  },
  [InvoiceStatus.SENT]: {
    label: "Envoyée",
    color: "bg-blue-100 text-blue-800",
    icon: "📤",
  },
  [InvoiceStatus.PAID]: {
    label: "Payée",
    color: "bg-green-100 text-green-800",
    icon: "✅",
  },
  [InvoiceStatus.OVERDUE]: {
    label: "En retard",
    color: "bg-red-100 text-red-800",
    icon: "⚠️",
  },
  [InvoiceStatus.CANCELLED]: {
    label: "Annulée",
    color: "bg-gray-100 text-gray-800",
    icon: "❌",
  },
}

export function InvoicesList({ onRefresh }: InvoicesListProps) {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [showCreateSheet, setShowCreateSheet] = useState(false)
  const router = useRouter()

  useEffect(() => {
    fetchInvoices()
  }, [search, statusFilter])

  const fetchInvoices = async () => {
    try {
      const params = new URLSearchParams()
      if (search) params.append("search", search)
      if (statusFilter !== "all") params.append("status", statusFilter)

      const response = await fetch(`/api/invoices?${params}`)
      if (response.ok) {
        const data = await response.json()
        setInvoices(data)
      }
    } catch (error) {
      console.error("Error fetching invoices:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleStatusChange = async (invoiceId: string, newStatus: InvoiceStatus) => {
    try {
      const response = await fetch(`/api/invoices/${invoiceId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      })

      if (response.ok) {
        fetchInvoices()
        onRefresh?.()
      }
    } catch (error) {
      console.error("Error updating invoice status:", error)
    }
  }

  const handleSendInvoice = async (invoiceId: string) => {
    try {
      const response = await fetch(`/api/invoices/${invoiceId}/send`, {
        method: "POST",
      })

      if (response.ok) {
        fetchInvoices()
        onRefresh?.()
      }
    } catch (error) {
      console.error("Error sending invoice:", error)
    }
  }

  const handleInvoiceCreated = () => {
    setShowCreateSheet(false)
    fetchInvoices()
    onRefresh?.()
  }

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })
  }

  const isOverdue = (dueDate: Date, status: InvoiceStatus) => {
    return status === InvoiceStatus.SENT && new Date(dueDate) < new Date()
  }

  const getDaysOverdue = (dueDate: Date) => {
    const today = new Date()
    const due = new Date(dueDate)
    const diffTime = today.getTime() - due.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  // Auto-open create sheet if no invoices and no search/filter
  useEffect(() => {
    if (!loading && invoices.length === 0 && !search && statusFilter === "all") {
      setShowCreateSheet(true)
    }
  }, [loading, invoices.length, search, statusFilter])

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Filtres */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Factures</CardTitle>
            <Button onClick={() => setShowCreateSheet(true)}>
              <Receipt className="mr-2 h-4 w-4" />
              Nouvelle facture
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Rechercher par numéro, client, titre..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                {Object.entries(statusConfig).map(([status, config]) => (
                  <SelectItem key={status} value={status}>
                    {config.icon} {config.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Liste des factures */}
      <div className="space-y-4">
        {invoices.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Receipt className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {search || statusFilter !== "all" ? "Aucune facture trouvée" : "Aucune facture"}
              </h3>
              <p className="text-gray-600 mb-4">
                {search || statusFilter !== "all"
                  ? "Aucune facture ne correspond à vos critères de recherche."
                  : "Le formulaire de création s'ouvrira automatiquement pour créer votre première facture."}
              </p>
            </CardContent>
          </Card>
        ) : (
          invoices.map((invoice) => {
            const status = statusConfig[invoice.status]
            const overdue = isOverdue(invoice.dueDate, invoice.status)
            const daysOverdue = overdue ? getDaysOverdue(invoice.dueDate) : 0

            return (
              <Card
                key={invoice.id}
                className={cn(
                  "hover:shadow-md transition-shadow cursor-pointer",
                  overdue && "border-red-200 bg-red-50",
                )}
                onClick={() => router.push(`/dashboard/sales/invoices/${invoice.id}`)}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900 truncate">{invoice.number}</h3>
                        <Badge className={cn("text-xs", status.color)}>
                          {status.icon} {status.label}
                        </Badge>
                        {overdue && (
                          <Badge variant="outline" className="text-red-600 border-red-200">
                            <AlertTriangle className="mr-1 h-3 w-3" />
                            {daysOverdue} jour{daysOverdue > 1 ? "s" : ""} de retard
                          </Badge>
                        )}
                      </div>

                      <p className="text-gray-900 font-medium mb-1">{invoice.title}</p>

                      <div className="flex items-center space-x-4 text-sm text-gray-600 mb-3">
                        <div className="flex items-center">
                          <User className="h-4 w-4 mr-1" />
                          {invoice.contact.firstName} {invoice.contact.lastName}
                          {invoice.contact.job && <span className="ml-1">({invoice.contact.job})</span>}
                        </div>
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 mr-1" />
                          Échéance: {formatDate(invoice.dueDate)}
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center text-lg font-bold text-gray-900">
                          <Euro className="h-4 w-4 mr-1" />
                          {invoice.total.toLocaleString()} xaf 
                        </div>

                        <div className="flex items-center space-x-2">
                          {invoice.status === InvoiceStatus.DRAFT && (
                            <Button
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleSendInvoice(invoice.id)
                              }}
                            >
                              <Send className="h-4 w-4 mr-1" />
                              Envoyer
                            </Button>
                          )}

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => router.push(`/dashboard/sales/invoices/${invoice.id}`)}>
                                <Eye className="mr-2 h-4 w-4" />
                                Voir les détails
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => router.push(`/dashboard/sales/invoices/${invoice.id}/edit`)}
                              >
                                <Receipt className="mr-2 h-4 w-4" />
                                Modifier
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => {}}>
                                <Download className="mr-2 h-4 w-4" />
                                Télécharger PDF
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              {invoice.status !== InvoiceStatus.PAID && (
                                <DropdownMenuItem
                                  onClick={() => handleStatusChange(invoice.id, InvoiceStatus.PAID)}
                                  className="text-green-600"
                                >
                                  ✅ Marquer comme payée
                                </DropdownMenuItem>
                              )}
                              {invoice.status !== InvoiceStatus.CANCELLED && (
                                <DropdownMenuItem
                                  onClick={() => handleStatusChange(invoice.id, InvoiceStatus.CANCELLED)}
                                  className="text-red-600"
                                >
                                  ❌ Annuler
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>

      {/* Sheet de création */}
      <CreateInvoiceSheet
        open={showCreateSheet}
        onOpenChange={setShowCreateSheet}
        onInvoiceCreated={handleInvoiceCreated}
      />
    </div>
  )
}
