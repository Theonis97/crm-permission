"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CalendarIcon, Loader2 } from "lucide-react"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import { cn } from "@/lib/utils"

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await onSubmit({
      ...formData,
      amount: Number(formData.amount),
    })
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

      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
          Annuler
        </Button>
        <Button 
          type="submit" 
          disabled={isLoading || formData.amount <= 0 || formData.amount > remainingAmount}
        >
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Enregistrer le paiement
        </Button>
      </div>
    </form>
  )
}
