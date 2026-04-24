"use client"

import { useState, useEffect } from "react"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { UserPlus, Users, Loader2, CheckCircle2 } from "lucide-react"
import { toast } from "@/lib/app-toast"

interface User {
  id: string
  email: string
  firstName: string | null
  lastName: string | null
  name: string | null
}

interface ManagerSelectorProps {
  value?: string | null
  onChange: (managerId: string | null) => void
  disabled?: boolean
}

export function ManagerSelector({ value, onChange, disabled }: ManagerSelectorProps) {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [creating, setCreating] = useState(false)
  const [formData, setFormData] = useState({
    email: "",
    firstName: "",
    lastName: "",
    password: "",
  })

  useEffect(() => {
    loadUsers()
  }, [])

  const loadUsers = async () => {
    try {
      setLoading(true)
      let response: Response
      try {
        response = await fetch("/api/users")
      } catch {
        throw new Error("Serveur inaccessible. Vérifiez que le serveur est démarré.")
      }

      if (response.status === 401) {
        throw new Error("Session expirée. Veuillez vous reconnecter.")
      }

      if (!response.ok) {
        throw new Error(`Erreur ${response.status} lors du chargement des utilisateurs`)
      }

      const data = await response.json()
      setUsers(data)
    } catch (error) {
      console.error("Error loading users:", error)
      toast.error("Erreur", {
        description: error instanceof Error ? error.message : "Impossible de charger la liste des utilisateurs",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreating(true)

    try {
      // Validation basique
      if (!formData.email || !formData.firstName || !formData.lastName || !formData.password) {
        toast.error("Erreur", {
          description: "Tous les champs sont requis",
        })
        return
      }

      const response = await fetch("/api/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          status: "ACTIVE",
          roleIds: [], // Pas de rôle assigné par défaut
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Erreur lors de la création")
      }

      const newUser = await response.json()
      
      toast.success("Utilisateur créé!", {
        description: `${newUser.firstName} ${newUser.lastName} a été créé avec succès.`,
        icon: <CheckCircle2 className="h-4 w-4" />,
      })

      // Recharger la liste et sélectionner le nouvel utilisateur
      await loadUsers()
      onChange(newUser.id)
      
      // Fermer le dialog et réinitialiser le formulaire
      setShowCreateDialog(false)
      setFormData({
        email: "",
        firstName: "",
        lastName: "",
        password: "",
      })
    } catch (error) {
      toast.error("Erreur", {
        description: error instanceof Error ? error.message : "Impossible de créer l'utilisateur",
      })
    } finally {
      setCreating(false)
    }
  }

  const getUserDisplayName = (user: User) => {
    if (user.firstName && user.lastName) {
      return `${user.firstName} ${user.lastName}`
    }
    return user.name || user.email
  }

  return (
    <div className="space-y-2">
      <Label className="text-sm font-semibold flex items-center gap-2">
        <Users className="h-4 w-4" />
        Manager de la boutique
      </Label>
      
      <div className="flex gap-2">
        <Select
          value={value || "none"}
          onValueChange={(val) => onChange(val === "none" ? null : val)}
          disabled={disabled || loading}
        >
          <SelectTrigger className="flex-1 rounded-full">
            <SelectValue placeholder={loading ? "Chargement..." : "Sélectionner un manager"} />
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

        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => setShowCreateDialog(true)}
          disabled={disabled}
          className="rounded-full shrink-0"
          title="Créer un nouvel utilisateur"
        >
          <UserPlus className="h-4 w-4" />
        </Button>
      </div>

      <p className="text-xs text-gray-500">
        Le manager peut gérer plusieurs boutiques. Laissez vide pour assigner plus tard.
      </p>

      {/* Dialog de création d'utilisateur */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-blue-600" />
              Créer un nouvel utilisateur
            </DialogTitle>
            <DialogDescription>
              Créez un nouvel utilisateur qui pourra être assigné comme manager
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateUser} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">
                Email <span className="text-red-500">*</span>
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="manager@exemple.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
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
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
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
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  required
                  className="rounded-full"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">
                Mot de passe <span className="text-red-500">*</span>
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
                minLength={6}
                className="rounded-full"
              />
              <p className="text-xs text-gray-500">Minimum 6 caractères</p>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowCreateDialog(false)}
                disabled={creating}
                className="rounded-full"
              >
                Annuler
              </Button>
              <Button
                type="submit"
                disabled={creating}
                className="rounded-full"
              >
                {creating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Création...
                  </>
                ) : (
                  <>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Créer l'utilisateur
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
