"use client"

import { useState, useEffect } from "react"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Loader2 } from "lucide-react"
import { toast } from "@/lib/app-toast"

interface PayrollRubric {
  id: string
  code: string
  name: string
  description: string | null
  type: "PRIME" | "INDEMNITY"
  isSubjectToTax: boolean
  isSubjectToSocial: boolean
  calculationBase: string
  defaultAmount: number | null
  defaultRate: number | null
  exemptionCeiling: number | null
  displayOrder: number
  category: string | null
  isActive: boolean
  isAlreadyDisbursed: boolean
}

interface EditRubricSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  rubric: PayrollRubric | null
  onSuccess: () => void
}

export function EditRubricSheet({ open, onOpenChange, rubric, onSuccess }: EditRubricSheetProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    code: "", name: "", description: "", type: "PRIME" as "PRIME" | "INDEMNITY",
    isSubjectToTax: true, isSubjectToSocial: true, calculationBase: "FIXED",
    defaultAmount: "", defaultRate: "", exemptionCeiling: "", category: "", displayOrder: "0",
    isAlreadyDisbursed: false,
  })

  useEffect(() => {
    if (rubric) {
      setFormData({
        code: rubric.code,
        name: rubric.name,
        description: rubric.description || "",
        type: rubric.type,
        isSubjectToTax: rubric.isSubjectToTax,
        isSubjectToSocial: rubric.isSubjectToSocial,
        calculationBase: rubric.calculationBase,
        defaultAmount: rubric.defaultAmount?.toString() || "",
        defaultRate: rubric.defaultRate?.toString() || "",
        exemptionCeiling: rubric.exemptionCeiling?.toString() || "",
        category: rubric.category || "",
        displayOrder: rubric.displayOrder.toString(),
        isAlreadyDisbursed:
          rubric.type === "INDEMNITY" ? true : rubric.isAlreadyDisbursed ?? false,
      })
    }
  }, [rubric])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!rubric || !formData.code || !formData.name) {
      toast.error("Code et nom sont requis")
      return
    }

    setIsLoading(true)
    try {
      const res = await fetch(`/api/payroll/rubrics/${rubric.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          defaultAmount: formData.defaultAmount ? parseFloat(formData.defaultAmount) : null,
          defaultRate: formData.defaultRate ? parseFloat(formData.defaultRate) : null,
          exemptionCeiling: formData.exemptionCeiling ? parseFloat(formData.exemptionCeiling) : null,
          displayOrder: parseInt(formData.displayOrder) || 0,
          category: formData.category || null,
          isAlreadyDisbursed: formData.type === "INDEMNITY" || formData.isAlreadyDisbursed,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Erreur")
      }

      toast.success("Rubrique modifiée")
      onSuccess()
      onOpenChange(false)
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
          <SheetTitle>Modifier la rubrique</SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="code">Code *</Label>
              <Input id="code" value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="type">Type *</Label>
              <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v as "PRIME" | "INDEMNITY" })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="PRIME">Prime</SelectItem>
                  <SelectItem value="INDEMNITY">Indemnité</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Nom *</Label>
            <Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={2} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Catégorie</Label>
            <Input id="category" value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} />
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
            {formData.type === "INDEMNITY" && (
              <p className="text-xs text-slate-600 border-t border-gray-200 pt-3">
                Les indemnités figurent sur le bulletin pour la traçabilité mais ne sont pas incluses dans le net à payer (versements séparés).
              </p>
            )}
            {formData.type === "PRIME" && (
              <div className="flex items-center justify-between border-t border-gray-200 pt-3">
                <div>
                  <Label>Prime déjà versée hors paie</Label>
                  <p className="text-xs text-gray-500">Ne sera pas ajoutée au net à payer</p>
                </div>
                <Switch
                  checked={formData.isAlreadyDisbursed}
                  onCheckedChange={(v) => setFormData({ ...formData, isAlreadyDisbursed: v })}
                />
              </div>
            )}
          </div>

          <div className="border rounded-lg p-4 space-y-4 bg-gray-50">
            <h4 className="font-medium">Mode de calcul</h4>
            <div className="space-y-2">
              <Label>Base de calcul</Label>
              <Select value={formData.calculationBase} onValueChange={(v) => setFormData({ ...formData, calculationBase: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
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
                <Input type="number" value={formData.defaultAmount} onChange={(e) => setFormData({ ...formData, defaultAmount: e.target.value })} />
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Taux par défaut (%)</Label>
                <Input type="number" step="0.01" value={formData.defaultRate} onChange={(e) => setFormData({ ...formData, defaultRate: e.target.value })} />
              </div>
            )}

            {formData.type === "INDEMNITY" && (
              <div className="space-y-2">
                <Label>Plafond d'exonération (FCFA)</Label>
                <Input type="number" value={formData.exemptionCeiling} onChange={(e) => setFormData({ ...formData, exemptionCeiling: e.target.value })} />
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
              Enregistrer
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}
