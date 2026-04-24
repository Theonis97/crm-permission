"use client"

import { useState, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Separator } from "@/components/ui/separator"
import { Settings, Shield, Save, X } from "lucide-react"
import { toast } from "@/lib/app-toast"

interface StoreUser {
  id: string
  firstName: string | null
  lastName: string | null
  name: string | null
  email: string
  image: string | null
  status: string
  createdAt: string
  storeRoles: Array<{
    id: string
    name: string
    description: string | null
    isSystem: boolean
  }>
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
  _count?: {
    storeUserRoles: number
  }
}

interface ManageUserRolesSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  user: StoreUser | null
  storeId: string
  roles: StoreRole[]
  onSuccess: () => void
}

export function ManageUserRolesSheet({ 
  open, 
  onOpenChange, 
  user, 
  storeId, 
  roles, 
  onSuccess 
}: ManageUserRolesSheetProps) {
  const [selectedRoles, setSelectedRoles] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (user && open) {
      // Initialiser avec les rôles actuels de l'utilisateur
      setSelectedRoles(new Set(user.storeRoles.map(role => role.id)))
    }
  }, [user, open])

  if (!user) return null

  const getUserDisplayName = (user: StoreUser) => {
    if (user.firstName && user.lastName) {
      return `${user.firstName} ${user.lastName}`
    }
    return user.name || user.email
  }

  const getUserInitials = (user: StoreUser) => {
    if (user.firstName && user.lastName) {
      return `${user.firstName[0]}${user.lastName[0]}`
    }
    if (user.name) {
      return user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
    }
    return user.email[0]?.toUpperCase() || "U"
  }

  const handleRoleToggle = (roleId: string) => {
    const newSelectedRoles = new Set(selectedRoles)
    if (newSelectedRoles.has(roleId)) {
      newSelectedRoles.delete(roleId)
    } else {
      newSelectedRoles.add(roleId)
    }
    setSelectedRoles(newSelectedRoles)
  }

  const handleSave = async () => {
    if (selectedRoles.size === 0) {
      toast.error("L'utilisateur doit avoir au moins un rôle")
      return
    }

    setSaving(true)
    try {
      const response = await fetch(`/api/stores/${storeId}/users/${user.id}/roles`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          roles: Array.from(selectedRoles),
        }),
      })

      if (response.ok) {
        toast.success("Rôles mis à jour avec succès")
        onSuccess()
        onOpenChange(false)
      } else {
        const error = await response.json()
        toast.error(error.error || "Erreur lors de la mise à jour des rôles")
      }
    } catch (error) {
      console.error("Error updating user roles:", error)
      toast.error("Erreur lors de la mise à jour des rôles")
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    // Restaurer les rôles originaux
    setSelectedRoles(new Set(user.storeRoles.map(role => role.id)))
    onOpenChange(false)
  }

  // Grouper les rôles par type
  const systemRoles = roles.filter(role => role.isSystem)
  const customRoles = roles.filter(role => !role.isSystem)

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[600px] sm:w-[700px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Gérer les rôles
          </SheetTitle>
          <SheetDescription>
            Modifiez les rôles assignés à cet utilisateur dans ce magasin
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 py-6">
          {/* Informations utilisateur */}
          <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
            <Avatar className="h-12 w-12">
              <AvatarImage src={user.image || undefined} />
              <AvatarFallback>{getUserInitials(user)}</AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-semibold">{getUserDisplayName(user)}</h3>
              <p className="text-sm text-gray-600">{user.email}</p>
            </div>
          </div>

          <Separator />

          {/* Sélection des rôles */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium text-gray-900 flex items-center">
                <Shield className="h-4 w-4 mr-2" />
                Rôles disponibles
              </h4>
              <Badge variant="outline">
                {selectedRoles.size} sélectionné(s)
              </Badge>
            </div>

            <Accordion type="multiple" defaultValue={["system", "custom"]} className="w-full">
              {/* Rôles système */}
              {systemRoles.length > 0 && (
                <AccordionItem value="system">
                  <AccordionTrigger className="text-sm">
                    Rôles système ({systemRoles.length})
                  </AccordionTrigger>
                  <AccordionContent className="space-y-3">
                    {systemRoles.map((role) => (
                      <div key={role.id} className="flex items-start space-x-3 p-3 border rounded-lg">
                        <Checkbox
                          id={`role-${role.id}`}
                          checked={selectedRoles.has(role.id)}
                          onCheckedChange={() => handleRoleToggle(role.id)}
                          className="mt-1"
                        />
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center space-x-2">
                            <label
                              htmlFor={`role-${role.id}`}
                              className="text-sm font-medium cursor-pointer"
                            >
                              {role.name}
                            </label>
                            <Badge variant="secondary" className="text-xs">
                              Système
                            </Badge>
                          </div>
                          {role.description && (
                            <p className="text-xs text-gray-600">{role.description}</p>
                          )}
                          <div className="flex items-center space-x-2 text-xs text-gray-500">
                            <Shield className="h-3 w-3" />
                            <span>{role.storeRolePermissions?.length || 0} permission(s)</span>
                            {role._count && (
                              <>
                                <span>•</span>
                                <span>{role._count.storeUserRoles} utilisateur(s)</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </AccordionContent>
                </AccordionItem>
              )}

              {/* Rôles personnalisés */}
              {customRoles.length > 0 && (
                <AccordionItem value="custom">
                  <AccordionTrigger className="text-sm">
                    Rôles personnalisés ({customRoles.length})
                  </AccordionTrigger>
                  <AccordionContent className="space-y-3">
                    {customRoles.map((role) => (
                      <div key={role.id} className="flex items-start space-x-3 p-3 border rounded-lg">
                        <Checkbox
                          id={`role-${role.id}`}
                          checked={selectedRoles.has(role.id)}
                          onCheckedChange={() => handleRoleToggle(role.id)}
                          className="mt-1"
                        />
                        <div className="flex-1 space-y-1">
                          <label
                            htmlFor={`role-${role.id}`}
                            className="text-sm font-medium cursor-pointer"
                          >
                            {role.name}
                          </label>
                          {role.description && (
                            <p className="text-xs text-gray-600">{role.description}</p>
                          )}
                          <div className="flex items-center space-x-2 text-xs text-gray-500">
                            <Shield className="h-3 w-3" />
                            <span>{role.storeRolePermissions?.length || 0} permission(s)</span>
                            {role._count && (
                              <>
                                <span>•</span>
                                <span>{role._count.storeUserRoles} utilisateur(s)</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </AccordionContent>
                </AccordionItem>
              )}
            </Accordion>

            {roles.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <Shield className="mx-auto h-12 w-12 text-gray-300 mb-2" />
                <p>Aucun rôle disponible</p>
                <p className="text-sm">Créez des rôles pour pouvoir les assigner aux utilisateurs</p>
              </div>
            )}
          </div>
        </div>

        <SheetFooter className="gap-2">
          <Button variant="outline" onClick={handleCancel} disabled={saving}>
            <X className="h-4 w-4 mr-2" />
            Annuler
          </Button>
          <Button onClick={handleSave} disabled={saving || selectedRoles.size === 0}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? "Enregistrement..." : "Enregistrer"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
