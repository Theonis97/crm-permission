"use client"

import { useState, useEffect } from "react"
import {
  Plus, Loader2, Search, Gift, Car, MoreVertical, Pencil, Trash2, Users, CheckCircle, XCircle, Filter,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { PermissionGuard } from "@/components/auth/permission-guard"
import { toast } from "sonner"
import { CreateRubricSheet } from "@/components/payroll/create-rubric-sheet"
import { EditRubricSheet } from "@/components/payroll/edit-rubric-sheet"
import { RubricEmployeesSheet } from "@/components/payroll/rubric-employees-sheet"

interface PayrollRubric {
  id: string
  code: string
  name: string
  description: string | null
  type: "PRIME" | "INDEMNITY"
  isSubjectToTax: boolean
  isSubjectToSocial: boolean
  calculationBase: string
  defaultAmount: number | null
  defaultRate: number | null
  exemptionCeiling: number | null
  displayOrder: number
  category: string | null
  isActive: boolean
  _count: { employeeRubrics: number; rubricLines: number }
}

const typeLabels: Record<string, string> = { PRIME: "Prime", INDEMNITY: "Indemnité" }
const typeColors: Record<string, string> = { PRIME: "bg-purple-100 text-purple-800", INDEMNITY: "bg-blue-100 text-blue-800" }
const calculationBaseLabels: Record<string, string> = { FIXED: "Montant fixe", GROSS_SALARY: "% du brut", BASE_SALARY: "% du salaire de base", NET_SALARY: "% du net" }

export default function PayrollRubricsPage() {
  const [rubrics, setRubrics] = useState<PayrollRubric[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [filterType, setFilterType] = useState<string>("all")
  const [showCreateSheet, setShowCreateSheet] = useState(false)
  const [showEditSheet, setShowEditSheet] = useState(false)
  const [showEmployeesSheet, setShowEmployeesSheet] = useState(false)
  const [selectedRubric, setSelectedRubric] = useState<PayrollRubric | null>(null)

  useEffect(() => { fetchRubrics() }, [])

  const fetchRubrics = async () => {
    try {
      setIsLoading(true)
      const res = await fetch("/api/payroll/rubrics")
      if (!res.ok) throw new Error("Erreur")
      const data = await res.json()
      setRubrics(data.rubrics)
      setCategories(data.categories || [])
    } catch (error) {
      toast.error("Erreur lors du chargement")
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (rubric: PayrollRubric) => {
    if (!confirm(`Supprimer "${rubric.name}" ?`)) return
    try {
      const res = await fetch(`/api/payroll/rubrics/${rubric.id}`, { method: "DELETE" })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error) }
      toast.success("Rubrique supprimée")
      fetchRubrics()
    } catch (error: any) { toast.error(error.message) }
  }

  const handleToggleActive = async (rubric: PayrollRubric) => {
    try {
      const res = await fetch(`/api/payroll/rubrics/${rubric.id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !rubric.isActive }),
      })
      if (!res.ok) throw new Error("Erreur")
      toast.success(rubric.isActive ? "Désactivée" : "Activée")
      fetchRubrics()
    } catch { toast.error("Erreur") }
  }

  const formatCurrency = (amount: number | null) => amount === null ? "-" : `${amount.toLocaleString("fr-FR")} FCFA`
  const formatRate = (rate: number | null) => rate === null ? "-" : `${rate}%`

  const filteredRubrics = rubrics.filter((r) => {
    if (searchQuery && !r.code.toLowerCase().includes(searchQuery.toLowerCase()) && !r.name.toLowerCase().includes(searchQuery.toLowerCase())) return false
    if (filterType !== "all" && r.type !== filterType) return false
    return true
  })

  const stats = { total: rubrics.length, primes: rubrics.filter(r => r.type === "PRIME").length, indemnities: rubrics.filter(r => r.type === "INDEMNITY").length }

  if (isLoading) return <PermissionGuard permission="payroll.view"><div className="flex items-center justify-center min-h-[400px]"><Loader2 className="h-8 w-8 animate-spin" /></div></PermissionGuard>

  return (
    <PermissionGuard permission="payroll.view">
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Rubriques de paie</h1>
            <p className="text-gray-500">Gérez les primes et indemnités</p>
          </div>
          <Button onClick={() => setShowCreateSheet(true)} className="bg-indigo-600 hover:bg-indigo-700">
            <Plus className="h-4 w-4 mr-2" /> Nouvelle rubrique
          </Button>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <Card><CardContent className="p-4 flex items-center gap-4"><div className="h-10 w-10 bg-gray-100 rounded-full flex items-center justify-center"><Gift className="h-5 w-5 text-gray-600" /></div><div><p className="text-2xl font-bold">{stats.total}</p><p className="text-sm text-gray-500">Total</p></div></CardContent></Card>
          <Card><CardContent className="p-4 flex items-center gap-4"><div className="h-10 w-10 bg-purple-100 rounded-full flex items-center justify-center"><Gift className="h-5 w-5 text-purple-600" /></div><div><p className="text-2xl font-bold">{stats.primes}</p><p className="text-sm text-gray-500">Primes</p></div></CardContent></Card>
          <Card><CardContent className="p-4 flex items-center gap-4"><div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center"><Car className="h-5 w-5 text-blue-600" /></div><div><p className="text-2xl font-bold">{stats.indemnities}</p><p className="text-sm text-gray-500">Indemnités</p></div></CardContent></Card>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Liste des rubriques</CardTitle>
            <div className="flex gap-2">
              <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" /><Input placeholder="Rechercher..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 w-[200px]" /></div>
              <Select value={filterType} onValueChange={setFilterType}><SelectTrigger className="w-[150px]"><SelectValue placeholder="Type" /></SelectTrigger><SelectContent><SelectItem value="all">Tous</SelectItem><SelectItem value="PRIME">Primes</SelectItem><SelectItem value="INDEMNITY">Indemnités</SelectItem></SelectContent></Select>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {filteredRubrics.length === 0 ? (
              <div className="text-center py-12"><Gift className="h-12 w-12 text-gray-300 mx-auto mb-3" /><p className="text-gray-500">Aucune rubrique</p></div>
            ) : (
              <Table>
                <TableHeader><TableRow><TableHead>Code</TableHead><TableHead>Nom</TableHead><TableHead>Type</TableHead><TableHead>Mode calcul</TableHead><TableHead className="text-right">Montant/Taux</TableHead><TableHead className="text-center">Fiscal</TableHead><TableHead className="text-center">Employés</TableHead><TableHead className="text-center">Statut</TableHead><TableHead></TableHead></TableRow></TableHeader>
                <TableBody>
                  {filteredRubrics.map((rubric) => (
                    <TableRow key={rubric.id} className={!rubric.isActive ? "opacity-50" : ""}>
                      <TableCell className="font-mono">{rubric.code}</TableCell>
                      <TableCell><div><p className="font-medium">{rubric.name}</p>{rubric.category && <p className="text-xs text-gray-500">{rubric.category}</p>}</div></TableCell>
                      <TableCell><Badge className={typeColors[rubric.type]}>{typeLabels[rubric.type]}</Badge></TableCell>
                      <TableCell className="text-sm text-gray-600">{calculationBaseLabels[rubric.calculationBase]}</TableCell>
                      <TableCell className="text-right">{rubric.calculationBase === "FIXED" ? formatCurrency(rubric.defaultAmount) : formatRate(rubric.defaultRate)}</TableCell>
                      <TableCell className="text-center"><div className="flex justify-center gap-1">{rubric.isSubjectToTax ? <Badge variant="outline" className="text-xs">IRPP</Badge> : null}{rubric.isSubjectToSocial ? <Badge variant="outline" className="text-xs">CNSS</Badge> : null}</div></TableCell>
                      <TableCell className="text-center"><Badge variant="secondary">{rubric._count.employeeRubrics}</Badge></TableCell>
                      <TableCell className="text-center">{rubric.isActive ? <CheckCircle className="h-5 w-5 text-green-500 mx-auto" /> : <XCircle className="h-5 w-5 text-gray-400 mx-auto" />}</TableCell>
                      <TableCell>
                        <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => { setSelectedRubric(rubric); setShowEditSheet(true) }}><Pencil className="h-4 w-4 mr-2" />Modifier</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => { setSelectedRubric(rubric); setShowEmployeesSheet(true) }}><Users className="h-4 w-4 mr-2" />Employés ({rubric._count.employeeRubrics})</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleToggleActive(rubric)}>{rubric.isActive ? "Désactiver" : "Activer"}</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDelete(rubric)} className="text-red-600"><Trash2 className="h-4 w-4 mr-2" />Supprimer</DropdownMenuItem>
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

        <CreateRubricSheet open={showCreateSheet} onOpenChange={setShowCreateSheet} onSuccess={fetchRubrics} />
        <EditRubricSheet open={showEditSheet} onOpenChange={setShowEditSheet} rubric={selectedRubric} onSuccess={fetchRubrics} />
        <RubricEmployeesSheet open={showEmployeesSheet} onOpenChange={setShowEmployeesSheet} rubric={selectedRubric} onSuccess={fetchRubrics} />
      </div>
    </PermissionGuard>
  )
}
