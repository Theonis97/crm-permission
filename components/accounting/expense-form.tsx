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
import { CalendarIcon, Loader2 } from "lucide-react"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import { cn } from "@/lib/utils"

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await onSubmit({
      ...formData,
      storeId: formData.storeId === "" ? null : formData.storeId,
      amount: Number(formData.amount),
      paymentDay: formData.periodicity !== "ONCE" ? formData.paymentDay : null,
    })
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
            placeholder="+237 6XX XXX XXX"
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

      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
          Annuler
        </Button>
        <Button type="submit" disabled={isLoading || !formData.title || !formData.categoryId || formData.amount <= 0}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {initialData?.id ? "Modifier" : "Créer"}
        </Button>
      </div>
    </form>
  )
}
