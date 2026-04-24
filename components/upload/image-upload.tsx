"use client"

import { useState, useRef } from "react"
import { Upload, X, Loader2, Image as ImageIcon, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { toast } from "@/lib/app-toast"

interface ImageUploadProps {
  value?: string
  onChange: (url: string) => void
  folder?: string
  aspectRatio?: "square" | "video" | "wide"
  className?: string
  disabled?: boolean
  label?: string
}

export function ImageUpload({
  value,
  onChange,
  folder = "stores",
  aspectRatio = "square",
  className,
  disabled = false,
  label = "Télécharger une image",
}: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [previewUrl, setPreviewUrl] = useState(value || "")
  const fileInputRef = useRef<HTMLInputElement>(null)

  const aspectRatioClass = {
    square: "aspect-square",
    video: "aspect-video",
    wide: "aspect-[21/9]",
  }[aspectRatio]

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validation
    if (!file.type.startsWith("image/")) {
      toast.error("Veuillez sélectionner une image")
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error("L'image ne doit pas dépasser 10MB")
      return
    }

    setIsUploading(true)

    try {
      // Créer une preview locale
      const reader = new FileReader()
      reader.onload = (e) => {
        setPreviewUrl(e.target?.result as string)
      }
      reader.readAsDataURL(file)

      // Upload vers le serveur
      const formData = new FormData()
      formData.append("file", file)
      formData.append("folder", folder)
      formData.append("type", "image")

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || "Erreur lors de l'upload")
      }

      const data = await response.json()
      
      onChange(data.fileUrl)
      setPreviewUrl(data.fileUrl)
      
      toast.success("Image téléchargée avec succès", {
        icon: <CheckCircle2 className="h-4 w-4" />,
      })
    } catch (error) {
      console.error("Upload error:", error)
      toast.error(error instanceof Error ? error.message : "Erreur lors de l'upload")
      setPreviewUrl(value || "")
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
  }

  const handleRemove = () => {
    setPreviewUrl("")
    onChange("")
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  return (
    <div className={cn("space-y-3", className)}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        disabled={disabled || isUploading}
        className="hidden"
      />

      <div
        className={cn(
          "relative rounded-lg border-2 border-dashed overflow-hidden bg-gray-50",
          aspectRatioClass,
          !previewUrl && "hover:border-blue-400 hover:bg-blue-50/50 transition-colors cursor-pointer",
          disabled && "opacity-50 cursor-not-allowed"
        )}
        onClick={() => !previewUrl && !disabled && !isUploading && fileInputRef.current?.click()}
      >
        {previewUrl ? (
          <>
            <img
              src={previewUrl}
              alt="Preview"
              className="w-full h-full object-cover"
              onError={(e) => {
                e.currentTarget.src = ""
                e.currentTarget.style.display = "none"
              }}
            />
            {!disabled && !isUploading && (
              <Button
                type="button"
                size="icon"
                variant="destructive"
                className="absolute top-2 right-2 h-8 w-8 rounded-full shadow-lg"
                onClick={(e) => {
                  e.stopPropagation()
                  handleRemove()
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-gray-500">
            {isUploading ? (
              <>
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                <p className="text-sm font-medium text-blue-600">Téléchargement...</p>
              </>
            ) : (
              <>
                <ImageIcon className="h-10 w-10" />
                <p className="text-sm font-medium">{label}</p>
                <p className="text-xs text-gray-400">PNG, JPG, WEBP jusqu'à 10MB</p>
              </>
            )}
          </div>
        )}
      </div>

      {!previewUrl && !isUploading && (
        <Button
          type="button"
          variant="outline"
          className="w-full rounded-full"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled}
        >
          <Upload className="h-4 w-4 mr-2" />
          Choisir une image
        </Button>
      )}
    </div>
  )
}
