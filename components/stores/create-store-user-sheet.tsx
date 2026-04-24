"use client"

import { useState } from "react"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Save, Loader2, UserPlus, X, Info } from "lucide-react"
import { Separator } from "@/components/ui/separator"
import { toast } from "@/lib/app-toast"
import { Alert, AlertDescription } from "@/components/ui/alert"

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

interface CreateStoreUserSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  storeId: string
  roles: StoreRole[]
  onSuccess: () => void
}

export function CreateStoreUserSheet({ 
  open, 
  onOpenChange, 
  storeId, 
  roles, 
  onSuccess 
}: CreateStoreUserSheetProps) {
  const [email, setEmail] = useState("")
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [selectedRoles, setSelectedRoles] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)

  // Grouper les rôles par type
  const systemRoles = roles.filter(role => role.isSystem)
  const customRoles = roles.filter(role => !role.isSystem)

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
    if (!email.trim()) {
      toast.error("L'email est requis")
      return
    }

    if (!firstName.trim() || !lastName.trim()) {
      toast.error("Le prénom et nom sont requis")
      return
    }

    if (selectedRoles.size === 0) {
      toast.error("Au moins un rôle doit être sélectionné")
      return
    }

    setSaving(true)
    try {
      const response = await fetch(`/api/stores/${storeId}/users`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email.trim(),
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          password: "password", // Mot de passe par défaut
          roles: Array.from(selectedRoles),
        }),
      })

      if (response.ok) {
        toast.success("Utilisateur ajouté au magasin avec succès")
        // Reset form
        setEmail("")
        setFirstName("")
        setLastName("")
        setSelectedRoles(new Set())
        onSuccess()
      } else {
        const error = await response.json()
        toast.error(error.error || "Erreur lors de l'ajout de l'utilisateur")
      }
    } catch (error) {
      console.error("Error creating user:", error)
      toast.error("Erreur lors de la création de l'utilisateur")
    } finally {
      setSaving(false)
    }
  }

  const resetForm = () => {
    setEmail("")
    setFirstName("")
    setLastName("")
    setSelectedRoles(new Set())
  }

  const handleOpenChange = (open: boolean) => {
    if (!open && !saving) {
      resetForm()
    }
    onOpenChange(open)
  }

  const totalSelectedRoles = selectedRoles.size

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent className="w-[600px] sm:w-[700px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Nouvel utilisateur
          </SheetTitle>
          <SheetDescription>
            Ajoutez un utilisateur à ce magasin. Si l'utilisateur n'existe pas, il sera créé avec le mot de passe par défaut "password".
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 py-6">
          {/* Alerte mot de passe par défaut */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Si l'utilisateur n'existe pas, il sera créé avec le mot de passe par défaut <strong>"password"</strong>. 
              S'il existe déjà, il sera simplement ajouté à ce magasin avec les rôles sélectionnés.
            </AlertDescription>
          </Alert>

          {/* Informations personnelles */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName">Prénom *</Label>
                <Input
                  id="firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Ex: Jean"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="lastName">Nom *</Label>
                <Input
                  id="lastName"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Ex: Dupont"
                  className="mt-1"
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Ex: jean.dupont@example.com"
                className="mt-1"
              />
            </div>
          </div>

          <Separator />

          {/* Sélection des rôles */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <Label className="text-base font-medium">
                Rôles ({totalSelectedRoles} sélectionné{totalSelectedRoles > 1 ? 's' : ''})
              </Label>
              <Badge variant="outline">
                {totalSelectedRoles} rôle{totalSelectedRoles > 1 ? 's' : ''}
              </Badge>
            </div>
            
            <p className="text-sm text-gray-600 mb-4">
              Sélectionnez les rôles à attribuer à cet utilisateur dans ce magasin.
            </p>

            {roles.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <UserPlus className="mx-auto h-12 w-12 text-gray-300 mb-2" />
                <p>Aucun rôle disponible</p>
                <p className="text-sm">Créez d'abord des rôles dans la section Rôles</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Rôles système */}
                {systemRoles.length > 0 && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                      Rôles système
                      <Badge variant="outline" className="text-xs">
                        {systemRoles.length}
                      </Badge>
                    </h4>
                    <div className="space-y-2">
                      {systemRoles.map((role) => (
                        <div key={role.id} className="flex items-start space-x-3 p-3 border rounded-lg">
                          <Checkbox
                            id={role.id}
                            checked={selectedRoles.has(role.id)}
                            onCheckedChange={() => handleRoleToggle(role.id)}
                          />
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <label
                                htmlFor={role.id}
                                className="text-sm font-medium cursor-pointer"
                              >
                                {role.name}
                              </label>
                              <Badge className="bg-orange-100 text-orange-800 border-orange-200 text-xs">
                                Système
                              </Badge>
                            </div>
                            {role.description && (
                              <p className="text-xs text-gray-600 mt-1">
                                {role.description}
                              </p>
                            )}
                            <p className="text-xs text-gray-500 mt-1">
                              {role.storeRolePermissions.length} permission{role.storeRolePermissions.length > 1 ? 's' : ''}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Rôles personnalisés */}
                {customRoles.length > 0 && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                      Rôles personnalisés
                      <Badge variant="outline" className="text-xs">
                        {customRoles.length}
                      </Badge>
                    </h4>
                    <div className="space-y-2">
                      {customRoles.map((role) => (
                        <div key={role.id} className="flex items-start space-x-3 p-3 border rounded-lg">
                          <Checkbox
                            id={role.id}
                            checked={selectedRoles.has(role.id)}
                            onCheckedChange={() => handleRoleToggle(role.id)}
                          />
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <label
                                htmlFor={role.id}
                                className="text-sm font-medium cursor-pointer"
                              >
                                {role.name}
                              </label>
                              <Badge className="bg-blue-100 text-blue-800 border-blue-200 text-xs">
                                Personnalisé
                              </Badge>
                            </div>
                            {role.description && (
                              <p className="text-xs text-gray-600 mt-1">
                                {role.description}
                              </p>
                            )}
                            <p className="text-xs text-gray-500 mt-1">
                              {role.storeRolePermissions.length} permission{role.storeRolePermissions.length > 1 ? 's' : ''}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-6 border-t">
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={saving}
          >
            <X className="mr-2 h-4 w-4" />
            Annuler
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || !email.trim() || !firstName.trim() || !lastName.trim() || selectedRoles.size === 0}
          >
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            {saving ? "Création..." : "Créer l'utilisateur"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
