"use client"

import { useState, useEffect } from "react"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Shield, Save, Loader2 } from "lucide-react"
import type { RoleWithPermissions } from "@/types/auth"

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

interface RolePermissionsSheetProps {
  role: RoleWithPermissions & { _count: { userRoles: number } }
  open: boolean
  onOpenChange: (open: boolean) => void
  onPermissionsUpdated: () => void
}

export function RolePermissionsSheet({ role, open, onOpenChange, onPermissionsUpdated }: RolePermissionsSheetProps) {
  const [allPermissions, setAllPermissions] = useState<PermissionsByModule>({})
  const [selectedPermissions, setSelectedPermissions] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open && role) {
      loadPermissions()
    }
  }, [open, role])

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

        // Définir les permissions actuelles du rôle
        const currentPermissions = new Set(role.rolePermissions.map((rp) => rp.permission.id))
        setSelectedPermissions(currentPermissions)
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
      const response = await fetch(`/api/roles/${role.id}/permissions`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          permissionIds: Array.from(selectedPermissions),
        }),
      })

      if (response.ok) {
        onPermissionsUpdated()
      }
    } catch (error) {
      console.error("Error updating permissions:", error)
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

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[800px] sm:max-w-[800px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center space-x-2">
            <Shield className="w-5 h-5" />
            <span>Permissions du rôle "{role.name}"</span>
          </SheetTitle>
          <SheetDescription>Gérez les permissions par module pour ce rôle</SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <>
              {Object.entries(allPermissions).map(([module, permissions]) => (
                <Card key={module}>
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

              <div className="flex justify-end space-x-2 pt-4 border-t">
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  Annuler
                </Button>
                <Button onClick={handleSave} disabled={saving}>
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  <Save className="mr-2 h-4 w-4" />
                  Enregistrer
                </Button>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
