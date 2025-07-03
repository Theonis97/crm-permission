"use client"

import { useState, useEffect } from "react"
import { PermissionGuard } from "@/components/auth/permission-guard"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Plus, MoreHorizontal, Users, Shield, Edit, Trash2 } from "lucide-react"
import type { RoleWithPermissions } from "@/types/auth"
import { RoleUsersSheet } from "@/components/roles/role-users-sheet"
import { RolePermissionsSheet } from "@/components/roles/role-permissions-sheet"
import { EditRoleSheet } from "@/components/roles/edit-role-sheet"
import { DeleteRoleDialog } from "@/components/roles/delete-role-dialog"

export default function RolesPage() {
  const [roles, setRoles] = useState<(RoleWithPermissions & { _count: { userRoles: number } })[]>([])
  const [loading, setLoading] = useState(true)

  // États pour les sheets et dialogs
  const [selectedRole, setSelectedRole] = useState<(RoleWithPermissions & { _count: { userRoles: number } }) | null>(
    null,
  )
  const [showUsersSheet, setShowUsersSheet] = useState(false)
  const [showPermissionsSheet, setShowPermissionsSheet] = useState(false)
  const [showEditSheet, setShowEditSheet] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  useEffect(() => {
    loadRoles()
  }, [])

  const loadRoles = async () => {
    try {
      const response = await fetch("/api/roles")
      if (response.ok) {
        const data = await response.json()
        setRoles(data)
      }
    } catch (error) {
      console.error("Error loading roles:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleAction = (role: (typeof roles)[0], action: string) => {
    setSelectedRole(role)

    switch (action) {
      case "users":
        setShowUsersSheet(true)
        break
      case "permissions":
        setShowPermissionsSheet(true)
        break
      case "edit":
        setShowEditSheet(true)
        break
      case "delete":
        setShowDeleteDialog(true)
        break
    }
  }

  const closeSheets = () => {
    setShowUsersSheet(false)
    setShowPermissionsSheet(false)
    setShowEditSheet(false)
    setShowDeleteDialog(false)
    setSelectedRole(null)
  }

  const handleRoleUpdated = () => {
    loadRoles()
    closeSheets()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <PermissionGuard permission="roles.view">
      <div className="space-y-6">
        {/* En-tête */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Gestion des rôles</h1>
            <p className="text-gray-600 mt-1">Gérez les rôles et leurs permissions dans le système</p>
          </div>
          <PermissionGuard permission="roles.create">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nouveau rôle
            </Button>
          </PermissionGuard>
        </div>

        {/* Tableau des rôles */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Shield className="w-5 h-5" />
              <span>Liste des rôles ({roles.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom du rôle</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-center">Utilisateurs</TableHead>
                  <TableHead className="text-center">Permissions</TableHead>
                  <TableHead className="text-center">Type</TableHead>
                  <TableHead className="text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {roles.map((role) => (
                  <TableRow key={role.id} className="hover:bg-gray-50">
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <Shield className="w-4 h-4 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{role.name}</p>
                          <p className="text-sm text-gray-500">ID: {role.id.slice(0, 8)}...</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="text-gray-700 max-w-xs truncate">{role.description}</p>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center space-x-1">
                        <Users className="w-4 h-4 text-gray-400" />
                        <span className="font-medium">{role._count.userRoles}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center space-x-1">
                        <Shield className="w-4 h-4 text-gray-400" />
                        <span className="font-medium">{role.rolePermissions.length}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      {role.isSystem ? (
                        <Badge variant="secondary">Système</Badge>
                      ) : (
                        <Badge variant="outline">Personnalisé</Badge>
                      )}
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
                          <DropdownMenuItem onClick={() => handleAction(role, "users")}>
                            <Users className="mr-2 h-4 w-4" />
                            Voir les utilisateurs
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleAction(role, "permissions")}>
                            <Shield className="mr-2 h-4 w-4" />
                            Gérer les permissions
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <PermissionGuard permission="roles.edit">
                            <DropdownMenuItem onClick={() => handleAction(role, "edit")}>
                              <Edit className="mr-2 h-4 w-4" />
                              Modifier
                            </DropdownMenuItem>
                          </PermissionGuard>
                          <PermissionGuard permission="roles.delete">
                            <DropdownMenuItem
                              onClick={() => handleAction(role, "delete")}
                              disabled={role.isSystem}
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
                ))}
              </TableBody>
            </Table>

            {roles.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <Shield className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>Aucun rôle trouvé</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sheets et Dialogs */}
        {selectedRole && (
          <>
            <RoleUsersSheet role={selectedRole} open={showUsersSheet} onOpenChange={setShowUsersSheet} />

            <RolePermissionsSheet
              role={selectedRole}
              open={showPermissionsSheet}
              onOpenChange={setShowPermissionsSheet}
              onPermissionsUpdated={handleRoleUpdated}
            />

            <EditRoleSheet
              role={selectedRole}
              open={showEditSheet}
              onOpenChange={setShowEditSheet}
              onRoleUpdated={handleRoleUpdated}
            />

            <DeleteRoleDialog
              role={selectedRole}
              open={showDeleteDialog}
              onOpenChange={setShowDeleteDialog}
              onRoleDeleted={handleRoleUpdated}
            />
          </>
        )}
      </div>
    </PermissionGuard>
  )
}
