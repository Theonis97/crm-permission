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

  useEffect(() => {
    if (open && payrollId) {
      fetchPayroll()
    }
  }, [open, payrollId])

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
    } catch (error) {
      console.error("Error fetching payroll:", error)
      toast.error("Erreur lors du chargement du bulletin")
    } finally {
      setIsLoading(false)
    }
  }

  const recalculateNet = () => {
    const net = formData.grossSalary - formData.totalDeductions + formData.totalBonuses
    setFormData(prev => ({ ...prev, netSalary: Math.max(0, net) }))
  }

  useEffect(() => {
    recalculateNet()
  }, [formData.grossSalary, formData.totalDeductions, formData.totalBonuses])

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
          totalBonuses: formData.totalBonuses,
          totalDeductions: formData.totalDeductions,
          netSalary: formData.netSalary,
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
                </div>

                {/* Period info */}
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Calendar className="h-4 w-4" />
                  <span>
                    Période: {formatDate(payroll.period.startDate)} - {formatDate(payroll.period.endDate)}
                  </span>
                  <span className="text-gray-400">•</span>
                  <span>{payroll.period.workingDays} jours ouvrés</span>
                </div>

                {/* Warning if no hours */}
                {payroll.hoursWorked === 0 && (
                  <div className="flex items-start gap-3 p-4 rounded-lg bg-amber-50 border border-amber-200">
                    <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-amber-800">Aucune heure pointée</p>
                      <p className="text-sm text-amber-700">
                        Cet employé n'a pas de pointage pour cette période. 
                        Vous pouvez ajuster manuellement les heures et le salaire.
                      </p>
                    </div>
                  </div>
                )}

                <Separator />

                {/* Time data */}
                <div>
                  <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Temps de travail
                  </h3>
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
                  <div className="mt-3 p-3 rounded-lg bg-blue-50 border border-blue-200">
                    <p className="text-sm text-blue-800 font-medium">
                      Jours attendus pour cet employé: <span className="font-bold">{payroll.expectedWorkingDays} jours</span>
                    </p>
                    <p className="text-xs text-blue-600 mt-1">
                      Basé sur son planning de travail ({payroll.employeeProfile.workingDaysPattern.length} jours/semaine)
                    </p>
                  </div>
                  <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                    <Info className="h-3 w-3" />
                    Données brutes du pointage: {payroll.rawDaysWorked} jours, {payroll.rawHoursWorked}h
                  </p>
                </div>

                <Separator />

                {/* Salary data */}
                <div>
                  <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Rémunération
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
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
                    <div className="space-y-2">
                      <Label htmlFor="totalBonuses">Primes (FCFA)</Label>
                      <Input
                        id="totalBonuses"
                        type="number"
                        min={0}
                        step={1000}
                        value={formData.totalBonuses}
                        onChange={(e) => setFormData(prev => ({ ...prev, totalBonuses: parseFloat(e.target.value) || 0 }))}
                        disabled={!canEdit}
                      />
                    </div>
                  </div>
                </div>

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
                      {formData.totalBonuses > 0 && <p>+ Primes: {formatCurrency(formData.totalBonuses)}</p>}
                      {formData.totalDeductions > 0 && <p>- Cotisations: {formatCurrency(formData.totalDeductions)}</p>}
                    </div>
                  </div>
                </div>
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
