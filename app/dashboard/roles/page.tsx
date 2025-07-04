"use client"

import { useState, useEffect } from "react"
import { PermissionGuard } from "@/components/auth/permission-guard"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Shield, Lock, Settings, Search, Filter, MoreHorizontal, Edit, Trash2, Users, Eye, Plus } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { RoleWithPermissions } from "@/types/auth"
import { ModuleNavbar } from "@/components/navigation/module-navbar"
import { RoleUsersSheet } from "@/components/roles/role-users-sheet"
import { RolePermissionsSheet } from "@/components/roles/role-permissions-sheet"
import { EditRoleSheet } from "@/components/roles/edit-role-sheet"
import { DeleteRoleDialog } from "@/components/roles/delete-role-dialog"
import { usePermissions } from "@/hooks/use-permissions"
import { CreateRoleSheet } from "@/components/roles/create-role-sheet"

interface RoleWithCount extends RoleWithPermissions {
  _count: {
    userRoles: number
  }
}

export default function RolesPage() {
  const [roles, setRoles] = useState<RoleWithCount[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const { hasPermission } = usePermissions()

  // États pour les modales/sheets
  const [showCreateRole, setShowCreateRole] = useState(false)
  const [viewingRoleUsers, setViewingRoleUsers] = useState<RoleWithCount | null>(null)
  const [managingRolePermissions, setManagingRolePermissions] = useState<RoleWithCount | null>(null)
  const [editingRole, setEditingRole] = useState<RoleWithCount | null>(null)
  const [deletingRole, setDeletingRole] = useState<RoleWithCount | null>(null)

  const [stats, setStats] = useState({
    totalRoles: 0,
    systemRoles: 0,
    customRoles: 0,
    totalPermissions: 0,
  })

  useEffect(() => {
    loadRoles()
  }, [])

  const loadRoles = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/roles")
      if (response.ok) {
        const data = await response.json()
        setRoles(data)

        // Calculer les statistiques
        const stats = {
          totalRoles: data.length,
          systemRoles: data.filter((r: RoleWithCount) => r.isSystem).length,
          customRoles: data.filter((r: RoleWithCount) => !r.isSystem).length,
          totalPermissions: data.reduce((acc: number, role: RoleWithCount) => acc + role.rolePermissions.length, 0),
        }
        setStats(stats)
      }
    } catch (error) {
      console.error("Error loading roles:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateRole = () => {
    setShowCreateRole(true)
  }

  const handleViewRoleUsers = (role: RoleWithCount) => {
    setViewingRoleUsers(role)
  }

  const handleManageRolePermissions = (role: RoleWithCount) => {
    setManagingRolePermissions(role)
  }

  const handleEditRole = (role: RoleWithCount) => {
    setEditingRole(role)
  }

  const handleDeleteRole = (role: RoleWithCount) => {
    setDeletingRole(role)
  }

  const handleRoleUpdated = () => {
    setEditingRole(null)
    setManagingRolePermissions(null)
    loadRoles()
  }

  const handleRoleDeleted = () => {
    setDeletingRole(null)
    loadRoles()
  }

  const filteredRoles = roles.filter(
    (role) =>
      role.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (role.description && role.description.toLowerCase().includes(searchTerm.toLowerCase())),
  )

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <ModuleNavbar title="Rôles & Permissions" description="Contrôle d'accès et sécurité" icon={Shield} />
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    )
  }

  return (
    <PermissionGuard permission="roles.view">
      <div className="min-h-screen bg-gray-50">
        <ModuleNavbar
          title="Rôles & Permissions"
          description="Contrôle d'accès et sécurité"
          icon={Shield}
          primaryAction={
            hasPermission("roles.create")
              ? {
                  label: "Nouveau rôle",
                  onClick: handleCreateRole,
                  icon: Plus,
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
                    <CardTitle className="text-sm font-medium">Total Rôles</CardTitle>
                    <Shield className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.totalRoles}</div>
                    <p className="text-xs text-muted-foreground">Tous les rôles</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Rôles Système</CardTitle>
                    <Lock className="h-4 w-4 text-orange-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-orange-600">{stats.systemRoles}</div>
                    <p className="text-xs text-muted-foreground">Rôles protégés</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Rôles Personnalisés</CardTitle>
                    <Settings className="h-4 w-4 text-blue-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-blue-600">{stats.customRoles}</div>
                    <p className="text-xs text-muted-foreground">Rôles modifiables</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Permissions</CardTitle>
                    <Users className="h-4 w-4 text-green-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">{stats.totalPermissions}</div>
                    <p className="text-xs text-muted-foreground">Permissions assignées</p>
                  </CardContent>
                </Card>
              </div>

              {/* Liste des rôles */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Liste des rôles ({filteredRoles.length})</CardTitle>
                    <div className="flex items-center space-x-2">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                        <Input
                          placeholder="Rechercher un rôle..."
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
                        <TableHead>Rôle</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Utilisateurs</TableHead>
                        <TableHead>Permissions</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredRoles.map((role) => (
                        <TableRow key={role.id}>
                          <TableCell>
                            <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
                                <Shield className="h-4 w-4 text-white" />
                              </div>
                              <span className="font-medium">{role.name}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-gray-600 max-w-xs truncate">
                            {role.description || "Aucune description"}
                          </TableCell>
                          <TableCell>
                            {role.isSystem ? (
                              <Badge className="bg-orange-100 text-orange-800 border-orange-200">
                                <Lock className="mr-1 h-3 w-3" />
                                Système
                              </Badge>
                            ) : (
                              <Badge variant="outline">
                                <Settings className="mr-1 h-3 w-3" />
                                Personnalisé
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-auto p-0 font-normal"
                              onClick={() => handleViewRoleUsers(role)}
                            >
                              <div className="flex items-center space-x-2">
                                <Users className="h-4 w-4 text-gray-400" />
                                <span>{role._count.userRoles}</span>
                              </div>
                            </Button>
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-auto p-0 font-normal"
                              onClick={() => handleManageRolePermissions(role)}
                            >
                              <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-200">
                                {role.rolePermissions.length} permissions
                              </Badge>
                            </Button>
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleManageRolePermissions(role)}>
                                  <Eye className="mr-2 h-4 w-4" />
                                  Voir les permissions
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleViewRoleUsers(role)}>
                                  <Users className="mr-2 h-4 w-4" />
                                  Voir les utilisateurs
                                </DropdownMenuItem>
                                {!role.isSystem && hasPermission("roles.edit") && (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => handleEditRole(role)}>
                                      <Edit className="mr-2 h-4 w-4" />
                                      Modifier
                                    </DropdownMenuItem>
                                  </>
                                )}
                                {!role.isSystem && hasPermission("roles.delete") && (
                                  <DropdownMenuItem className="text-red-600" onClick={() => handleDeleteRole(role)}>
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
        {viewingRoleUsers && (
          <RoleUsersSheet
            role={viewingRoleUsers}
            open={!!viewingRoleUsers}
            onOpenChange={(open) => !open && setViewingRoleUsers(null)}
          />
        )}

        {managingRolePermissions && (
          <RolePermissionsSheet
            role={managingRolePermissions}
            open={!!managingRolePermissions}
            onOpenChange={(open) => !open && setManagingRolePermissions(null)}
            onPermissionsUpdated={handleRoleUpdated}
          />
        )}

        {editingRole && (
          <EditRoleSheet
            role={editingRole}
            open={!!editingRole}
            onOpenChange={(open) => !open && setEditingRole(null)}
            onRoleUpdated={handleRoleUpdated}
          />
        )}

        {deletingRole && (
          <DeleteRoleDialog
            role={deletingRole}
            open={!!deletingRole}
            onOpenChange={(open) => !open && setDeletingRole(null)}
            onRoleDeleted={handleRoleDeleted}
          />
        )}

        <CreateRoleSheet open={showCreateRole} onOpenChange={setShowCreateRole} onRoleCreated={handleRoleUpdated} />
      </div>
    </PermissionGuard>
  )
}
