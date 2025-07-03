"use client"

import { useState } from "react"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Edit, Save, Loader2 } from "lucide-react"
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

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle className="flex items-center space-x-2">
            <Edit className="w-5 h-5" />
            <span>Modifier le rôle</span>
          </SheetTitle>
          <SheetDescription>Modifiez les informations de base du rôle</SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nom du rôle</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nom du rôle" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description du rôle"
              rows={3}
            />
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button onClick={handleSave} disabled={saving || !name.trim()}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Save className="mr-2 h-4 w-4" />
              Enregistrer
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
