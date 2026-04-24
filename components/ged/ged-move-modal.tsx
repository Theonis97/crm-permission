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
import { Loader2, Folder, FolderInput, Copy, ChevronRight, Home } from "lucide-react"
import { toast } from "@/lib/app-toast"
import { cn } from "@/lib/utils"

interface GedFile {
  id: string
  name: string
  folderId?: string
}

interface GedFolder {
  id: string
  name: string
  parentId?: string | null
  _count?: {
    children: number
    files: number
  }
}

interface GedMoveModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  file: GedFile | null
  mode: "move" | "copy"
  onSuccess?: () => void
}

export function GedMoveModal({
  open,
  onOpenChange,
  file,
  mode,
  onSuccess,
}: GedMoveModalProps) {
  const [folders, setFolders] = useState<GedFolder[]>([])
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null)
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null)
  const [breadcrumb, setBreadcrumb] = useState<{ id: string; name: string }[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      fetchFolders(null)
    }
  }, [open])

  const fetchFolders = async (parentId: string | null) => {
    setIsLoading(true)
    try {
      const url = parentId
        ? `/api/ged/folders/${parentId}`
        : "/api/ged/folders"
      const response = await fetch(url)
      
      if (response.ok) {
        const data = await response.json()
        if (parentId) {
          setFolders(data.folder?.children || [])
          setBreadcrumb(data.breadcrumb || [])
        } else {
          setFolders(data.folders || [])
          setBreadcrumb([])
        }
        setCurrentFolderId(parentId)
      }
    } catch (error) {
      console.error("Error fetching folders:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const navigateToFolder = (folderId: string | null) => {
    setSelectedFolderId(null)
    fetchFolders(folderId)
  }

  const handleSubmit = async () => {
    if (!file) return

    setIsSubmitting(true)

    try {
      const endpoint = mode === "move"
        ? `/api/ged/files/${file.id}/move`
        : `/api/ged/files/${file.id}/copy`

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetFolderId: selectedFolderId || currentFolderId,
        }),
      })

      if (response.ok) {
        toast.success(mode === "move" ? "Fichier déplacé" : "Fichier copié")
        onOpenChange(false)
        onSuccess?.()
      } else {
        const error = await response.json()
        toast.error(error.error || `Erreur lors du ${mode === "move" ? "déplacement" : "copie"}`)
      }
    } catch (error) {
      toast.error(`Erreur lors du ${mode === "move" ? "déplacement" : "copie"}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    if (!isSubmitting) {
      setSelectedFolderId(null)
      setCurrentFolderId(null)
      setBreadcrumb([])
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {mode === "move" ? (
              <>
                <FolderInput className="h-5 w-5 text-teal-600" />
                Déplacer le fichier
              </>
            ) : (
              <>
                <Copy className="h-5 w-5 text-teal-600" />
                Copier le fichier
              </>
            )}
          </DialogTitle>
        </DialogHeader>

        {file && (
          <div className="bg-gray-50 rounded-lg p-3 mb-4">
            <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
          </div>
        )}

        {/* Breadcrumb */}
        <div className="flex items-center gap-1 text-sm text-gray-500 mb-2 flex-wrap">
          <button
            onClick={() => navigateToFolder(null)}
            className="flex items-center gap-1 hover:text-teal-600 transition-colors"
          >
            <Home className="h-4 w-4" />
            <span>Racine</span>
          </button>
          {breadcrumb.map((item) => (
            <div key={item.id} className="flex items-center gap-1">
              <ChevronRight className="h-4 w-4" />
              <button
                onClick={() => navigateToFolder(item.id)}
                className="hover:text-teal-600 transition-colors"
              >
                {item.name}
              </button>
            </div>
          ))}
        </div>

        {/* Folder list */}
        <div className="border rounded-lg max-h-64 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : folders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-gray-500">
              <Folder className="h-10 w-10 mb-2 text-gray-300" />
              <p className="text-sm">Aucun sous-dossier</p>
            </div>
          ) : (
            <div className="divide-y">
              {folders.map((folder) => (
                <div
                  key={folder.id}
                  className={cn(
                    "flex items-center gap-3 p-3 cursor-pointer transition-colors",
                    selectedFolderId === folder.id
                      ? "bg-teal-50"
                      : "hover:bg-gray-50"
                  )}
                  onClick={() => setSelectedFolderId(folder.id)}
                  onDoubleClick={() => navigateToFolder(folder.id)}
                >
                  <Folder className="h-6 w-6 text-teal-500" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {folder.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {(folder._count?.children || 0) + (folder._count?.files || 0)} éléments
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      navigateToFolder(folder.id)
                    }}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        <p className="text-xs text-gray-500 mt-2">
          Double-cliquez pour entrer dans un dossier, cliquez pour le sélectionner comme destination.
        </p>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            Annuler
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="bg-teal-600 hover:bg-teal-700"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {mode === "move" ? "Déplacement..." : "Copie..."}
              </>
            ) : (
              <>
                {mode === "move" ? (
                  <>
                    <FolderInput className="h-4 w-4 mr-2" />
                    Déplacer ici
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-2" />
                    Copier ici
                  </>
                )}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
