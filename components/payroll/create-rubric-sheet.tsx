"use client"

import { useState } from "react"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

interface CreateRubricSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function CreateRubricSheet({ open, onOpenChange, onSuccess }: CreateRubricSheetProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    code: "",
    name: "",
    description: "",
    type: "PRIME" as "PRIME" | "INDEMNITY",
    isSubjectToTax: true,
    isSubjectToSocial: true,
    calculationBase: "FIXED",
    defaultAmount: "",
    defaultRate: "",
    exemptionCeiling: "",
    category: "",
    displayOrder: "0",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.code || !formData.name) {
      toast.error("Code et nom sont requis")
      return
    }

    setIsLoading(true)
    try {
      const res = await fetch("/api/payroll/rubrics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          defaultAmount: formData.defaultAmount ? parseFloat(formData.defaultAmount) : null,
          defaultRate: formData.defaultRate ? parseFloat(formData.defaultRate) : null,
          exemptionCeiling: formData.exemptionCeiling ? parseFloat(formData.exemptionCeiling) : null,
          displayOrder: parseInt(formData.displayOrder) || 0,
          category: formData.category || null,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Erreur")
      }

      toast.success("Rubrique créée avec succès")
      onSuccess()
      onOpenChange(false)
      setFormData({
        code: "", name: "", description: "", type: "PRIME", isSubjectToTax: true, isSubjectToSocial: true,
        calculationBase: "FIXED", defaultAmount: "", defaultRate: "", exemptionCeiling: "", category: "", displayOrder: "0",
      })
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[500px] sm:max-w-[500px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Nouvelle rubrique de paie</SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="code">Code *</Label>
              <Input id="code" placeholder="PRIME_PERF" value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="type">Type *</Label>
              <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v as "PRIME" | "INDEMNITY" })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent className="z-[9999]">
                  <SelectItem value="PRIME">Prime</SelectItem>
                  <SelectItem value="INDEMNITY">Indemnité</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Nom *</Label>
            <Input id="name" placeholder="Prime de performance" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" placeholder="Description de la rubrique..." value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={2} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Catégorie</Label>
            <Input id="category" placeholder="Transport, Performance..." value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} />
          </div>

          <div className="border rounded-lg p-4 space-y-4 bg-gray-50">
            <h4 className="font-medium">Caractéristiques fiscales</h4>
            <div className="flex items-center justify-between">
              <div><Label>Soumis à l'IRPP</Label><p className="text-xs text-gray-500">Imposable sur le revenu</p></div>
              <Switch checked={formData.isSubjectToTax} onCheckedChange={(v) => setFormData({ ...formData, isSubjectToTax: v })} />
            </div>
            <div className="flex items-center justify-between">
              <div><Label>Soumis aux cotisations</Label><p className="text-xs text-gray-500">CNSS, CSS, etc.</p></div>
              <Switch checked={formData.isSubjectToSocial} onCheckedChange={(v) => setFormData({ ...formData, isSubjectToSocial: v })} />
            </div>
          </div>

          <div className="border rounded-lg p-4 space-y-4 bg-gray-50">
            <h4 className="font-medium">Mode de calcul</h4>
            <div className="space-y-2">
              <Label>Base de calcul</Label>
              <Select value={formData.calculationBase} onValueChange={(v) => setFormData({ ...formData, calculationBase: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent className="z-[9999]">
                  <SelectItem value="FIXED">Montant fixe</SelectItem>
                  <SelectItem value="GROSS_SALARY">% du salaire brut</SelectItem>
                  <SelectItem value="BASE_SALARY">% du salaire de base</SelectItem>
                  <SelectItem value="NET_SALARY">% du salaire net</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.calculationBase === "FIXED" ? (
              <div className="space-y-2">
                <Label>Montant par défaut (FCFA)</Label>
                <Input type="number" placeholder="50000" value={formData.defaultAmount} onChange={(e) => setFormData({ ...formData, defaultAmount: e.target.value })} />
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Taux par défaut (%)</Label>
                <Input type="number" step="0.01" placeholder="5" value={formData.defaultRate} onChange={(e) => setFormData({ ...formData, defaultRate: e.target.value })} />
              </div>
            )}

            {formData.type === "INDEMNITY" && (
              <div className="space-y-2">
                <Label>Plafond d'exonération (FCFA)</Label>
                <p className="text-xs text-gray-500">Montant exonéré de cotisations</p>
                <Input type="number" placeholder="25000" value={formData.exemptionCeiling} onChange={(e) => setFormData({ ...formData, exemptionCeiling: e.target.value })} />
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>Ordre d'affichage</Label>
            <Input type="number" value={formData.displayOrder} onChange={(e) => setFormData({ ...formData, displayOrder: e.target.value })} />
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1">Annuler</Button>
            <Button type="submit" disabled={isLoading} className="flex-1 bg-indigo-600 hover:bg-indigo-700">
              {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Créer
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}
