"use client"

import { useState, useEffect } from "react"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Loader2, Plus, Trash2, UserPlus } from "lucide-react"
import { toast } from "sonner"

interface PayrollRubric {
  id: string
  code: string
  name: string
  type: "PRIME" | "INDEMNITY"
  calculationBase: string
  defaultAmount: number | null
  defaultRate: number | null
  _count: { employeeRubrics: number }
}

interface EmployeeRubric {
  id: string
  amount: number | null
  rate: number | null
  isActive: boolean
  startDate: string | null
  endDate: string | null
  employeeProfile: {
    id: string
    user: { id: string; firstName: string | null; lastName: string | null; matricule: string | null }
  }
}

interface EmployeeProfile {
  id: string
  user: { id: string; firstName: string | null; lastName: string | null; matricule: string | null }
}

interface RubricEmployeesSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  rubric: PayrollRubric | null
  onSuccess: () => void
}

export function RubricEmployeesSheet({ open, onOpenChange, rubric, onSuccess }: RubricEmployeesSheetProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [employeeRubrics, setEmployeeRubrics] = useState<EmployeeRubric[]>([])
  const [employees, setEmployees] = useState<EmployeeProfile[]>([])
  const [showAddForm, setShowAddForm] = useState(false)
  const [selectedEmployee, setSelectedEmployee] = useState("")
  const [amount, setAmount] = useState("")
  const [rate, setRate] = useState("")
  const [isAdding, setIsAdding] = useState(false)

  useEffect(() => {
    if (open && rubric) {
      fetchEmployeeRubrics()
      fetchEmployees()
    }
  }, [open, rubric])

  const fetchEmployeeRubrics = async () => {
    if (!rubric) return
    setIsLoading(true)
    try {
      const res = await fetch(`/api/payroll/rubrics/${rubric.id}/employees`)
      if (!res.ok) throw new Error("Erreur")
      const data = await res.json()
      setEmployeeRubrics(data)
    } catch (error) {
      toast.error("Erreur lors du chargement")
    } finally {
      setIsLoading(false)
    }
  }

  const fetchEmployees = async () => {
    try {
      const res = await fetch("/api/payroll/employees")
      if (!res.ok) throw new Error("Erreur")
      const data = await res.json()
      setEmployees(data.employees || [])
    } catch (error) {
      console.error("Error fetching employees:", error)
    }
  }

  const handleAddEmployee = async () => {
    if (!rubric || !selectedEmployee) {
      toast.error("Sélectionnez un employé")
      return
    }

    setIsAdding(true)
    try {
      const res = await fetch(`/api/payroll/rubrics/${rubric.id}/employees`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeProfileId: selectedEmployee,
          amount: amount ? parseFloat(amount) : null,
          rate: rate ? parseFloat(rate) : null,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Erreur")
      }

      toast.success("Employé ajouté")
      fetchEmployeeRubrics()
      onSuccess()
      setShowAddForm(false)
      setSelectedEmployee("")
      setAmount("")
      setRate("")
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setIsAdding(false)
    }
  }

  const handleRemoveEmployee = async (employeeRubricId: string) => {
    if (!confirm("Retirer cet employé de cette rubrique ?")) return

    try {
      const res = await fetch(`/api/payroll/employee-rubrics/${employeeRubricId}`, {
        method: "DELETE",
      })

      if (!res.ok) throw new Error("Erreur")

      toast.success("Employé retiré")
      fetchEmployeeRubrics()
      onSuccess()
    } catch (error) {
      toast.error("Erreur lors de la suppression")
    }
  }

  const formatCurrency = (amount: number | null) => amount === null ? "-" : `${amount.toLocaleString("fr-FR")} FCFA`
  const formatRate = (rate: number | null) => rate === null ? "-" : `${rate}%`

  const availableEmployees = employees.filter(
    (emp) => !employeeRubrics.some((er) => er.employeeProfile.id === emp.id)
  )

  const typeColors: Record<string, string> = { PRIME: "bg-purple-100 text-purple-800", INDEMNITY: "bg-blue-100 text-blue-800" }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[600px] sm:max-w-[600px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            Employés - {rubric?.name}
            {rubric && <Badge className={typeColors[rubric.type]}>{rubric.type === "PRIME" ? "Prime" : "Indemnité"}</Badge>}
          </SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          {!showAddForm ? (
            <Button onClick={() => setShowAddForm(true)} className="w-full bg-indigo-600 hover:bg-indigo-700">
              <UserPlus className="h-4 w-4 mr-2" /> Ajouter un employé
            </Button>
          ) : (
            <div className="border rounded-lg p-4 space-y-4 bg-gray-50">
              <h4 className="font-medium">Ajouter un employé</h4>
              <div className="space-y-2">
                <Label>Employé</Label>
                <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                  <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                  <SelectContent>
                    {availableEmployees.map((emp) => (
                      <SelectItem key={emp.id} value={emp.id}>
                        {emp.user.firstName} {emp.user.lastName} {emp.user.matricule && `(${emp.user.matricule})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {rubric?.calculationBase === "FIXED" ? (
                <div className="space-y-2">
                  <Label>Montant (FCFA)</Label>
                  <Input type="number" placeholder={rubric.defaultAmount?.toString() || "0"} value={amount} onChange={(e) => setAmount(e.target.value)} />
                  <p className="text-xs text-gray-500">Laissez vide pour utiliser le montant par défaut</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label>Taux (%)</Label>
                  <Input type="number" step="0.01" placeholder={rubric?.defaultRate?.toString() || "0"} value={rate} onChange={(e) => setRate(e.target.value)} />
                  <p className="text-xs text-gray-500">Laissez vide pour utiliser le taux par défaut</p>
                </div>
              )}

              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setShowAddForm(false)} className="flex-1">Annuler</Button>
                <Button onClick={handleAddEmployee} disabled={isAdding || !selectedEmployee} className="flex-1 bg-indigo-600 hover:bg-indigo-700">
                  {isAdding && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Ajouter
                </Button>
              </div>
            </div>
          )}

          {isLoading ? (
            <div className="flex items-center justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : employeeRubrics.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <UserPlus className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p>Aucun employé n'a cette rubrique</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employé</TableHead>
                  <TableHead className="text-right">{rubric?.calculationBase === "FIXED" ? "Montant" : "Taux"}</TableHead>
                  <TableHead className="text-center">Statut</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employeeRubrics.map((er) => (
                  <TableRow key={er.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{er.employeeProfile.user.firstName} {er.employeeProfile.user.lastName}</p>
                        {er.employeeProfile.user.matricule && <p className="text-xs text-gray-500">{er.employeeProfile.user.matricule}</p>}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {rubric?.calculationBase === "FIXED" 
                        ? formatCurrency(er.amount ?? rubric.defaultAmount)
                        : formatRate(er.rate ?? rubric?.defaultRate ?? null)}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={er.isActive ? "default" : "secondary"}>{er.isActive ? "Actif" : "Inactif"}</Badge>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => handleRemoveEmployee(er.id)} className="text-red-600 hover:text-red-700 hover:bg-red-50">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
