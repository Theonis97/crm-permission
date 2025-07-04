"use client"

import { useState, useEffect } from "react"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Plus, Save, Loader2 } from "lucide-react"

interface Permission {
  id: string
  name: string
  description: string | null
  module: string
  action: string
}

interface PermissionsByModule {
  [module: string]: Permission[]
}

interface CreateRoleSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onRoleCreated: () => void
}

export function CreateRoleSheet({ open, onOpenChange, onRoleCreated }: CreateRoleSheetProps) {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [allPermissions, setAllPermissions] = useState<PermissionsByModule>({})
  const [selectedPermissions, setSelectedPermissions] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      loadPermissions()
      // Reset form
      setName("")
      setDescription("")
      setSelectedPermissions(new Set())
    }
  }, [open])

  const loadPermissions = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/permissions")
      if (response.ok) {
        const permissions: Permission[] = await response.json()

        // Grouper par module
        const grouped = permissions.reduce((acc, permission) => {
          if (!acc[permission.module]) {
            acc[permission.module] = []
          }
          acc[permission.module].push(permission)
          return acc
        }, {} as PermissionsByModule)

        setAllPermissions(grouped)
      }
    } catch (error) {
      console.error("Error loading permissions:", error)
    } finally {
      setLoading(false)
    }
  }

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
    const modulePermissions = allPermissions[module] || []

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
    const modulePermissions = allPermissions[module] || []
    return modulePermissions.every((permission) => selectedPermissions.has(permission.id))
  }

  const isModulePartiallySelected = (module: string) => {
    const modulePermissions = allPermissions[module] || []
    return (
      modulePermissions.some((permission) => selectedPermissions.has(permission.id)) && !isModuleFullySelected(module)
    )
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const response = await fetch("/api/roles", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          description,
          permissions: Array.from(selectedPermissions),
        }),
      })

      if (response.ok) {
        onRoleCreated()
      }
    } catch (error) {
      console.error("Error creating role:", error)
    } finally {
      setSaving(false)
    }
  }

  const getModuleIcon = (module: string) => {
    const icons: { [key: string]: string } = {
      users: "👥",
      roles: "🛡️",
      contacts: "📞",
      products: "📦",
      quotes: "📄",
      invoices: "🧾",
      tasks: "✅",
      opportunities: "💼",
      reports: "📊",
    }
    return icons[module] || "⚙️"
  }

  const getModuleName = (module: string) => {
    const names: { [key: string]: string } = {
      users: "Utilisateurs",
      roles: "Rôles",
      contacts: "Contacts",
      products: "Produits",
      quotes: "Devis",
      invoices: "Factures",
      tasks: "Tâches",
      opportunities: "Opportunités",
      reports: "Rapports",
    }
    return names[module] || module
  }

  const getActionName = (action: string) => {
    const names: { [key: string]: string } = {
      view: "Voir",
      create: "Créer",
      edit: "Modifier",
      delete: "Supprimer",
      assign: "Assigner",
      export: "Exporter",
      send: "Envoyer",
    }
    return names[action] || action
  }

  const isFormValid = name.trim() && selectedPermissions.size > 0

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[800px] sm:max-w-[800px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center space-x-2">
            <Plus className="w-5 h-5" />
            <span>Créer un nouveau rôle</span>
          </SheetTitle>
          <SheetDescription>Définissez un nouveau rôle avec ses permissions</SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Informations de base */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Informations de base</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nom du rôle *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Gestionnaire commercial"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Description du rôle et de ses responsabilités"
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Permissions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Permissions ({selectedPermissions.size} sélectionnées)</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                </div>
              ) : (
                <div className="space-y-4">
                  {Object.entries(allPermissions).map(([module, permissions]) => (
                    <Card key={module} className="border-gray-200">
                      <CardHeader className="pb-3">
                        <CardTitle className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <span className="text-lg">{getModuleIcon(module)}</span>
                            <span className="text-base">{getModuleName(module)}</span>
                            <Badge variant="outline" className="text-xs">
                              {permissions.length} permission{permissions.length !== 1 ? "s" : ""}
                            </Badge>
                          </div>
                          <Checkbox
                            checked={isModuleFullySelected(module)}
                            onCheckedChange={(checked) => handleModuleToggle(module, checked as boolean)}
                            className={isModulePartiallySelected(module) ? "data-[state=checked]:bg-orange-500" : ""}
                          />
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 gap-3">
                          {permissions.map((permission) => (
                            <div key={permission.id} className="flex items-center space-x-2">
                              <Checkbox
                                id={permission.id}
                                checked={selectedPermissions.has(permission.id)}
                                onCheckedChange={() => handlePermissionToggle(permission.id)}
                              />
                              <label
                                htmlFor={permission.id}
                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                              >
                                {getActionName(permission.action)}
                              </label>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-end space-x-2 pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button onClick={handleSave} disabled={saving || !isFormValid}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Save className="mr-2 h-4 w-4" />
              Créer le rôle
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
