"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Users,
  UserCheck,
  UserX,
  Shield,
  Search,
  Filter,
  MoreHorizontal,
  Edit,
  Trash2,
  Key,
  UserPlus,
  Eye,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { toast } from "@/lib/app-toast"
import { StorePermissionGuard } from "@/components/auth/store-permission-guard"
import { STORE_PERMISSIONS } from "@/types/store-auth"
import { CreateStoreUserSheet } from "@/components/stores/create-store-user-sheet"
import { ViewStoreUserSheet } from "@/components/stores/view-store-user-sheet"
import { ManageUserRolesSheet } from "@/components/stores/manage-user-roles-sheet"

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
    assignedAt: string
    assignedBy: {
      id: string
      name: string | null
      email: string
    }
    permissions: Array<{
      id: string
      name: string
      description: string | null
    }>
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

export default function StoreUsersPage() {
  const params = useParams()
  const storeId = params.id as string

  const [users, setUsers] = useState<StoreUser[]>([])
  const [roles, setRoles] = useState<StoreRole[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [showCreateUser, setShowCreateUser] = useState(false)
  const [selectedUser, setSelectedUser] = useState<StoreUser | null>(null)
  const [showViewUser, setShowViewUser] = useState(false)
  const [showManageRoles, setShowManageRoles] = useState(false)

  // Statistiques calculées
  const stats = {
    totalUsers: users.length,
    activeUsers: users.filter(u => u.status === "ACTIVE").length,
    inactiveUsers: users.filter(u => u.status === "INACTIVE").length,
    totalRoles: roles.length,
  }

  // Charger les utilisateurs du magasin
  const fetchUsers = async () => {
    try {
      const response = await fetch(`/api/stores/${storeId}/users`)
      if (response.ok) {
        const data = await response.json()
        setUsers(data)
      } else {
        toast.error("Erreur lors du chargement des utilisateurs")
      }
    } catch (error) {
      console.error("Error fetching users:", error)
      toast.error("Erreur lors du chargement des utilisateurs")
    }
  }

  // Charger les rôles du magasin
  const fetchRoles = async () => {
    try {
      const response = await fetch(`/api/stores/${storeId}/roles`)
      if (response.ok) {
        const data = await response.json()
        setRoles(data)
      } else {
        toast.error("Erreur lors du chargement des rôles")
      }
    } catch (error) {
      console.error("Error fetching roles:", error)
      toast.error("Erreur lors du chargement des rôles")
    }
  }

  // Charger toutes les données
  const loadData = async () => {
    setLoading(true)
    try {
      await Promise.all([fetchUsers(), fetchRoles()])
    } catch (error) {
      console.error("Error loading data:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeId])

  // Fonctions utilitaires
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return <Badge className="bg-green-100 text-green-800 border-green-200">Actif</Badge>
      case "INACTIVE":
        return <Badge variant="secondary">Inactif</Badge>
      case "SUSPENDED":
        return <Badge className="bg-red-100 text-red-800 border-red-200">Suspendu</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  // Filtrer les utilisateurs
  const filteredUsers = users.filter(
    (user) =>
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      getUserDisplayName(user).toLowerCase().includes(searchTerm.toLowerCase()),
  )

  // Gestionnaires d'événements
  const handleCreateUser = () => {
    setShowCreateUser(true)
  }

  const handleUserCreated = () => {
    setShowCreateUser(false)
    loadData()
  }

  // Voir les détails d'un utilisateur
  const handleViewUser = (user: StoreUser) => {
    setSelectedUser(user)
    setShowViewUser(true)
  }

  // Gérer les rôles d'un utilisateur
  const handleManageRoles = (user: StoreUser) => {
    setSelectedUser(user)
    setShowManageRoles(true)
  }

  // Réinitialiser le mot de passe
  const handleResetPassword = async (user: StoreUser) => {
    if (!confirm(`Êtes-vous sûr de vouloir réinitialiser le mot de passe de ${getUserDisplayName(user)} ?`)) {
      return
    }

    try {
      const response = await fetch(`/api/stores/${storeId}/users/${user.id}/reset-password`, {
        method: "POST",
      })

      if (response.ok) {
        toast.success("Mot de passe réinitialisé avec succès. Le nouveau mot de passe est 'password'.")
      } else {
        const error = await response.json()
        toast.error(error.error || "Erreur lors de la réinitialisation du mot de passe")
      }
    } catch (error) {
      console.error("Error resetting password:", error)
      toast.error("Erreur lors de la réinitialisation du mot de passe")
    }
  }

  // Retirer l'utilisateur du magasin
  const handleRemoveFromStore = async (user: StoreUser) => {
    if (!confirm(`Êtes-vous sûr de vouloir retirer ${getUserDisplayName(user)} de ce magasin ?`)) {
      return
    }

    try {
      const response = await fetch(`/api/stores/${storeId}/users`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: user.id,
        }),
      })

      if (response.ok) {
        toast.success("Utilisateur retiré du magasin avec succès")
        loadData() // Recharger la liste
      } else {
        const error = await response.json()
        toast.error(error.error || "Erreur lors de la suppression de l'utilisateur")
      }
    } catch (error) {
      console.error("Error removing user from store:", error)
      toast.error("Erreur lors de la suppression de l'utilisateur")
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  return (
    <StorePermissionGuard 
      storeId={storeId} 
      permission={STORE_PERMISSIONS.USERS_VIEW}
    >
      {/* Header - même style que contacts */}
      <div className="border-b bg-white px-6 py-2.5 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Utilisateurs</h1>
            <p className="text-gray-600">Gérez les utilisateurs de ce magasin</p>
          </div>
          <StorePermissionGuard 
            storeId={storeId} 
            permission={STORE_PERMISSIONS.USERS_INVITE}
          >
            <Button className="bg-blue-900 hover:bg-blue-900 text-white" onClick={handleCreateUser}>
              <UserPlus className="h-4 w-4 mr-2" />
              Nouvel utilisateur
            </Button>
          </StorePermissionGuard>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Statistiques */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total utilisateurs</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalUsers}</div>
              <p className="text-xs text-muted-foreground">
                Utilisateurs dans ce magasin
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Utilisateurs actifs</CardTitle>
              <UserCheck className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.activeUsers}</div>
              <p className="text-xs text-muted-foreground">
                Comptes actifs
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Utilisateurs inactifs</CardTitle>
              <UserX className="h-4 w-4 text-gray-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-600">{stats.inactiveUsers}</div>
              <p className="text-xs text-muted-foreground">
                Comptes inactifs
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Rôles disponibles</CardTitle>
              <Shield className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{stats.totalRoles}</div>
              <p className="text-xs text-muted-foreground">
                Rôles configurés
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Liste des utilisateurs */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Utilisateurs du magasin</CardTitle>
              <div className="flex items-center space-x-2">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Rechercher un utilisateur..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8 w-[300px]"
                  />
                </div>
                <Button variant="outline" size="sm">
                  <Filter className="h-4 w-4 mr-2" />
                  Filtres
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {filteredUsers.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Users className="mx-auto h-12 w-12 text-gray-300 mb-2" />
                <p>Aucun utilisateur trouvé</p>
                <p className="text-sm">
                  {searchTerm ? "Aucun résultat pour votre recherche" : "Créez votre premier utilisateur"}
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Utilisateur</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Rôles</TableHead>
                    <TableHead>Créé le</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={user.image || undefined} />
                            <AvatarFallback>{getUserInitials(user)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">{getUserDisplayName(user)}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>{getStatusBadge(user.status)}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {user.storeRoles.slice(0, 2).map((role) => (
                            <Badge key={role.id} variant="outline" className="text-xs">
                              {role.name}
                            </Badge>
                          ))}
                          {user.storeRoles.length > 2 && (
                            <Badge variant="outline" className="text-xs">
                              +{user.storeRoles.length - 2}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {new Date(user.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleViewUser(user)}>
                              <Eye className="mr-2 h-4 w-4" />
                              Voir les détails
                            </DropdownMenuItem>
                            <StorePermissionGuard 
                              storeId={storeId} 
                              permission={STORE_PERMISSIONS.USERS_ROLES}
                            >
                              <DropdownMenuItem onClick={() => handleManageRoles(user)}>
                                <Edit className="mr-2 h-4 w-4" />
                                Gérer les rôles
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleResetPassword(user)}>
                                <Key className="mr-2 h-4 w-4" />
                                Réinitialiser mot de passe
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                className="text-red-600 focus:text-red-600"
                                onClick={() => handleRemoveFromStore(user)}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Retirer du magasin
                              </DropdownMenuItem>
                            </StorePermissionGuard>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Sheet de création d'utilisateur */}
      <CreateStoreUserSheet
        open={showCreateUser}
        onOpenChange={setShowCreateUser}
        storeId={storeId}
        roles={roles}
        onSuccess={handleUserCreated}
      />

      {/* Sheet de visualisation d'utilisateur */}
      <ViewStoreUserSheet
        open={showViewUser}
        onOpenChange={(open) => {
          setShowViewUser(open)
          if (!open) setSelectedUser(null)
        }}
        user={selectedUser}
      />

      {/* Sheet de gestion des rôles */}
      <ManageUserRolesSheet
        open={showManageRoles}
        onOpenChange={(open) => {
          setShowManageRoles(open)
          if (!open) setSelectedUser(null)
        }}
        user={selectedUser}
        storeId={storeId}
        roles={roles}
        onSuccess={() => {
          setShowManageRoles(false)
          setSelectedUser(null)
          loadData()
        }}
      />
    </StorePermissionGuard>
  )
}
