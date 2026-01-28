"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  Settings,
  Plus,
  MoreVertical,
  Edit,
  Trash2,
  Loader2,
  ArrowLeft,
  Percent,
  Building2,
  User,
  ToggleLeft,
  ToggleRight,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { PermissionGuard } from "@/components/auth/permission-guard"
import { toast } from "sonner"

interface PayrollContribution {
  id: string
  name: string
  code: string
  description: string | null
  isEmployeeShare: boolean
  isEmployerShare: boolean
  rate: number
  ceiling: number | null
  declaredOnly: boolean
  displayOrder: number
  isActive: boolean
}

export default function PayrollContributionsPage() {
  const router = useRouter()
  const [contributions, setContributions] = useState<PayrollContribution[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingContribution, setEditingContribution] = useState<PayrollContribution | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const [formData, setFormData] = useState({
    name: "",
    code: "",
    description: "",
    isEmployeeShare: true,
    isEmployerShare: false,
    rate: "",
    ceiling: "",
    declaredOnly: true,
    displayOrder: "0",
  })

  useEffect(() => {
    fetchContributions()
  }, [])

  const fetchContributions = async () => {
    try {
      setIsLoading(true)
      const res = await fetch("/api/payroll/contributions")
      if (!res.ok) throw new Error("Erreur lors du chargement")
      const data = await res.json()
      setContributions(data)
    } catch (error) {
      console.error("Error fetching contributions:", error)
      toast.error("Erreur lors du chargement des cotisations")
    } finally {
      setIsLoading(false)
    }
  }

  const openCreateDialog = () => {
    setEditingContribution(null)
    setFormData({
      name: "",
      code: "",
      description: "",
      isEmployeeShare: true,
      isEmployerShare: false,
      rate: "",
      ceiling: "",
      declaredOnly: true,
      displayOrder: "0",
    })
    setIsDialogOpen(true)
  }

  const openEditDialog = (contribution: PayrollContribution) => {
    setEditingContribution(contribution)
    setFormData({
      name: contribution.name,
      code: contribution.code,
      description: contribution.description || "",
      isEmployeeShare: contribution.isEmployeeShare,
      isEmployerShare: contribution.isEmployerShare,
      rate: String(contribution.rate),
      ceiling: contribution.ceiling ? String(contribution.ceiling) : "",
      declaredOnly: contribution.declaredOnly,
      displayOrder: String(contribution.displayOrder),
    })
    setIsDialogOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name || !formData.code || !formData.rate) {
      toast.error("Veuillez remplir tous les champs obligatoires")
      return
    }

    try {
      setIsSaving(true)
      const url = editingContribution
        ? `/api/payroll/contributions/${editingContribution.id}`
        : "/api/payroll/contributions"
      const method = editingContribution ? "PUT" : "POST"

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          rate: parseFloat(formData.rate),
          ceiling: formData.ceiling ? parseFloat(formData.ceiling) : null,
          displayOrder: parseInt(formData.displayOrder),
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Erreur lors de l'enregistrement")
      }

      toast.success(
        editingContribution
          ? "Cotisation modifiée avec succès"
          : "Cotisation créée avec succès"
      )
      setIsDialogOpen(false)
      fetchContributions()
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cette cotisation ?")) return

    try {
      const res = await fetch(`/api/payroll/contributions/${id}`, {
        method: "DELETE",
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Erreur lors de la suppression")
      }
      toast.success("Cotisation supprimée avec succès")
      fetchContributions()
    } catch (error: any) {
      toast.error(error.message)
    }
  }

  const toggleActive = async (contribution: PayrollContribution) => {
    try {
      const res = await fetch(`/api/payroll/contributions/${contribution.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !contribution.isActive }),
      })
      if (!res.ok) throw new Error("Erreur lors de la modification")
      fetchContributions()
    } catch (error) {
      toast.error("Erreur lors de la modification")
    }
  }

  const employeeContributions = contributions.filter((c) => c.isEmployeeShare)
  const employerContributions = contributions.filter((c) => c.isEmployerShare)

  return (
    <PermissionGuard permission="payroll.contributions.manage">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 -mx-6 -mt-6 px-6 py-4 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-gray-900">
                Cotisations et taxes
              </h1>
              <p className="text-sm text-gray-500 mt-0.5">
                Configuration des cotisations sociales et fiscales
              </p>
            </div>
            <Button 
              size="sm"
              className="bg-indigo-600 hover:bg-indigo-700"
              onClick={openCreateDialog}
            >
              <Plus className="h-4 w-4 mr-2" />
              Nouvelle cotisation
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                <Percent className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{contributions.length}</p>
                <p className="text-sm text-gray-500">Total cotisations</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="h-10 w-10 bg-green-100 rounded-full flex items-center justify-center">
                <User className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {employeeContributions.reduce((sum, c) => sum + c.rate, 0).toFixed(1)}%
                </p>
                <p className="text-sm text-gray-500">Part salariale</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="h-10 w-10 bg-purple-100 rounded-full flex items-center justify-center">
                <Building2 className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {employerContributions.reduce((sum, c) => sum + c.rate, 0).toFixed(1)}%
                </p>
                <p className="text-sm text-gray-500">Part patronale</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Table */}
        <Card>
          <CardHeader>
            <CardTitle>Liste des cotisations</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : contributions.length === 0 ? (
              <div className="text-center py-12">
                <Settings className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">Aucune cotisation configurée</p>
                <Button variant="link" onClick={openCreateDialog}>
                  Créer une cotisation
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nom</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead className="text-center">Taux</TableHead>
                    <TableHead className="text-center">Part</TableHead>
                    <TableHead className="text-center">Déclarés seuls</TableHead>
                    <TableHead className="text-center">Actif</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contributions.map((contribution) => (
                    <TableRow key={contribution.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{contribution.name}</p>
                          {contribution.description && (
                            <p className="text-sm text-gray-500">
                              {contribution.description}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <code className="bg-gray-100 px-2 py-1 rounded text-sm">
                          {contribution.code}
                        </code>
                      </TableCell>
                      <TableCell className="text-center font-medium">
                        {contribution.rate}%
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex justify-center gap-1">
                          {contribution.isEmployeeShare && (
                            <Badge className="bg-green-100 text-green-800">
                              Salariale
                            </Badge>
                          )}
                          {contribution.isEmployerShare && (
                            <Badge className="bg-purple-100 text-purple-800">
                              Patronale
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        {contribution.declaredOnly ? "Oui" : "Non"}
                      </TableCell>
                      <TableCell className="text-center">
                        <Switch
                          checked={contribution.isActive}
                          onCheckedChange={() => toggleActive(contribution)}
                        />
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
                              onClick={() => openEditDialog(contribution)}
                            >
                              <Edit className="h-4 w-4 mr-2" />
                              Modifier
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={() => handleDelete(contribution.id)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Supprimer
                            </DropdownMenuItem>
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

        {/* Create/Edit Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingContribution ? "Modifier la cotisation" : "Nouvelle cotisation"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nom *</Label>
                <Input
                  id="name"
                  placeholder="Ex: CNSS Salariale"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, name: e.target.value }))
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="code">Code *</Label>
                <Input
                  id="code"
                  placeholder="Ex: CNSS_SAL"
                  value={formData.code}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      code: e.target.value.toUpperCase(),
                    }))
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  placeholder="Description optionnelle"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, description: e.target.value }))
                  }
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="rate">Taux (%) *</Label>
                  <Input
                    id="rate"
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    placeholder="Ex: 4.5"
                    value={formData.rate}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, rate: e.target.value }))
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ceiling">Plafond (optionnel)</Label>
                  <Input
                    id="ceiling"
                    type="number"
                    min="0"
                    placeholder="Ex: 500000"
                    value={formData.ceiling}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, ceiling: e.target.value }))
                    }
                  />
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Part salariale</Label>
                  <Switch
                    checked={formData.isEmployeeShare}
                    onCheckedChange={(checked) =>
                      setFormData((prev) => ({ ...prev, isEmployeeShare: checked }))
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Part patronale</Label>
                  <Switch
                    checked={formData.isEmployerShare}
                    onCheckedChange={(checked) =>
                      setFormData((prev) => ({ ...prev, isEmployerShare: checked }))
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Employés déclarés uniquement</Label>
                  <Switch
                    checked={formData.declaredOnly}
                    onCheckedChange={(checked) =>
                      setFormData((prev) => ({ ...prev, declaredOnly: checked }))
                    }
                  />
                </div>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                  disabled={isSaving}
                >
                  Annuler
                </Button>
                <Button type="submit" disabled={isSaving}>
                  {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {editingContribution ? "Enregistrer" : "Créer"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </PermissionGuard>
  )
}
