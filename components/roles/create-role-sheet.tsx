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
import { Save, Loader2, ShieldCheck, X } from "lucide-react"
import { Separator } from "@/components/ui/separator"

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
      warehouses: "🏭",
      stores: "🏪",
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
      warehouses: "Entrepôts",
      stores: "Magasins",
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
      manage_stock: "Gérer stock",
      transfer: "Transférer",
      inventory: "Inventaire",
      assign_manager: "Assigner gestionnaire",
      manage_inventory: "Gérer inventaire",
      view_sales: "Voir ventes",
    }
    return names[action] || action
  }

  const isFormValid = name.trim() && selectedPermissions.size > 0

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-[900px] p-0 flex flex-col h-full">
        {/* Header */}
        <div className="px-6 py-4 border-b bg-gradient-to-r from-primary/5 to-primary/10 shrink-0">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2 text-xl">
              <div className="p-2 rounded-lg bg-primary/10">
                <ShieldCheck className="w-5 h-5 text-primary" />
              </div>
              <span>Créer un nouveau rôle</span>
            </SheetTitle>
            <SheetDescription className="text-sm mt-1">
              Configurez les informations et les permissions du nouveau rôle
            </SheetDescription>
          </SheetHeader>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto px-6">
          <div className="py-6 space-y-6">
            {/* Informations de base */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="h-px flex-1 bg-border" />
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Informations générales
                </h3>
                <div className="h-px flex-1 bg-border" />
              </div>

              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-sm font-medium">
                    Nom du rôle <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: Gestionnaire commercial"
                    className="h-10"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description" className="text-sm font-medium">
                    Description
                  </Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Décrivez les responsabilités et le périmètre d'action de ce rôle..."
                    rows={3}
                    className="resize-none"
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Permissions */}
            <div className="space-y-4 pb-6">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="h-px flex-1 bg-border" />
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                    Permissions
                  </h3>
                  <div className="h-px flex-1 bg-border" />
                </div>
                <Badge variant="secondary" className="ml-3">
                  {selectedPermissions.size} sélectionnée{selectedPermissions.size !== 1 ? "s" : ""}
                </Badge>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center space-y-3">
                    <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
                    <p className="text-sm text-muted-foreground">Chargement des permissions...</p>
                  </div>
                </div>
              ) : (
                <Accordion type="multiple" className="space-y-2">
                  {Object.entries(allPermissions).map(([module, permissions]) => {
                    const selectedCount = permissions.filter((p) => selectedPermissions.has(p.id)).length
                    const isFullySelected = isModuleFullySelected(module)
                    const isPartiallySelected = isModulePartiallySelected(module)

                    return (
                      <AccordionItem
                        key={module}
                        value={module}
                        className="border rounded-lg overflow-hidden bg-card"
                      >
                        <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/50 transition-colors">
                          <div className="flex items-center justify-between w-full pr-2">
                            <div className="flex items-center gap-3">
                              <Checkbox
                                checked={isFullySelected}
                                onCheckedChange={(checked) => handleModuleToggle(module, checked as boolean)}
                                onClick={(e) => e.stopPropagation()}
                                className={
                                  isPartiallySelected
                                    ? "data-[state=checked]:bg-orange-500 data-[state=checked]:border-orange-500"
                                    : ""
                                }
                              />
                              <div className="flex items-center gap-2">
                                <span className="text-2xl">{getModuleIcon(module)}</span>
                                <span className="font-semibold text-sm">{getModuleName(module)}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge
                                variant={selectedCount > 0 ? "default" : "outline"}
                                className="text-xs font-normal"
                              >
                                {selectedCount}/{permissions.length}
                              </Badge>
                            </div>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="px-4 pb-4 pt-2">
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            {permissions.map((permission) => (
                              <div
                                key={permission.id}
                                className="flex items-center space-x-2 p-2 rounded-md hover:bg-muted/50 transition-colors"
                              >
                                <Checkbox
                                  id={permission.id}
                                  checked={selectedPermissions.has(permission.id)}
                                  onCheckedChange={() => handlePermissionToggle(permission.id)}
                                />
                                <label
                                  htmlFor={permission.id}
                                  className="text-sm font-medium leading-none cursor-pointer flex-1"
                                >
                                  {getActionName(permission.action)}
                                </label>
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
        </div>

        {/* Fixed Footer - Toujours visible en bas */}
        <div className="border-t bg-background shadow-lg shrink-0">
          <div className="px-6 py-4">
            <div className="grid grid-cols-2 gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="h-11"
                disabled={saving}
              >
                <X className="mr-2 h-4 w-4" />
                Annuler
              </Button>
              <Button onClick={handleSave} disabled={saving || !isFormValid} className="h-11">
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Création...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Créer le rôle
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
