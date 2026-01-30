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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Checkbox } from "@/components/ui/checkbox"
import { 
  Loader2, 
  Edit,
  Trash2,
  AlertTriangle,
} from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
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

interface Contribution {
  id: string
  name: string
  code: string
  rate: number
  isEmployeeShare: boolean
  isEmployerShare: boolean
}

interface EmployeeContribution {
  id: string
  contributionId: string
  customRate: number | null
  isActive: boolean
  contribution: Contribution
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
  user: {
    id: string
    email: string
    firstName: string | null
    lastName: string | null
    name: string | null
    matricule: string | null
    image: string | null
  }
  contributions: EmployeeContribution[]
}

interface EditEmployeeProfileSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  profileId: string
  onSuccess?: () => void
}

const weekDays = [
  { value: "MONDAY", label: "Lundi", short: "Lun" },
  { value: "TUESDAY", label: "Mardi", short: "Mar" },
  { value: "WEDNESDAY", label: "Mercredi", short: "Mer" },
  { value: "THURSDAY", label: "Jeudi", short: "Jeu" },
  { value: "FRIDAY", label: "Vendredi", short: "Ven" },
  { value: "SATURDAY", label: "Samedi", short: "Sam" },
  { value: "SUNDAY", label: "Dimanche", short: "Dim" },
]

const contractTypes = [
  { value: "CDI", label: "CDI - Contrat à durée indéterminée" },
  { value: "CDD", label: "CDD - Contrat à durée déterminée" },
  { value: "STAGE", label: "Stage" },
  { value: "INTERIM", label: "Intérim" },
  { value: "FREELANCE", label: "Freelance / Prestataire" },
]

const paymentMethods = [
  { value: "BANK_TRANSFER", label: "Virement bancaire" },
  { value: "CASH", label: "Espèces" },
  { value: "CHECK", label: "Chèque" },
  { value: "MOBILE_MONEY", label: "Mobile Money" },
]

const employeeStatuses = [
  { value: "true", label: "Actif" },
  { value: "false", label: "Inactif" },
]

