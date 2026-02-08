"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  Users,
  Calendar,
  FileText,
  Settings,
  Plus,
  TrendingUp,
  DollarSign,
  Clock,
  CheckCircle,
  AlertCircle,
  ChevronRight,
  Loader2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { PermissionGuard } from "@/components/auth/permission-guard"

interface PayrollStats {
  totalProfiles: number
  activeProfiles: number
  currentPeriod: {
    id: string
    name: string
    startDate: string
    endDate: string
    payrollsCount: number
    totalNet: number
    byStatus: {
      DRAFT: number
      PENDING: number
      VALIDATED: number
      APPROVED: number
      PARTIALLY_PAID: number
      PAID: number
    }
  } | null
  recentPayrolls: Array<{
    id: string
    number: string
    status: string
    netSalary: number
    employee: {
      firstName: string
      lastName: string
    }
  }>
}

const statusColors: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-800",
  PENDING: "bg-yellow-100 text-yellow-800",
  VALIDATED: "bg-blue-100 text-blue-800",
  APPROVED: "bg-purple-100 text-purple-800",
  PAID: "bg-green-100 text-green-800",
  CANCELLED: "bg-red-100 text-red-800",
}

const statusLabels: Record<string, string> = {
  DRAFT: "Brouillon",
  PENDING: "En attente",
  VALIDATED: "Validé",
  APPROVED: "Approuvé",
  PAID: "Payé",
  CANCELLED: "Annulé",
}

