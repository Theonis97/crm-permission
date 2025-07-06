"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type { Opportunity } from "@/types/opportunities"
import { AlertTriangle } from "lucide-react"

interface DeleteOpportunityDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  opportunity: Opportunity
  onSuccess: () => void
}

export function DeleteOpportunityDialog({ open, onOpenChange, opportunity, onSuccess }: DeleteOpportunityDialogProps) {
  const [loading, setLoading] = useState(false)

  const handleDelete = async () => {
    setLoading(true)

    try {
      const response = await fetch(`/api/opportunities/${opportunity.id}`, {
        method: "DELETE",
      })

      if (response.ok) {
        onSuccess()
        onOpenChange(false)
      }
    } catch (error) {
      console.error("Erreur lors de la suppression:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            Supprimer l'opportunité
          </DialogTitle>
          <DialogDescription>
            Êtes-vous sûr de vouloir supprimer l'opportunité "{opportunity.title}" ? Cette action est irréversible et
            supprimera également toutes les données associées.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Annuler
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={loading}>
            {loading ? "Suppression..." : "Supprimer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
