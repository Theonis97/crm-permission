"use client"

import { useState, useEffect } from "react"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Save, Loader2, X, ShieldCheck, Users } from "lucide-react"
import { Separator } from "@/components/ui/separator"
import type { RoleWithPermissions } from "@/types/auth"

interface EditRoleSheetProps {
  role: RoleWithPermissions & { _count: { userRoles: number } }
  open: boolean
  onOpenChange: (open: boolean) => void
  onRoleUpdated: () => void
}

export function EditRoleSheet({ role, open, onOpenChange, onRoleUpdated }: EditRoleSheetProps) {
  const [name, setName] = useState(role.name)
  const [description, setDescription] = useState(role.description || "")
  const [saving, setSaving] = useState(false)

  // Réinitialiser les valeurs quand le rôle change
  useEffect(() => {
    if (open) {
      setName(role.name)
      setDescription(role.description || "")
    }
  }, [open, role])

  const handleSave = async () => {
    setSaving(true)
    try {
      const response = await fetch(`/api/roles/${role.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          description,
        }),
      })

      if (response.ok) {
        onRoleUpdated()
      }
    } catch (error) {
      console.error("Error updating role:", error)
    } finally {
      setSaving(false)
    }
  }

  const isFormValid = name.trim() && name !== role.name || description !== (role.description || "")

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-[600px] p-0 flex flex-col h-full">
        {/* Header */}
        <div className="px-6 py-4 border-b bg-gradient-to-r from-primary/5 to-primary/10 shrink-0">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2 text-xl">
              <div className="p-2 rounded-lg bg-primary/10">
                <ShieldCheck className="w-5 h-5 text-primary" />
              </div>
              <span>Modifier le rôle</span>
            </SheetTitle>
            <SheetDescription className="text-sm mt-1">
              Modifiez les informations de base du rôle
            </SheetDescription>
          </SheetHeader>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto px-6">
          <div className="py-6 space-y-6">
            {/* Statistiques du rôle */}
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border">
              <Users className="w-4 h-4 text-muted-foreground" />
              <div className="flex-1">
                <p className="text-sm font-medium">Utilisateurs assignés</p>
                <p className="text-xs text-muted-foreground">
                  {role._count.userRoles} utilisateur{role._count.userRoles !== 1 ? "s" : ""} possède
                  {role._count.userRoles !== 1 ? "nt" : ""} ce rôle
                </p>
              </div>
              <Badge variant="secondary">{role._count.userRoles}</Badge>
            </div>

            <Separator />

            {/* Informations générales */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="h-px flex-1 bg-border" />
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Informations
                </h3>
                <div className="h-px flex-1 bg-border" />
              </div>

              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-sm font-medium">
                    Nom du rôle <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: Gestionnaire commercial"
                    className="h-10"
                    disabled={role.isSystem}
                  />
                  {role.isSystem && (
                    <p className="text-xs text-muted-foreground">
                      ⚠️ Ce rôle est un rôle système et ne peut pas être renommé
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description" className="text-sm font-medium">
                    Description
                  </Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Décrivez les responsabilités et le périmètre d'action de ce rôle..."
                    rows={4}
                    className="resize-none"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Fixed Footer - Toujours visible en bas */}
        <div className="border-t bg-background shadow-lg shrink-0">
          <div className="px-6 py-4">
            <div className="grid grid-cols-2 gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="h-11"
                disabled={saving}
              >
                <X className="mr-2 h-4 w-4" />
                Annuler
              </Button>
              <Button onClick={handleSave} disabled={saving || !name.trim()} className="h-11">
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Enregistrement...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Enregistrer
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
