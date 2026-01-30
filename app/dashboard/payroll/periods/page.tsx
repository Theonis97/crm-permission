"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  Calendar,
  Plus,
  Search,
  MoreVertical,
  Eye,
  Lock,
  Loader2,
  FileText,
  CheckCircle,
  Clock,
  Trash2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { PermissionGuard } from "@/components/auth/permission-guard"
import { CreatePeriodSheet } from "@/components/payroll/create-period-sheet"
import { toast } from "sonner"

interface PayrollPeriod {
  id: string
  name: string
  periodType: string
  startDate: string
  endDate: string
  workingDays: number
  isClosed: boolean
  closedAt: string | null
  closedBy: {
    id: string
    firstName: string | null
    lastName: string | null
    name: string | null
  } | null
  _count: {
    payrolls: number
  }
}

const periodTypeLabels: Record<string, string> = {
  MONTHLY: "Mensuel",
  BIWEEKLY: "Bi-mensuel",
  WEEKLY: "Hebdomadaire",
}

export default function PayrollPeriodsPage() {
  const router = useRouter()
  const [periods, setPeriods] = useState<PayrollPeriod[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filterYear, setFilterYear] = useState<string>("all")
  const [filterStatus, setFilterStatus] = useState<string>("all")
  const [showCreateSheet, setShowCreateSheet] = useState(false)

  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i)

  useEffect(() => {
    fetchPeriods()
  }, [filterYear])

  const fetchPeriods = async () => {
    try {
      setIsLoading(true)
      let url = "/api/payroll/periods"
      const params = new URLSearchParams()
      if (filterYear !== "all") {
        params.append("year", filterYear)
      }
      if (params.toString()) {
        url += `?${params.toString()}`
      }
      const res = await fetch(url)
      if (!res.ok) throw new Error("Erreur lors du chargement")
      const data = await res.json()
      setPeriods(data)
    } catch (error) {
      console.error("Error fetching periods:", error)
      toast.error("Erreur lors du chargement des périodes")
    } finally {
      setIsLoading(false)
    }
  }

  const handleClosePeriod = async (id: string) => {
    if (!confirm("Êtes-vous sûr de vouloir clôturer cette période ? Cette action est irréversible.")) return

    try {
      const res = await fetch(`/api/payroll/periods/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ close: true }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Erreur lors de la clôture")
      }
      toast.success("Période clôturée avec succès")
      fetchPeriods()
    } catch (error: any) {
      toast.error(error.message)
    }
  }

  const handleDeletePeriod = async (id: string, periodName: string, payrollsCount: number) => {
    const message = payrollsCount > 0
      ? `Êtes-vous sûr de vouloir supprimer la période "${periodName}" et ses ${payrollsCount} bulletin(s) de paie ?\n\nCette action est irréversible.`
      : `Êtes-vous sûr de vouloir supprimer la période "${periodName}" ?\n\nCette action est irréversible.`
    
    if (!confirm(message)) return

    try {
      const res = await fetch(`/api/payroll/periods/${id}?deletePeriod=true`, {
        method: "DELETE",
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Erreur lors de la suppression")
      }
      const data = await res.json()
      toast.success(data.message || "Période supprimée avec succès")
      fetchPeriods()
    } catch (error: any) {
      toast.error(error.message)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
  }

  const filteredPeriods = periods.filter((period) => {
    if (filterStatus === "open") return !period.isClosed
    if (filterStatus === "closed") return period.isClosed
    return true
  })

  return (
    <PermissionGuard permission="payroll.view">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 -mx-6 -mt-6 px-6 py-4 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-gray-900">
                Périodes de paie
              </h1>
              <p className="text-sm text-gray-500 mt-0.5">
                Gestion des périodes et génération des bulletins
              </p>
            </div>
            <Button 
              size="sm"
              className="bg-indigo-600 hover:bg-indigo-700"
              onClick={() => setShowCreateSheet(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Nouvelle période
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <Select value={filterYear} onValueChange={setFilterYear}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Année" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes les années</SelectItem>
                  {years.map((year) => (
                    <SelectItem key={year} value={String(year)}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les statuts</SelectItem>
                  <SelectItem value="open">En cours</SelectItem>
                  <SelectItem value="closed">Clôturées</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                <Calendar className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{periods.length}</p>
                <p className="text-sm text-gray-500">Total périodes</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="h-10 w-10 bg-green-100 rounded-full flex items-center justify-center">
                <Clock className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {periods.filter((p) => !p.isClosed).length}
                </p>
                <p className="text-sm text-gray-500">En cours</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="h-10 w-10 bg-purple-100 rounded-full flex items-center justify-center">
                <FileText className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {periods.reduce((sum, p) => sum + p._count.payrolls, 0)}
                </p>
                <p className="text-sm text-gray-500">Total bulletins</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredPeriods.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">Aucune période trouvée</p>
                <Button
                  variant="link"
                  onClick={() => router.push("/dashboard/payroll/periods/new")}
                >
                  Créer une période
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Période</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Dates</TableHead>
                    <TableHead className="text-center">Jours ouvrés</TableHead>
                    <TableHead className="text-center">Bulletins</TableHead>
                    <TableHead className="text-center">Statut</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPeriods.map((period) => (
                    <TableRow key={period.id}>
                      <TableCell>
                        <div className="font-medium">{period.name}</div>
                      </TableCell>
                      <TableCell>
                        {periodTypeLabels[period.periodType] || period.periodType}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {formatDate(period.startDate)} - {formatDate(period.endDate)}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        {period.workingDays}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary">
                          {period._count.payrolls}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        {period.isClosed ? (
                          <Badge className="bg-gray-100 text-gray-800">
                            <Lock className="h-3 w-3 mr-1" />
                            Clôturée
                          </Badge>
                        ) : (
                          <Badge className="bg-green-100 text-green-800">
                            <Clock className="h-3 w-3 mr-1" />
                            En cours
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() =>
                                router.push(`/dashboard/payroll/periods/${period.id}`)
                              }
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              Voir les bulletins
                            </DropdownMenuItem>
                            {!period.isClosed && (
                              <>
                                <DropdownMenuItem
                                  onClick={() => handleClosePeriod(period.id)}
                                >
                                  <Lock className="h-4 w-4 mr-2" />
                                  Clôturer la période
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-red-600"
                                  onClick={() => handleDeletePeriod(period.id, period.name, period._count.payrolls)}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Supprimer la période
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
        {/* Create Period Sheet */}
        <CreatePeriodSheet
          open={showCreateSheet}
          onOpenChange={setShowCreateSheet}
          onSuccess={fetchPeriods}
        />
      </div>
    </PermissionGuard>
  )
}
