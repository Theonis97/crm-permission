"use client"

import { useState, useEffect } from "react"
import { PermissionGuard } from "@/components/auth/permission-guard"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Plus, MoreHorizontal, Users, Edit, Trash2, Shield, Mail, Calendar } from "lucide-react"
import { CreateUserSheet } from "@/components/users/create-user-sheet"
import { EditUserSheet } from "@/components/users/edit-user-sheet"
import { DeleteUserDialog } from "@/components/users/delete-user-dialog"
import { UserRolesSheet } from "@/components/users/user-roles-sheet"

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

  // États pour les sheets et dialogs
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [showCreateSheet, setShowCreateSheet] = useState(false)
  const [showEditSheet, setShowEditSheet] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showRolesSheet, setShowRolesSheet] = useState(false)

  useEffect(() => {
    loadUsers()
  }, [])

  const loadUsers = async () => {
    try {
      const response = await fetch("/api/users")
      if (response.ok) {
        const data = await response.json()
        setUsers(data)
      }
    } catch (error) {
      console.error("Error loading users:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleAction = (user: User, action: string) => {
    setSelectedUser(user)

    switch (action) {
      case "edit":
        setShowEditSheet(true)
        break
      case "delete":
        setShowDeleteDialog(true)
        break
      case "roles":
        setShowRolesSheet(true)
        break
    }
  }

  const closeSheets = () => {
    setShowCreateSheet(false)
    setShowEditSheet(false)
    setShowDeleteDialog(false)
    setShowRolesSheet(false)
    setSelectedUser(null)
  }

  const handleUserUpdated = () => {
    loadUsers()
    closeSheets()
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })
  }

  const getStatusBadge = (status: string) => {
    const variants = {
      ACTIVE: { variant: "default" as const, label: "Actif" },
      INACTIVE: { variant: "secondary" as const, label: "Inactif" },
      SUSPENDED: { variant: "destructive" as const, label: "Suspendu" },
    }
    return variants[status as keyof typeof variants] || { variant: "secondary" as const, label: status }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <PermissionGuard permission="users.view">
      <div className="space-y-6">
        {/* En-tête */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Gestion des utilisateurs</h1>
            <p className="text-gray-600 mt-1">Gérez les utilisateurs et leurs accès au système</p>
          </div>
          <PermissionGuard permission="users.create">
            <Button onClick={() => setShowCreateSheet(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Nouvel utilisateur
            </Button>
          </PermissionGuard>
        </div>

        {/* Tableau des utilisateurs */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Users className="w-5 h-5" />
              <span>Liste des utilisateurs ({users.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Utilisateur</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead className="text-center">Statut</TableHead>
                  <TableHead className="text-center">Rôles</TableHead>
                  <TableHead className="text-center">Créé le</TableHead>
                  <TableHead className="text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => {
                  const statusInfo = getStatusBadge(user.status)
                  return (
                    <TableRow key={user.id} className="hover:bg-gray-50">
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src="/placeholder.svg" />
                            <AvatarFallback className="bg-blue-100 text-blue-600 font-semibold">
                              {getUserInitials(user)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-gray-900">
                              {user.firstName && user.lastName
                                ? `${user.firstName} ${user.lastName}`
                                : user.name || "Utilisateur"}
                            </p>
                            <p className="text-sm text-gray-500">ID: {user.id.slice(0, 8)}...</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-1">
                          <Mail className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-700">{user.email}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex flex-wrap justify-center gap-1">
                          {user.userRoles.length > 0 ? (
                            user.userRoles.slice(0, 2).map((userRole) => (
                              <Badge key={userRole.role.id} variant="outline" className="text-xs">
                                {userRole.role.name}
                              </Badge>
                            ))
                          ) : (
                            <Badge variant="secondary" className="text-xs">
                              Aucun rôle
                            </Badge>
                          )}
                          {user.userRoles.length > 2 && (
                            <Badge variant="outline" className="text-xs">
                              +{user.userRoles.length - 2}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center space-x-1">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-600">{formatDate(user.createdAt)}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Ouvrir le menu</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem onClick={() => handleAction(user, "roles")}>
                              <Shield className="mr-2 h-4 w-4" />
                              Gérer les rôles
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <PermissionGuard permission="users.edit">
                              <DropdownMenuItem onClick={() => handleAction(user, "edit")}>
                                <Edit className="mr-2 h-4 w-4" />
                                Modifier
                              </DropdownMenuItem>
                            </PermissionGuard>
                            <PermissionGuard permission="users.delete">
                              <DropdownMenuItem
                                onClick={() => handleAction(user, "delete")}
                                className="text-red-600 focus:text-red-600"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Supprimer
                              </DropdownMenuItem>
                            </PermissionGuard>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>

            {users.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>Aucun utilisateur trouvé</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sheets et Dialogs */}
        <CreateUserSheet open={showCreateSheet} onOpenChange={setShowCreateSheet} onUserCreated={handleUserUpdated} />

        {selectedUser && (
          <>
            <EditUserSheet
              user={selectedUser}
              open={showEditSheet}
              onOpenChange={setShowEditSheet}
              onUserUpdated={handleUserUpdated}
            />

            <DeleteUserDialog
              user={selectedUser}
              open={showDeleteDialog}
              onOpenChange={setShowDeleteDialog}
              onUserDeleted={handleUserUpdated}
            />

            <UserRolesSheet
              user={selectedUser}
              open={showRolesSheet}
              onOpenChange={setShowRolesSheet}
              onRolesUpdated={handleUserUpdated}
            />
          </>
        )}
      </div>
    </PermissionGuard>
  )
}
