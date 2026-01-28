"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Download, X, Loader2, FileText, Music, Video, File } from "lucide-react"
import { formatFileSize } from "@/lib/s3"

interface GedFile {
  id: string
  name: string
  originalName: string
  s3Key: string
  mimeType: string
  size: number
  extension: string
}

interface GedPreviewModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  file: GedFile
}

export function GedPreviewModal({
  open,
  onOpenChange,
  file,
}: GedPreviewModalProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open && file) {
      fetchPreviewUrl()
    }
  }, [open, file])

  const fetchPreviewUrl = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/ged/files/${file.id}?action=preview`)
      if (response.ok) {
        const data = await response.json()
        setPreviewUrl(data.previewUrl)
      } else {
        setError("Impossible de charger la prévisualisation")
      }
    } catch (err) {
      setError("Erreur lors du chargement")
    } finally {
      setIsLoading(false)
    }
  }

  const handleDownload = async () => {
    try {
      const response = await fetch(`/api/ged/files/${file.id}?action=download`)
      if (response.ok) {
        const data = await response.json()
        window.open(data.downloadUrl, "_blank")
      }
    } catch (error) {
      console.error("Download error:", error)
    }
  }

  const renderPreview = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      )
    }

    if (error || !previewUrl) {
      return (
        <div className="flex flex-col items-center justify-center h-96 text-gray-500">
          <File className="h-16 w-16 mb-4 text-gray-300" />
          <p>{error || "Prévisualisation non disponible"}</p>
          <Button variant="outline" className="mt-4" onClick={handleDownload}>
            <Download className="h-4 w-4 mr-2" />
            Télécharger le fichier
          </Button>
        </div>
      )
    }

    // Image
    if (file.mimeType.startsWith("image/")) {
      return (
        <div className="flex items-center justify-center bg-gray-100 rounded-lg overflow-hidden max-h-[70vh]">
          <img
            src={previewUrl}
            alt={file.name}
            className="max-w-full max-h-[70vh] object-contain"
          />
        </div>
      )
    }

    // PDF
    if (file.mimeType === "application/pdf") {
      return (
        <iframe
          src={previewUrl}
          className="w-full h-[70vh] rounded-lg border"
          title={file.name}
        />
      )
    }

    // Video
    if (file.mimeType.startsWith("video/")) {
      return (
        <video
          src={previewUrl}
          controls
          className="w-full max-h-[70vh] rounded-lg bg-black"
        >
          Votre navigateur ne supporte pas la lecture vidéo.
        </video>
      )
    }

    // Audio
    if (file.mimeType.startsWith("audio/")) {
      return (
        <div className="flex flex-col items-center justify-center h-64 bg-gray-100 rounded-lg">
          <Music className="h-16 w-16 text-gray-400 mb-4" />
          <audio src={previewUrl} controls className="w-full max-w-md">
            Votre navigateur ne supporte pas la lecture audio.
          </audio>
        </div>
      )
    }

    // Text files
    if (file.mimeType.startsWith("text/") || file.mimeType === "application/json") {
      return (
        <iframe
          src={previewUrl}
          className="w-full h-[70vh] rounded-lg border bg-white font-mono text-sm"
          title={file.name}
        />
      )
    }

    // Default - no preview
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-500">
        <FileText className="h-16 w-16 mb-4 text-gray-300" />
        <p>Prévisualisation non disponible pour ce type de fichier</p>
        <Button variant="outline" className="mt-4" onClick={handleDownload}>
          <Download className="h-4 w-4 mr-2" />
          Télécharger le fichier
        </Button>
      </div>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden">
        <DialogHeader className="flex flex-row items-center justify-between">
          <div>
            <DialogTitle className="truncate max-w-lg">{file.name}</DialogTitle>
            <p className="text-sm text-gray-500 mt-1">
              {file.extension.toUpperCase()} • {formatFileSize(file.size)}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={handleDownload}>
            <Download className="h-4 w-4 mr-2" />
            Télécharger
          </Button>
        </DialogHeader>

        <div className="overflow-auto">{renderPreview()}</div>
      </DialogContent>
    </Dialog>
  )
}
