"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
  Search, 
  Loader2, 
  User, 
  Check,
  UserPlus,
  AlertCircle,
  Calendar,
} from "lucide-react"
import { toast } from "@/lib/app-toast"
import { cn } from "@/lib/utils"

interface UserItem {
  id: string
  firstName: string | null
  lastName: string | null
  email: string
  matricule: string | null
  image: string | null
  hasPayrollProfile: boolean
}

interface Contribution {
  id: string
  name: string
  code: string
  rate: number
  isEmployeeShare: boolean
  isEmployerShare: boolean
}

interface AddEmployeeProfileModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
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

export function AddEmployeeProfileModal({ open, onOpenChange, onSuccess }: AddEmployeeProfileModalProps) {
  const [step, setStep] = useState<"select" | "configure">("select")
  const [users, setUsers] = useState<UserItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedUser, setSelectedUser] = useState<UserItem | null>(null)
  
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
  })

  // Fetch users when modal opens
  useEffect(() => {
    if (open) {
      fetchUsers()
      setStep("select")
      setSelectedUser(null)
      setSearchQuery("")
      setFormData({
        baseSalary: "",
        contractType: "CDI",
        paymentMethod: "BANK_TRANSFER",
        position: "",
        hireDate: "",
        contractEndDate: "",
        isActive: "true",
        bankName: "",
        bankAccountNumber: "",
        workingDaysPattern: ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"],
        workingHoursPerDay: "8",
      })
      setSelectedContributions([])
      fetchContributions()
    }
  }, [open])

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

  const fetchUsers = async () => {
    try {
      setIsLoading(true)
      // Fetch all users
      const usersRes = await fetch("/api/users?limit=500")
      const usersData = await usersRes.json()
      
      // Fetch existing payroll profiles
      const profilesRes = await fetch("/api/payroll/profiles")
      const profilesData = await profilesRes.json()
      
      const profileUserIds = new Set(profilesData.map((p: any) => p.userId))
      
      const usersWithStatus = (usersData.users || usersData || []).map((user: any) => ({
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        matricule: user.matricule,
        image: user.image,
        hasPayrollProfile: profileUserIds.has(user.id),
      }))
      
      setUsers(usersWithStatus)
    } catch (error) {
      console.error("Error fetching users:", error)
      toast.error("Erreur lors du chargement des utilisateurs")
    } finally {
      setIsLoading(false)
    }
  }

  const filteredUsers = users.filter(user => {
    const searchLower = searchQuery.toLowerCase()
    const fullName = `${user.firstName || ""} ${user.lastName || ""}`.toLowerCase()
    return (
      fullName.includes(searchLower) ||
      user.email.toLowerCase().includes(searchLower) ||
      (user.matricule?.toLowerCase().includes(searchLower) ?? false)
    )
  })

  const availableUsers = filteredUsers.filter(u => !u.hasPayrollProfile)
  const configuredUsers = filteredUsers.filter(u => u.hasPayrollProfile)

  const handleSelectUser = (user: UserItem) => {
    if (user.hasPayrollProfile) {
      toast.info("Cet utilisateur a déjà un profil de paie")
      return
    }
    setSelectedUser(user)
    setStep("configure")
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!selectedUser) {
      toast.error("Veuillez sélectionner un utilisateur")
      return
    }
    
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
      userId: selectedUser.id,
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
    }

    console.log("Submitting payload:", payload)

    try {
      setIsSubmitting(true)
      const response = await fetch("/api/payroll/profiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      console.log("Response status:", response.status)
      const data = await response.json()
      console.log("Response data:", data)

      if (!response.ok) {
        throw new Error(data.error || "Erreur lors de la création")
      }

      toast.success("Profil employé créé avec succès")
      onOpenChange(false)
      onSuccess?.()
    } catch (error: any) {
      console.error("Submit error:", error)
      toast.error(error.message || "Erreur lors de la création")
    } finally {
      setIsSubmitting(false)
    }
  }

  const getUserName = (user: UserItem) => {
    if (user.firstName || user.lastName) {
      return `${user.firstName || ""} ${user.lastName || ""}`.trim()
    }
    return user.email.split("@")[0]
  }

  const getInitials = (user: UserItem) => {
    if (user.firstName && user.lastName) {
      return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
    }
    return user.email.substring(0, 2).toUpperCase()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-indigo-600" />
            {step === "select" ? "Ajouter un profil employé" : "Configurer le profil"}
          </DialogTitle>
          <DialogDescription>
            {step === "select" 
              ? "Sélectionnez un utilisateur pour créer son profil de paie"
              : `Configuration du profil pour ${getUserName(selectedUser!)}`
            }
          </DialogDescription>
        </DialogHeader>

        {step === "select" ? (
          <div className="flex-1 flex flex-col min-h-0">
            {/* Search */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Rechercher par nom, email ou matricule..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {isLoading ? (
              <div className="flex-1 flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
              </div>
            ) : (
              <ScrollArea className="flex-1 -mx-6 px-6" style={{ maxHeight: "400px" }}>
                {availableUsers.length === 0 && configuredUsers.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <User className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                    <p>Aucun utilisateur trouvé</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {availableUsers.length > 0 && (
                      <>
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                          Utilisateurs disponibles ({availableUsers.length})
                        </p>
                        {availableUsers.map((user) => (
                          <button
                            key={user.id}
                            type="button"
                            onClick={() => handleSelectUser(user)}
                            className="w-full flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 transition-colors text-left"
                          >
                            <Avatar className="h-10 w-10 border">
                              <AvatarImage src={user.image || undefined} />
                              <AvatarFallback className="bg-indigo-100 text-indigo-600 font-medium">
                                {getInitials(user)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-gray-900 truncate">
                                {getUserName(user)}
                              </p>
                              <p className="text-sm text-gray-500 truncate">
                                {user.email}
                              </p>
                            </div>
                            {user.matricule && (
                              <Badge variant="outline" className="shrink-0">
                                {user.matricule}
                              </Badge>
                            )}
                          </button>
                        ))}
                      </>
                    )}

                    {configuredUsers.length > 0 && (
                      <>
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2 mt-4">
                          Déjà configurés ({configuredUsers.length})
                        </p>
                        {configuredUsers.map((user) => (
                          <div
                            key={user.id}
                            className="w-full flex items-center gap-3 p-3 rounded-lg border border-gray-100 bg-gray-50 opacity-60"
                          >
                            <Avatar className="h-10 w-10 border">
                              <AvatarImage src={user.image || undefined} />
                              <AvatarFallback className="bg-gray-200 text-gray-600 font-medium">
                                {getInitials(user)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-gray-700 truncate">
                                {getUserName(user)}
                              </p>
                              <p className="text-sm text-gray-500 truncate">
                                {user.email}
                              </p>
                            </div>
                            <Badge className="bg-green-100 text-green-700 shrink-0">
                              <Check className="h-3 w-3 mr-1" />
                              Configuré
                            </Badge>
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                )}
              </ScrollArea>
            )}

            <DialogFooter className="pt-4 border-t mt-4">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Annuler
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 py-2">
            {/* Selected user info */}
            <div className="flex items-center gap-3 p-3 rounded-lg bg-indigo-50 border border-indigo-100">
              <Avatar className="h-10 w-10 border border-indigo-200">
                <AvatarImage src={selectedUser?.image || undefined} />
                <AvatarFallback className="bg-indigo-100 text-indigo-600 font-medium">
                  {selectedUser && getInitials(selectedUser)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="font-medium text-gray-900">
                  {selectedUser && getUserName(selectedUser)}
                </p>
                <p className="text-sm text-gray-500">{selectedUser?.email}</p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setStep("select")}
              >
                Changer
              </Button>
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

            {/* Poste */}
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

            {/* Heures par jour */}
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

            {/* Type de contrat et Statut */}
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
                  <SelectContent className="z-[200]">
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
                  <SelectContent className="z-[200]">
                    {employeeStatuses.map((status) => (
                      <SelectItem key={status.value} value={status.value}>
                        {status.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Dates de contrat */}
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

            {/* Mode de paiement */}
            <div className="space-y-2">
              <Label htmlFor="paymentMethod">Mode de paiement</Label>
              <Select
                value={formData.paymentMethod}
                onValueChange={(value) => setFormData(prev => ({ ...prev, paymentMethod: value }))}
              >
                <SelectTrigger id="paymentMethod">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="z-[200]">
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
                <div className="border rounded-lg p-3 space-y-2 max-h-[150px] overflow-y-auto">
                  {contributions.map((contribution) => (
                    <div
                      key={contribution.id}
                      className="flex items-center justify-between p-2 rounded hover:bg-gray-50"
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

            <DialogFooter className="pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep("select")}
                disabled={isSubmitting}
              >
                Retour
              </Button>
              <Button
                type="submit"
                className="bg-indigo-600 hover:bg-indigo-700"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Création...
                  </>
                ) : (
                  "Créer le profil"
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
