"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Calendar, Loader2, Users, Info } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

interface EmployeeProfile {
  id: string
  userId: string
  baseSalary: number
  position: string | null
  workingDaysPattern: string[]
  isActive: boolean
  user: {
    id: string
    firstName: string | null
    lastName: string | null
    email: string
    matricule: string | null
  }
}

interface CreatePeriodSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

const monthNames = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
]

const periodTypes = [
  { value: "MONTHLY", label: "Mensuel" },
  { value: "BIWEEKLY", label: "Bi-mensuel" },
  { value: "WEEKLY", label: "Hebdomadaire" },
]

const weekDays = [
  { value: "MONDAY", label: "Lundi", short: "Lun" },
  { value: "TUESDAY", label: "Mardi", short: "Mar" },
  { value: "WEDNESDAY", label: "Mercredi", short: "Mer" },
  { value: "THURSDAY", label: "Jeudi", short: "Jeu" },
  { value: "FRIDAY", label: "Vendredi", short: "Ven" },
  { value: "SATURDAY", label: "Samedi", short: "Sam" },
  { value: "SUNDAY", label: "Dimanche", short: "Dim" },
]

export function CreatePeriodSheet({ open, onOpenChange, onSuccess }: CreatePeriodSheetProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoadingEmployees, setIsLoadingEmployees] = useState(false)
  const [employees, setEmployees] = useState<EmployeeProfile[]>([])
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([])
  const [generatePayslips, setGeneratePayslips] = useState(false)
  
  const [formData, setFormData] = useState({
    name: "",
    periodType: "MONTHLY",
    startDate: "",
    endDate: "",
    workingDays: 22,
  })

  useEffect(() => {
    if (open) {
      const now = new Date()
      const year = now.getFullYear()
      const month = now.getMonth()
      
      const startDate = new Date(year, month, 1)
      const endDate = new Date(year, month + 1, 0)
      
      setFormData({
        name: `${monthNames[month]} ${year}`,
        periodType: "MONTHLY",
        startDate: startDate.toISOString().split("T")[0],
        endDate: endDate.toISOString().split("T")[0],
        workingDays: 22,
      })
      
      setSelectedEmployees([])
      setGeneratePayslips(false)
      fetchEmployees()
    }
  }, [open])

  useEffect(() => {
    if (formData.startDate && formData.endDate) {
      calculateWorkingDays()
    }
  }, [formData.startDate, formData.endDate])

  const fetchEmployees = async () => {
    try {
      setIsLoadingEmployees(true)
      const res = await fetch("/api/payroll/profiles?isActive=true")
      if (res.ok) {
        const data = await res.json()
        setEmployees(data.filter((e: EmployeeProfile) => e.isActive))
        // Sélectionner tous les employés actifs par défaut
        setSelectedEmployees(data.filter((e: EmployeeProfile) => e.isActive).map((e: EmployeeProfile) => e.id))
      }
    } catch (error) {
      console.error("Error fetching employees:", error)
    } finally {
      setIsLoadingEmployees(false)
    }
  }

  const calculateWorkingDays = () => {
    const start = new Date(formData.startDate)
    const end = new Date(formData.endDate)
    let workingDays = 0
    
    const current = new Date(start)
    while (current <= end) {
      const dayOfWeek = current.getDay()
      // Par défaut: Lundi-Vendredi (1-5)
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        workingDays++
      }
      current.setDate(current.getDate() + 1)
    }
    
    setFormData(prev => ({ ...prev, workingDays }))
  }

  const handleDateChange = (field: "startDate" | "endDate", value: string) => {
    setFormData(prev => {
      const newData = { ...prev, [field]: value }
      
      if (field === "startDate" && value) {
        const date = new Date(value)
        newData.name = `${monthNames[date.getMonth()]} ${date.getFullYear()}`
      }
      
      return newData
    })
  }

  const toggleEmployee = (employeeId: string) => {
    setSelectedEmployees(prev => 
      prev.includes(employeeId)
        ? prev.filter(id => id !== employeeId)
        : [...prev, employeeId]
    )
  }

  const selectAllEmployees = () => {
    if (selectedEmployees.length === employees.length) {
      setSelectedEmployees([])
    } else {
      setSelectedEmployees(employees.map(e => e.id))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name || !formData.startDate || !formData.endDate) {
      toast.error("Veuillez remplir tous les champs obligatoires")
      return
    }

    try {
      setIsSubmitting(true)
      
      // Créer la période
      const periodResponse = await fetch("/api/payroll/periods", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      if (!periodResponse.ok) {
        const error = await periodResponse.json()
        throw new Error(error.error || "Erreur lors de la création")
      }

      const period = await periodResponse.json()
      
      // Générer les bulletins si demandé
      if (generatePayslips && selectedEmployees.length > 0) {
        const generateResponse = await fetch(`/api/payroll/periods/${period.id}/generate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ employeeProfileIds: selectedEmployees }),
        })

        if (!generateResponse.ok) {
          const error = await generateResponse.json()
          toast.warning(`Période créée mais erreur lors de la génération des bulletins: ${error.error}`)
        } else {
          const result = await generateResponse.json()
          toast.success(`Période créée avec ${result.count || selectedEmployees.length} bulletin(s) généré(s)`)
        }
      } else {
        toast.success("Période créée avec succès")
      }
      
      onOpenChange(false)
      onSuccess?.()
      router.push(`/dashboard/payroll/periods/${period.id}`)
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de la création")
    } finally {
      setIsSubmitting(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("fr-FR").format(amount) + " FCFA"
  }

  const getUserName = (employee: EmployeeProfile) => {
    if (employee.user.firstName || employee.user.lastName) {
      return `${employee.user.firstName || ""} ${employee.user.lastName || ""}`.trim()
    }
    return employee.user.email.split("@")[0]
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-xl !p-0 flex flex-col h-full overflow-hidden">
        <SheetHeader className="px-6 py-4 border-b shrink-0">
          <SheetTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-indigo-600" />
            Nouvelle période de paie
          </SheetTitle>
          <SheetDescription>
            Créez une période et générez les bulletins de paie
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto px-6">
            <div className="space-y-5 py-4">
              {/* Nom et type */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nom de la période *</Label>
                  <Input
                    id="name"
                    placeholder="Ex: Janvier 2026"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="periodType">Type</Label>
                  <Select
                    value={formData.periodType}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, periodType: value }))}
                  >
                    <SelectTrigger id="periodType">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="z-[2100]">
                      {periodTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startDate">Date de début *</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => handleDateChange("startDate", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endDate">Date de fin *</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => handleDateChange("endDate", e.target.value)}
                  />
                </div>
              </div>

              {/* Jours ouvrés */}
              <div className="space-y-2">
                <Label htmlFor="workingDays">Jours ouvrés (par défaut)</Label>
                <Input
                  id="workingDays"
                  type="number"
                  min={1}
                  max={31}
                  value={formData.workingDays}
                  onChange={(e) => setFormData(prev => ({ ...prev, workingDays: parseInt(e.target.value) || 22 }))}
                />
                <p className="text-xs text-gray-500 flex items-center gap-1">
                  <Info className="h-3 w-3" />
                  Calculé automatiquement (Lun-Ven). Chaque employé a son propre planning.
                </p>
              </div>

              {/* Option génération bulletins */}
              <div className="border rounded-lg p-4 bg-gray-50">
                <div className="flex items-center gap-3">
                  <Checkbox
                    id="generatePayslips"
                    checked={generatePayslips}
                    onCheckedChange={(checked) => setGeneratePayslips(checked as boolean)}
                  />
                  <div>
                    <label htmlFor="generatePayslips" className="font-medium cursor-pointer">
                      Générer les bulletins de paie
                    </label>
                    <p className="text-sm text-gray-500">
                      Créer automatiquement les bulletins pour les employés sélectionnés
                    </p>
                  </div>
                </div>
              </div>

              {/* Sélection des employés */}
              {generatePayslips && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Employés à inclure
                    </Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={selectAllEmployees}
                    >
                      {selectedEmployees.length === employees.length ? "Désélectionner tout" : "Sélectionner tout"}
                    </Button>
                  </div>
                  
                  {isLoadingEmployees ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="h-5 w-5 animate-spin text-indigo-600" />
                    </div>
                  ) : employees.length === 0 ? (
                    <div className="text-center py-4 text-gray-500 border rounded-lg">
                      <Users className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                      <p className="text-sm">Aucun employé actif</p>
                    </div>
                  ) : (
                    <div className="border rounded-lg divide-y max-h-[200px] overflow-y-auto">
                      {employees.map((employee) => (
                        <div
                          key={employee.id}
                          className={cn(
                            "flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer",
                            selectedEmployees.includes(employee.id) && "bg-indigo-50"
                          )}
                          onClick={() => toggleEmployee(employee.id)}
                        >
                          <Checkbox
                            checked={selectedEmployees.includes(employee.id)}
                            onCheckedChange={() => toggleEmployee(employee.id)}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">
                              {getUserName(employee)}
                            </p>
                            <p className="text-xs text-gray-500">
                              {employee.position || "Poste non défini"} • {formatCurrency(employee.baseSalary)}
                            </p>
                          </div>
                          <div className="flex gap-1">
                            {employee.workingDaysPattern?.slice(0, 3).map((day) => (
                              <Badge key={day} variant="outline" className="text-xs px-1">
                                {weekDays.find(d => d.value === day)?.short}
                              </Badge>
                            ))}
                            {employee.workingDaysPattern?.length > 3 && (
                              <Badge variant="outline" className="text-xs px-1">
                                +{employee.workingDaysPattern.length - 3}
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  <p className="text-xs text-gray-500">
                    {selectedEmployees.length} employé(s) sélectionné(s) sur {employees.length}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Fixed footer */}
          <div className="px-6 py-4 border-t bg-gray-50 shrink-0 flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="flex-1"
            >
              Annuler
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-indigo-600 hover:bg-indigo-700"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Création...
                </>
              ) : generatePayslips ? (
                `Créer et générer ${selectedEmployees.length} bulletin(s)`
              ) : (
                "Créer la période"
              )}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}
