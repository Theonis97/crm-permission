"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"

interface StorePermission {
  id: string
  name: string
  description: string | null
  module: string
  action: string
}

interface StoreRole {
  id: string
  name: string
  description: string | null
  isSystem: boolean
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

interface EditRoleDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  storeId: string
  role: StoreRole
  permissions: StorePermission[]
  onSuccess: () => void
}

export function EditRoleDialog({
  open,
  onOpenChange,
  storeId,
  role,
  permissions,
  onSuccess,
}: EditRoleDialogProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    permissions: [] as string[],
  })

  // Initialiser le formulaire avec les données du rôle
  useEffect(() => {
    if (role) {
      setFormData({
        name: role.name,
        description: role.description || "",
        permissions: role.storeRolePermissions.map(rp => rp.permission.id),
      })
    }
  }, [role])

  // Grouper les permissions par module
  const permissionsByModule = permissions.reduce((acc, permission) => {
    if (!acc[permission.module]) {
      acc[permission.module] = []
    }
    acc[permission.module].push(permission)
    return acc
  }, {} as Record<string, StorePermission[]>)

  // Gérer la sélection des permissions
  const handlePermissionChange = (permissionId: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      permissions: checked
        ? [...prev.permissions, permissionId]
        : prev.permissions.filter(id => id !== permissionId)
    }))
  }

  // Sélectionner/désélectionner toutes les permissions d'un module
  const handleModuleToggle = (modulePermissions: StorePermission[], checked: boolean) => {
    const modulePermissionIds = modulePermissions.map(p => p.id)
    setFormData(prev => ({
      ...prev,
      permissions: checked
        ? [...new Set([...prev.permissions, ...modulePermissionIds])]
        : prev.permissions.filter(id => !modulePermissionIds.includes(id))
    }))
  }

  // Vérifier si toutes les permissions d'un module sont sélectionnées
  const isModuleFullySelected = (modulePermissions: StorePermission[]) => {
    return modulePermissions.every(p => formData.permissions.includes(p.id))
  }

  // Vérifier si certaines permissions d'un module sont sélectionnées
  const isModulePartiallySelected = (modulePermissions: StorePermission[]) => {
    return modulePermissions.some(p => formData.permissions.includes(p.id)) &&
           !isModuleFullySelected(modulePermissions)
  }

  // Soumettre le formulaire
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name.trim()) {
      toast.error("Le nom du rôle est requis")
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`/api/stores/${storeId}/roles/${role.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        toast.success("Rôle modifié avec succès")
        onSuccess()
      } else {
        const error = await response.json()
        toast.error(error.error || "Erreur lors de la modification")
      }
    } catch (error) {
      console.error("Error updating role:", error)
      toast.error("Erreur lors de la modification")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Modifier le rôle</DialogTitle>
          <DialogDescription>
            Modifiez les informations et permissions de ce rôle.
            {role.isSystem && (
              <Badge variant="secondary" className="ml-2">
                Rôle système
              </Badge>
            )}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Informations de base */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Nom du rôle *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Ex: Vendeur, Caissier, Gestionnaire..."
                required
                disabled={role.isSystem}
              />
              {role.isSystem && (
                <p className="text-xs text-gray-500 mt-1">
                  Le nom des rôles système ne peut pas être modifié
                </p>
              )}
            </div>
            
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Description du rôle et de ses responsabilités..."
                rows={3}
              />
            </div>
          </div>

          {/* Sélection des permissions */}
          <div>
            <Label className="text-base font-medium">Permissions</Label>
            <p className="text-sm text-gray-600 mb-4">
              Sélectionnez les permissions à accorder à ce rôle.
            </p>
            
            <div className="space-y-4">
              {Object.entries(permissionsByModule).map(([module, modulePermissions]) => {
                const isFullySelected = isModuleFullySelected(modulePermissions)
                
                return (
                  <Card key={module}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id={`module-${module}`}
                          checked={isFullySelected}
                          onCheckedChange={(checked) => 
                            handleModuleToggle(modulePermissions, checked as boolean)
                          }
                        />
                        <CardTitle className="text-base capitalize">
                          Module {module}
                        </CardTitle>
                        <Badge variant="outline">
                          {modulePermissions.filter(p => formData.permissions.includes(p.id)).length} / {modulePermissions.length}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {modulePermissions.map((permission) => (
                          <div key={permission.id} className="flex items-start space-x-2">
                            <Checkbox
                              id={permission.id}
                              checked={formData.permissions.includes(permission.id)}
                              onCheckedChange={(checked) =>
                                handlePermissionChange(permission.id, checked as boolean)
                              }
                            />
                            <div className="grid gap-1.5 leading-none">
                              <label
                                htmlFor={permission.id}
                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
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
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Modifier le rôle
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
