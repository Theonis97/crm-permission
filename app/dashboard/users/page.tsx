"use client"

import { useState, useEffect } from "react"
import { PermissionGuard } from "@/components/auth/permission-guard"
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
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ModuleNavbar } from "@/components/navigation/module-navbar"
import { CreateUserSheet } from "@/components/users/create-user-sheet"
import { EditUserSheet } from "@/components/users/edit-user-sheet"
import { DeleteUserDialog } from "@/components/users/delete-user-dialog"
import { UserRolesSheet } from "@/components/users/user-roles-sheet"
import { usePermissions } from "@/hooks/use-permissions"

interface User {
  id: string
  email: string
  firstName: string | null
  lastName: string | null
  name: string | null
  status: string
  createdAt: string
  userRoles: Array<{
    role: {
      id: string
      name: string
    }
  }>
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const { hasPermission } = usePermissions()

  // États pour les modales/sheets
  const [showCreateUser, setShowCreateUser] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [deletingUser, setDeletingUser] = useState<User | null>(null)
  const [managingUserRoles, setManagingUserRoles] = useState<User | null>(null)

  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    inactive: 0,
    withRoles: 0,
  })

  useEffect(() => {
    loadUsers()
  }, [])

  const loadUsers = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/users")
      if (response.ok) {
        const data = await response.json()
        setUsers(data)

        // Calculer les statistiques
        const stats = {
          total: data.length,
          active: data.filter((u: User) => u.status === "ACTIVE").length,
          inactive: data.filter((u: User) => u.status !== "ACTIVE").length,
          withRoles: data.filter((u: User) => u.userRoles.length > 0).length,
        }
        setStats(stats)
      }
    } catch (error) {
      console.error("Error loading users:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateUser = () => {
    setShowCreateUser(true)
  }

  const handleEditUser = (user: User) => {
    setEditingUser(user)
  }

  const handleDeleteUser = (user: User) => {
    setDeletingUser(user)
  }

  const handleManageUserRoles = (user: User) => {
    setManagingUserRoles(user)
  }

  const handleUserCreated = () => {
    setShowCreateUser(false)
    loadUsers()
  }

  const handleUserUpdated = () => {
    setEditingUser(null)
    loadUsers()
  }

  const handleUserDeleted = () => {
    setDeletingUser(null)
    loadUsers()
  }

  const handleUserRolesUpdated = () => {
    setManagingUserRoles(null)
    loadUsers()
  }

  const filteredUsers = users.filter(
    (user) =>
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      `${user.firstName} ${user.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const getUserDisplayName = (user: User) => {
    if (user.firstName && user.lastName) {
      return `${user.firstName} ${user.lastName}`
    }
    return user.name || user.email
  }

  const getUserInitials = (user: User) => {
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <ModuleNavbar title="Utilisateurs" description="Gestion des comptes utilisateurs" icon={Users} />
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    )
  }

  return (
    <PermissionGuard permission="users.view">
      <div className="min-h-screen bg-gray-50">
        <ModuleNavbar
          title="Utilisateurs"
          description="Gestion des comptes utilisateurs"
          icon={Users}
          primaryAction={
            hasPermission("users.create")
              ? {
                  label: "Nouvel utilisateur",
                  onClick: handleCreateUser,
                  icon: UserPlus,
                }
              : undefined
          }
        />

        <main className="py-8">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="space-y-8">
              {/* Statistiques */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Utilisateurs</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.total}</div>
                    <p className="text-xs text-muted-foreground">Tous les utilisateurs</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Utilisateurs Actifs</CardTitle>
                    <UserCheck className="h-4 w-4 text-green-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">{stats.active}</div>
                    <p className="text-xs text-muted-foreground">Comptes actifs</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Utilisateurs Inactifs</CardTitle>
                    <UserX className="h-4 w-4 text-red-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-red-600">{stats.inactive}</div>
                    <p className="text-xs text-muted-foreground">Comptes inactifs</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Avec Rôles</CardTitle>
                    <Shield className="h-4 w-4 text-blue-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-blue-600">{stats.withRoles}</div>
                    <p className="text-xs text-muted-foreground">Utilisateurs avec rôles</p>
                  </CardContent>
                </Card>
              </div>

              {/* Liste des utilisateurs */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Liste des utilisateurs ({filteredUsers.length})</CardTitle>
                    <div className="flex items-center space-x-2">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                        <Input
                          placeholder="Rechercher un utilisateur..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-10 w-64"
                        />
                      </div>
                      <Button variant="outline" size="sm">
                        <Filter className="mr-2 h-4 w-4" />
                        Filtres
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Utilisateur</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Statut</TableHead>
                        <TableHead>Rôles</TableHead>
                        <TableHead>Créé le</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUsers.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell>
                            <div className="flex items-center space-x-3">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src="/placeholder.svg" />
                                <AvatarFallback className="bg-blue-100 text-blue-600 text-sm font-semibold">
                                  {getUserInitials(user)}
                                </AvatarFallback>
                              </Avatar>
                              <span className="font-medium">{getUserDisplayName(user)}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-gray-600">{user.email}</TableCell>
                          <TableCell>{getStatusBadge(user.status)}</TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {user.userRoles.map((userRole) => (
                                <Badge key={userRole.role.id} variant="outline" className="text-xs">
                                  {userRole.role.name}
                                </Badge>
                              ))}
                              {user.userRoles.length === 0 && <span className="text-sm text-gray-400">Aucun rôle</span>}
                            </div>
                          </TableCell>
                          <TableCell className="text-gray-600">
                            {new Date(user.createdAt).toLocaleDateString("fr-FR")}
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {hasPermission("users.edit") && (
                                  <DropdownMenuItem onClick={() => handleEditUser(user)}>
                                    <Edit className="mr-2 h-4 w-4" />
                                    Modifier
                                  </DropdownMenuItem>
                                )}
                                {hasPermission("roles.assign") && (
                                  <DropdownMenuItem onClick={() => handleManageUserRoles(user)}>
                                    <Key className="mr-2 h-4 w-4" />
                                    Gérer les rôles
                                  </DropdownMenuItem>
                                )}
                                {(hasPermission("users.edit") || hasPermission("roles.assign")) &&
                                  hasPermission("users.delete") && <DropdownMenuSeparator />}
                                {hasPermission("users.delete") && (
                                  <DropdownMenuItem className="text-red-600" onClick={() => handleDeleteUser(user)}>
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Supprimer
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>

        {/* Modales et Sheets */}
        <CreateUserSheet open={showCreateUser} onOpenChange={setShowCreateUser} onUserCreated={handleUserCreated} />

        {editingUser && (
          <EditUserSheet
            user={editingUser}
            open={!!editingUser}
            onOpenChange={(open) => !open && setEditingUser(null)}
            onUserUpdated={handleUserUpdated}
          />
        )}

        {deletingUser && (
          <DeleteUserDialog
            user={deletingUser}
            open={!!deletingUser}
            onOpenChange={(open) => !open && setDeletingUser(null)}
            onUserDeleted={handleUserDeleted}
          />
        )}

        {managingUserRoles && (
          <UserRolesSheet
            user={managingUserRoles}
            open={!!managingUserRoles}
            onOpenChange={(open) => !open && setManagingUserRoles(null)}
            onRolesUpdated={handleUserRolesUpdated}
          />
        )}
      </div>
    </PermissionGuard>
  )
}
