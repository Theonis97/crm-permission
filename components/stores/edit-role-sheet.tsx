"use client"

import { useState, useEffect } from "react"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Save, Loader2, Edit, X, Lock } from "lucide-react"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"

interface StoreRole {
  id: string
  name: string
  description: string | null
  isSystem: boolean
  createdAt: string
  storeRolePermissions: Array<{
    permission: {
      id: string
      name: string
      description: string | null
      module: string
      action: string
    }
  }>
}

interface StorePermission {
  id: string
  name: string
  description: string | null
  module: string
  action: string
}

interface PermissionsByModule {
  [module: string]: StorePermission[]
}

interface EditRoleSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  role: StoreRole | null
  storeId: string
  permissions: StorePermission[]
  onSuccess: () => void
}

export function EditRoleSheet({ 
  open, 
  onOpenChange, 
  role,
  storeId, 
  permissions, 
  onSuccess 
}: EditRoleSheetProps) {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [selectedPermissions, setSelectedPermissions] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)

  // Grouper les permissions par module
  const permissionsByModule: PermissionsByModule = permissions.reduce((acc, permission) => {
    if (!acc[permission.module]) {
      acc[permission.module] = []
    }
    acc[permission.module].push(permission)
    return acc
  }, {} as PermissionsByModule)

  useEffect(() => {
    if (open && role) {
      // Pré-remplir les données du rôle
      setName(role.name)
      setDescription(role.description || "")
      
      // Pré-sélectionner les permissions actuelles
      const currentPermissionIds = new Set(
        role.storeRolePermissions.map(rp => rp.permission.id)
      )
      setSelectedPermissions(currentPermissionIds)
    }
  }, [open, role])

  const handlePermissionToggle = (permissionId: string) => {
    const newSelected = new Set(selectedPermissions)
    if (newSelected.has(permissionId)) {
      newSelected.delete(permissionId)
    } else {
      newSelected.add(permissionId)
    }
    setSelectedPermissions(newSelected)
  }

  const handleModuleToggle = (module: string, checked: boolean) => {
    const newSelected = new Set(selectedPermissions)
    const modulePermissions = permissionsByModule[module] || []

    modulePermissions.forEach((permission) => {
      if (checked) {
        newSelected.add(permission.id)
      } else {
        newSelected.delete(permission.id)
      }
    })

    setSelectedPermissions(newSelected)
  }

  const isModuleFullySelected = (module: string) => {
    const modulePermissions = permissionsByModule[module] || []
    return modulePermissions.every(p => selectedPermissions.has(p.id))
  }

  const isModulePartiallySelected = (module: string) => {
    const modulePermissions = permissionsByModule[module] || []
    return modulePermissions.some(p => selectedPermissions.has(p.id)) && !isModuleFullySelected(module)
  }

  const getSelectedCount = (module: string) => {
    const modulePermissions = permissionsByModule[module] || []
    return modulePermissions.filter(p => selectedPermissions.has(p.id)).length
  }

  const handleSave = async () => {
    if (!role) return
    
    if (!name.trim()) {
      toast.error("Le nom du rôle est requis")
      return
    }

    setSaving(true)
    try {
      const response = await fetch(`/api/stores/${storeId}/roles/${role.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          permissions: Array.from(selectedPermissions),
        }),
      })

      if (response.ok) {
        toast.success("Rôle modifié avec succès")
        onSuccess()
      } else {
        const error = await response.json()
        toast.error(error.error || "Erreur lors de la modification du rôle")
      }
    } catch (error) {
      console.error("Error updating role:", error)
      toast.error("Erreur lors de la modification du rôle")
    } finally {
      setSaving(false)
    }
  }

  if (!role) return null

  const totalSelectedPermissions = selectedPermissions.size
  const totalPermissions = permissions.length

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[600px] sm:w-[700px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Edit className="h-5 w-5" />
            Modifier le rôle
          </SheetTitle>
          <SheetDescription>
            Modifiez les informations et permissions de ce rôle.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 py-6">
          {/* Informations de base */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Nom du rôle *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Vendeur, Caissier, Gestionnaire..."
                className="mt-1"
                disabled={role.isSystem}
              />
              {role.isSystem && (
                <p className="text-xs text-orange-600 mt-1 flex items-center gap-1">
                  <Lock className="h-3 w-3" />
                  Le nom des rôles système ne peut pas être modifié
                </p>
              )}
            </div>
            
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Description du rôle et de ses responsabilités..."
                rows={3}
                className="mt-1"
              />
            </div>
          </div>

          <Separator />

          {/* Sélection des permissions */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <Label className="text-base font-medium">
                Permissions ({totalSelectedPermissions}/{totalPermissions})
              </Label>
              <Badge variant="outline">
                {totalSelectedPermissions} sélectionnée(s)
              </Badge>
            </div>
            
            <p className="text-sm text-gray-600 mb-4">
              Sélectionnez les permissions à accorder à ce rôle.
            </p>

            {Object.keys(permissionsByModule).length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Edit className="mx-auto h-12 w-12 text-gray-300 mb-2" />
                <p>Aucune permission disponible</p>
              </div>
            ) : (
              <Accordion type="multiple" className="w-full">
                {Object.entries(permissionsByModule).map(([module, modulePermissions]) => {
                  const isFullySelected = isModuleFullySelected(module)
                  const isPartiallySelected = isModulePartiallySelected(module)
                  const selectedCount = getSelectedCount(module)
                  
                  return (
                    <AccordionItem key={module} value={module}>
                      <AccordionTrigger className="hover:no-underline">
                        <div className="flex items-center justify-between w-full mr-4">
                          <div className="flex items-center gap-3">
                            <Checkbox
                              checked={isFullySelected}
                              onCheckedChange={(checked) => handleModuleToggle(module, checked as boolean)}
                              onClick={(e) => e.stopPropagation()}
                            />
                            <span className="font-medium capitalize">
                              Module {module}
                            </span>
                          </div>
                          <Badge variant={selectedCount > 0 ? "default" : "outline"}>
                            {selectedCount}/{modulePermissions.length}
                          </Badge>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="pl-6 space-y-3">
                          {modulePermissions.map((permission) => (
                            <div key={permission.id} className="flex items-start space-x-3">
                              <Checkbox
                                id={permission.id}
                                checked={selectedPermissions.has(permission.id)}
                                onCheckedChange={() => handlePermissionToggle(permission.id)}
                              />
                              <div className="grid gap-1.5 leading-none flex-1">
                                <label
                                  htmlFor={permission.id}
                                  className="text-sm font-medium leading-none cursor-pointer"
                                >
                                  {permission.name}
                                </label>
                                {permission.description && (
                                  <p className="text-xs text-muted-foreground">
                                    {permission.description}
                                  </p>
                                )}
                                <Badge variant="outline" className="w-fit text-xs">
                                  {permission.action}
                                </Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  )
                })}
              </Accordion>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-6 border-t">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            <X className="mr-2 h-4 w-4" />
            Annuler
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || !name.trim()}
          >
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            {saving ? "Modification..." : "Modifier le rôle"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
