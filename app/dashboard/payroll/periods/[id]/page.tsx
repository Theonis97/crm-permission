"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import {
  ArrowLeft,
  Calendar,
  FileText,
  Plus,
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  DollarSign,
  Eye,
  MoreVertical,
  Check,
  ThumbsUp,
  CreditCard,
  Lock,
  Download,
  Printer,
  Users,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
  DropdownMenuSeparator,
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
import { EditPayrollSheet } from "@/components/payroll/edit-payroll-sheet"
import { AddPayrollsSheet } from "@/components/payroll/add-payrolls-sheet"
import { Checkbox } from "@/components/ui/checkbox"
import { toast } from "sonner"

interface PayrollPeriodDetail {
  id: string
  name: string
  periodType: string
  startDate: string
  endDate: string
  workingDays: number
  isClosed: boolean
  closedAt: string | null
  closedBy: {
    firstName: string | null
    lastName: string | null
  } | null
  payrolls: Array<{
    id: string
    number: string
    status: string
    daysWorked: number
    hoursWorked: number
    expectedWorkingDays: number
    grossSalary: number
    totalDeductions: number
    totalBonuses: number
    netSalary: number
    paidAmount: number
    remainingAmount: number
    employeeProfile: {
      id: string
      user: {
        id: string
        firstName: string | null
        lastName: string | null
        matricule: string | null
      }
    }
    rubricLines: Array<{
      id: string
      rubricName: string
      rubricType: string
      amount: number
    }>
  }>
  stats: {
    totalPayrolls: number
    totalGross: number
    totalNet: number
    totalDeductions: number
    byStatus: Record<string, number>
  }
}

const statusColors: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-800",
  PENDING: "bg-yellow-100 text-yellow-800",
  VALIDATED: "bg-blue-100 text-blue-800",
  APPROVED: "bg-purple-100 text-purple-800",
  PARTIALLY_PAID: "bg-orange-100 text-orange-800",
  PAID: "bg-green-100 text-green-800",
  CANCELLED: "bg-red-100 text-red-800",
}

const statusLabels: Record<string, string> = {
  DRAFT: "Brouillon",
  PENDING: "En attente",
  VALIDATED: "Validé RH",
  APPROVED: "Approuvé",
  PARTIALLY_PAID: "Partiellement payé",
  PAID: "Payé",
  CANCELLED: "Annulé",
}

