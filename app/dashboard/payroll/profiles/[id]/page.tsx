"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import {
  ArrowLeft,
  User,
  Briefcase,
  Calendar,
  Clock,
  Banknote,
  FileText,
  Edit,
  Trash2,
  Plus,
  Loader2,
  Building2,
  CreditCard,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Receipt,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { PermissionGuard } from "@/components/auth/permission-guard"
import { EditEmployeeProfileSheet } from "@/components/payroll/edit-employee-profile-sheet"
import { toast } from "sonner"

interface EmployeeContribution {
  id: string
  contributionId: string
  customRate: number | null
  isActive: boolean
  contribution: {
    id: string
    name: string
    code: string
    rate: number
    isEmployeeShare: boolean
    isEmployerShare: boolean
  }
}

interface Payroll {
  id: string
  number: string
  status: string
  netSalary: number
  grossSalary: number
  createdAt: string
  period: {
    name: string
    startDate: string
    endDate: string
  }
}

interface EmployeeProfile {
  id: string
  userId: string
  employeeType: string
  contractType: string
  baseSalary: number
  salaryIsNet: boolean
  workingDaysPattern: string[]
  workingHoursPerDay: number
  dailyRate: number | null
  hourlyRate: number | null
  overtimeRate: number
  position: string | null
  hireDate: string | null
  contractEndDate: string | null
  bankName: string | null
  bankAccountNumber: string | null
  isActive: boolean
  createdAt: string
  user: {
    id: string
    email: string
    firstName: string | null
    lastName: string | null
    name: string | null
    matricule: string | null
    image: string | null
    status: string
  }
  contributions: EmployeeContribution[]
  payrolls: Payroll[]
  _count?: {
    payrolls: number
  }
}

const weekDayLabels: Record<string, string> = {
  MONDAY: "Lun",
  TUESDAY: "Mar",
  WEDNESDAY: "Mer",
  THURSDAY: "Jeu",
  FRIDAY: "Ven",
  SATURDAY: "Sam",
  SUNDAY: "Dim",
}

const contractTypeLabels: Record<string, string> = {
  CDI: "CDI",
  CDD: "CDD",
  STAGE: "Stage",
  INTERIM: "Intérim",
  FREELANCE: "Freelance",
}

const employeeTypeLabels: Record<string, string> = {
  DECLARED: "Déclaré",
  UNDECLARED: "Non déclaré",
}

const payrollStatusLabels: Record<string, { label: string; color: string; icon: any }> = {
  DRAFT: { label: "Brouillon", color: "bg-gray-100 text-gray-700", icon: FileText },
  PENDING: { label: "En attente", color: "bg-yellow-100 text-yellow-700", icon: Clock },
  VALIDATED: { label: "Validé", color: "bg-blue-100 text-blue-700", icon: CheckCircle },
  APPROVED: { label: "Approuvé", color: "bg-green-100 text-green-700", icon: CheckCircle },
  PAID: { label: "Payé", color: "bg-emerald-100 text-emerald-700", icon: Banknote },
  CANCELLED: { label: "Annulé", color: "bg-red-100 text-red-700", icon: XCircle },
}

