"use client"

import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Shield, Lock, Settings, Eye } from "lucide-react"

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

interface ViewRoleSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  role: StoreRole | null
}

export function ViewRoleSheet({ open, onOpenChange, role }: ViewRoleSheetProps) {
  if (!role) return null

  // Grouper les permissions par module
  const permissionsByModule = role.storeRolePermissions.reduce((acc, rp) => {
    const permission = rp.permission
    if (!acc[permission.module]) {
      acc[permission.module] = []
    }
    acc[permission.module].push(permission)
    return acc
  }, {} as Record<string, typeof role.storeRolePermissions[0]['permission'][]>)

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[600px] sm:w-[700px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
           {role.name}
          </SheetTitle>
          <SheetDescription>
            Créé le {new Date(role.createdAt).toLocaleDateString()}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 py-6">
        
          <Separator />

          {/* Permissions */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium">
                Permissions ({role.storeRolePermissions.length})
              </h3>
              <Badge variant="outline">
                {Object.keys(permissionsByModule).length} module(s)
              </Badge>
            </div>

            {Object.keys(permissionsByModule).length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Shield className="mx-auto h-12 w-12 text-gray-300 mb-2" />
                <p>Aucune permission assignée</p>
              </div>
            ) : (
              <div className="space-y-4">
                {Object.entries(permissionsByModule).map(([module, modulePermissions]) => (
                  <div key={module} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium text-gray-900 capitalize">
                        Module {module}
                      </h4>
                      <Badge variant="outline">
                        {modulePermissions.length} permission(s)
                      </Badge>
                    </div>
                    <div className="grid gap-2">
                      {modulePermissions.map((permission) => (
                        <div key={permission.id} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-md">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm">
                                {permission.name}
                              </span>
                              <Badge variant="outline" className="text-xs">
                                {permission.action}
                              </Badge>
                            </div>
                            {permission.description && (
                              <p className="text-xs text-gray-600 mt-1">
                                {permission.description}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
