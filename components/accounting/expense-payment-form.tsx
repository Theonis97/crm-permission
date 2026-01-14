"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CalendarIcon, Loader2, Plus, X, FileText } from "lucide-react"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import { cn } from "@/lib/utils"

interface PaymentDocument {
  url: string
  name: string
  type?: string
  size?: number
  mimeType?: string
  file?: File
}

interface ExpensePaymentFormProps {
  expenseId: string
  remainingAmount: number
  onSubmit: (data: any) => Promise<void>
  onCancel: () => void
  isLoading?: boolean
}

export function ExpensePaymentForm({
  expenseId,
  remainingAmount,
  onSubmit,
  onCancel,
  isLoading = false,
}: ExpensePaymentFormProps) {
  const [formData, setFormData] = useState({
    amount: remainingAmount,
    paymentDate: new Date(),
    paymentMode: "CASH",
    reference: "",
    notes: "",
  })
  const [documents, setDocuments] = useState<PaymentDocument[]>([])
  const [isUploading, setIsUploading] = useState(false)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      const newDocs: PaymentDocument[] = []
      
      Array.from(files).forEach(file => {
        const doc: PaymentDocument = {
          url: "",
          name: file.name,
          type: "receipt",
          size: file.size,
          mimeType: file.type,
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
    e.target.value = ""
  }

  const removeDocument = (index: number) => {
    setDocuments(prev => prev.filter((_, i) => i !== index))
  }

  const uploadFiles = async (): Promise<Array<{ url: string; name: string; type?: string; size?: number; mimeType?: string }>> => {
    const uploadedDocs: Array<{ url: string; name: string; type?: string; size?: number; mimeType?: string }> = []
    
    for (const doc of documents) {
      if (doc.file) {
        const formDataUpload = new FormData()
        formDataUpload.append("file", doc.file)
        formDataUpload.append("folder", "expense-payments")
        
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
      const uploadedDocuments = await uploadFiles()
      
      await onSubmit({
        ...formData,
        amount: Number(formData.amount),
        documents: uploadedDocuments,
      })
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="p-4 bg-blue-50 rounded-lg mb-4">
        <p className="text-sm text-blue-700">
          Reste à payer: <span className="font-bold">{remainingAmount.toLocaleString("fr-FR")} FCFA</span>
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="amount">Montant (FCFA) *</Label>
          <Input
            id="amount"
            type="number"
            min="1"
            max={remainingAmount}
            step="1"
            value={formData.amount}
            onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
            required
          />
          {formData.amount > remainingAmount && (
            <p className="text-xs text-red-500">Le montant ne peut pas dépasser le reste à payer</p>
          )}
        </div>

        <div className="space-y-2">
          <Label>Date de paiement *</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !formData.paymentDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {formData.paymentDate ? format(formData.paymentDate, "PPP", { locale: fr }) : "Sélectionner"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 z-[60]">
              <Calendar
                mode="single"
                selected={formData.paymentDate}
                onSelect={(date) => date && setFormData({ ...formData, paymentDate: date })}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="paymentMode">Mode de paiement *</Label>
          <Select
            value={formData.paymentMode}
            onValueChange={(value) => setFormData({ ...formData, paymentMode: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="z-[60]">
              <SelectItem value="CASH">Caisse</SelectItem>
              <SelectItem value="BANK">Banque</SelectItem>
              <SelectItem value="MOBILE_MONEY">Mobile Money</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="reference">Référence</Label>
          <Input
            id="reference"
            value={formData.reference}
            onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
            placeholder="N° de transaction, chèque..."
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          placeholder="Notes supplémentaires..."
          rows={2}
        />
      </div>

      {/* Upload de reçus/justificatifs */}
      <div className="space-y-2">
        <Label>Reçus / Justificatifs</Label>
        
        {documents.length > 0 && (
          <div className="space-y-2 mb-3">
            {documents.map((doc, index) => (
              <div key={index} className="relative border rounded-lg p-2 bg-gray-50">
                <div className="flex items-center gap-2">
                  {doc.url.startsWith("data:image") ? (
                    <img src={doc.url} alt="Aperçu" className="w-10 h-10 object-cover rounded" />
                  ) : (
                    <div className="w-10 h-10 bg-gray-200 rounded flex items-center justify-center">
                      <FileText className="h-5 w-5 text-gray-500" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-700 truncate">{doc.name}</p>
                    <p className="text-xs text-gray-500">
                      {doc.size ? `${(doc.size / 1024).toFixed(1)} Ko` : ""}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeDocument(index)}
                    className="text-red-500 hover:text-red-700 h-8 w-8"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
        
        <label className="flex flex-col items-center justify-center w-full h-16 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
          <div className="flex items-center gap-2">
            <Plus className="h-4 w-4 text-gray-400" />
            <p className="text-sm text-gray-500">
              {documents.length > 0 ? "Ajouter d'autres fichiers" : "Ajouter des reçus"}
            </p>
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
        <Button 
          type="submit" 
          disabled={isLoading || isUploading || formData.amount <= 0 || formData.amount > remainingAmount}
        >
          {(isLoading || isUploading) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isUploading ? "Upload en cours..." : "Enregistrer le paiement"}
        </Button>
      </div>
    </form>
  )
}