export default function PayrollDashboardPage() {
  const router = useRouter()
  const [stats, setStats] = useState<PayrollStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      setIsLoading(true)
      // Fetch profiles count
      const profilesRes = await fetch("/api/payroll/profiles")
      const profiles = await profilesRes.json()

      // Fetch current period
      const periodsRes = await fetch("/api/payroll/periods?isClosed=false")
      const periods = await periodsRes.json()
      const currentPeriod = periods[0] || null

      let periodStats = null
      if (currentPeriod) {
        const periodDetailRes = await fetch(`/api/payroll/periods/${currentPeriod.id}`)
        const periodDetail = await periodDetailRes.json()
        periodStats = {
          ...currentPeriod,
          payrollsCount: periodDetail.payrolls?.length || 0,
          totalNet: periodDetail.stats?.totalNet || 0,
          byStatus: periodDetail.stats?.byStatus || {},
        }
      }

      setStats({
        totalProfiles: profiles.length,
        activeProfiles: profiles.filter((p: any) => p.isActive).length,
        currentPeriod: periodStats,
        recentPayrolls: [],
      })
    } catch (error) {
      console.error("Error fetching payroll stats:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "decimal",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount) + " FCFA"
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
  }

  if (isLoading) {
    return (
      <PermissionGuard permission="payroll.view">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </PermissionGuard>
    )
  }

  return (
    <PermissionGuard permission="payroll.view">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 -mx-6 -mt-6 px-6 py-4 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Vue d'ensemble</h1>
              <p className="text-sm text-gray-500 mt-0.5">
                Tableau de bord du module paie
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push("/dashboard/payroll/contributions")}
              >
                <Settings className="h-4 w-4 mr-2" />
                Cotisations
              </Button>
              <Button 
                size="sm"
                className="bg-indigo-600 hover:bg-indigo-700"
                onClick={() => router.push("/dashboard/payroll/periods/new")}
              >
                <Plus className="h-4 w-4 mr-2" />
                Nouvelle période
              </Button>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => router.push("/dashboard/payroll/profiles")}
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Employés configurés</p>
                  <p className="text-2xl font-bold mt-1">
                    {stats?.activeProfiles || 0}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    sur {stats?.totalProfiles || 0} profils
                  </p>
                </div>
                <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => router.push("/dashboard/payroll/periods")}
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Période en cours</p>
                  <p className="text-lg font-bold mt-1">
                    {stats?.currentPeriod?.name || "Aucune"}
                  </p>
                  {stats?.currentPeriod && (
                    <p className="text-xs text-gray-400 mt-1">
                      {formatDate(stats.currentPeriod.startDate)} -{" "}
                      {formatDate(stats.currentPeriod.endDate)}
                    </p>
                  )}
                </div>
                <div className="h-12 w-12 bg-purple-100 rounded-full flex items-center justify-center">
                  <Calendar className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Bulletins générés</p>
                  <p className="text-2xl font-bold mt-1">
                    {stats?.currentPeriod?.payrollsCount || 0}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    pour la période en cours
                  </p>
                </div>
                <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center">
                  <FileText className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Masse salariale</p>
                  <p className="text-xl font-bold mt-1">
                    {formatCurrency(stats?.currentPeriod?.totalNet || 0)}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    net à payer
                  </p>
                </div>
                <div className="h-12 w-12 bg-orange-100 rounded-full flex items-center justify-center">
                  <DollarSign className="h-6 w-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Quick Actions */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="text-lg">Actions rapides</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                variant="outline"
                className="w-full justify-between"
                onClick={() => router.push("/dashboard/payroll/profiles")}
              >
                <span className="flex items-center">
                  <Users className="h-4 w-4 mr-2" />
                  Gérer les profils employés
                </span>
                <ChevronRight className="h-4 w-4" />
              </Button>

              <Button
                variant="outline"
                className="w-full justify-between"
                onClick={() => router.push("/dashboard/payroll/periods")}
              >
                <span className="flex items-center">
                  <Calendar className="h-4 w-4 mr-2" />
                  Gérer les périodes
                </span>
                <ChevronRight className="h-4 w-4" />
              </Button>

              {stats?.currentPeriod && (
                <Button
                  variant="outline"
                  className="w-full justify-between"
                  onClick={() =>
                    router.push(`/dashboard/payroll/periods/${stats.currentPeriod?.id}`)
                  }
                >
                  <span className="flex items-center">
                    <FileText className="h-4 w-4 mr-2" />
                    Voir les bulletins
                  </span>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              )}

              <Button
                variant="outline"
                className="w-full justify-between"
                onClick={() => router.push("/dashboard/payroll/contributions")}
              >
                <span className="flex items-center">
                  <Settings className="h-4 w-4 mr-2" />
                  Configurer les cotisations
                </span>
                <ChevronRight className="h-4 w-4" />
              </Button>

              <Button
                variant="outline"
                className="w-full justify-between"
                onClick={() => router.push("/dashboard/attendance")}
              >
                <span className="flex items-center">
                  <Clock className="h-4 w-4 mr-2" />
                  Voir le pointage
                </span>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>

          {/* Period Status */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-lg">
                Statut de la période{" "}
                {stats?.currentPeriod?.name && `- ${stats.currentPeriod.name}`}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {stats?.currentPeriod ? (
                <div className="space-y-4">
                  {/* Status breakdown */}
                  <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                    <div className="bg-gray-50 rounded-lg p-3 text-center">
                      <p className="text-2xl font-bold text-gray-600">
                        {stats.currentPeriod.byStatus?.DRAFT || 0}
                      </p>
                      <p className="text-xs text-gray-500">Brouillons</p>
                    </div>
                    <div className="bg-yellow-50 rounded-lg p-3 text-center">
                      <p className="text-2xl font-bold text-yellow-600">
                        {stats.currentPeriod.byStatus?.PENDING || 0}
                      </p>
                      <p className="text-xs text-yellow-600">En attente</p>
                    </div>
                    <div className="bg-blue-50 rounded-lg p-3 text-center">
                      <p className="text-2xl font-bold text-blue-600">
                        {stats.currentPeriod.byStatus?.VALIDATED || 0}
                      </p>
                      <p className="text-xs text-blue-600">Validés</p>
                    </div>
                    <div className="bg-purple-50 rounded-lg p-3 text-center">
                      <p className="text-2xl font-bold text-purple-600">
                        {stats.currentPeriod.byStatus?.APPROVED || 0}
                      </p>
                      <p className="text-xs text-purple-600">Approuvés</p>
                    </div>
                    <div className="bg-orange-50 rounded-lg p-3 text-center">
                      <p className="text-2xl font-bold text-orange-600">
                        {stats.currentPeriod.byStatus?.PARTIALLY_PAID || 0}
                      </p>
                      <p className="text-xs text-orange-600">Partiellement payés</p>
                    </div>
                    <div className="bg-green-50 rounded-lg p-3 text-center">
                      <p className="text-2xl font-bold text-green-600">
                        {stats.currentPeriod.byStatus?.PAID || 0}
                      </p>
                      <p className="text-xs text-green-600">Payés</p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3 pt-4 border-t">
                    <Button
                      onClick={() =>
                        router.push(
                          `/dashboard/payroll/periods/${stats.currentPeriod?.id}`
                        )
                      }
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      Voir les bulletins
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() =>
                        router.push(
                          `/dashboard/payroll/periods/${stats.currentPeriod?.id}/generate`
                        )
                      }
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Générer les bulletins
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <AlertCircle className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 mb-4">
                    Aucune période de paie en cours
                  </p>
                  <Button
                    onClick={() => router.push("/dashboard/payroll/periods/new")}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Créer une période
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Workflow Guide */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Workflow de paie</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-blue-600 font-bold">1</span>
                </div>
                <div>
                  <p className="font-medium">Configurer les profils</p>
                  <p className="text-sm text-gray-500">
                    Définir les salaires et types de contrat
                  </p>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-gray-300 hidden md:block" />

              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-purple-100 rounded-full flex items-center justify-center">
                  <span className="text-purple-600 font-bold">2</span>
                </div>
                <div>
                  <p className="font-medium">Créer la période</p>
                  <p className="text-sm text-gray-500">
                    Définir les dates de la paie
                  </p>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-gray-300 hidden md:block" />

              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-green-100 rounded-full flex items-center justify-center">
                  <span className="text-green-600 font-bold">3</span>
                </div>
                <div>
                  <p className="font-medium">Générer les bulletins</p>
                  <p className="text-sm text-gray-500">
                    Calcul automatique depuis le pointage
                  </p>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-gray-300 hidden md:block" />

              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-orange-100 rounded-full flex items-center justify-center">
                  <span className="text-orange-600 font-bold">4</span>
                </div>
                <div>
                  <p className="font-medium">Valider et payer</p>
                  <p className="text-sm text-gray-500">
                    Workflow RH → Direction → Paiement
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </PermissionGuard>
  )
}
