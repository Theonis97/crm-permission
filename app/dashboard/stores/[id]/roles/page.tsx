"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { Plus, Shield, Users, Edit, Trash2, Settings, Eye, Search, Filter, Lock, MoreHorizontal } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { toast } from "sonner"
import { StorePermissionGuard } from "@/components/auth/store-permission-guard"
import { STORE_PERMISSIONS } from "@/types/store-auth"
import { CreateRoleSheet } from "@/components/stores/create-role-sheet"
import { EditRoleSheet } from "@/components/stores/edit-role-sheet"
import { ViewRoleSheet } from "@/components/stores/view-role-sheet"

interface StoreRole {
  id: string
  name: string
  description: string | null
  isSystem: boolean
  createdAt: string
  storeRolePermissions: Array<{
    permission: {
      id: string
      name: string
      description: string | null
      module: string
      action: string
    }
  }>
  _count: {
    storeUserRoles: number
  }
}

interface StorePermission {
  id: string
  name: string
  description: string | null
  module: string
  action: string
}

export default function StoreRolesPage() {
  const params = useParams()
  const storeId = params.id as string

  const [roles, setRoles] = useState<StoreRole[]>([])
  const [permissions, setPermissions] = useState<StorePermission[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [showCreateSheet, setShowCreateSheet] = useState(false)
  const [showEditSheet, setShowEditSheet] = useState(false)
  const [showViewSheet, setShowViewSheet] = useState(false)
  const [selectedRole, setSelectedRole] = useState<StoreRole | null>(null)

  // Statistiques calculées
  const stats = {
    totalRoles: roles.length,
    systemRoles: roles.filter(r => r.isSystem).length,
    customRoles: roles.filter(r => !r.isSystem).length,
    totalPermissions: permissions.length,
  }

  // Filtrage des rôles
  const filteredRoles = roles.filter(role =>
    role.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (role.description && role.description.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  // Charger les rôles du magasin
  const fetchRoles = async () => {
    try {
      const response = await fetch(`/api/stores/${storeId}/roles`)
      if (response.ok) {
        const data = await response.json()
        setRoles(Array.isArray(data) ? data : [])
      } else {
        toast.error("Erreur lors du chargement des rôles")
        setRoles([])
      }
    } catch (error) {
      console.error("Error fetching roles:", error)
      toast.error("Erreur lors du chargement des rôles")
      setRoles([])
    }
  }

  // Charger les permissions disponibles
  const fetchPermissions = async () => {
    try {
      console.log("🔍 Chargement des permissions pour le magasin:", storeId)
      const response = await fetch(`/api/stores/${storeId}/permissions`)
      console.log("📡 Réponse API permissions:", response.status)
      
      if (response.ok) {
        const data = await response.json()
        console.log("📋 Permissions reçues:", data)
        setPermissions(Array.isArray(data) ? data : [])
      } else {
        const errorText = await response.text()
        console.error("❌ Erreur API permissions:", response.status, errorText)
        toast.error("Erreur lors du chargement des permissions")
        setPermissions([])
      }
    } catch (error) {
      console.error("Error fetching permissions:", error)
      toast.error("Erreur lors du chargement des permissions")
      setPermissions([])
    }
  }

  // Supprimer un rôle
  const handleDeleteRole = async (roleId: string, roleName: string) => {
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer le rôle "${roleName}" ?`)) {
      try {
        const response = await fetch(`/api/stores/${storeId}/roles/${roleId}`, {
          method: "DELETE",
        })

        if (response.ok) {
          toast.success("Rôle supprimé avec succès")
          fetchRoles()
        } else {
          const error = await response.json()
          toast.error(error.error || "Erreur lors de la suppression")
        }
      } catch (error) {
        console.error("Error deleting role:", error)
        toast.error("Erreur lors de la suppression")
      }
    }
  }

  // Ouvrir le sheet d'édition
  const handleEditRole = (role: StoreRole) => {
    setSelectedRole(role)
    setShowEditSheet(true)
  }

  // Ouvrir le sheet de visualisation
  const handleViewRole = (role: StoreRole) => {
    setSelectedRole(role)
    setShowViewSheet(true)
  }


  // Charger toutes les données
  const loadData = async () => {
    setLoading(true)
    try {
      await Promise.all([fetchRoles(), fetchPermissions()])
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

  // Grouper les permissions par module
  const permissionsByModule = (permissions || []).reduce((acc, permission) => {
    if (!acc[permission.module]) {
      acc[permission.module] = []
    }
    acc[permission.module].push(permission)
    return acc
  }, {} as Record<string, StorePermission[]>)

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
            <h1 className="text-xl font-bold text-gray-900">Rôles et Permissions</h1>
            <p className="text-gray-600">Gérez les rôles et permissions des utilisateurs de ce magasin</p>
          </div>
          <StorePermissionGuard 
            storeId={storeId} 
            permission={STORE_PERMISSIONS.USERS_ROLES}
          >
            <Button className="bg-blue-900 hover:bg-blue-900 text-white" onClick={() => setShowCreateSheet(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Créer un rôle
            </Button>
          </StorePermissionGuard>
        </div>
      </div>

      <div className="p-6 space-y-6 bg-gray-50 min-h-screen">

        {/* Statistiques - même style que dashboard/roles */}
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
              <p className="text-xs text-muted-foreground">Permissions disponibles</p>
            </CardContent>
          </Card>
        </div>

        {/* Liste des rôles - même style que dashboard/roles */}
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
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="text-gray-600 mt-2">Chargement des rôles...</p>
              </div>
            ) : filteredRoles.length === 0 ? (
              <div className="text-center py-8">
                <Shield className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {searchTerm ? "Aucun rôle trouvé" : "Aucun rôle configuré"}
                </h3>
                <p className="text-gray-600 mb-4">
                  {searchTerm ? "Essayez avec d'autres termes de recherche" : "Commencez par créer un rôle pour ce magasin"}
                </p>
                {!searchTerm && (
                  <StorePermissionGuard 
                    storeId={storeId} 
                    permission={STORE_PERMISSIONS.USERS_ROLES}
                  >
                    <Button onClick={() => setShowCreateSheet(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Créer le premier rôle
                    </Button>
                  </StorePermissionGuard>
                )}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Rôle</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Permissions</TableHead>
                    <TableHead>Créé le</TableHead>
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
                          <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                            <Settings className="mr-1 h-3 w-3" />
                            Personnalisé
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {role.storeRolePermissions.length} permission(s)
                        </Badge>
                      </TableCell>
                      <TableCell className="text-gray-500 text-sm">
                        {new Date(role.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedRole(role)
                                setShowViewSheet(true)
                              }}
                            >
                              <Eye className="mr-2 h-4 w-4" />
                              Voir les détails
                            </DropdownMenuItem>
                            <StorePermissionGuard 
                              storeId={storeId} 
                              permission={STORE_PERMISSIONS.USERS_ROLES}
                            >
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedRole(role)
                                  setShowEditSheet(true)
                                }}
                              >
                                <Edit className="mr-2 h-4 w-4" />
                                Modifier
                              </DropdownMenuItem>
                              {!role.isSystem && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => handleDeleteRole(role.id, role.name)}
                                    className="text-red-600 focus:text-red-600"
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Supprimer
                                  </DropdownMenuItem>
                                </>
                              )}
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

      {/* Sheets */}
      <CreateRoleSheet
        open={showCreateSheet}
        onOpenChange={setShowCreateSheet}
        storeId={storeId}
        permissions={permissions}
        onSuccess={() => {
          fetchRoles()
          setShowCreateSheet(false)
        }}
      />

      <EditRoleSheet
        open={showEditSheet}
        onOpenChange={(open) => {
          setShowEditSheet(open)
          if (!open) setSelectedRole(null)
        }}
        storeId={storeId}
        role={selectedRole}
        permissions={permissions}
        onSuccess={() => {
          fetchRoles()
          setShowEditSheet(false)
          setSelectedRole(null)
        }}
      />
      
      <ViewRoleSheet
        open={showViewSheet}
        onOpenChange={(open) => {
          setShowViewSheet(open)
          if (!open) setSelectedRole(null)
        }}
        role={selectedRole}
      />
    </StorePermissionGuard>
  )
}
