"use client"

import { useState, useEffect } from "react"
import { usePermissions } from "@/hooks/use-permissions"
import { ModuleNavbar } from "@/components/navigation/module-navbar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { TrendingUp, FileText, Receipt, Plus, Euro, Clock, AlertTriangle, CheckCircle, Eye, Send } from "lucide-react"
import type { SalesStats } from "@/types/sales"
import { QuotesList } from "@/components/sales/quotes-list"
import { InvoicesList } from "@/components/sales/invoices-list"
import { PermissionGuard } from "@/components/auth/permission-guard"


export default function SalesPage() {
  const { hasPermission } = usePermissions()
  const [stats, setStats] = useState<SalesStats | null>(null)
  const [loading, setLoading] = useState(true)

  const [activeTab, setActiveTab] = useState("quotes")

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      const response = await fetch("/api/sales/stats")
      if (response.ok) {
        const data = await response.json()
        setStats(data)
      }
    } catch (error) {
      console.error("Error fetching sales stats:", error)
    } finally {
      setLoading(false)
    }
  }


  return (
    <PermissionGuard permission="quotes.view">
      <ModuleNavbar
        title="Ventes"
        description="Gestion des devis et factures"
        icon={TrendingUp}
      >
       
      </ModuleNavbar>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Statistiques */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Chiffre d'affaires</CardTitle>
              <Euro className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loading ? "..." : `XAF ${stats?.totalRevenue?.toLocaleString() || 0}`}
              </div>
              <p className="text-xs text-muted-foreground">+12% par rapport au mois dernier</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Devis en attente</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loading ? "..." : `XAF ${stats?.pendingAmount?.toLocaleString() || 0}`}
              </div>
              <p className="text-xs text-muted-foreground">{stats?.totalQuotes || 0} devis actifs</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Factures en retard</CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {loading ? "..." : `XAF ${stats?.overdueAmount?.toLocaleString() || 0}`}
              </div>
              <p className="text-xs text-muted-foreground">Nécessite un suivi</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Taux de conversion</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {loading ? "..." : `${stats?.conversionRate?.toFixed(1) || 0}%`}
              </div>
              <p className="text-xs text-muted-foreground">Devis → Factures</p>
            </CardContent>
          </Card>
        </div>

        {/* Onglets Devis/Factures */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <div className="flex items-center justify-between">
            <TabsList className="grid w-fit grid-cols-2">
              <TabsTrigger value="quotes" className="flex items-center space-x-2">
                <FileText className="h-4 w-4" />
                <span>Devis</span>
                <Badge variant="secondary" className="ml-2">
                  {stats?.totalQuotes || 0}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="invoices" className="flex items-center space-x-2">
                <Receipt className="h-4 w-4" />
                <span>Factures</span>
                <Badge variant="secondary" className="ml-2">
                  {stats?.totalInvoices || 0}
                </Badge>
              </TabsTrigger>
            </TabsList>

            
          </div>

          <TabsContent value="quotes" className="space-y-6">
            <QuotesList onRefresh={fetchStats} />
          </TabsContent>

          <TabsContent value="invoices" className="space-y-6">
            <InvoicesList onRefresh={fetchStats} />
          </TabsContent>
        </Tabs>
      </div>
    </PermissionGuard>

  )
}
