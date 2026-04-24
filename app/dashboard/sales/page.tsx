"use client"

import { useState } from "react"
import { usePermissions } from "@/hooks/use-permissions"
import { toast } from "@/lib/app-toast"
import type { SalesStats } from "@/types/sales"
import { PermissionGuard } from "@/components/auth/permission-guard"
import { SalesHeader } from "@/components/sales/sales-header"
import { SalesFilters } from "@/components/sales/sales-filters"
import { SalesTable } from "@/components/sales/sales-table"
import { CreateQuoteSheet } from "@/components/sales/create-quote-sheet-v2"
import { CreateInvoiceSheet } from "@/components/sales/create-invoice-sheet-v2"
import { useSales } from "@/hooks/use-sales"

export default function SalesPage() {
  const { hasPermission } = usePermissions()
  const [showCreateQuote, setShowCreateQuote] = useState(false)
  const [showCreateInvoice, setShowCreateInvoice] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [typeFilter, setTypeFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")

  // Utiliser le hook SWR pour gérer les données
  const {
    quotes,
    invoices,
    stats,
    isLoading: loading,
    deleteQuote,
    deleteInvoice,
    sendQuote,
    sendInvoice,
  } = useSales()

  const handleCreateQuote = () => {
    setShowCreateQuote(true)
  }

  const handleCreateInvoice = () => {
    setShowCreateInvoice(true)
  }

  const handleView = (item: any) => {
    const route = item.type === 'quote' 
      ? `/dashboard/sales/quotes/${item.id}` 
      : `/dashboard/sales/invoices/${item.id}`
    window.open(route, '_blank')
  }

  const handleEdit = (item: any) => {
    toast.info(`Modification de ${item.type === 'quote' ? 'devis' : 'facture'} ${item.number}`)
  }

  const handleSend = async (item: any) => {
    const result = item.type === 'quote' 
      ? await sendQuote(item.id)
      : await sendInvoice(item.id)
    
    if (result.success) {
      toast.success(result.message)
    } else {
      toast.error("Erreur lors de l'envoi")
    }
  }

  const handleDelete = async (item: any) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer ${item.type === 'quote' ? 'le devis' : 'la facture'} ${item.number} ?`)) {
      return
    }

    const result = item.type === 'quote' 
      ? await deleteQuote(item.id)
      : await deleteInvoice(item.id)
    
    if (result.success) {
      toast.success(result.message)
    } else {
      toast.error("Erreur lors de la suppression")
    }
  }

  return (
    <PermissionGuard permission="quotes.view">
      <div className="min-h-screen bg-gray-50">
        {/* Header avec stats intégrées */}
        <SalesHeader
          stats={stats}
          loading={loading}
          onCreateQuote={handleCreateQuote}
          onCreateInvoice={handleCreateInvoice}
        />

        {/* Barre de recherche et filtres */}
        <SalesFilters
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          typeFilter={typeFilter}
          onTypeFilterChange={setTypeFilter}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
        />

        {/* Tableau unifié */}
        <SalesTable
          quotes={quotes}
          invoices={invoices}
          loading={loading}
          searchQuery={searchQuery}
          typeFilter={typeFilter}
          statusFilter={statusFilter}
          onView={handleView}
          onEdit={handleEdit}
          onSend={handleSend}
          onDelete={handleDelete}
        />

        {/* Sheets de création avec design document */}
        <CreateQuoteSheet
          open={showCreateQuote}
          onOpenChange={setShowCreateQuote}
        />

        <CreateInvoiceSheet
          open={showCreateInvoice}
          onOpenChange={setShowCreateInvoice}
        />
      </div>
    </PermissionGuard>
  )
}
