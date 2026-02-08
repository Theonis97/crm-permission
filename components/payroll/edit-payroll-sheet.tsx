"use client"

import { useState, useEffect } from "react"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { 
  FileText, 
  Loader2, 
  Clock, 
  Calendar,
  User,
  DollarSign,
  AlertCircle,
  Info,
  Plus,
  Trash2,
  Gift,
  Banknote,
  Wallet,
  History,
} from "lucide-react"
import { toast } from "sonner"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

interface PayrollDetail {
  id: string
  number: string
  status: string
  daysWorked: number
  hoursWorked: number
  overtimeHours: number
  absenceDays: number
  rawDaysWorked: number
  rawHoursWorked: number
  expectedWorkingDays: number
  grossSalary: number
  totalDeductions: number
  totalBonuses: number
  netSalary: number
  paidAmount: number
  remainingAmount: number
  employerCharges: number
  employeeProfile: {
    id: string
    baseSalary: number
    position: string | null
    workingDaysPattern: string[]
    workingHoursPerDay: number
    contractType: string
    user: {
      id: string
      firstName: string | null
      lastName: string | null
      email: string
      matricule: string | null
      image: string | null
    }
    contributions: Array<{
      id: string
      contribution: {
        id: string
        name: string
        code: string
        rate: number
      }
    }>
  }
  period: {
    id: string
    name: string
    startDate: string
    endDate: string
    workingDays: number
  }
  contributionLines: Array<{
    id: string
    contributionId: string
    baseAmount: number
    appliedRate: number
    amount: number
    contribution: {
      name: string
      code: string
    }
  }>
  rubricLines: Array<{
    id: string
    rubricId: string
    rubricCode: string
    rubricName: string
    rubricType: "PRIME" | "INDEMNITY"
    amount: number
    isSubjectToTax: boolean
    isSubjectToSocial: boolean
  }>
}

interface EditPayrollSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  payrollId: string | null
  onSuccess?: () => void
}

const statusLabels: Record<string, string> = {
  DRAFT: "Brouillon",
  PENDING: "En attente",
  VALIDATED: "Validé RH",
  APPROVED: "Approuvé",
  PAID: "Payé",
  CANCELLED: "Annulé",
}

const weekDays: Record<string, string> = {
  MONDAY: "Lun",
  TUESDAY: "Mar",
  WEDNESDAY: "Mer",
  THURSDAY: "Jeu",
  FRIDAY: "Ven",
  SATURDAY: "Sam",
  SUNDAY: "Dim",
}

