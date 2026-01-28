"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
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
import { Calendar, Loader2 } from "lucide-react"
import { toast } from "sonner"

interface CreatePeriodModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

const monthNames = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
]

export function CreatePeriodModal({ open, onOpenChange, onSuccess }: CreatePeriodModalProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    startDate: "",
    endDate: "",
    workingDays: 22,
  })

  // Auto-fill dates when modal opens
  useEffect(() => {
    if (open) {
      const now = new Date()
      const year = now.getFullYear()
      const month = now.getMonth()
      
      // First day of current month
      const startDate = new Date(year, month, 1)
      // Last day of current month
      const endDate = new Date(year, month + 1, 0)
      
      setFormData({
        name: `${monthNames[month]} ${year}`,
        startDate: startDate.toISOString().split("T")[0],
        endDate: endDate.toISOString().split("T")[0],
        workingDays: 22,
      })
    }
  }, [open])

  // Calculate working days when dates change
  useEffect(() => {
    if (formData.startDate && formData.endDate) {
      const start = new Date(formData.startDate)
      const end = new Date(formData.endDate)
      let workingDays = 0
      
      const current = new Date(start)
      while (current <= end) {
        const dayOfWeek = current.getDay()
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
          workingDays++
        }
        current.setDate(current.getDate() + 1)
      }
      
      setFormData(prev => ({ ...prev, workingDays }))
    }
  }, [formData.startDate, formData.endDate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name || !formData.startDate || !formData.endDate) {
      toast.error("Veuillez remplir tous les champs obligatoires")
      return
    }

    try {
      setIsSubmitting(true)
      const response = await fetch("/api/payroll/periods", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Erreur lors de la création")
      }

      const period = await response.json()
      toast.success("Période créée avec succès")
      onOpenChange(false)
      onSuccess?.()
      router.push(`/dashboard/payroll/periods/${period.id}`)
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de la création")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDateChange = (field: "startDate" | "endDate", value: string) => {
    setFormData(prev => {
      const newData = { ...prev, [field]: value }
      
      // Auto-update name based on start date
      if (field === "startDate" && value) {
        const date = new Date(value)
        newData.name = `${monthNames[date.getMonth()]} ${date.getFullYear()}`
      }
      
      return newData
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-indigo-600" />
            Nouvelle période de paie
          </DialogTitle>
          <DialogDescription>
            Créez une nouvelle période pour générer les bulletins de paie
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nom de la période *</Label>
            <Input
              id="name"
              placeholder="Ex: Janvier 2026"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Date de début *</Label>
              <Input
                id="startDate"
                type="date"
                value={formData.startDate}
                onChange={(e) => handleDateChange("startDate", e.target.value)}
                className="w-full"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">Date de fin *</Label>
              <Input
                id="endDate"
                type="date"
                value={formData.endDate}
                onChange={(e) => handleDateChange("endDate", e.target.value)}
                className="w-full"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="workingDays">Jours ouvrés</Label>
            <Input
              id="workingDays"
              type="number"
              min={1}
              max={31}
              value={formData.workingDays}
              onChange={(e) => setFormData(prev => ({ ...prev, workingDays: parseInt(e.target.value) || 22 }))}
              className="w-full"
            />
            <p className="text-xs text-gray-500">
              Calculé automatiquement (hors week-ends)
            </p>
          </div>

          <DialogFooter className="pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Annuler
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
                "Créer la période"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