export function EditEmployeeProfileSheet({ 
  open, 
  onOpenChange, 
  profileId,
  onSuccess 
}: EditEmployeeProfileSheetProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [profile, setProfile] = useState<EmployeeProfile | null>(null)
  
  const [contributions, setContributions] = useState<Contribution[]>([])
  const [selectedContributions, setSelectedContributions] = useState<string[]>([])
  
  const [formData, setFormData] = useState({
    baseSalary: "",
    contractType: "CDI",
    paymentMethod: "BANK_TRANSFER",
    position: "",
    hireDate: "",
    contractEndDate: "",
    isActive: "true",
    bankName: "",
    bankAccountNumber: "",
    workingDaysPattern: ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"] as string[],
    workingHoursPerDay: "8",
    matricule: "",
  })

  useEffect(() => {
    if (open && profileId) {
      fetchProfile()
      fetchContributions()
    }
  }, [open, profileId])

  const fetchProfile = async () => {
    try {
      setIsLoading(true)
      const res = await fetch(`/api/payroll/profiles/${profileId}`)
      if (!res.ok) throw new Error("Erreur lors du chargement")
      const data = await res.json()
      setProfile(data)
      
      // Populate form data
      setFormData({
        baseSalary: data.baseSalary?.toString() || "",
        contractType: data.contractType || "CDI",
        paymentMethod: data.bankName ? "BANK_TRANSFER" : "CASH",
        position: data.position || "",
        hireDate: data.hireDate ? data.hireDate.split("T")[0] : "",
        contractEndDate: data.contractEndDate ? data.contractEndDate.split("T")[0] : "",
        isActive: data.isActive ? "true" : "false",
        bankName: data.bankName || "",
        bankAccountNumber: data.bankAccountNumber || "",
        workingDaysPattern: data.workingDaysPattern || ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"],
        workingHoursPerDay: data.workingHoursPerDay?.toString() || "8",
        matricule: data.user?.matricule || "",
      })
      
      // Set selected contributions
      if (data.contributions) {
        setSelectedContributions(data.contributions.map((c: EmployeeContribution) => c.contributionId))
      }
    } catch (error) {
      console.error("Error fetching profile:", error)
      toast.error("Erreur lors du chargement du profil")
    } finally {
      setIsLoading(false)
    }
  }

  const fetchContributions = async () => {
    try {
      const res = await fetch("/api/payroll/contributions?isActive=true")
      if (res.ok) {
        const data = await res.json()
        setContributions(data)
      }
    } catch (error) {
      console.error("Error fetching contributions:", error)
    }
  }

  const toggleWorkingDay = (day: string) => {
    setFormData(prev => {
      const days = prev.workingDaysPattern.includes(day)
        ? prev.workingDaysPattern.filter(d => d !== day)
        : [...prev.workingDaysPattern, day]
      return { ...prev, workingDaysPattern: days }
    })
  }

  const toggleContribution = (contributionId: string) => {
    setSelectedContributions(prev => 
      prev.includes(contributionId)
        ? prev.filter(id => id !== contributionId)
        : [...prev, contributionId]
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.baseSalary || parseFloat(formData.baseSalary) <= 0) {
      toast.error("Veuillez entrer un salaire de base valide")
      return
    }

    if (!formData.position) {
      toast.error("Veuillez entrer un poste")
      return
    }

    if (formData.workingDaysPattern.length === 0) {
      toast.error("Veuillez sélectionner au moins un jour de travail")
      return
    }

    const payload = {
      baseSalary: parseFloat(formData.baseSalary),
      contractType: formData.contractType,
      position: formData.position,
      hireDate: formData.hireDate || null,
      contractEndDate: formData.contractEndDate || null,
      isActive: formData.isActive === "true",
      bankName: formData.bankName || null,
      bankAccountNumber: formData.bankAccountNumber || null,
      workingDaysPattern: formData.workingDaysPattern,
      workingHoursPerDay: parseFloat(formData.workingHoursPerDay) || 8,
      contributionIds: selectedContributions,
      matricule: formData.matricule || null,
    }

    try {
      setIsSubmitting(true)
      const response = await fetch(`/api/payroll/profiles/${profileId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Erreur lors de la mise à jour")
      }

      toast.success("Profil employé mis à jour avec succès")
      onOpenChange(false)
      onSuccess?.()
    } catch (error: any) {
      console.error("Submit error:", error)
      toast.error(error.message || "Erreur lors de la mise à jour")
    } finally {
      setIsSubmitting(false)
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
      setShowDeleteDialog(false)
      onOpenChange(false)
      onSuccess?.()
    } catch (error: any) {
      console.error("Delete error:", error)
      toast.error(error.message || "Erreur lors de la suppression")
    } finally {
      setIsDeleting(false)
    }
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

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full sm:max-w-lg !p-0 flex flex-col h-full overflow-hidden">
          <SheetHeader className="px-6 py-4 border-b shrink-0">
            <SheetTitle className="flex items-center gap-2">
              <Edit className="h-5 w-5 text-indigo-600" />
              Modifier le profil
            </SheetTitle>
            <SheetDescription>
              {profile ? `Modification du profil de ${getUserName()}` : "Chargement..."}
            </SheetDescription>
          </SheetHeader>

          {isLoading ? (
            <div className="flex-1 flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
            </div>
          ) : profile ? (
            <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
              <div className="flex-1 overflow-y-auto px-6">
                <div className="space-y-4 py-4">
                  {/* User info */}
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-indigo-50 border border-indigo-100">
                    <Avatar className="h-10 w-10 border border-indigo-200">
                      <AvatarImage src={profile.user.image || undefined} />
                      <AvatarFallback className="bg-indigo-100 text-indigo-600 font-medium">
                        {getInitials()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{getUserName()}</p>
                      <p className="text-sm text-gray-500">{profile.user.email}</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="matricule">Matricule (optionnel mais recommandé pour les cotisants)</Label>
                    <Input
                      id="matricule"
                      placeholder="Ex: EMP-001, MAT-2024-001..."
                      value={formData.matricule}
                      onChange={(e) => setFormData(prev => ({ ...prev, matricule: e.target.value }))}
                    />
                    <p className="text-xs text-gray-500">
                      Le matricule apparaîtra sur les bulletins de paie
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="baseSalary">Salaire de base mensuel (FCFA) *</Label>
                    <Input
                      id="baseSalary"
                      type="number"
                      min={0}
                      step={1000}
                      placeholder="Ex: 250000"
                      value={formData.baseSalary}
                      onChange={(e) => setFormData(prev => ({ ...prev, baseSalary: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="position">Poste *</Label>
                    <Input
                      id="position"
                      placeholder="Ex: Développeur, Comptable, Commercial..."
                      value={formData.position}
                      onChange={(e) => setFormData(prev => ({ ...prev, position: e.target.value }))}
                    />
                  </div>

                  {/* Jours de travail */}
                  <div className="space-y-2">
                    <Label>Jours de travail *</Label>
                    <div className="flex flex-wrap gap-2">
                      {weekDays.map((day) => (
                        <button
                          key={day.value}
                          type="button"
                          onClick={() => toggleWorkingDay(day.value)}
                          className={cn(
                            "px-3 py-1.5 rounded-full text-sm font-medium transition-colors border",
                            formData.workingDaysPattern.includes(day.value)
                              ? "bg-indigo-600 text-white border-indigo-600"
                              : "bg-white text-gray-600 border-gray-300 hover:border-indigo-300"
                          )}
                        >
                          {day.short}
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-gray-500">
                      {formData.workingDaysPattern.length} jour(s) sélectionné(s)
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="workingHoursPerDay">Heures de travail par jour</Label>
                    <Input
                      id="workingHoursPerDay"
                      type="number"
                      min={1}
                      max={24}
                      step={0.5}
                      value={formData.workingHoursPerDay}
                      onChange={(e) => setFormData(prev => ({ ...prev, workingHoursPerDay: e.target.value }))}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="contractType">Type de contrat</Label>
                      <Select
                        value={formData.contractType}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, contractType: value }))}
                      >
                        <SelectTrigger id="contractType">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="z-[2100]">
                          {contractTypes.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="isActive">Statut</Label>
                      <Select
                        value={formData.isActive}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, isActive: value }))}
                      >
                        <SelectTrigger id="isActive">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="z-[2100]">
                          {employeeStatuses.map((status) => (
                            <SelectItem key={status.value} value={status.value}>
                              {status.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="hireDate">Date d'embauche</Label>
                      <Input
                        id="hireDate"
                        type="date"
                        value={formData.hireDate}
                        onChange={(e) => setFormData(prev => ({ ...prev, hireDate: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="contractEndDate">Date de fin de contrat</Label>
                      <Input
                        id="contractEndDate"
                        type="date"
                        value={formData.contractEndDate}
                        onChange={(e) => setFormData(prev => ({ ...prev, contractEndDate: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="paymentMethod">Mode de paiement</Label>
                    <Select
                      value={formData.paymentMethod}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, paymentMethod: value }))}
                    >
                      <SelectTrigger id="paymentMethod">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="z-[2100]">
                        {paymentMethods.map((method) => (
                          <SelectItem key={method.value} value={method.value}>
                            {method.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {formData.paymentMethod === "BANK_TRANSFER" && (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="bankName">Nom de la banque</Label>
                        <Input
                          id="bankName"
                          placeholder="Ex: BGFI Bank"
                          value={formData.bankName}
                          onChange={(e) => setFormData(prev => ({ ...prev, bankName: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="bankAccountNumber">Numéro de compte</Label>
                        <Input
                          id="bankAccountNumber"
                          placeholder="Ex: GA123456789"
                          value={formData.bankAccountNumber}
                          onChange={(e) => setFormData(prev => ({ ...prev, bankAccountNumber: e.target.value }))}
                        />
                      </div>
                    </div>
                  )}

                  {/* Cotisations et taxes */}
                  {contributions.length > 0 && (
                    <div className="space-y-2">
                      <Label>Cotisations et taxes</Label>
                      <div className="border rounded-lg divide-y">
                        {contributions.map((contribution) => (
                          <div
                            key={contribution.id}
                            className="flex items-center justify-between p-3 hover:bg-gray-50"
                          >
                            <div className="flex items-center gap-3">
                              <Checkbox
                                id={`contribution-${contribution.id}`}
                                checked={selectedContributions.includes(contribution.id)}
                                onCheckedChange={() => toggleContribution(contribution.id)}
                              />
                              <label
                                htmlFor={`contribution-${contribution.id}`}
                                className="text-sm font-medium cursor-pointer"
                              >
                                {contribution.name}
                              </label>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">
                                {contribution.rate}%
                              </Badge>
                              {contribution.isEmployeeShare && (
                                <Badge className="bg-blue-100 text-blue-700 text-xs">Salarié</Badge>
                              )}
                              {contribution.isEmployerShare && (
                                <Badge className="bg-purple-100 text-purple-700 text-xs">Employeur</Badge>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                      <p className="text-xs text-gray-500">
                        {selectedContributions.length} cotisation(s) sélectionnée(s)
                      </p>
                    </div>
                  )}

                  {/* Delete button */}
                  <div className="pt-4 border-t">
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300"
                      onClick={() => setShowDeleteDialog(true)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Supprimer ce profil
                    </Button>
                  </div>
                </div>
              </div>

              {/* Fixed footer with action buttons */}
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
                      Enregistrement...
                    </>
                  ) : (
                    "Enregistrer"
                  )}
                </Button>
              </div>
            </form>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500">
              Profil non trouvé
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Delete confirmation dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              Supprimer le profil
            </AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer le profil de <strong>{getUserName()}</strong> ?
              Cette action est irréversible et supprimera également toutes les données associées.
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
    </>
  )
}
