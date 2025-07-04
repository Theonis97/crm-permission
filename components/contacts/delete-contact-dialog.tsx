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
import { AlertTriangle } from "lucide-react"
import type { Contact } from "@/types/contacts"
import { toast } from "sonner"

interface DeleteContactDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  contact: Contact | null
  onContactDeleted: () => void
}

export function DeleteContactDialog({ open, onOpenChange, contact, onContactDeleted }: DeleteContactDialogProps) {
  const [loading, setLoading] = useState(false)

  if (!contact) return null

  const getContactName = () => {
    if (contact.type === "ENTREPRISE") {
      return contact.firstName || "Entreprise"
    }
    return `${contact.firstName || ""} ${contact.lastName || ""}`.trim() || "Contact"
  }

  const handleDelete = async () => {
    setLoading(true)

    try {
      const response = await fetch(`/api/contacts/${contact.id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("Erreur lors de la suppression")
      }

      onContactDeleted()
      onOpenChange(false)
    } catch (error) {
      console.error("Erreur:", error)
      toast.error("Erreur lors de la suppression du contact")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <DialogTitle>Supprimer le contact</DialogTitle>
              <DialogDescription>Cette action est irréversible.</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="py-4">
          <p className="text-sm text-muted-foreground">
            Êtes-vous sûr de vouloir supprimer le contact{" "}
            <span className="font-medium text-foreground">{getContactName()}</span> ? Cette action ne peut pas être
            annulée.
          </p>
        </div>

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