export function EditPayrollSheet({ open, onOpenChange, payrollId, onSuccess }: EditPayrollSheetProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [payroll, setPayroll] = useState<PayrollDetail | null>(null)
  
  const [formData, setFormData] = useState({
    daysWorked: 0,
    hoursWorked: 0,
    overtimeHours: 0,
    grossSalary: 0,
    totalBonuses: 0,
    totalDeductions: 0,
    netSalary: 0,
  })

  // Gestion des rubriques (primes/indemnités)
  const [availableRubrics, setAvailableRubrics] = useState<Array<{
    id: string
    code: string
    name: string
    type: "PRIME" | "INDEMNITY"
    calculationBase: string
    defaultAmount: number | null
    defaultRate: number | null
    isSubjectToTax: boolean
    isSubjectToSocial: boolean
    exemptionCeiling: number | null
  }>>([])
  const [selectedRubrics, setSelectedRubrics] = useState<Array<{
    id: string
    rubricId: string
    rubricCode: string
    rubricName: string
    rubricType: "PRIME" | "INDEMNITY"
    amount: number
    isSubjectToTax: boolean
    isSubjectToSocial: boolean
  }>>([])
  const [selectedRubricId, setSelectedRubricId] = useState("")
  const [rubricAmount, setRubricAmount] = useState("")
  const [isLoadingRubrics, setIsLoadingRubrics] = useState(false)

  useEffect(() => {
    if (open && payrollId) {
      fetchPayroll()
      fetchRubrics()
    }
  }, [open, payrollId])

  const fetchRubrics = async () => {
    try {
      setIsLoadingRubrics(true)
      const res = await fetch("/api/payroll/rubrics?isActive=true")
      if (!res.ok) throw new Error("Erreur lors du chargement des rubriques")
      const data = await res.json()
      setAvailableRubrics(data.rubrics || [])
    } catch (error) {
      console.error("Error fetching rubrics:", error)
    } finally {
      setIsLoadingRubrics(false)
    }
  }

  const fetchPayroll = async () => {
    if (!payrollId) return
    
    try {
      setIsLoading(true)
      const res = await fetch(`/api/payroll/${payrollId}`)
      if (!res.ok) throw new Error("Erreur lors du chargement")
      const data = await res.json()
      setPayroll(data)
      setFormData({
        daysWorked: data.daysWorked,
        hoursWorked: data.hoursWorked,
        overtimeHours: data.overtimeHours,
        grossSalary: data.grossSalary,
        totalBonuses: data.totalBonuses,
        totalDeductions: data.totalDeductions,
        netSalary: data.netSalary,
      })
      // Charger les rubriques existantes du bulletin
      if (data.rubricLines && data.rubricLines.length > 0) {
        setSelectedRubrics(data.rubricLines.map((rl: any) => ({
          id: rl.id,
          rubricId: rl.rubricId,
          rubricCode: rl.rubricCode,
          rubricName: rl.rubricName,
          rubricType: rl.rubricType,
          amount: rl.amount,
          isSubjectToTax: rl.isSubjectToTax,
          isSubjectToSocial: rl.isSubjectToSocial,
        })))
      } else {
        setSelectedRubrics([])
      }
      setSelectedRubricId("")
      setRubricAmount("")
    } catch (error) {
      console.error("Error fetching payroll:", error)
      toast.error("Erreur lors du chargement du bulletin")
    } finally {
      setIsLoading(false)
    }
  }

  // Calculer le total des rubriques ajoutées
  const totalSelectedRubrics = selectedRubrics.reduce((sum, r) => sum + r.amount, 0)
  const totalPrimes = selectedRubrics.filter(r => r.rubricType === "PRIME").reduce((sum, r) => sum + r.amount, 0)
  const totalIndemnities = selectedRubrics.filter(r => r.rubricType === "INDEMNITY").reduce((sum, r) => sum + r.amount, 0)

  const recalculateNet = () => {
    const net = formData.grossSalary - formData.totalDeductions + totalSelectedRubrics
    setFormData(prev => ({ ...prev, netSalary: Math.max(0, net) }))
  }

  useEffect(() => {
    recalculateNet()
  }, [formData.grossSalary, formData.totalDeductions, totalSelectedRubrics])

  // Quand on sélectionne une rubrique, pré-remplir le montant par défaut
  const handleRubricSelect = (rubricId: string) => {
    setSelectedRubricId(rubricId)
    const rubric = availableRubrics.find(r => r.id === rubricId)
    if (rubric) {
      if (rubric.calculationBase === "FIXED" && rubric.defaultAmount) {
        setRubricAmount(rubric.defaultAmount.toString())
      } else if (rubric.defaultRate && payroll) {
        // Calculer le montant basé sur le taux
        let baseAmount = 0
        switch (rubric.calculationBase) {
          case "GROSS_SALARY":
            baseAmount = formData.grossSalary
            break
          case "BASE_SALARY":
            baseAmount = payroll.employeeProfile.baseSalary
            break
          case "NET_SALARY":
            baseAmount = formData.netSalary
            break
        }
        const calculatedAmount = Math.round((baseAmount * rubric.defaultRate / 100) * 100) / 100
        setRubricAmount(calculatedAmount.toString())
      } else {
        setRubricAmount("")
      }
    }
  }

  const addSelectedRubric = () => {
    if (!selectedRubricId) {
      toast.error("Veuillez sélectionner une rubrique")
      return
    }
    const rubric = availableRubrics.find(r => r.id === selectedRubricId)
    if (!rubric) return

    const amount = parseFloat(rubricAmount)
    if (isNaN(amount) || amount <= 0) {
      toast.error("Le montant doit être un nombre positif")
      return
    }

    // Vérifier si la rubrique n'est pas déjà ajoutée
    if (selectedRubrics.some(r => r.rubricId === selectedRubricId)) {
      toast.error("Cette rubrique est déjà ajoutée")
      return
    }

    setSelectedRubrics(prev => [
      ...prev,
      {
        id: `rubric-${Date.now()}`,
        rubricId: rubric.id,
        rubricCode: rubric.code,
        rubricName: rubric.name,
        rubricType: rubric.type,
        amount,
        isSubjectToTax: rubric.isSubjectToTax,
        isSubjectToSocial: rubric.isSubjectToSocial,
      }
    ])
    setSelectedRubricId("")
    setRubricAmount("")
  }

  const removeSelectedRubric = (id: string) => {
    setSelectedRubrics(prev => prev.filter(r => r.id !== id))
  }

  const handleSave = async () => {
    if (!payroll) return
    
    try {
      setIsSaving(true)
      const res = await fetch(`/api/payroll/${payroll.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          daysWorked: formData.daysWorked,
          hoursWorked: formData.hoursWorked,
          overtimeHours: formData.overtimeHours,
          grossSalary: formData.grossSalary,
          totalBonuses: totalSelectedRubrics, // Total des rubriques
          totalDeductions: formData.totalDeductions,
          netSalary: formData.netSalary,
          rubricLines: selectedRubrics, // Envoyer les détails des rubriques
        }),
      })
      
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Erreur lors de la sauvegarde")
      }
      
      toast.success("Bulletin mis à jour avec succès")
      onOpenChange(false)
      onSuccess?.()
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setIsSaving(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("fr-FR").format(Math.round(amount)) + " FCFA"
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
  }

  const getUserName = () => {
    if (!payroll) return ""
    const { firstName, lastName, email } = payroll.employeeProfile.user
    if (firstName || lastName) {
      return `${firstName || ""} ${lastName || ""}`.trim()
    }
    return email.split("@")[0]
  }

  const getInitials = () => {
    if (!payroll) return ""
    const { firstName, lastName, email } = payroll.employeeProfile.user
    if (firstName && lastName) {
      return `${firstName[0]}${lastName[0]}`.toUpperCase()
    }
    return email.substring(0, 2).toUpperCase()
  }

  // État pour les paiements
  const [paymentHistory, setPaymentHistory] = useState<Array<{
    id: string
    amount: number
    paymentDate: string
    paymentMode: string
    reference: string | null
    notes: string | null
    paidBy: { id: string; name: string }
    createdAt: string
  }>>([])
  const [isLoadingPayments, setIsLoadingPayments] = useState(false)
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false)
  const [paymentForm, setPaymentForm] = useState({
    amount: "",
    paymentMode: "BANK",
    reference: "",
    notes: "",
  })

  const canPay = payroll?.status === "APPROVED" || payroll?.status === "PARTIALLY_PAID"

  const fetchPayments = async () => {
    if (!payrollId) return
    try {
      setIsLoadingPayments(true)
      const res = await fetch(`/api/payroll/${payrollId}/payments`)
      if (!res.ok) throw new Error("Erreur")
      const data = await res.json()
      setPaymentHistory(data.payments || [])
    } catch (error) {
      console.error("Error fetching payments:", error)
    } finally {
      setIsLoadingPayments(false)
    }
  }

  useEffect(() => {
    if (open && payrollId && (payroll?.status === "PARTIALLY_PAID" || payroll?.status === "PAID")) {
      fetchPayments()
    }
  }, [open, payrollId, payroll?.status])

  const handleSubmitPayment = async () => {
    if (!payroll) return
    const amount = parseFloat(paymentForm.amount)
    const remaining = payroll.status === "APPROVED" ? payroll.netSalary : payroll.remainingAmount

    if (!paymentForm.amount || isNaN(amount) || amount <= 0) {
      toast.error("Veuillez saisir un montant valide")
      return
    }
    if (amount > remaining) {
      toast.error(`Le montant ne peut pas dépasser le reste à payer (${formatCurrency(remaining)})`)
      return
    }

    try {
      setIsSubmittingPayment(true)
      const res = await fetch(`/api/payroll/${payroll.id}/pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: amount,
          paymentMode: paymentForm.paymentMode,
          reference: paymentForm.reference || undefined,
          notes: paymentForm.notes || undefined,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Erreur lors du paiement")
      }
      const data = await res.json()
      toast.success(data.message)
      setPaymentForm({ amount: "", paymentMode: "BANK", reference: "", notes: "" })
      fetchPayroll()
      fetchPayments()
      onSuccess?.()
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setIsSubmittingPayment(false)
    }
  }

  const handlePayFullBalance = async () => {
    if (!payroll) return
    try {
      setIsSubmittingPayment(true)
      const res = await fetch(`/api/payroll/${payroll.id}/pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentMode: paymentForm.paymentMode || "BANK",
          reference: paymentForm.reference || undefined,
          notes: paymentForm.notes || "Paiement du solde",
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Erreur lors du paiement")
      }
      const data = await res.json()
      toast.success(data.message)
      setPaymentForm({ amount: "", paymentMode: "BANK", reference: "", notes: "" })
      fetchPayroll()
      fetchPayments()
      onSuccess?.()
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setIsSubmittingPayment(false)
    }
  }

  const paymentModeLabels: Record<string, string> = {
    BANK: "Virement bancaire",
    CASH: "Espèces",
    MOBILE_MONEY: "Mobile Money",
    CHECK: "Chèque",
  }

  const canEdit = payroll?.status === "DRAFT" || payroll?.status === "PENDING"

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl !p-0 flex flex-col h-full overflow-hidden">
        <SheetHeader className="px-6 py-4 border-b shrink-0">
          <SheetTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-indigo-600" />
            {payroll ? `Bulletin ${payroll.number}` : "Chargement..."}
          </SheetTitle>
          <SheetDescription>
            {payroll ? (
              <span className="flex items-center gap-2">
                {payroll.period.name} • 
                <Badge variant="outline">{statusLabels[payroll.status]}</Badge>
              </span>
            ) : "Détails et modification du bulletin de paie"}
          </SheetDescription>
        </SheetHeader>

        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
          </div>
        ) : payroll ? (
          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex-1 overflow-y-auto px-6">
              <div className="space-y-6 py-4">
                {/* Employee info */}
                <div className="flex items-center gap-4 p-4 rounded-lg bg-gray-50 border">
                  <Avatar className="h-12 w-12 border">
                    <AvatarImage src={payroll.employeeProfile.user.image || undefined} />
                    <AvatarFallback className="bg-indigo-100 text-indigo-600 font-medium">
                      {getInitials()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">{getUserName()}</p>
                    <p className="text-sm text-gray-500">
                      {payroll.employeeProfile.position || "Poste non défini"} • 
                      Salaire base: {formatCurrency(payroll.employeeProfile.baseSalary)}
                    </p>
                    <div className="flex gap-1 mt-1">
                      {payroll.employeeProfile.workingDaysPattern.map((day) => (
                        <Badge key={day} variant="outline" className="text-xs px-1.5">
                          {weekDays[day]}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-indigo-600">{payroll.expectedWorkingDays}</p>
                    <p className="text-xs text-gray-500">jours ouvrés</p>
                  </div>
                </div>

                <Separator />

                {/* Time data */}
                <div>
                 
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="daysWorked">Jours travaillés</Label>
                      <Input
                        id="daysWorked"
                        type="number"
                        min={0}
                        step={0.5}
                        value={formData.daysWorked}
                        onChange={(e) => setFormData(prev => ({ ...prev, daysWorked: parseFloat(e.target.value) || 0 }))}
                        disabled={!canEdit}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="hoursWorked">Heures travaillées</Label>
                      <Input
                        id="hoursWorked"
                        type="number"
                        min={0}
                        step={0.5}
                        value={formData.hoursWorked}
                        onChange={(e) => setFormData(prev => ({ ...prev, hoursWorked: parseFloat(e.target.value) || 0 }))}
                        disabled={!canEdit}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="overtimeHours">Heures sup.</Label>
                      <Input
                        id="overtimeHours"
                        type="number"
                        min={0}
                        step={0.5}
                        value={formData.overtimeHours}
                        onChange={(e) => setFormData(prev => ({ ...prev, overtimeHours: parseFloat(e.target.value) || 0 }))}
                        disabled={!canEdit}
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Salary data */}
                <div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="grossSalary">Salaire brut (FCFA)</Label>
                    <Input
                      id="grossSalary"
                      type="number"
                      min={0}
                      step={1000}
                      value={formData.grossSalary}
                      onChange={(e) => setFormData(prev => ({ ...prev, grossSalary: parseFloat(e.target.value) || 0 }))}
                      disabled={!canEdit}
                    />
                  </div>
                </div>

                {/* Section Ajout de primes/indemnités via rubriques */}
                {canEdit && (
                  <>
                    <Separator />
                    <div>
                      <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                        <Gift className="h-4 w-4 text-green-600" />
                        Ajouter des primes / indemnités
                      </h3>
                      
                      {/* Liste des rubriques ajoutées */}
                      {selectedRubrics.length > 0 && (
                        <div className="mb-4 space-y-1">
                          {selectedRubrics.map((rubric) => (
                            <div key={rubric.id} className="flex items-center justify-between py-2 border-b border-gray-100">
                              <div className="flex items-center gap-2 flex-wrap">
                                <Badge variant="outline" className={`text-xs ${
                                  rubric.rubricType === "PRIME" 
                                    ? "bg-green-100 text-green-700 border-green-300" 
                                    : "bg-blue-100 text-blue-700 border-blue-300"
                                }`}>
                                  {rubric.rubricType === "PRIME" ? "Prime" : "Indemnité"}
                                </Badge>
                                <span className="text-sm text-gray-900">{rubric.rubricName}</span>
                                {rubric.isSubjectToTax && (
                                  <Badge variant="outline" className="text-[10px] bg-orange-50 text-orange-600 border-orange-200">
                                    Imposable
                                  </Badge>
                                )}
                                {rubric.isSubjectToSocial && (
                                  <Badge variant="outline" className="text-[10px] bg-purple-50 text-purple-600 border-purple-200">
                                    Cotisable
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="text-sm font-medium text-gray-900">{formatCurrency(rubric.amount)}</span>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeSelectedRubric(rubric.id)}
                                  className="h-6 w-6 p-0 text-gray-400 hover:text-red-600"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </div>
                          ))}
                          <div className="flex justify-end pt-2 text-sm font-medium text-gray-700">
                            Total: {formatCurrency(totalSelectedRubrics)}
                          </div>
                        </div>
                      )}

                      {/* Formulaire d'ajout */}
                      <div className="p-4 rounded-lg border border-dashed border-gray-300 bg-gray-50">
                        <div className="space-y-3">
                          <div className="space-y-1">
                            <Label className="text-xs">Sélectionner une rubrique</Label>
                            <Select value={selectedRubricId} onValueChange={handleRubricSelect}>
                              <SelectTrigger className="h-9">
                                <SelectValue placeholder="Choisir une prime ou indemnité..." />
                              </SelectTrigger>
                              <SelectContent className="z-[9999]">
                                {isLoadingRubrics ? (
                                  <div className="p-2 text-center text-sm text-gray-500">Chargement...</div>
                                ) : availableRubrics.length === 0 ? (
                                  <div className="p-2 text-center text-sm text-gray-500">Aucune rubrique disponible</div>
                                ) : (
                                  <>
                                    {availableRubrics.filter(r => r.type === "PRIME").length > 0 && (
                                      <>
                                        <div className="px-2 py-1.5 text-xs font-semibold text-green-700 bg-green-50">Primes</div>
                                        {availableRubrics.filter(r => r.type === "PRIME").map((rubric) => (
                                          <SelectItem key={rubric.id} value={rubric.id}>
                                            <div className="flex items-center gap-2">
                                              <span className="font-medium">{rubric.name}</span>
                                              <span className="text-xs text-gray-500">({rubric.code})</span>
                                              {rubric.defaultAmount && (
                                                <span className="text-xs text-green-600">{formatCurrency(rubric.defaultAmount)}</span>
                                              )}
                                            </div>
                                          </SelectItem>
                                        ))}
                                      </>
                                    )}
                                    {availableRubrics.filter(r => r.type === "INDEMNITY").length > 0 && (
                                      <>
                                        <div className="px-2 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50">Indemnités</div>
                                        {availableRubrics.filter(r => r.type === "INDEMNITY").map((rubric) => (
                                          <SelectItem key={rubric.id} value={rubric.id}>
                                            <div className="flex items-center gap-2">
                                              <span className="font-medium">{rubric.name}</span>
                                              <span className="text-xs text-gray-500">({rubric.code})</span>
                                              {rubric.defaultAmount && (
                                                <span className="text-xs text-blue-600">{formatCurrency(rubric.defaultAmount)}</span>
                                              )}
                                            </div>
                                          </SelectItem>
                                        ))}
                                      </>
                                    )}
                                  </>
                                )}
                              </SelectContent>
                            </Select>
                          </div>
                          
                          {selectedRubricId && (
                            <>
                              <div className="space-y-1">
                                <Label className="text-xs">Montant (FCFA)</Label>
                                <Input
                                  type="number"
                                  placeholder="Montant"
                                  min={0}
                                  value={rubricAmount}
                                  onChange={(e) => setRubricAmount(e.target.value)}
                                  className="h-9"
                                />
                                {availableRubrics.find(r => r.id === selectedRubricId)?.defaultAmount && (
                                  <p className="text-xs text-gray-500">
                                    Montant par défaut: {formatCurrency(availableRubrics.find(r => r.id === selectedRubricId)?.defaultAmount || 0)}
                                  </p>
                                )}
                              </div>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={addSelectedRubric}
                                className="w-full"
                              >
                                <Plus className="h-4 w-4 mr-2" />
                                Ajouter cette rubrique
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {/* Affichage des rubriques en lecture seule */}
                {!canEdit && selectedRubrics.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                        <Gift className="h-4 w-4 text-green-600" />
                        Primes / Indemnités
                      </h3>
                      <div className="space-y-1">
                        {selectedRubrics.map((rubric) => (
                          <div key={rubric.id} className="flex items-center justify-between py-2 border-b border-gray-100">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge variant="outline" className={`text-xs ${
                                rubric.rubricType === "PRIME" 
                                  ? "bg-green-100 text-green-700 border-green-300" 
                                  : "bg-blue-100 text-blue-700 border-blue-300"
                              }`}>
                                {rubric.rubricType === "PRIME" ? "Prime" : "Indemnité"}
                              </Badge>
                              <span className="text-sm text-gray-900">{rubric.rubricName}</span>
                              {rubric.isSubjectToTax && (
                                <Badge variant="outline" className="text-[10px] bg-orange-50 text-orange-600 border-orange-200">
                                  Imposable
                                </Badge>
                              )}
                              {rubric.isSubjectToSocial && (
                                <Badge variant="outline" className="text-[10px] bg-purple-50 text-purple-600 border-purple-200">
                                  Cotisable
                                </Badge>
                              )}
                            </div>
                            <span className="text-sm font-medium text-gray-900">{formatCurrency(rubric.amount)}</span>
                          </div>
                        ))}
                        <div className="flex justify-end pt-2 text-sm font-medium text-gray-700">
                          Total: {formatCurrency(totalSelectedRubrics)}
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {/* Contributions */}
                {payroll.contributionLines.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <h3 className="font-medium text-gray-900 mb-3">Cotisations</h3>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Cotisation</TableHead>
                            <TableHead className="text-right">Base</TableHead>
                            <TableHead className="text-right">Taux</TableHead>
                            <TableHead className="text-right">Montant</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {payroll.contributionLines.map((line) => (
                            <TableRow key={line.id}>
                              <TableCell>
                                <span className="font-medium">{line.contribution.name}</span>
                                <span className="text-gray-500 text-xs ml-1">({line.contribution.code})</span>
                              </TableCell>
                              <TableCell className="text-right">{formatCurrency(line.baseAmount)}</TableCell>
                              <TableCell className="text-right">{line.appliedRate}%</TableCell>
                              <TableCell className="text-right text-red-600">-{formatCurrency(line.amount)}</TableCell>
                            </TableRow>
                          ))}
                          <TableRow className="font-medium">
                            <TableCell colSpan={3}>Total cotisations</TableCell>
                            <TableCell className="text-right text-red-600">
                              -{formatCurrency(formData.totalDeductions)}
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </div>
                  </>
                )}

                {payroll.employeeProfile.contributions.length === 0 && (
                  <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
                    <p className="text-sm text-blue-800">
                      <Info className="h-4 w-4 inline mr-1" />
                      Aucune cotisation assignée à cet employé. Le salaire net = salaire brut + primes.
                    </p>
                  </div>
                )}

                <Separator />

                {/* Net salary */}
                <div className="p-4 rounded-lg bg-green-50 border border-green-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-green-700">Salaire net à payer</p>
                      <p className="text-2xl font-bold text-green-800">
                        {formatCurrency(formData.netSalary)}
                      </p>
                    </div>
                    <div className="text-right text-sm text-green-700">
                      <p>Brut: {formatCurrency(formData.grossSalary)}</p>
                      {totalPrimes > 0 && <p>+ Primes: {formatCurrency(totalPrimes)}</p>}
                      {totalIndemnities > 0 && <p>+ Indemnités: {formatCurrency(totalIndemnities)}</p>}
                      {formData.totalDeductions > 0 && <p>- Cotisations: {formatCurrency(formData.totalDeductions)}</p>}
                    </div>
                  </div>
                </div>

                {/* Section Paiements / Acomptes */}
                {(canPay || payroll.status === "PAID" || payroll.status === "PARTIALLY_PAID") && (
                  <>
                    <Separator />
                    <div>
                      <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                        <Banknote className="h-4 w-4 text-indigo-600" />
                        Paiements
                      </h3>

                      {/* Barre de progression */}
                      {(() => {
                        const paid = payroll.paidAmount || 0
                        const total = payroll.netSalary
                        const remaining = payroll.status === "APPROVED" ? total : (payroll.remainingAmount || 0)
                        const pct = total > 0 ? Math.round((paid / total) * 100) : 0
                        return (
                          <div className="mb-4">
                            <div className="flex items-center justify-between text-sm mb-1.5">
                              <span className="text-gray-600">Payé: <span className="font-semibold text-gray-900">{formatCurrency(paid)}</span></span>
                              <span className="text-gray-600">Reste: <span className="font-semibold text-orange-600">{formatCurrency(remaining)}</span></span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                              <div className={`h-full rounded-full transition-all duration-500 ${pct >= 100 ? "bg-green-500" : pct > 0 ? "bg-indigo-500" : "bg-gray-300"}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                            </div>
                            <p className="text-xs text-gray-500 mt-1 text-right">{pct}% payé</p>
                          </div>
                        )
                      })()}

                      {/* Formulaire de paiement */}
                      {canPay && (
                        <div className="p-4 rounded-lg border border-dashed border-indigo-300 bg-indigo-50/50 mb-4">
                          <p className="text-sm font-medium text-indigo-800 mb-3 flex items-center gap-2">
                            <Wallet className="h-4 w-4" />
                            Enregistrer un versement
                          </p>
                          <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-1">
                                <Label className="text-xs">Montant (FCFA)</Label>
                                <Input type="number" placeholder="Montant..." min={1} value={paymentForm.amount} onChange={(e) => setPaymentForm(prev => ({ ...prev, amount: e.target.value }))} className="h-9" />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs">Mode de paiement</Label>
                                <Select value={paymentForm.paymentMode} onValueChange={(v) => setPaymentForm(prev => ({ ...prev, paymentMode: v }))}>
                                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                                  <SelectContent className="z-[9999]">
                                    <SelectItem value="BANK">Virement bancaire</SelectItem>
                                    <SelectItem value="CASH">Espèces</SelectItem>
                                    <SelectItem value="MOBILE_MONEY">Mobile Money</SelectItem>
                                    <SelectItem value="CHECK">Chèque</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-1">
                                <Label className="text-xs">Référence (optionnel)</Label>
                                <Input placeholder="N° transaction..." value={paymentForm.reference} onChange={(e) => setPaymentForm(prev => ({ ...prev, reference: e.target.value }))} className="h-9" />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs">Notes (optionnel)</Label>
                                <Input placeholder="Commentaire..." value={paymentForm.notes} onChange={(e) => setPaymentForm(prev => ({ ...prev, notes: e.target.value }))} className="h-9" />
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button type="button" size="sm" onClick={handleSubmitPayment} disabled={isSubmittingPayment || !paymentForm.amount} className="flex-1 bg-indigo-600 hover:bg-indigo-700">
                                {isSubmittingPayment ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Banknote className="h-4 w-4 mr-1" />}
                                Enregistrer l'acompte
                              </Button>
                              <Button type="button" size="sm" variant="outline" onClick={handlePayFullBalance} disabled={isSubmittingPayment} className="text-green-700 border-green-300 hover:bg-green-50">
                                Payer le solde
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Historique des versements */}
                      {paymentHistory.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-gray-500 mb-2 flex items-center gap-1">
                            <History className="h-3.5 w-3.5" />
                            Historique des versements ({paymentHistory.length})
                          </p>
                          <div className="space-y-2">
                            {paymentHistory.map((p) => (
                              <div key={p.id} className="flex items-center justify-between p-2.5 rounded-lg bg-gray-50 border text-sm">
                                <div>
                                  <p className="font-medium text-gray-900">{formatCurrency(p.amount)}</p>
                                  <p className="text-xs text-gray-500">
                                    {new Date(p.paymentDate).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                                    {" • "}{paymentModeLabels[p.paymentMode] || p.paymentMode}
                                  </p>
                                  {p.reference && <p className="text-xs text-gray-400">Réf: {p.reference}</p>}
                                </div>
                                <div className="text-right text-xs text-gray-500">
                                  <p>{p.paidBy.name}</p>
                                  {p.notes && <p className="italic">{p.notes}</p>}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {isLoadingPayments && (
                        <div className="flex items-center justify-center py-4">
                          <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Fixed footer */}
            <div className="px-6 py-4 border-t bg-gray-50 shrink-0 flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSaving}
                className="flex-1"
              >
                Fermer
              </Button>
              {canEdit && (
                <Button
                  onClick={handleSave}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700"
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Enregistrement...
                    </>
                  ) : (
                    "Enregistrer les modifications"
                  )}
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            Bulletin non trouvé
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
