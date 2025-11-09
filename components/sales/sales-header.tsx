"use client"

import { TrendingUp, Plus, Euro, Clock, AlertTriangle, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { SalesStats } from "@/types/sales"

interface SalesHeaderProps {
  stats: SalesStats | null
  loading: boolean
  onCreateQuote: () => void
  onCreateInvoice: () => void
}

export function SalesHeader({ stats, loading, onCreateQuote, onCreateInvoice }: SalesHeaderProps) {
  return (
    <div className="border-b bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header principal */}
        <div className="flex items-center justify-between py-6">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-3">
              <div className="flex items-center justify-center w-10 h-10 bg-orange-100 rounded-lg">
                <TrendingUp className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Ventes</h1>
                <p className="text-sm text-gray-500">Gestion des devis et factures</p>
              </div>
            </div>
          </div>

          {/* Bouton Créer */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="bg-orange-600 hover:bg-orange-700">
                <Plus className="h-4 w-4 mr-2" />
                Créer
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={onCreateQuote}>
                <TrendingUp className="h-4 w-4 mr-2" />
                Nouveau devis
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onCreateInvoice}>
                <AlertTriangle className="h-4 w-4 mr-2" />
                Nouvelle facture
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Statistiques intégrées */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 pb-6">
          <div className="flex items-center space-x-3 p-4 bg-green-50 rounded-lg border border-green-100">
            <div className="flex items-center justify-center w-10 h-10 bg-green-100 rounded-lg">
              <Euro className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-green-900">Chiffre d'affaires</p>
              <p className="text-xl font-bold text-green-700">
                {loading ? "..." : `XAF ${stats?.totalRevenue?.toLocaleString() || 0}`}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3 p-4 bg-blue-50 rounded-lg border border-blue-100">
            <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-lg">
              <Clock className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-blue-900">Devis en attente</p>
              <p className="text-xl font-bold text-blue-700">
                {loading ? "..." : `XAF ${stats?.pendingAmount?.toLocaleString() || 0}`}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3 p-4 bg-red-50 rounded-lg border border-red-100">
            <div className="flex items-center justify-center w-10 h-10 bg-red-100 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-red-900">Factures en retard</p>
              <p className="text-xl font-bold text-red-700">
                {loading ? "..." : `XAF ${stats?.overdueAmount?.toLocaleString() || 0}`}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3 p-4 bg-emerald-50 rounded-lg border border-emerald-100">
            <div className="flex items-center justify-center w-10 h-10 bg-emerald-100 rounded-lg">
              <CheckCircle className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-emerald-900">Taux de conversion</p>
              <p className="text-xl font-bold text-emerald-700">
                {loading ? "..." : `${stats?.conversionRate?.toFixed(1) || 0}%`}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
