"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  Users,
  Plus,
  Search,
  MoreVertical,
  Edit,
  Trash2,
  Eye,
  Loader2,
  Building2,
  Clock,
  Banknote,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
import { AddEmployeeProfileSheet } from "@/components/payroll/add-employee-profile-sheet"
import { EditEmployeeProfileSheet } from "@/components/payroll/edit-employee-profile-sheet"
import { toast } from "sonner"

interface EmployeeProfile {
  id: string
  userId: string
  employeeType: string
  contractType: string
  baseSalary: number
  dailyRate: number | null
  hourlyRate: number | null
  workingDaysPerMonth: number
  workingHoursPerDay: number
  overtimeRate: number
  hireDate: string | null
  isActive: boolean
  user: {
    id: string
    email: string
    firstName: string | null
    lastName: string | null
    name: string | null
    matricule: string | null
    status: string
  }
  _count: {
    payrolls: number
  }
}

const employeeTypeLabels: Record<string, string> = {
  DECLARED: "Déclaré",
  UNDECLARED: "Non déclaré",
}

const contractTypeLabels: Record<string, string> = {
  MONTHLY: "Mensuel",
  DAILY: "Journalier",
  HOURLY: "Horaire",
  CONTRACTOR: "Prestataire",
  TEMPORARY: "CDD",
}

const employeeTypeColors: Record<string, string> = {
  DECLARED: "bg-green-100 text-green-800",
  UNDECLARED: "bg-orange-100 text-orange-800",
}

export default function PayrollProfilesPage() {
  const router = useRouter()
  const [profiles, setProfiles] = useState<EmployeeProfile[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [filterType, setFilterType] = useState<string>("all")
  const [filterContract, setFilterContract] = useState<string>("all")
  const [showAddSheet, setShowAddSheet] = useState(false)
  const [showEditSheet, setShowEditSheet] = useState(false)
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null)

  useEffect(() => {
    fetchProfiles()
  }, [])

  const fetchProfiles = async () => {
    try {
      setIsLoading(true)
      const res = await fetch("/api/payroll/profiles")
      if (!res.ok) throw new Error("Erreur lors du chargement")
      const data = await res.json()
      setProfiles(data)
    } catch (error) {
      console.error("Error fetching profiles:", error)
      toast.error("Erreur lors du chargement des profils")
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer ce profil ?")) return

    try {
      const res = await fetch(`/api/payroll/profiles/${id}`, {
        method: "DELETE",
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Erreur lors de la suppression")
      }
      toast.success("Profil supprimé avec succès")
      fetchProfiles()
    } catch (error: any) {
      toast.error(error.message)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "decimal",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount) + " FCFA"
  }

  const filteredProfiles = profiles.filter((profile) => {
    const matchesSearch =
      !searchQuery ||
      profile.user.firstName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      profile.user.lastName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      profile.user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      profile.user.matricule?.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesType =
      filterType === "all" || profile.employeeType === filterType

    const matchesContract =
      filterContract === "all" || profile.contractType === filterContract

    return matchesSearch && matchesType && matchesContract
  })

  return (
    <PermissionGuard permission="payroll.view">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 -mx-6 -mt-6 px-6 py-4 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-gray-900">
                Profils employés
              </h1>
              <p className="text-sm text-gray-500 mt-0.5">
                Configuration des salaires et types de contrat
              </p>
            </div>
            <Button 
              size="sm"
              className="bg-indigo-600 hover:bg-indigo-700"
              onClick={() => setShowAddSheet(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Ajouter un employé
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Rechercher par nom, email ou matricule..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Type d'employé" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les types</SelectItem>
                  <SelectItem value="DECLARED">Déclaré</SelectItem>
                  <SelectItem value="UNDECLARED">Non déclaré</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterContract} onValueChange={setFilterContract}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Type de contrat" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les contrats</SelectItem>
                  <SelectItem value="MONTHLY">Mensuel</SelectItem>
                  <SelectItem value="DAILY">Journalier</SelectItem>
                  <SelectItem value="HOURLY">Horaire</SelectItem>
                  <SelectItem value="CONTRACTOR">Prestataire</SelectItem>
                  <SelectItem value="TEMPORARY">CDD</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{profiles.length}</p>
                <p className="text-sm text-gray-500">Total profils</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="h-10 w-10 bg-green-100 rounded-full flex items-center justify-center">
                <Building2 className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {profiles.filter((p) => p.employeeType === "DECLARED").length}
                </p>
                <p className="text-sm text-gray-500">Déclarés</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="h-10 w-10 bg-orange-100 rounded-full flex items-center justify-center">
                <Clock className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {profiles.filter((p) => p.contractType === "MONTHLY").length}
                </p>
                <p className="text-sm text-gray-500">Mensuels</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="h-10 w-10 bg-purple-100 rounded-full flex items-center justify-center">
                <Banknote className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {formatCurrency(
                    profiles.reduce((sum, p) => sum + p.baseSalary, 0)
                  )}
                </p>
                <p className="text-sm text-gray-500">Masse salariale</p>
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
            ) : filteredProfiles.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">Aucun profil trouvé</p>
                <Button
                  variant="link"
                  onClick={() => router.push("/dashboard/payroll/profiles/new")}
                >
                  Créer un profil
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employé</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Contrat</TableHead>
                    <TableHead className="text-right">Salaire base</TableHead>
                    <TableHead className="text-right">Taux journalier</TableHead>
                    <TableHead className="text-center">Bulletins</TableHead>
                    <TableHead className="text-center">Statut</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProfiles.map((profile) => (
                    <TableRow key={profile.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">
                            {profile.user.firstName} {profile.user.lastName}
                          </p>
                          <p className="text-sm text-gray-500">
                            {profile.user.matricule || profile.user.email}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={
                            employeeTypeColors[profile.employeeType] ||
                            "bg-gray-100"
                          }
                        >
                          {employeeTypeLabels[profile.employeeType] ||
                            profile.employeeType}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {contractTypeLabels[profile.contractType] ||
                          profile.contractType}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(profile.baseSalary)}
                      </TableCell>
                      <TableCell className="text-right">
                        {profile.dailyRate
                          ? formatCurrency(profile.dailyRate)
                          : "-"}
                      </TableCell>
                      <TableCell className="text-center">
                        {profile._count.payrolls}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant={profile.isActive ? "default" : "secondary"}
                        >
                          {profile.isActive ? "Actif" : "Inactif"}
                        </Badge>
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
                                router.push(
                                  `/dashboard/payroll/profiles/${profile.id}`
                                )
                              }
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              Voir
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedProfileId(profile.id)
                                setShowEditSheet(true)
                              }}
                            >
                              <Edit className="h-4 w-4 mr-2" />
                              Modifier
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={() => handleDelete(profile.id)}
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
        {/* Add Employee Profile Sheet */}
        <AddEmployeeProfileSheet
          open={showAddSheet}
          onOpenChange={setShowAddSheet}
          onSuccess={fetchProfiles}
        />

        {/* Edit Employee Profile Sheet */}
        {selectedProfileId && (
          <EditEmployeeProfileSheet
            open={showEditSheet}
            onOpenChange={setShowEditSheet}
            profileId={selectedProfileId}
            onSuccess={fetchProfiles}
          />
        )}
      </div>
    </PermissionGuard>
  )
}
