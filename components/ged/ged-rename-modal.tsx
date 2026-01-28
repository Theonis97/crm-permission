"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, Pencil } from "lucide-react"
import { toast } from "sonner"

interface GedFile {
  id: string
  name: string
}

interface GedFolder {
  id: string
  name: string
}

interface GedRenameModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  file?: GedFile | null
  folder?: GedFolder | null
  onSuccess?: () => void
}

export function GedRenameModal({
  open,
  onOpenChange,
  file,
  folder,
  onSuccess,
}: GedRenameModalProps) {
  const [name, setName] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const item = file || folder
  const isFolder = !!folder

  useEffect(() => {
    if (item) {
      setName(item.name)
    }
  }, [item])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!name.trim() || !item) {
      toast.error("Le nom est requis")
      return
    }

    setIsLoading(true)

    try {
      const endpoint = isFolder
        ? `/api/ged/folders/${item.id}`
        : `/api/ged/files/${item.id}`

      const response = await fetch(endpoint, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      })

      if (response.ok) {
        toast.success("Renommé avec succès")
        onOpenChange(false)
        onSuccess?.()
      } else {
        const error = await response.json()
        toast.error(error.error || "Erreur lors du renommage")
      }
    } catch (error) {
      toast.error("Erreur lors du renommage")
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    if (!isLoading) {
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-5 w-5 text-teal-600" />
            Renommer {isFolder ? "le dossier" : "le fichier"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="item-name">Nouveau nom</Label>
            <Input
              id="item-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nouveau nom..."
              disabled={isLoading}
              autoFocus
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
            >
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={isLoading || !name.trim()}
              className="bg-teal-600 hover:bg-teal-700"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Renommage...
                </>
              ) : (
                "Renommer"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