export default function PayrollPeriodDetailPage() {
  const router = useRouter()
  const params = useParams()
  const periodId = params.id as string

  const [period, setPeriod] = useState<PayrollPeriodDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState<string>("all")
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [selectedPayrollId, setSelectedPayrollId] = useState<string | null>(null)
  const [showEditSheet, setShowEditSheet] = useState(false)
  const [selectedPayrolls, setSelectedPayrolls] = useState<Set<string>>(new Set())
  const [showAddPayrollsSheet, setShowAddPayrollsSheet] = useState(false)
  const [isGeneratingPayrolls, setIsGeneratingPayrolls] = useState(false)

  useEffect(() => {
    if (periodId) {
      fetchPeriod()
    }
  }, [periodId])

  const fetchPeriod = async () => {
    try {
      setIsLoading(true)
      setIsGeneratingPayrolls(false) // S'assurer que l'état de génération est réinitialisé
      const res = await fetch(`/api/payroll/periods/${periodId}`)
      if (!res.ok) throw new Error("Erreur lors du chargement")
      const data = await res.json()
      setPeriod(data)
      // Réinitialiser la sélection après mise à jour
      setSelectedPayrolls(new Set())
    } catch (error) {
      console.error("Error fetching period:", error)
      toast.error("Erreur lors du chargement de la période")
    } finally {
      setIsLoading(false)
      setIsGeneratingPayrolls(false) // Double sécurité pour réinitialiser l'état
    }
  }

  const handleValidate = async (payrollId: string) => {
    try {
      setActionLoading(payrollId)
      const res = await fetch(`/api/payroll/${payrollId}/validate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Erreur lors de la validation")
      }
      toast.success("Bulletin validé avec succès")
      fetchPeriod()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Erreur lors de la validation"
      toast.error(errorMessage)
    } finally {
      setActionLoading(null)
    }
  }

  const handleApprove = async (payrollId: string) => {
    try {
      setActionLoading(payrollId)
      const res = await fetch(`/api/payroll/${payrollId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Erreur lors de l'approbation")
      }
      toast.success("Bulletin approuvé avec succès")
      fetchPeriod()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Erreur lors de l'approbation"
      toast.error(errorMessage)
    } finally {
      setActionLoading(null)
    }
  }

  const handlePay = async (payrollId: string) => {
    try {
      setActionLoading(payrollId)
      const res = await fetch(`/api/payroll/${payrollId}/pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Erreur lors du marquage du paiement")
      }
      toast.success("Bulletin marqué comme payé")
      fetchPeriod()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Erreur lors du marquage du paiement"
      toast.error(errorMessage)
    } finally {
      setActionLoading(null)
    }
  }

  const handleGeneratePayrolls = async () => {
    try {
      setIsGeneratingPayrolls(true)
      setActionLoading("generate")
      const res = await fetch(`/api/payroll/periods/${periodId}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Erreur lors de la génération")
      }
      const data = await res.json()
      toast.success(data.message)
      await fetchPeriod()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Erreur lors de la génération"
      toast.error(errorMessage)
    } finally {
      setActionLoading(null)
      setIsGeneratingPayrolls(false)
    }
  }

  const handleAddPayrollsSuccess = async () => {
    console.log("🔄 Début de la mise à jour après ajout de bulletins")
    console.log("📋 Période avant mise à jour:", {
      id: period?.id,
      payrollsCount: period?.payrolls?.length || 0
    })
    setIsGeneratingPayrolls(true)
    try {
      await fetchPeriod()
      console.log("✅ Mise à jour terminée avec succès")
      console.log("📋 Période après mise à jour:", {
        id: period?.id,
        payrollsCount: period?.payrolls?.length || 0
      })
    } catch (error) {
      console.error("❌ Erreur lors de la mise à jour:", error)
    } finally {
      setIsGeneratingPayrolls(false)
    }
  }

  const handleRegeneratePayrolls = async () => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer et régénérer tous les bulletins ? Cette action est irréversible.")) return

    try {
      setIsGeneratingPayrolls(true)
      setActionLoading("regenerate")
      
      // 1. Supprimer les bulletins existants
      const deleteRes = await fetch(`/api/payroll/periods/${periodId}?deletePayrolls=true`, {
        method: "DELETE",
      })
      if (!deleteRes.ok) {
        const data = await deleteRes.json()
        throw new Error(data.error || "Erreur lors de la suppression")
      }
      
      // 2. Régénérer les bulletins
      const generateRes = await fetch(`/api/payroll/periods/${periodId}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      })
      if (!generateRes.ok) {
        const data = await generateRes.json()
        throw new Error(data.error || "Erreur lors de la génération")
      }
      
      const data = await generateRes.json()
      toast.success(`Bulletins régénérés: ${data.message}`)
      await fetchPeriod()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Erreur lors de la régénération"
      toast.error(errorMessage)
    } finally {
      setActionLoading(null)
      setIsGeneratingPayrolls(false)
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

  const filteredPayrolls = period?.payrolls.filter((payroll) => {
    if (filterStatus === "all") return true
    return payroll.status === filterStatus
  }) || []

  // Debug: Log l'état actuel
  useEffect(() => {
    console.log("📊 État actuel:", {
      periodLoaded: !!period,
      payrollsCount: period?.payrolls?.length || 0,
      filteredCount: filteredPayrolls.length,
      isGenerating: isGeneratingPayrolls,
      isLoading: isLoading
    })
  }, [period, filteredPayrolls.length, isGeneratingPayrolls, isLoading])

  // Sélection multiple
  const toggleSelectPayroll = (payrollId: string) => {
    setSelectedPayrolls(prev => {
      const newSet = new Set(prev)
      if (newSet.has(payrollId)) {
        newSet.delete(payrollId)
      } else {
        newSet.add(payrollId)
      }
      return newSet
    })
  }

  const toggleSelectAll = () => {
    if (selectedPayrolls.size === filteredPayrolls.length) {
      setSelectedPayrolls(new Set())
    } else {
      setSelectedPayrolls(new Set(filteredPayrolls.map(p => p.id)))
    }
  }

  const clearSelection = () => {
    setSelectedPayrolls(new Set())
  }

  // Bulletins sélectionnés imprimables (VALIDATED ou APPROVED ou PAID)
  const printableSelected = Array.from(selectedPayrolls).filter(id => {
    const payroll = period?.payrolls.find(p => p.id === id)
    return payroll && ["VALIDATED", "APPROVED", "PARTIALLY_PAID", "PAID"].includes(payroll.status)
  })

  // Actions groupées
  const handleBulkValidate = async () => {
    const toValidate = Array.from(selectedPayrolls).filter(id => {
      const payroll = period?.payrolls.find(p => p.id === id)
      return payroll && (payroll.status === "DRAFT" || payroll.status === "PENDING")
    })

    if (toValidate.length === 0) {
      toast.error("Aucun bulletin à valider dans la sélection")
      return
    }

    try {
      setActionLoading("bulk")
      let successCount = 0
      for (const id of toValidate) {
        const res = await fetch(`/api/payroll/${id}/validate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        })
        if (res.ok) successCount++
      }
      toast.success(`${successCount} bulletin(s) validé(s)`)
      clearSelection()
      fetchPeriod()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Erreur lors de la validation"
      toast.error(errorMessage)
    } finally {
      setActionLoading(null)
    }
  }

  const handleBulkApprove = async () => {
    const toApprove = Array.from(selectedPayrolls).filter(id => {
      const payroll = period?.payrolls.find(p => p.id === id)
      return payroll && payroll.status === "VALIDATED"
    })

    if (toApprove.length === 0) {
      toast.error("Aucun bulletin à approuver dans la sélection")
      return
    }

    try {
      setActionLoading("bulk")
      let successCount = 0
      for (const id of toApprove) {
        const res = await fetch(`/api/payroll/${id}/approve`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        })
        if (res.ok) successCount++
      }
      toast.success(`${successCount} bulletin(s) approuvé(s)`)
      clearSelection()
      fetchPeriod()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Erreur lors de l'approbation"
      toast.error(errorMessage)
    } finally {
      setActionLoading(null)
    }
  }

  const handleBulkPay = async () => {
    const toPay = Array.from(selectedPayrolls).filter(id => {
      const payroll = period?.payrolls.find(p => p.id === id)
      return payroll && (payroll.status === "APPROVED" || payroll.status === "PARTIALLY_PAID")
    })

    if (toPay.length === 0) {
      toast.error("Aucun bulletin approuvé ou partiellement payé dans la sélection")
      return
    }

    try {
      setActionLoading("bulk")
      let successCount = 0
      for (const id of toPay) {
        const res = await fetch(`/api/payroll/${id}/pay`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        })
        if (res.ok) successCount++
      }
      toast.success(`${successCount} bulletin(s) marqué(s) payé(s)`)
      clearSelection()
      fetchPeriod()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Erreur lors du marquage du paiement"
      toast.error(errorMessage)
    } finally {
      setActionLoading(null)
    }
  }

  const handleBulkPrint = () => {
    if (printableSelected.length === 0) {
      toast.error("Aucun bulletin imprimable sélectionné. Seuls les bulletins validés, approuvés ou payés peuvent être imprimés.")
      return
    }
    // Ouvrir une nouvelle fenêtre pour l'impression
    const ids = printableSelected.join(",")
    window.open(`/api/payroll/print?ids=${ids}`, "_blank")
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

  if (!period) {
    return (
      <PermissionGuard permission="payroll.view">
        <div className="p-6 text-center">
          <p className="text-gray-500">Période non trouvée</p>
          <Button
            variant="link"
            onClick={() => router.push("/dashboard/payroll/periods")}
          >
            Retour aux périodes
          </Button>
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
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.push("/dashboard/payroll/periods")}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-xl font-semibold text-gray-900">
                    {period.name}
                  </h1>
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
                </div>
                <p className="text-sm text-gray-500 mt-0.5">
                  {formatDate(period.startDate)} - {formatDate(period.endDate)} •{" "}
                  {period.workingDays} jours ouvrés
                </p>
              </div>
            </div>
            {!period.isClosed && (
              <div className="flex gap-2">
                {period.stats.totalPayrolls > 0 && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-orange-600 border-orange-300 hover:bg-orange-50"
                    onClick={handleRegeneratePayrolls}
                    disabled={actionLoading === "regenerate"}
                  >
                    {actionLoading === "regenerate" ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <FileText className="h-4 w-4 mr-2" />
                    )}
                    Régénérer
                  </Button>
                )}
                <Button
                  size="sm"
                  className="bg-indigo-600 hover:bg-indigo-700"
                  onClick={() => setShowAddPayrollsSheet(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Ajouter des bulletins
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                <FileText className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{period.stats.totalPayrolls}</p>
                <p className="text-sm text-gray-500">Bulletins</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="h-10 w-10 bg-orange-100 rounded-full flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-lg font-bold">
                  {formatCurrency(period.stats.totalGross)}
                </p>
                <p className="text-sm text-gray-500">Brut total</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="h-10 w-10 bg-red-100 rounded-full flex items-center justify-center">
                <XCircle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-lg font-bold">
                  {formatCurrency(period.stats.totalDeductions)}
                </p>
                <p className="text-sm text-gray-500">Cotisations</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="h-10 w-10 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-lg font-bold">
                  {formatCurrency(period.stats.totalNet)}
                </p>
                <p className="text-sm text-gray-500">Net à payer</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Status breakdown */}
        <div className="grid grid-cols-2 md:grid-cols-7 gap-2">
          {Object.entries(statusLabels).map(([status, label]) => (
            <div
              key={status}
              className={`p-3 rounded-lg text-center cursor-pointer transition-all ${
                filterStatus === status
                  ? "ring-2 ring-primary"
                  : "hover:bg-gray-50"
              } ${statusColors[status]}`}
              onClick={() =>
                setFilterStatus(filterStatus === status ? "all" : status)
              }
            >
              <p className="text-xl font-bold">
                {period.stats.byStatus[status] || 0}
              </p>
              <p className="text-xs">{label}</p>
            </div>
          ))}
        </div>

        {/* Payrolls Table */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Bulletins de paie</CardTitle>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filtrer par statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                {Object.entries(statusLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent className="p-0">
            {filteredPayrolls.length === 0 && !isGeneratingPayrolls ? (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">Aucun bulletin trouvé</p>
                {!period.isClosed && (
                  <Button
                    variant="link"
                    onClick={handleGeneratePayrolls}
                    disabled={actionLoading === "generate"}
                  >
                    Générer les bulletins
                  </Button>
                )}
              </div>
            ) : isGeneratingPayrolls ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-2 text-gray-600">Génération des bulletins en cours...</span>
              </div>
            ) : (
              <>
              {/* Barre d'actions pour sélection multiple */}
              {selectedPayrolls.size > 0 && (
                <div className="bg-indigo-50 border-b border-indigo-200 px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-indigo-700">
                      {selectedPayrolls.size} bulletin(s) sélectionné(s)
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearSelection}
                      className="text-indigo-600 hover:text-indigo-800"
                    >
                      <X className="h-4 w-4 mr-1" />
                      Désélectionner
                    </Button>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleBulkValidate}
                      disabled={actionLoading === "bulk"}
                      className="text-blue-600 border-blue-300 hover:bg-blue-50"
                    >
                      <Check className="h-4 w-4 mr-1" />
                      Valider (RH)
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleBulkApprove}
                      disabled={actionLoading === "bulk"}
                      className="text-purple-600 border-purple-300 hover:bg-purple-50"
                    >
                      <ThumbsUp className="h-4 w-4 mr-1" />
                      Approuver
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleBulkPay}
                      disabled={actionLoading === "bulk"}
                      className="text-green-600 border-green-300 hover:bg-green-50"
                    >
                      <CreditCard className="h-4 w-4 mr-1" />
                      Marquer payé
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleBulkPrint}
                      disabled={actionLoading === "bulk" || printableSelected.length === 0}
                      className="bg-indigo-600 hover:bg-indigo-700"
                    >
                      <Printer className="h-4 w-4 mr-1" />
                      Imprimer ({printableSelected.length})
                    </Button>
                  </div>
                </div>
              )}

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">
                      <Checkbox
                        checked={selectedPayrolls.size === filteredPayrolls.length && filteredPayrolls.length > 0}
                        onCheckedChange={toggleSelectAll}
                      />
                    </TableHead>
                    <TableHead>N° Bulletin</TableHead>
                    <TableHead>Employé</TableHead>
                    <TableHead className="text-center">Jours travaillés</TableHead>
                    <TableHead className="text-center">Jours attendus</TableHead>
                    <TableHead className="text-center">Heures</TableHead>
                    <TableHead className="text-right">Brut</TableHead>
                    <TableHead>Primes / Indemnités</TableHead>
                    <TableHead className="text-right">Cotisations</TableHead>
                    <TableHead className="text-right">Net</TableHead>
                    <TableHead className="text-center">Statut</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPayrolls.map((payroll) => (
                    <TableRow 
                      key={payroll.id}
                      className={selectedPayrolls.has(payroll.id) ? "bg-indigo-50" : ""}
                    >
                      <TableCell>
                        <Checkbox
                          checked={selectedPayrolls.has(payroll.id)}
                          onCheckedChange={() => toggleSelectPayroll(payroll.id)}
                        />
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {payroll.number}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">
                            {payroll.employeeProfile.user.firstName}{" "}
                            {payroll.employeeProfile.user.lastName}
                          </p>
                          <p className="text-sm text-gray-500">
                            {payroll.employeeProfile.user.matricule}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={payroll.daysWorked === 0 ? "text-red-500" : ""}>
                          {payroll.daysWorked}
                        </span>
                      </TableCell>
                      <TableCell className="text-center text-gray-500">
                        {payroll.expectedWorkingDays}
                      </TableCell>
                      <TableCell className="text-center">
                        {payroll.hoursWorked.toFixed(1)}h
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(payroll.grossSalary)}
                      </TableCell>
                      <TableCell>
                        {payroll.rubricLines && payroll.rubricLines.length > 0 ? (
                          <div className="space-y-0.5 text-xs">
                            {payroll.rubricLines.map((rubric) => (
                              <div key={rubric.id} className="flex items-center gap-1">
                                <Badge 
                                  variant="outline" 
                                  className={rubric.rubricType === 'PRIME' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-blue-50 text-blue-700 border-blue-200'}
                                >
                                  {rubric.rubricType === 'PRIME' ? 'P' : 'I'}
                                </Badge>
                                <span className="truncate max-w-[100px]" title={rubric.rubricName}>{rubric.rubricName}</span>
                                <span className="font-medium text-gray-700">{formatCurrency(rubric.amount)}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-gray-400 text-xs">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right text-red-600">
                        -{formatCurrency(payroll.totalDeductions)}
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="font-bold">{formatCurrency(payroll.netSalary)}</span>
                        {payroll.status === "PARTIALLY_PAID" && (
                          <div className="text-xs mt-0.5">
                            <span className="text-green-600">{formatCurrency(payroll.paidAmount)}</span>
                            <span className="text-gray-400"> / </span>
                            <span className="text-orange-600">{formatCurrency(payroll.remainingAmount)} restant</span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge className={statusColors[payroll.status]}>
                          {statusLabels[payroll.status]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              disabled={actionLoading === payroll.id}
                            >
                              {actionLoading === payroll.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <MoreVertical className="h-4 w-4" />
                              )}
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedPayrollId(payroll.id)
                                setShowEditSheet(true)
                              }}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              Voir / Modifier
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => window.open(`/api/payroll/print?ids=${payroll.id}`, "_blank")}
                              disabled={!["VALIDATED", "APPROVED", "PARTIALLY_PAID", "PAID"].includes(payroll.status)}
                            >
                              <Printer className="h-4 w-4 mr-2" />
                              Imprimer
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {(payroll.status === "DRAFT" ||
                              payroll.status === "PENDING") && (
                              <DropdownMenuItem
                                onClick={() => handleValidate(payroll.id)}
                              >
                                <Check className="h-4 w-4 mr-2" />
                                Valider (RH)
                              </DropdownMenuItem>
                            )}
                            {payroll.status === "VALIDATED" && (
                              <DropdownMenuItem
                                onClick={() => handleApprove(payroll.id)}
                              >
                                <ThumbsUp className="h-4 w-4 mr-2" />
                                Approuver (Direction)
                              </DropdownMenuItem>
                            )}
                            {(payroll.status === "APPROVED" || payroll.status === "PARTIALLY_PAID") && (
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedPayrollId(payroll.id)
                                  setShowEditSheet(true)
                                }}
                              >
                                <CreditCard className="h-4 w-4 mr-2" />
                                {payroll.status === "PARTIALLY_PAID" ? "Enregistrer un versement" : "Payer / Acompte"}
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </>
            )}
          </CardContent>
        </Card>

        {/* Edit Payroll Sheet */}
        <EditPayrollSheet
          open={showEditSheet}
          onOpenChange={setShowEditSheet}
          payrollId={selectedPayrollId}
          onSuccess={fetchPeriod}
        />

        {/* Add Payrolls Sheet */}
        <AddPayrollsSheet
          open={showAddPayrollsSheet}
          onOpenChange={setShowAddPayrollsSheet}
          periodId={periodId}
          existingEmployeeProfileIds={period?.payrolls.map(p => p.employeeProfile.id) || []}
          onSuccess={handleAddPayrollsSuccess}
        />
      </div>
    </PermissionGuard>
  )
}
