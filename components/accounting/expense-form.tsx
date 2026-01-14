"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CalendarIcon, Loader2, Upload, X, FileText, Plus } from "lucide-react"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import { cn } from "@/lib/utils"

interface ExpenseDocument {
  id?: string
  url: string
  name: string
  type?: string
  size?: number
  mimeType?: string
  isNew?: boolean // Pour distinguer les nouveaux fichiers
  file?: File // Fichier local avant upload
}

interface ExpenseFormProps {
  stores: Array<{ id: string; name: string }>
  categories: Array<{ id: string; name: string; icon: string | null; color: string | null }>
  initialData?: {
    id?: string
    storeId?: string | null
    categoryId?: string
    title?: string
    description?: string
    amount?: number
    supplierName?: string
    supplierPhone?: string
    dueDate?: Date
    periodicity?: string
    paymentDay?: number
    isRecurring?: boolean
    documentUrl?: string
    documents?: Array<{ id: string; url: string; name: string; type?: string }>
  }
  onSubmit: (data: any) => Promise<void>
  onCancel: () => void
  isLoading?: boolean
}

export function ExpenseForm({
  stores,
  categories,
  initialData,
  onSubmit,
  onCancel,
  isLoading = false,
}: ExpenseFormProps) {
  const [formData, setFormData] = useState({
    storeId: initialData?.storeId || "",
    categoryId: initialData?.categoryId || "",
    title: initialData?.title || "",
    description: initialData?.description || "",
    amount: initialData?.amount || 0,
    supplierName: initialData?.supplierName || "",
    supplierPhone: initialData?.supplierPhone || "",
    dueDate: initialData?.dueDate || new Date(),
    periodicity: initialData?.periodicity || "ONCE",
    paymentDay: initialData?.paymentDay || 1,
    isRecurring: initialData?.isRecurring || false,
  })
  // Gestion des documents multiples
  const [documents, setDocuments] = useState<ExpenseDocument[]>(() => {
    // Initialiser avec les documents existants
    if (initialData?.documents && initialData.documents.length > 0) {
      return initialData.documents.map(doc => ({
        id: doc.id,
        url: doc.url,
        name: doc.name,
        type: doc.type,
        isNew: false
      }))
    }
    // Rétrocompatibilité avec documentUrl
    if (initialData?.documentUrl) {
      return [{
        url: initialData.documentUrl,
        name: "Document",
        type: "invoice",
        isNew: false
      }]
    }
    return []
  })
  const [documentsToDelete, setDocumentsToDelete] = useState<string[]>([])
  const [isUploading, setIsUploading] = useState(false)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      const newDocs: ExpenseDocument[] = []
      
      Array.from(files).forEach(file => {
        // Créer une preview pour les images
        const doc: ExpenseDocument = {
          url: "",
          name: file.name,
          type: file.type.includes("pdf") ? "invoice" : "other",
          size: file.size,
          mimeType: file.type,
          isNew: true,
          file: file
        }
        
        if (file.type.startsWith("image/")) {
          const reader = new FileReader()
          reader.onloadend = () => {
            doc.url = reader.result as string
            setDocuments(prev => [...prev])
          }
          reader.readAsDataURL(file)
        }
        
        newDocs.push(doc)
      })
      
      setDocuments(prev => [...prev, ...newDocs])
    }
    // Reset input
    e.target.value = ""
  }

  const removeDocument = (index: number) => {
    const doc = documents[index]
    // Si c'est un document existant (avec ID), le marquer pour suppression
    if (doc.id) {
      setDocumentsToDelete(prev => [...prev, doc.id!])
    }
    setDocuments(prev => prev.filter((_, i) => i !== index))
  }

  const uploadFiles = async (): Promise<Array<{ url: string; name: string; type?: string; size?: number; mimeType?: string }>> => {
    const uploadedDocs: Array<{ url: string; name: string; type?: string; size?: number; mimeType?: string }> = []
    
    for (const doc of documents) {
      if (doc.isNew && doc.file) {
        // Upload du nouveau fichier
        const formDataUpload = new FormData()
        formDataUpload.append("file", doc.file)
        formDataUpload.append("folder", "expenses")
        
        try {
          const response = await fetch("/api/upload", {
            method: "POST",
            body: formDataUpload,
          })
          
          if (response.ok) {
            const data = await response.json()
            uploadedDocs.push({
              url: data.fileUrl,
              name: doc.name,
              type: doc.type,
              size: doc.size,
              mimeType: doc.mimeType
            })
          }
        } catch (error) {
          console.error("Upload error:", error)
        }
      }
    }
    
    return uploadedDocs
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsUploading(true)
    
    try {
      // Upload des nouveaux fichiers
      const newDocuments = await uploadFiles()
      
      await onSubmit({
        ...formData,
        storeId: formData.storeId === "" ? null : formData.storeId,
        amount: Number(formData.amount),
        paymentDay: formData.periodicity !== "ONCE" ? formData.paymentDay : null,
        documents: newDocuments, // Nouveaux documents à créer
        documentsToDelete: documentsToDelete, // Documents à supprimer
      })
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="title">Intitulé *</Label>
          <Input
            id="title"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="Ex: Loyer Janvier 2024"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="amount">Montant (FCFA) *</Label>
          <Input
            id="amount"
            type="number"
            min="0"
            step="1"
            value={formData.amount}
            onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
            placeholder="0"
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="categoryId">Catégorie *</Label>
          <Select
            value={formData.categoryId}
            onValueChange={(value) => setFormData({ ...formData, categoryId: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Sélectionner une catégorie" />
            </SelectTrigger>
            <SelectContent className="z-[2100]">
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  <span className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: category.color || "#6b7280" }}
                    />
                    {category.name}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="storeId">Magasin (optionnel)</Label>
          <Select
            value={formData.storeId || "general"}
            onValueChange={(value) => setFormData({ ...formData, storeId: value === "general" ? "" : value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Dépense générale" />
            </SelectTrigger>
            <SelectContent className="z-[2100]">
              <SelectItem value="general">Dépense générale</SelectItem>
              {stores.map((store) => (
                <SelectItem key={store.id} value={store.id}>
                  {store.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Date d'échéance *</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !formData.dueDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {formData.dueDate ? format(formData.dueDate, "PPP", { locale: fr }) : "Sélectionner"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 z-[2100]">
              <Calendar
                mode="single"
                selected={formData.dueDate}
                onSelect={(date) => date && setFormData({ ...formData, dueDate: date })}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="space-y-2">
          <Label htmlFor="periodicity">Périodicité</Label>
          <Select
            value={formData.periodicity}
            onValueChange={(value) => setFormData({ ...formData, periodicity: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="z-[2100]">
              <SelectItem value="ONCE">Unique</SelectItem>
              <SelectItem value="WEEKLY">Hebdomadaire</SelectItem>
              <SelectItem value="MONTHLY">Mensuelle</SelectItem>
              <SelectItem value="YEARLY">Annuelle</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {formData.periodicity !== "ONCE" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="paymentDay">
              {formData.periodicity === "WEEKLY" ? "Jour de la semaine" : "Jour du mois"}
            </Label>
            <Input
              id="paymentDay"
              type="number"
              min={formData.periodicity === "WEEKLY" ? 0 : 1}
              max={formData.periodicity === "WEEKLY" ? 6 : 31}
              value={formData.paymentDay}
              onChange={(e) => setFormData({ ...formData, paymentDay: Number(e.target.value) })}
            />
            <p className="text-xs text-gray-500">
              {formData.periodicity === "WEEKLY" 
                ? "0 = Dimanche, 1 = Lundi, ..., 6 = Samedi"
                : "Jour du mois (1-31)"
              }
            </p>
          </div>

          <div className="flex items-center space-x-2 pt-6">
            <Switch
              id="isRecurring"
              checked={formData.isRecurring}
              onCheckedChange={(checked) => setFormData({ ...formData, isRecurring: checked })}
            />
            <Label htmlFor="isRecurring">Générer automatiquement</Label>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="supplierName">Fournisseur</Label>
          <Input
            id="supplierName"
            value={formData.supplierName}
            onChange={(e) => setFormData({ ...formData, supplierName: e.target.value })}
            placeholder="Nom du fournisseur"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="supplierPhone">Téléphone fournisseur</Label>
          <Input
            id="supplierPhone"
            value={formData.supplierPhone}
            onChange={(e) => setFormData({ ...formData, supplierPhone: e.target.value })}
            placeholder="+241 6XX XXX XXX"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Notes ou détails supplémentaires..."
          rows={3}
        />
      </div>

      {/* Upload de fichiers multiples */}
      <div className="space-y-2">
        <Label>Pièces jointes (factures, reçus...)</Label>
        
        {/* Liste des documents */}
        {documents.length > 0 && (
          <div className="space-y-2 mb-3">
            {documents.map((doc, index) => (
              <div key={index} className="relative border rounded-lg p-3 bg-gray-50">
                <div className="flex items-center gap-3">
                  {(doc.url.startsWith("data:image") || doc.url.startsWith("http")) && doc.mimeType?.startsWith("image") ? (
                    <img 
                      src={doc.url} 
                      alt="Aperçu" 
                      className="w-12 h-12 object-cover rounded"
                    />
                  ) : (
                    <div className="w-12 h-12 bg-gray-200 rounded flex items-center justify-center">
                      <FileText className="h-6 w-6 text-gray-500" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-700 truncate">
                      {doc.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {doc.isNew ? (
                        doc.size ? `${(doc.size / 1024).toFixed(1)} Ko - Nouveau` : "Nouveau"
                      ) : (
                        "Fichier existant"
                      )}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeDocument(index)}
                    className="text-red-500 hover:text-red-700 flex-shrink-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
        
        {/* Bouton d'ajout */}
        <label className="flex flex-col items-center justify-center w-full h-20 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
          <div className="flex flex-col items-center justify-center">
            <Plus className="h-5 w-5 text-gray-400 mb-1" />
            <p className="text-sm text-gray-500">
              {documents.length > 0 ? "Ajouter d'autres fichiers" : "Ajouter des fichiers"}
            </p>
            <p className="text-xs text-gray-400">PDF, Images (max 5Mo chacun)</p>
          </div>
          <input
            type="file"
            className="hidden"
            accept="image/*,.pdf"
            multiple
            onChange={handleFileChange}
          />
        </label>
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading || isUploading}>
          Annuler
        </Button>
        <Button type="submit" disabled={isLoading || isUploading || !formData.title || !formData.categoryId || formData.amount <= 0}>
          {(isLoading || isUploading) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isUploading ? "Upload en cours..." : (initialData?.id ? "Modifier" : "Créer")}
        </Button>
      </div>
    </form>
  )
}
