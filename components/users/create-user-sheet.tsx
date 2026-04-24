"use client"

import { useState, useEffect, useCallback } from "react"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { UserPlus, Save, Loader2, Plus, Trash2, Store } from "lucide-react"
import { toast } from "@/lib/app-toast"

interface Role {
  id: string
  name: string
  description: string | null
}

interface StoreOption {
  id: string
  name: string
}

interface StoreRole {
  id: string
  name: string
  description: string | null
}

interface StoreAssignmentRow {
  key: string
  storeId: string
  roleIds: string[]
}

/** Au-dessus du Sheet (z-[2000]) : sans cela, les listes Select restent invisibles derrière le panneau. */
const SELECT_IN_SHEET_CLASS = "z-[2100] max-h-[min(280px,var(--radix-select-content-available-height))]"

interface CreateUserSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onUserCreated: () => void
}

export function CreateUserSheet({ open, onOpenChange, onUserCreated }: CreateUserSheetProps) {
  const [formData, setFormData] = useState({
    email: "",
    firstName: "",
    lastName: "",
    password: "",
    status: "ACTIVE",
  })
  const [selectedRoles, setSelectedRoles] = useState<Set<string>>(new Set())
  const [roles, setRoles] = useState<Role[]>([])
  const [saving, setSaving] = useState(false)
  const [loadingRoles, setLoadingRoles] = useState(false)

  const [stores, setStores] = useState<StoreOption[]>([])
  const [loadingStores, setLoadingStores] = useState(false)
  const [storeRows, setStoreRows] = useState<StoreAssignmentRow[]>([])
  const [rolesByStoreId, setRolesByStoreId] = useState<Record<string, StoreRole[]>>({})
  const [loadingStoreRolesKey, setLoadingStoreRolesKey] = useState<string | null>(null)

  const loadStores = useCallback(async () => {
    setLoadingStores(true)
    try {
      const response = await fetch("/api/stores", { credentials: "same-origin" })
      const data = await response.json().catch(() => null)
      if (!response.ok) {
        const msg =
          data && typeof data === "object" && "message" in data
            ? String((data as { message: string }).message)
            : `Erreur ${response.status}`
        toast.error("Chargement des magasins impossible", { description: msg })
        setStores([])
        return
      }
      setStores(
        Array.isArray(data)
          ? data.map((s: { id: string; name: string }) => ({ id: s.id, name: s.name ?? "Sans nom" }))
          : [],
      )
    } catch (error) {
      console.error("Error loading stores:", error)
      toast.error("Réseau : impossible de charger les magasins")
      setStores([])
    } finally {
      setLoadingStores(false)
    }
  }, [])

  const loadRoles = async () => {
    setLoadingRoles(true)
    try {
      const response = await fetch("/api/roles")
      if (response.ok) {
        const data = await response.json()
        setRoles(data)
      }
    } catch (error) {
      console.error("Error loading roles:", error)
    } finally {
      setLoadingRoles(false)
    }
  }

  useEffect(() => {
    if (open) {
      loadRoles()
      loadStores()
      setFormData({
        email: "",
        firstName: "",
        lastName: "",
        password: "",
        status: "ACTIVE",
      })
      setSelectedRoles(new Set())
      setStoreRows([])
      setRolesByStoreId({})
    }
  }, [open, loadStores])

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
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

  const addStoreRow = () => {
    setStoreRows((prev) => [...prev, { key: crypto.randomUUID(), storeId: "", roleIds: [] }])
  }

  const removeStoreRow = (key: string) => {
    setStoreRows((prev) => prev.filter((r) => r.key !== key))
  }

  const setRowStore = async (rowKey: string, storeId: string) => {
    setStoreRows((prev) =>
      prev.map((r) => (r.key === rowKey ? { ...r, storeId, roleIds: [] } : r)),
    )
    if (!storeId) return

    if (rolesByStoreId[storeId]) return

    setLoadingStoreRolesKey(rowKey)
    try {
      const res = await fetch(`/api/stores/${storeId}/roles`)
      if (res.ok) {
        const data = await res.json()
        setRolesByStoreId((prev) => ({ ...prev, [storeId]: data }))
      } else {
        toast.error("Impossible de charger les rôles du magasin")
      }
    } catch {
      toast.error("Erreur réseau lors du chargement des rôles magasin")
    } finally {
      setLoadingStoreRolesKey(null)
    }
  }

  const toggleStoreRole = (rowKey: string, roleId: string) => {
    setStoreRows((prev) =>
      prev.map((r) => {
        if (r.key !== rowKey) return r
        const has = r.roleIds.includes(roleId)
        return {
          ...r,
          roleIds: has ? r.roleIds.filter((id) => id !== roleId) : [...r.roleIds, roleId],
        }
      }),
    )
  }

  const storesAvailableForRow = (rowKey: string) => {
    const taken = new Set(storeRows.filter((r) => r.key !== rowKey && r.storeId).map((r) => r.storeId))
    return stores.filter((s) => !taken.has(s.id) || storeRows.find((r) => r.key === rowKey)?.storeId === s.id)
  }

  const handleSave = async () => {
    for (const row of storeRows) {
      if (row.storeId && row.roleIds.length === 0) {
        toast.error("Pour chaque magasin sélectionné, choisissez au moins un rôle magasin.")
        return
      }
    }

    setSaving(true)
    try {
      const response = await fetch("/api/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          roleIds: Array.from(selectedRoles),
        }),
      })

      if (!response.ok) {
        const err = await response.json().catch(() => ({}))
        toast.error(err.error === "Email already exists" ? "Cet email est déjà utilisé" : "Création impossible")
        return
      }

      const validRows = storeRows.filter((r) => r.storeId && r.roleIds.length > 0)
      const storeErrors: string[] = []

      for (const row of validRows) {
        const res = await fetch(`/api/stores/${row.storeId}/users`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: formData.email.trim(),
            firstName: formData.firstName.trim(),
            lastName: formData.lastName.trim(),
            password: formData.password,
            roles: row.roleIds,
          }),
        })
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          const name = stores.find((s) => s.id === row.storeId)?.name ?? row.storeId
          storeErrors.push(`${name}: ${data.error || res.statusText}`)
        }
      }

      if (storeErrors.length > 0) {
        toast.warning("Utilisateur créé, mais certains magasins n’ont pas pu être assignés", {
          description: storeErrors.slice(0, 3).join(" · "),
        })
      } else if (validRows.length > 0) {
        toast.success("Utilisateur créé et assigné aux magasins sélectionnés")
      } else {
        toast.success("Utilisateur créé")
      }

      onUserCreated()
      onOpenChange(false)
    } catch (error) {
      console.error("Error creating user:", error)
      toast.error("Une erreur est survenue")
    } finally {
      setSaving(false)
    }
  }

  const isFormValid = formData.email && formData.password && formData.firstName && formData.lastName

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[600px] sm:max-w-[640px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center space-x-2">
            <UserPlus className="w-5 h-5" />
            <span>Créer un utilisateur</span>
          </SheetTitle>
          <SheetDescription>
            Ajoutez un utilisateur, ses rôles globaux et optionnellement un ou plusieurs magasins.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Informations personnelles</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">Prénom *</Label>
                  <Input
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) => handleInputChange("firstName", e.target.value)}
                    placeholder="Prénom"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Nom *</Label>
                  <Input
                    id="lastName"
                    value={formData.lastName}
                    onChange={(e) => handleInputChange("lastName", e.target.value)}
                    placeholder="Nom"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  placeholder="email@example.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Mot de passe *</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => handleInputChange("password", e.target.value)}
                  placeholder="Mot de passe"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Statut</Label>
                <Select value={formData.status} onValueChange={(value) => handleInputChange("status", value)}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className={SELECT_IN_SHEET_CLASS}>
                    <SelectItem value="ACTIVE">Actif</SelectItem>
                    <SelectItem value="INACTIVE">Inactif</SelectItem>
                    <SelectItem value="SUSPENDED">Suspendu</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Rôles globaux</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingRoles ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              ) : (
                <div className="space-y-3">
                  {roles.map((role) => (
                    <div key={role.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`global-${role.id}`}
                        checked={selectedRoles.has(role.id)}
                        onCheckedChange={() => handleRoleToggle(role.id)}
                      />
                      <label
                        htmlFor={`global-${role.id}`}
                        className="text-sm font-medium leading-none cursor-pointer flex-1"
                      >
                        <div>
                          <p>{role.name}</p>
                          {role.description && <p className="text-xs text-gray-500">{role.description}</p>}
                        </div>
                      </label>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="flex items-center gap-2">
                <Store className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-base">Magasins (optionnel)</CardTitle>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addStoreRow}
                disabled={loadingStores || stores.length === 0}
              >
                <Plus className="h-4 w-4 mr-1" />
                Ajouter
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {loadingStores ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Chargement des magasins…
                </div>
              ) : stores.length === 0 ? (
                <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                  Aucun magasin en base. Créez-en un depuis <strong>Nos magasins</strong>, puis rouvrez ce formulaire.
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  {stores.length} magasin(s) disponible(s). Cliquez sur <strong>Ajouter</strong>, puis choisissez un
                  magasin dans la liste.
                </p>
              )}
              {!loadingStores && stores.length > 0 && storeRows.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Utilisez « Ajouter » pour lier cet utilisateur à un ou plusieurs points de vente.
                </p>
              ) : null}
              {storeRows.length > 0 ? (
                storeRows.map((row) => {
                  const storeRoles = row.storeId ? rolesByStoreId[row.storeId] ?? [] : []
                  const options = storesAvailableForRow(row.key)
                  return (
                    <div key={row.key} className="rounded-lg border bg-muted/30 p-3 space-y-3">
                      <div className="flex items-start gap-2">
                        <div className="flex-1 space-y-2">
                          <Label>Magasin</Label>
                          <Select
                            value={row.storeId || "__none__"}
                            onValueChange={(v) => setRowStore(row.key, v === "__none__" ? "" : v)}
                          >
                            <SelectTrigger className="w-full min-w-0">
                              <SelectValue placeholder="Choisir un magasin" />
                            </SelectTrigger>
                            <SelectContent className={SELECT_IN_SHEET_CLASS} position="popper">
                              <SelectItem value="__none__">—</SelectItem>
                              {options.map((s) => (
                                <SelectItem key={s.id} value={s.id}>
                                  {s.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="mt-8 shrink-0 text-destructive"
                          onClick={() => removeStoreRow(row.key)}
                          aria-label="Retirer cette ligne"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>

                      {row.storeId && (
                        <div className="space-y-2 pl-1">
                          <Label className="text-xs text-muted-foreground">Rôles dans ce magasin</Label>
                          {loadingStoreRolesKey === row.key ? (
                            <div className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Chargement des rôles…
                            </div>
                          ) : storeRoles.length === 0 ? (
                            <p className="text-xs text-amber-700">Aucun rôle disponible pour ce magasin.</p>
                          ) : (
                            <div className="space-y-2 max-h-40 overflow-y-auto">
                              {storeRoles.map((sr) => (
                                <div key={sr.id} className="flex items-center space-x-2">
                                  <Checkbox
                                    id={`${row.key}-sr-${sr.id}`}
                                    checked={row.roleIds.includes(sr.id)}
                                    onCheckedChange={() => toggleStoreRole(row.key, sr.id)}
                                  />
                                  <label
                                    htmlFor={`${row.key}-sr-${sr.id}`}
                                    className="text-sm cursor-pointer flex-1 leading-tight"
                                  >
                                    {sr.name}
                                    {sr.description ? (
                                      <span className="block text-xs text-muted-foreground">{sr.description}</span>
                                    ) : null}
                                  </label>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })
              ) : null}
            </CardContent>
          </Card>

          <div className="flex justify-end space-x-2 pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button onClick={handleSave} disabled={saving || !isFormValid}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Save className="mr-2 h-4 w-4" />
              Créer l&apos;utilisateur
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
