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
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Loader2,
  Search,
  Users,
  FileText,
  CheckCircle,
  AlertCircle,
} from "lucide-react"
import { toast } from "sonner"

interface EmployeeProfile {
  id: string
  baseSalary: number
  contractType: string
  isActive: boolean
  user: {
    id: string
    firstName: string | null
    lastName: string | null
    email: string
    matricule: string | null
  }
}

interface AddPayrollsSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  periodId: string
  existingEmployeeProfileIds: string[]
  onSuccess?: () => void
}

export function AddPayrollsSheet({
  open,
  onOpenChange,
  periodId,
  existingEmployeeProfileIds,
  onSuccess,
}: AddPayrollsSheetProps) {
  const [profiles, setProfiles] = useState<EmployeeProfile[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedProfiles, setSelectedProfiles] = useState<Set<string>>(new Set())
  const [generationProgress, setGenerationProgress] = useState<{
    current: number
    total: number
    errors: string[]
  } | null>(null)

  useEffect(() => {
    if (open) {
      fetchProfiles()
      setSelectedProfiles(new Set())
      setGenerationProgress(null)
    }
  }, [open])

  const fetchProfiles = async () => {
    try {
      setIsLoading(true)
      const res = await fetch("/api/payroll/profiles")
      if (!res.ok) throw new Error("Erreur lors du chargement")
      const data = await res.json()
      // Filtrer les profils actifs qui n'ont pas encore de bulletin
      const availableProfiles = data.filter(
        (p: EmployeeProfile) => p.isActive && !existingEmployeeProfileIds.includes(p.id)
      )
      setProfiles(availableProfiles)
    } catch (error) {
      console.error("Error fetching profiles:", error)
      toast.error("Erreur lors du chargement des profils")
    } finally {
      setIsLoading(false)
    }
  }

  const filteredProfiles = profiles.filter((profile) => {
    const searchLower = searchQuery.toLowerCase()
    const fullName = `${profile.user.firstName || ""} ${profile.user.lastName || ""}`.toLowerCase()
    const email = profile.user.email.toLowerCase()
    const matricule = (profile.user.matricule || "").toLowerCase()
    return (
      fullName.includes(searchLower) ||
      email.includes(searchLower) ||
      matricule.includes(searchLower)
    )
  })

  const toggleProfile = (profileId: string) => {
    setSelectedProfiles((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(profileId)) {
        newSet.delete(profileId)
      } else {
        newSet.add(profileId)
      }
      return newSet
    })
  }

  const toggleSelectAll = () => {
    if (selectedProfiles.size === filteredProfiles.length) {
      setSelectedProfiles(new Set())
    } else {
      setSelectedProfiles(new Set(filteredProfiles.map((p) => p.id)))
    }
  }

  const handleGenerate = async () => {
    if (selectedProfiles.size === 0) {
      toast.error("Veuillez sélectionner au moins un employé")
      return
    }

    try {
      setIsGenerating(true)
      setGenerationProgress({
        current: 0,
        total: selectedProfiles.size,
        errors: [],
      })

      const profileIds = Array.from(selectedProfiles)
      
      // Générer les bulletins par lots de 5 pour éviter les timeouts
      const batchSize = 5
      let successCount = 0
      const errors: string[] = []

      for (let i = 0; i < profileIds.length; i += batchSize) {
        const batch = profileIds.slice(i, i + batchSize)
        
        const res = await fetch(`/api/payroll/periods/${periodId}/generate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ employeeProfileIds: batch }),
        })

        if (res.ok) {
          const data = await res.json()
          console.log(`📊 Lot ${Math.floor(i / batchSize) + 1} réussi:`, data)
          successCount += data.created || batch.length
        } else {
          const data = await res.json()
          console.log(`❌ Lot ${Math.floor(i / batchSize) + 1} échoué:`, data)
          errors.push(data.error || `Erreur pour le lot ${Math.floor(i / batchSize) + 1}`)
        }

        setGenerationProgress({
          current: Math.min(i + batchSize, profileIds.length),
          total: profileIds.length,
          errors,
        })
      }

      console.log(`📈 Total final: ${successCount} bulletins créés, ${errors.length} erreurs`)
      
      if (successCount > 0) {
        console.log(`✅ ${successCount} bulletins générés, appel de onSuccess`)
        toast.success(`${successCount} bulletin(s) généré(s) avec succès`)
        
        // Attendre un court instant pour s'assurer que la base de données est mise à jour
        console.log("⏳ Attente de 500ms avant de fermer...")
        setTimeout(() => {
          onSuccess?.()
          console.log(`🔄 onSuccess appelé, fermeture du sheet`)
          onOpenChange(false)
        }, 500)
      } else if (errors.length > 0) {
        toast.error(errors[0])
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Erreur lors de la génération"
      toast.error(errorMessage)
    } finally {
      setIsGenerating(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("fr-FR").format(amount) + " FCFA"
  }

  const getEmployeeName = (profile: EmployeeProfile) => {
    const { firstName, lastName, email } = profile.user
    if (firstName || lastName) {
      return `${firstName || ""} ${lastName || ""}`.trim()
    }
    return email.split("@")[0]
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg flex flex-col h-full">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-indigo-600" />
            Ajouter des bulletins
          </SheetTitle>
          <SheetDescription>
            Sélectionnez les employés pour lesquels vous souhaitez générer un bulletin de paie.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 flex flex-col gap-4 py-4 overflow-hidden">
          {/* Barre de recherche */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Rechercher un employé..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Sélection rapide */}
          {filteredProfiles.length > 0 && (
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={selectedProfiles.size === filteredProfiles.length && filteredProfiles.length > 0}
                  onCheckedChange={toggleSelectAll}
                />
                <span className="text-sm text-gray-600">
                  Tout sélectionner ({filteredProfiles.length})
                </span>
              </div>
              {selectedProfiles.size > 0 && (
                <Badge variant="secondary">
                  {selectedProfiles.size} sélectionné(s)
                </Badge>
              )}
            </div>
          )}

          {/* Liste des employés */}
          <ScrollArea className="flex-1">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredProfiles.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">
                  {profiles.length === 0
                    ? "Tous les employés ont déjà un bulletin pour cette période"
                    : "Aucun employé trouvé"}
                </p>
              </div>
            ) : (
              <div className="space-y-2 pr-4">
                {filteredProfiles.map((profile) => (
                  <div
                    key={profile.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                      selectedProfiles.has(profile.id)
                        ? "border-indigo-500 bg-indigo-50"
                        : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                    }`}
                    onClick={() => toggleProfile(profile.id)}
                  >
                    <Checkbox
                      checked={selectedProfiles.has(profile.id)}
                      onCheckedChange={() => toggleProfile(profile.id)}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900 truncate">
                          {getEmployeeName(profile)}
                        </span>
                        {profile.user.matricule && (
                          <Badge variant="outline" className="text-xs">
                            {profile.user.matricule}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <span>{profile.contractType}</span>
                        <span>•</span>
                        <span>{formatCurrency(profile.baseSalary)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          {/* Progression de génération */}
          {generationProgress && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                <span className="text-sm font-medium text-blue-800">
                  Génération en cours...
                </span>
              </div>
              <div className="w-full bg-blue-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all"
                  style={{
                    width: `${(generationProgress.current / generationProgress.total) * 100}%`,
                  }}
                />
              </div>
              <p className="text-xs text-blue-600 mt-1">
                {generationProgress.current} / {generationProgress.total} bulletins
              </p>
              {generationProgress.errors.length > 0 && (
                <div className="mt-2 text-xs text-red-600">
                  <AlertCircle className="h-3 w-3 inline mr-1" />
                  {generationProgress.errors.length} erreur(s)
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t pt-4 flex gap-3">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isGenerating}
            className="flex-1"
          >
            Annuler
          </Button>
          <Button
            onClick={handleGenerate}
            disabled={selectedProfiles.size === 0 || isGenerating}
            className="flex-1"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Génération...
              </>
            ) : (
              <>
                <FileText className="h-4 w-4 mr-2" />
                Générer {selectedProfiles.size > 0 ? `(${selectedProfiles.size})` : ""}
              </>
            )}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
