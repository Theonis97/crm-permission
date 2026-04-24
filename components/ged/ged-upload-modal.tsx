"use client"

import { useState, useCallback } from "react"
import { useDropzone } from "react-dropzone"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Upload, X, FileIcon, CheckCircle, AlertCircle, Loader2 } from "lucide-react"
import { toast } from "@/lib/app-toast"
import { formatFileSize, GED_MAX_FILE_SIZE, GED_ALLOWED_MIME_TYPES } from "@/lib/s3"

interface GedUploadModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
  folderId?: string
}

interface UploadingFile {
  file: File
  progress: number
  status: "pending" | "uploading" | "success" | "error"
  error?: string
}

export function GedUploadModal({
  open,
  onOpenChange,
  onSuccess,
  folderId,
}: GedUploadModalProps) {
  const [files, setFiles] = useState<UploadingFile[]>([])
  const [isUploading, setIsUploading] = useState(false)

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles: UploadingFile[] = acceptedFiles.map((file) => ({
      file,
      progress: 0,
      status: "pending" as const,
    }))
    setFiles((prev) => [...prev, ...newFiles])
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxSize: GED_MAX_FILE_SIZE,
    accept: GED_ALLOWED_MIME_TYPES.reduce((acc, type) => {
      acc[type] = []
      return acc
    }, {} as Record<string, string[]>),
  })

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const uploadFiles = async () => {
    if (files.length === 0) return

    setIsUploading(true)

    for (let i = 0; i < files.length; i++) {
      if (files[i].status === "success") continue

      setFiles((prev) =>
        prev.map((f, idx) =>
          idx === i ? { ...f, status: "uploading" as const, progress: 0 } : f
        )
      )

      try {
        const formData = new FormData()
        formData.append("file", files[i].file)
        if (folderId) {
          formData.append("folderId", folderId)
        }

        const response = await fetch("/api/ged/files/upload", {
          method: "POST",
          body: formData,
        })

        if (response.ok) {
          setFiles((prev) =>
            prev.map((f, idx) =>
              idx === i ? { ...f, status: "success" as const, progress: 100 } : f
            )
          )
        } else {
          const error = await response.json()
          setFiles((prev) =>
            prev.map((f, idx) =>
              idx === i
                ? { ...f, status: "error" as const, error: error.error || "Erreur" }
                : f
            )
          )
        }
      } catch (error) {
        setFiles((prev) =>
          prev.map((f, idx) =>
            idx === i
              ? { ...f, status: "error" as const, error: "Erreur réseau" }
              : f
          )
        )
      }
    }

    setIsUploading(false)

    // Recalculer après la boucle avec l'état mis à jour
    setFiles((currentFiles) => {
      const successCount = currentFiles.filter((f) => f.status === "success").length
      if (successCount > 0) {
        toast.success(`${successCount} fichier(s) importé(s) avec succès`)
        // Appeler onSuccess après un court délai pour s'assurer que l'état est à jour
        setTimeout(() => {
          onSuccess?.()
        }, 100)
      }
      return currentFiles
    })
  }

  const handleClose = () => {
    if (!isUploading) {
      setFiles([])
      onOpenChange(false)
    }
  }

  const pendingFiles = files.filter((f) => f.status !== "success")
  const allDone = files.length > 0 && files.every((f) => f.status === "success")

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Importer des fichiers</DialogTitle>
        </DialogHeader>

        {/* Dropzone */}
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
            isDragActive
              ? "border-teal-500 bg-teal-50"
              : "border-gray-300 hover:border-gray-400"
          }`}
        >
          <input {...getInputProps()} />
          <Upload className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          {isDragActive ? (
            <p className="text-teal-600 font-medium">Déposez les fichiers ici...</p>
          ) : (
            <>
              <p className="text-gray-600 font-medium">
                Glissez-déposez des fichiers ici
              </p>
              <p className="text-sm text-gray-500 mt-1">
                ou cliquez pour sélectionner
              </p>
              <p className="text-xs text-gray-400 mt-2">
                Taille max: {formatFileSize(GED_MAX_FILE_SIZE)}
              </p>
            </>
          )}
        </div>

        {/* Files list */}
        {files.length > 0 && (
          <div className="max-h-64 overflow-y-auto space-y-2">
            {files.map((uploadFile, index) => (
              <div
                key={index}
                className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
              >
                <FileIcon className="h-8 w-8 text-gray-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {uploadFile.file.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatFileSize(uploadFile.file.size)}
                  </p>
                  {uploadFile.status === "uploading" && (
                    <Progress value={uploadFile.progress} className="h-1 mt-1" />
                  )}
                  {uploadFile.status === "error" && (
                    <p className="text-xs text-red-500 mt-1">{uploadFile.error}</p>
                  )}
                </div>
                <div className="flex-shrink-0">
                  {uploadFile.status === "pending" && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => removeFile(index)}
                      disabled={isUploading}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                  {uploadFile.status === "uploading" && (
                    <Loader2 className="h-5 w-5 animate-spin text-teal-600" />
                  )}
                  {uploadFile.status === "success" && (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  )}
                  {uploadFile.status === "error" && (
                    <AlertCircle className="h-5 w-5 text-red-500" />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={handleClose} disabled={isUploading}>
            {allDone ? "Fermer" : "Annuler"}
          </Button>
          {!allDone && (
            <Button
              onClick={uploadFiles}
              disabled={pendingFiles.length === 0 || isUploading}
              className="bg-teal-600 hover:bg-teal-700"
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Import en cours...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Importer {pendingFiles.length} fichier(s)
                </>
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
