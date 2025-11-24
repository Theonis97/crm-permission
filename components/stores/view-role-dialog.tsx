"use client"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Shield, Users, Settings, Calendar } from "lucide-react"

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
  _count: {
    storeUserRoles: number
  }
}

interface ViewRoleDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  role: StoreRole
  onClose: () => void
}

export function ViewRoleDialog({
  open,
  onOpenChange,
  role,
  onClose,
}: ViewRoleDialogProps) {
  // Grouper les permissions par module
  const permissionsByModule = role.storeRolePermissions.reduce((acc, rp) => {
    const permission = rp.permission
    if (!acc[permission.module]) {
      acc[permission.module] = []
    }
    acc[permission.module].push(permission)
    return acc
  }, {} as Record<string, Array<{
    id: string
    name: string
    description: string | null
    module: string
    action: string
  }>>)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              {role.name}
            </DialogTitle>
            {role.isSystem && (
              <Badge variant="secondary">
                <Settings className="h-3 w-3 mr-1" />
                Système
              </Badge>
            )}
          </div>
          <DialogDescription>
            Détails et permissions de ce rôle
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Informations générales */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Informations générales</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">Nom</label>
                  <p className="text-sm">{role.name}</p>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-600">Type</label>
                  <p className="text-sm">
                    {role.isSystem ? "Rôle système" : "Rôle personnalisé"}
                  </p>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-600">Utilisateurs assignés</label>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-gray-500" />
                    <span className="text-sm">{role._count.storeUserRoles} utilisateur(s)</span>
                  </div>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-600">Date de création</label>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-500" />
                    <span className="text-sm">
                      {new Date(role.createdAt).toLocaleDateString('fr-FR', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </span>
                  </div>
                </div>
              </div>
              
              {role.description && (
                <>
                  <Separator />
                  <div>
                    <label className="text-sm font-medium text-gray-600">Description</label>
                    <p className="text-sm mt-1">{role.description}</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Permissions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Permissions ({role.storeRolePermissions.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {role.storeRolePermissions.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Shield className="mx-auto h-12 w-12 text-gray-300 mb-2" />
                  <p>Aucune permission assignée à ce rôle</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {Object.entries(permissionsByModule).map(([module, modulePermissions]) => (
                    <div key={module}>
                      <div className="flex items-center gap-2 mb-3">
                        <h4 className="font-medium text-gray-900 capitalize">
                          Module {module}
                        </h4>
                        <Badge variant="outline">
                          {modulePermissions.length} permission(s)
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {modulePermissions.map((permission) => (
                          <div
                            key={permission.id}
                            className="border rounded-lg p-3 bg-gray-50"
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="font-medium text-sm">
                                  {permission.name}
                                </div>
                                {permission.description && (
                                  <div className="text-xs text-gray-600 mt-1">
                                    {permission.description}
                                  </div>
                                )}
                              </div>
                              <Badge variant="outline" className="ml-2 text-xs">
                                {permission.action}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <DialogFooter>
          <Button onClick={onClose}>
            Fermer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
