"use client"

import { useState, useEffect } from "react"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Shield, Save, Loader2 } from "lucide-react"

interface User {
  id: string
  email: string
  firstName: string | null
  lastName: string | null
  userRoles: Array<{
    role: {
      id: string
      name: string
    }
  }>
}

interface Role {
  id: string
  name: string
  description: string | null
  isSystem: boolean
}

interface UserRolesSheetProps {
  user: User
  open: boolean
  onOpenChange: (open: boolean) => void
  onRolesUpdated: () => void
}

export function UserRolesSheet({ user, open, onOpenChange, onRolesUpdated }: UserRolesSheetProps) {
  const [allRoles, setAllRoles] = useState<Role[]>([])
  const [selectedRoles, setSelectedRoles] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open && user) {
      loadRoles()
    }
  }, [open, user])

  const loadRoles = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/roles")
      if (response.ok) {
        const roles: Role[] = await response.json()
        setAllRoles(roles)

        // Définir les rôles actuels de l'utilisateur
        const currentRoles = new Set(user.userRoles.map((ur) => ur.role.id))
        setSelectedRoles(currentRoles)
      }
    } catch (error) {
      console.error("Error loading roles:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleRoleToggle = (roleId: string) => {
    const newSelected = new Set(selectedRoles)
    if (newSelected.has(roleId)) {
      newSelected.delete(roleId)
    } else {
      newSelected.add(roleId)
    }
    setSelectedRoles(newSelected)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const response = await fetch(`/api/users/${user.id}/roles`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          roleIds: Array.from(selectedRoles),
        }),
      })

      if (response.ok) {
        onRolesUpdated()
      }
    } catch (error) {
      console.error("Error updating user roles:", error)
    } finally {
      setSaving(false)
    }
  }

  const getUserDisplayName = () => {
    if (user.firstName && user.lastName) {
      return `${user.firstName} ${user.lastName}`
    }
    return user.email
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[600px] sm:max-w-[600px]">
        <SheetHeader>
          <SheetTitle className="flex items-center space-x-2">
            <Shield className="w-5 h-5" />
            <span>Rôles de {getUserDisplayName()}</span>
          </SheetTitle>
          <SheetDescription>Gérez les rôles assignés à cet utilisateur</SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Rôles disponibles</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {allRoles.map((role) => (
                      <div key={role.id} className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50">
                        <Checkbox
                          id={role.id}
                          checked={selectedRoles.has(role.id)}
                          onCheckedChange={() => handleRoleToggle(role.id)}
                        />
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <label htmlFor={role.id} className="text-sm font-medium cursor-pointer">
                              {role.name}
                            </label>
                            {role.isSystem && (
                              <Badge variant="secondary" className="text-xs">
                                Système
                              </Badge>
                            )}
                          </div>
                          {role.description && <p className="text-xs text-gray-500 mt-1">{role.description}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

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