export default function EmployeeProfileDetailPage() {
  const router = useRouter()
  const params = useParams()
  const profileId = params.id as string

  const [profile, setProfile] = useState<EmployeeProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showEditSheet, setShowEditSheet] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    if (profileId) {
      fetchProfile()
    }
  }, [profileId])

  const fetchProfile = async () => {
    try {
      setIsLoading(true)
      const res = await fetch(`/api/payroll/profiles/${profileId}`)
      if (!res.ok) throw new Error("Erreur lors du chargement")
      const data = await res.json()
      setProfile(data)
    } catch (error) {
      console.error("Error fetching profile:", error)
      toast.error("Erreur lors du chargement du profil")
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async () => {
    try {
      setIsDeleting(true)
      const response = await fetch(`/api/payroll/profiles/${profileId}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Erreur lors de la suppression")
      }

      toast.success("Profil employé supprimé avec succès")
      router.push("/dashboard/payroll/profiles")
    } catch (error: any) {
      console.error("Delete error:", error)
      toast.error(error.message || "Erreur lors de la suppression")
    } finally {
      setIsDeleting(false)
      setShowDeleteDialog(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "decimal",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount) + " FCFA"
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "-"
    return new Date(dateString).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    })
  }

  const getUserName = () => {
    if (!profile) return ""
    if (profile.user.firstName || profile.user.lastName) {
      return `${profile.user.firstName || ""} ${profile.user.lastName || ""}`.trim()
    }
    return profile.user.email.split("@")[0]
  }

  const getInitials = () => {
    if (!profile) return ""
    if (profile.user.firstName && profile.user.lastName) {
      return `${profile.user.firstName[0]}${profile.user.lastName[0]}`.toUpperCase()
    }
    return profile.user.email.substring(0, 2).toUpperCase()
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-gray-500">
        <User className="h-12 w-12 mb-3 text-gray-300" />
        <p>Profil non trouvé</p>
        <Button variant="link" onClick={() => router.back()}>
          Retour
        </Button>
      </div>
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
                onClick={() => router.back()}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex items-center gap-4">
                <Avatar className="h-14 w-14 border-2 border-indigo-200">
                  <AvatarImage src={profile.user.image || undefined} />
                  <AvatarFallback className="bg-indigo-100 text-indigo-600 text-lg font-semibold">
                    {getInitials()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                    {getUserName()}
                    <Badge className={profile.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"}>
                      {profile.isActive ? "Actif" : "Inactif"}
                    </Badge>
                  </h1>
                  <p className="text-sm text-gray-500">
                    {profile.position || "Poste non défini"} • {profile.user.matricule || profile.user.email}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => setShowEditSheet(true)}
              >
                <Edit className="h-4 w-4 mr-2" />
                Modifier
              </Button>
              <Button
                variant="outline"
                className="text-red-600 border-red-200 hover:bg-red-50"
                onClick={() => setShowDeleteDialog(true)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Supprimer
              </Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column - Main info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Salary info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Banknote className="h-5 w-5 text-indigo-600" />
                  Informations salariales
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  <div>
                    <p className="text-sm text-gray-500">Salaire de base</p>
                    <p className="text-xl font-bold text-gray-900">{formatCurrency(profile.baseSalary)}</p>
                    <p className="text-xs text-gray-400">{profile.salaryIsNet ? "Net" : "Brut"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Taux journalier</p>
                    <p className="text-xl font-bold text-gray-900">
                      {profile.dailyRate ? formatCurrency(profile.dailyRate) : "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Taux horaire</p>
                    <p className="text-xl font-bold text-gray-900">
                      {profile.hourlyRate ? formatCurrency(profile.hourlyRate) : "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Taux heures sup.</p>
                    <p className="text-xl font-bold text-gray-900">x{profile.overtimeRate}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Working schedule */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Clock className="h-5 w-5 text-indigo-600" />
                  Planning de travail
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-500 mb-2">Jours de travail</p>
                    <div className="flex flex-wrap gap-2">
                      {["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"].map((day) => (
                        <Badge
                          key={day}
                          variant={profile.workingDaysPattern?.includes(day) ? "default" : "outline"}
                          className={profile.workingDaysPattern?.includes(day) 
                            ? "bg-indigo-600" 
                            : "text-gray-400 border-gray-200"
                          }
                        >
                          {weekDayLabels[day]}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <Separator />
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Heures par jour</p>
                      <p className="text-lg font-semibold">{profile.workingHoursPerDay}h</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Jours par semaine</p>
                      <p className="text-lg font-semibold">{profile.workingDaysPattern?.length || 0} jours</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Contributions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Receipt className="h-5 w-5 text-indigo-600" />
                  Cotisations et taxes
                </CardTitle>
                <CardDescription>
                  {profile.contributions?.length || 0} cotisation(s) assignée(s)
                </CardDescription>
              </CardHeader>
              <CardContent>
                {profile.contributions && profile.contributions.length > 0 ? (
                  <div className="space-y-2">
                    {profile.contributions.map((ec) => (
                      <div
                        key={ec.id}
                        className="flex items-center justify-between p-3 rounded-lg border bg-gray-50"
                      >
                        <div>
                          <p className="font-medium">{ec.contribution.name}</p>
                          <p className="text-sm text-gray-500">{ec.contribution.code}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{ec.customRate || ec.contribution.rate}%</Badge>
                          {ec.contribution.isEmployeeShare && (
                            <Badge className="bg-blue-100 text-blue-700">Salarié</Badge>
                          )}
                          {ec.contribution.isEmployerShare && (
                            <Badge className="bg-purple-100 text-purple-700">Employeur</Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 text-gray-500">
                    <Receipt className="h-10 w-10 mx-auto mb-2 text-gray-300" />
                    <p>Aucune cotisation assignée</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Payroll history */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <FileText className="h-5 w-5 text-indigo-600" />
                    Historique des bulletins
                  </CardTitle>
                  <CardDescription>
                    {profile.payrolls?.length || 0} bulletin(s) de paie
                  </CardDescription>
                </div>
                <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700">
                  <Plus className="h-4 w-4 mr-2" />
                  Créer un bulletin
                </Button>
              </CardHeader>
              <CardContent>
                {profile.payrolls && profile.payrolls.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>N° Bulletin</TableHead>
                        <TableHead>Période</TableHead>
                        <TableHead>Statut</TableHead>
                        <TableHead className="text-right">Net à payer</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {profile.payrolls.map((payroll) => {
                        const status = payrollStatusLabels[payroll.status] || payrollStatusLabels.DRAFT
                        const StatusIcon = status.icon
                        return (
                          <TableRow 
                            key={payroll.id}
                            className="cursor-pointer hover:bg-gray-50"
                            onClick={() => router.push(`/dashboard/payroll/${payroll.id}`)}
                          >
                            <TableCell className="font-medium">{payroll.number}</TableCell>
                            <TableCell>{payroll.period?.name || "-"}</TableCell>
                            <TableCell>
                              <Badge className={status.color}>
                                <StatusIcon className="h-3 w-3 mr-1" />
                                {status.label}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right font-semibold">
                              {formatCurrency(payroll.netSalary)}
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <FileText className="h-10 w-10 mx-auto mb-2 text-gray-300" />
                    <p>Aucun bulletin de paie</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right column - Details */}
          <div className="space-y-6">
            {/* Contract info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Briefcase className="h-5 w-5 text-indigo-600" />
                  Contrat
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-gray-500">Type de contrat</p>
                  <p className="font-medium">{contractTypeLabels[profile.contractType] || profile.contractType}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Type d'employé</p>
                  <Badge className={profile.employeeType === "DECLARED" ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"}>
                    {employeeTypeLabels[profile.employeeType] || profile.employeeType}
                  </Badge>
                </div>
                <Separator />
                <div>
                  <p className="text-sm text-gray-500">Date d'embauche</p>
                  <p className="font-medium">{formatDate(profile.hireDate)}</p>
                </div>
                {profile.contractEndDate && (
                  <div>
                    <p className="text-sm text-gray-500">Date de fin de contrat</p>
                    <p className="font-medium">{formatDate(profile.contractEndDate)}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Bank info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <CreditCard className="h-5 w-5 text-indigo-600" />
                  Informations bancaires
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {profile.bankName || profile.bankAccountNumber ? (
                  <>
                    <div>
                      <p className="text-sm text-gray-500">Banque</p>
                      <p className="font-medium">{profile.bankName || "-"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Numéro de compte</p>
                      <p className="font-medium font-mono">{profile.bankAccountNumber || "-"}</p>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-4 text-gray-500">
                    <CreditCard className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                    <p className="text-sm">Aucune information bancaire</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Profile meta */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Calendar className="h-5 w-5 text-indigo-600" />
                  Informations
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-gray-500">Profil créé le</p>
                  <p className="font-medium">{formatDate(profile.createdAt)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Email</p>
                  <p className="font-medium text-sm">{profile.user.email}</p>
                </div>
                {profile.user.matricule && (
                  <div>
                    <p className="text-sm text-gray-500">Matricule</p>
                    <p className="font-medium">{profile.user.matricule}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Edit Sheet */}
        <EditEmployeeProfileSheet
          open={showEditSheet}
          onOpenChange={setShowEditSheet}
          profileId={profileId}
          onSuccess={fetchProfile}
        />

        {/* Delete Dialog */}
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                Supprimer le profil
              </AlertDialogTitle>
              <AlertDialogDescription>
                Êtes-vous sûr de vouloir supprimer le profil de <strong>{getUserName()}</strong> ?
                Cette action est irréversible.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>Annuler</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                disabled={isDeleting}
                className="bg-red-600 hover:bg-red-700"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Suppression...
                  </>
                ) : (
                  "Supprimer"
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </PermissionGuard>
  )
}
