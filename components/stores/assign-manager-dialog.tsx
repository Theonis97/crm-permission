"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { UserPlus, Users, Loader2, CheckCircle2, UserCog } from "lucide-react"
import { toast } from "sonner"

interface User {
  id: string
  email: string
  firstName: string | null
  lastName: string | null
  name: string | null
}

interface AssignManagerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  storeId: string
  storeName: string
  currentManager?: {
    id: string
    email: string
    firstName: string | null
    lastName: string | null
    name: string | null
  } | null
  onSuccess: () => void
}

export function AssignManagerDialog({
  open,
  onOpenChange,
  storeId,
  storeName,
  currentManager,
  onSuccess,
}: AssignManagerDialogProps) {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState<string | null>(currentManager?.id || null)
  const [activeTab, setActiveTab] = useState<"select" | "create">("select")
  
  const [newUserData, setNewUserData] = useState({
    email: "",
    firstName: "",
    lastName: "",
    phone: "",
  })

  useEffect(() => {
    if (open) {
      loadUsers()
      setSelectedUserId(currentManager?.id || null)
    }
  }, [open, currentManager])

  const loadUsers = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/users")
      
      if (!response.ok) {
        throw new Error("Erreur lors du chargement des utilisateurs")
      }

      const data = await response.json()
      setUsers(data)
    } catch (error) {
      console.error("Error loading users:", error)
      toast.error("Erreur lors du chargement des utilisateurs")
    } finally {
      setLoading(false)
    }
  }

  const handleAssignExisting = async () => {
    if (!selectedUserId) {
      toast.error("Veuillez sélectionner un utilisateur")
      return
    }

    try {
      setSubmitting(true)
      const response = await fetch(`/api/stores/${storeId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ managerId: selectedUserId }),
      })

      if (!response.ok) {
        throw new Error("Erreur lors de l'assignation")
      }

      toast.success("Manager assigné!", {
        description: `Le manager a été assigné à ${storeName}`,
        icon: <CheckCircle2 className="h-4 w-4" />,
      })

      onSuccess()
      onOpenChange(false)
    } catch (error) {
      toast.error("Erreur", {
        description: error instanceof Error ? error.message : "Impossible d'assigner le manager",
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleRemoveManager = async () => {
    if (!confirm(`Êtes-vous sûr de vouloir retirer le manager de ${storeName} ?`)) {
      return
    }

    try {
      setSubmitting(true)
      const response = await fetch(`/api/stores/${storeId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ managerId: null }),
      })

      if (!response.ok) {
        throw new Error("Erreur lors de la suppression")
      }

      toast.success("Manager retiré", {
        description: `Le manager a été retiré de ${storeName}`,
      })

      onSuccess()
      onOpenChange(false)
    } catch (error) {
      toast.error("Erreur", {
        description: error instanceof Error ? error.message : "Impossible de retirer le manager",
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleCreateAndAssign = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!newUserData.email || !newUserData.firstName || !newUserData.lastName) {
      toast.error("Veuillez remplir tous les champs obligatoires")
      return
    }

    try {
      setSubmitting(true)

      // Créer l'utilisateur
      const createResponse = await fetch("/api/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...newUserData,
          password: "Manager@2025", // Mot de passe par défaut
          status: "ACTIVE",
          roleIds: [],
        }),
      })

      if (!createResponse.ok) {
        const error = await createResponse.json()
        throw new Error(error.error || "Erreur lors de la création de l'utilisateur")
      }

      const newUser = await createResponse.json()

      // Assigner le nouvel utilisateur comme manager
      const assignResponse = await fetch(`/api/stores/${storeId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ managerId: newUser.id }),
      })

      if (!assignResponse.ok) {
        throw new Error("Utilisateur créé mais erreur lors de l'assignation")
      }

      toast.success("Manager créé et assigné!", {
        description: `${newUser.firstName} ${newUser.lastName} a été créé et assigné à ${storeName}`,
        icon: <CheckCircle2 className="h-4 w-4" />,
      })

      // Réinitialiser le formulaire
      setNewUserData({
        email: "",
        firstName: "",
        lastName: "",
        phone: "",
      })

      onSuccess()
      onOpenChange(false)
    } catch (error) {
      toast.error("Erreur", {
        description: error instanceof Error ? error.message : "Impossible de créer et assigner le manager",
      })
    } finally {
      setSubmitting(false)
    }
  }

  const getUserDisplayName = (user: User) => {
    if (user.firstName && user.lastName) {
      return `${user.firstName} ${user.lastName}`
    }
    return user.name || user.email
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCog className="h-5 w-5 text-blue-600" />
            {currentManager ? "Changer le manager" : "Assigner un manager"}
          </DialogTitle>
          <DialogDescription>
            {currentManager 
              ? `Manager actuel : ${getUserDisplayName(currentManager)}`
              : `Assigner un manager à ${storeName}`
            }
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "select" | "create")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="select">
              <Users className="h-4 w-4 mr-2" />
              Sélectionner
            </TabsTrigger>
            <TabsTrigger value="create">
              <UserPlus className="h-4 w-4 mr-2" />
              Créer
            </TabsTrigger>
          </TabsList>

          {/* Sélectionner un utilisateur existant */}
          <TabsContent value="select" className="space-y-4">
            <div className="space-y-2">
              <Label>Utilisateur</Label>
              <Select
                value={selectedUserId || "none"}
                onValueChange={(val) => setSelectedUserId(val === "none" ? null : val)}
                disabled={loading}
              >
                <SelectTrigger>
                  <SelectValue placeholder={loading ? "Chargement..." : "Sélectionner un utilisateur"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">
                    <span className="text-gray-500 italic">Aucun manager</span>
                  </SelectItem>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      <div className="flex flex-col">
                        <span className="font-medium">{getUserDisplayName(user)}</span>
                        <span className="text-xs text-gray-500">{user.email}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <DialogFooter className="flex gap-2">
              {currentManager && (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleRemoveManager}
                  disabled={submitting}
                  className="rounded-full"
                >
                  Retirer le manager
                </Button>
              )}
              <Button
                type="button"
                onClick={handleAssignExisting}
                disabled={submitting || !selectedUserId}
                className="rounded-full flex-1"
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Assignation...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Assigner
                  </>
                )}
              </Button>
            </DialogFooter>
          </TabsContent>

          {/* Créer un nouvel utilisateur */}
          <TabsContent value="create">
            <form onSubmit={handleCreateAndAssign} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">
                  Email <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="manager@exemple.com"
                  value={newUserData.email}
                  onChange={(e) => setNewUserData({ ...newUserData, email: e.target.value })}
                  required
                  className="rounded-full"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="firstName">
                    Prénom <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="firstName"
                    placeholder="Jean"
                    value={newUserData.firstName}
                    onChange={(e) => setNewUserData({ ...newUserData, firstName: e.target.value })}
                    required
                    className="rounded-full"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lastName">
                    Nom <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="lastName"
                    placeholder="Dupont"
                    value={newUserData.lastName}
                    onChange={(e) => setNewUserData({ ...newUserData, lastName: e.target.value })}
                    required
                    className="rounded-full"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Téléphone</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+241 6XX XXX XXX"
                  value={newUserData.phone}
                  onChange={(e) => setNewUserData({ ...newUserData, phone: e.target.value })}
                  className="rounded-full"
                />
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
                <p className="font-medium">Mot de passe par défaut :</p>
                <code className="bg-blue-100 px-2 py-1 rounded mt-1 inline-block">Manager@2025</code>
              </div>

              <DialogFooter>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="rounded-full w-full"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Création...
                    </>
                  ) : (
                    <>
                      <UserPlus className="mr-2 h-4 w-4" />
                      Créer et Assigner
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
