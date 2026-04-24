"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Edit, Save, Loader2, Plus, Trash2, Store } from "lucide-react"
import { toast } from "@/lib/app-toast"

const SELECT_IN_SHEET_CLASS = "z-[2100] max-h-[min(280px,var(--radix-select-content-available-height))]"

export interface EditUserSheetUser {
  id: string
  email: string
  firstName: string | null
  lastName: string | null
  name: string | null
  status: string
  storeUserRoles?: Array<{
    store: { id: string; name: string }
    role: { id: string; name: string }
  }>
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

interface EditUserSheetProps {
  user: EditUserSheetUser
  open: boolean
  onOpenChange: (open: boolean) => void
  onUserUpdated: () => void
}

function rowsFromStoreUserRoles(
  storeUserRoles: NonNullable<EditUserSheetUser["storeUserRoles"]>,
): StoreAssignmentRow[] {
  const byStore = new Map<string, Set<string>>()
  for (const sur of storeUserRoles) {
    const sid = sur.store.id
    if (!byStore.has(sid)) byStore.set(sid, new Set())
    byStore.get(sid)!.add(sur.role.id)
  }
  return Array.from(byStore.entries()).map(([storeId, ids]) => ({
    key: crypto.randomUUID(),
    storeId,
    roleIds: Array.from(ids),
  }))
}

function baselineFromUser(
  storeUserRoles: NonNullable<EditUserSheetUser["storeUserRoles"]>,
): Map<string, string[]> {
  const m = new Map<string, Set<string>>()
  for (const sur of storeUserRoles) {
    if (!m.has(sur.store.id)) m.set(sur.store.id, new Set())
    m.get(sur.store.id)!.add(sur.role.id)
  }
  return new Map(Array.from(m.entries()).map(([k, v]) => [k, Array.from(v)]))
}

function sameRoleSet(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false
  const sa = new Set(a)
  return b.every((id) => sa.has(id))
}

export function EditUserSheet({ user, open, onOpenChange, onUserUpdated }: EditUserSheetProps) {
  const [formData, setFormData] = useState({
    email: user.email,
    firstName: user.firstName || "",
    lastName: user.lastName || "",
    status: user.status,
    password: "",
  })
  const [saving, setSaving] = useState(false)

  const [stores, setStores] = useState<StoreOption[]>([])
  const [loadingStores, setLoadingStores] = useState(false)
  const [storeRows, setStoreRows] = useState<StoreAssignmentRow[]>([])
  const [rolesByStoreId, setRolesByStoreId] = useState<Record<string, StoreRole[]>>({})
  const [loadingStoreRolesKey, setLoadingStoreRolesKey] = useState<string | null>(null)
  const baselineStoresRef = useRef<Map<string, string[]>>(new Map())

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
    } catch {
      toast.error("Réseau : impossible de charger les magasins")
      setStores([])
    } finally {
      setLoadingStores(false)
    }
  }, [])

  useEffect(() => {
    if (open) {
      setFormData({
        email: user.email,
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        status: user.status,
        password: "",
      })
      loadStores()
      const sur = user.storeUserRoles ?? []
      baselineStoresRef.current = baselineFromUser(sur)
      setStoreRows(sur.length ? rowsFromStoreUserRoles(sur) : [])
      setRolesByStoreId({})
      const uniqueStoreIds = [...new Set(sur.map((x) => x.store.id))]
      uniqueStoreIds.forEach((sid) => {
        void fetch(`/api/stores/${sid}/roles`, { credentials: "same-origin" })
          .then((res) => (res.ok ? res.json() : null))
          .then((list) => {
            if (Array.isArray(list)) {
              setRolesByStoreId((prev) => ({ ...prev, [sid]: list }))
            }
          })
          .catch(() => {})
      })
    }
  }, [open, user, loadStores])

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
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
      const res = await fetch(`/api/stores/${storeId}/roles`, { credentials: "same-origin" })
      if (res.ok) {
        const data = await res.json()
        setRolesByStoreId((prev) => ({ ...prev, [storeId]: data }))
      } else {
        toast.error("Impossible de charger les rôles du magasin")
      }
    } catch {
      toast.error("Erreur réseau (rôles magasin)")
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

  const syncStoreAssignments = async (userId: string, email: string, firstName: string, lastName: string) => {
    for (const row of storeRows) {
      if (row.storeId && row.roleIds.length === 0) {
        toast.error("Pour chaque magasin sélectionné, choisissez au moins un rôle magasin.")
        throw new Error("validation")
      }
    }

    const desired = new Map<string, string[]>()
    for (const row of storeRows) {
      if (row.storeId && row.roleIds.length > 0) {
        desired.set(row.storeId, row.roleIds)
      }
    }

    const baseline = baselineStoresRef.current
    const warnings: string[] = []

    for (const [storeId, oldRoleIds] of baseline) {
      const newRoleIds = desired.get(storeId)
      if (newRoleIds === undefined) {
        const res = await fetch(`/api/stores/${storeId}/users/${userId}/roles`, {
          method: "DELETE",
          credentials: "same-origin",
        })
        if (!res.ok) {
          const d = await res.json().catch(() => ({}))
          warnings.push(`${storeId}: ${(d as { error?: string }).error ?? res.statusText}`)
        }
      } else if (!sameRoleSet(oldRoleIds, newRoleIds)) {
        const res = await fetch(`/api/stores/${storeId}/users/${userId}/roles`, {
          method: "PUT",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ roleIds: newRoleIds }),
        })
        if (!res.ok) {
          const d = await res.json().catch(() => ({}))
          warnings.push(
            `${stores.find((s) => s.id === storeId)?.name ?? storeId}: ${(d as { error?: string }).error ?? res.statusText}`,
          )
        }
      }
    }

    for (const [storeId, newRoleIds] of desired) {
      if (!baseline.has(storeId)) {
        const res = await fetch(`/api/stores/${storeId}/users`, {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: email.trim(),
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            password: formData.password.trim() || "password",
            roles: newRoleIds,
          }),
        })
        if (!res.ok) {
          const d = await res.json().catch(() => ({}))
          warnings.push(
            `${stores.find((s) => s.id === storeId)?.name ?? storeId}: ${(d as { error?: string }).error ?? res.statusText}`,
          )
        }
      }
    }

    if (warnings.length > 0) {
      toast.warning("Profil enregistré, mais certaines assignations magasin ont échoué", {
        description: warnings.slice(0, 3).join(" · "),
      })
    }
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
      const updateData: Record<string, unknown> = {
        email: formData.email,
        firstName: formData.firstName,
        lastName: formData.lastName,
        status: formData.status,
      }
      if (formData.password.trim()) {
        updateData.password = formData.password
      }

      const response = await fetch(`/api/users/${user.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(updateData),
      })

      if (!response.ok) {
        const err = await response.json().catch(() => ({}))
        toast.error(
          (err as { error?: string }).error === "Email already exists"
            ? "Cet email est déjà utilisé"
            : "Mise à jour impossible",
        )
        return
      }

      try {
        await syncStoreAssignments(
          user.id,
          formData.email,
          formData.firstName,
          formData.lastName,
        )
      } catch (e) {
        if ((e as Error).message === "validation") {
          return
        }
        throw e
      }

      toast.success("Utilisateur mis à jour")
      onUserUpdated()
      onOpenChange(false)
    } catch (error) {
      console.error("Error updating user:", error)
      toast.error("Une erreur est survenue")
    } finally {
      setSaving(false)
    }
  }

  const isFormValid = formData.email && formData.firstName && formData.lastName

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[500px] sm:max-w-[640px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center space-x-2">
            <Edit className="w-5 h-5" />
            <span>Modifier l&apos;utilisateur</span>
          </SheetTitle>
          <SheetDescription>Informations, statut et rattachement aux magasins</SheetDescription>
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
                <Label htmlFor="password">Nouveau mot de passe (optionnel)</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => handleInputChange("password", e.target.value)}
                  placeholder="Laisser vide pour ne pas changer"
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
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="flex items-center gap-2">
                <Store className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-base">Magasins</CardTitle>
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
                  Aucun magasin disponible.
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  {stores.length} magasin(s). Modifiez les rôles ou ajoutez un magasin. Retirer une ligne puis
                  enregistrer supprime l&apos;accès à ce magasin.
                </p>
              )}
              {storeRows.length > 0
                ? storeRows.map((row) => {
                    const storeRoles = row.storeId ? rolesByStoreId[row.storeId] ?? [] : []
                    const options = storesAvailableForRow(row.key)
                    return (
                      <div key={row.key} className="rounded-lg border bg-muted/30 p-3 space-y-3">
                        <div className="flex items-start gap-2">
                          <div className="flex-1 space-y-2 min-w-0">
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
                                Chargement…
                              </div>
                            ) : storeRoles.length === 0 ? (
                              <p className="text-xs text-amber-700">Aucun rôle disponible.</p>
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
                : !loadingStores && stores.length > 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Aucune ligne — l&apos;utilisateur n&apos;est rattaché à aucun magasin. Utilisez « Ajouter ».
                    </p>
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
              Enregistrer
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
