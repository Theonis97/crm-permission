"use client"

import { useState } from "react"
import { useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import { 
  Shield, 
  Users, 
  Package, 
  Settings, 
  CheckCircle, 
  XCircle, 
  Loader2,
  Play,
  RefreshCw 
} from "lucide-react"
import { toast } from "sonner"
import { StorePermissionGuard } from "@/components/auth/store-permission-guard"
import { useStorePermissions } from "@/hooks/use-store-permissions"
import { STORE_PERMISSIONS } from "@/types/store-auth"

export default function TestPermissionsPage() {
  const params = useParams()
  const storeId = params.id as string
  const [initializing, setInitializing] = useState(false)
  const [initResult, setInitResult] = useState<any>(null)
  
  const { 
    permissions, 
    roles, 
    hasStoreAccess, 
    loading: permissionsLoading,
    refreshPermissions 
  } = useStorePermissions(storeId)

  const handleInitializePermissions = async () => {
    setInitializing(true)
    try {
      const response = await fetch(`/api/stores/${storeId}/init-permissions`, {
        method: 'POST'
      })
      
      if (response.ok) {
        const result = await response.json()
        setInitResult(result)
        toast.success("Permissions initialisées avec succès !")
        // Rafraîchir les permissions après initialisation
        await refreshPermissions()
      } else {
        const error = await response.json()
        toast.error(`Erreur: ${error.error}`)
      }
    } catch (error) {
      console.error("Error initializing permissions:", error)
      toast.error("Erreur lors de l'initialisation")
    } finally {
      setInitializing(false)
    }
  }

  const testPermissions = [
    { 
      permission: STORE_PERMISSIONS.PRODUCTS_VIEW, 
      label: "Voir les produits",
      description: "Permission de base pour voir les produits"
    },
    { 
      permission: STORE_PERMISSIONS.PRODUCTS_CREATE, 
      label: "Créer des produits",
      description: "Permission pour créer de nouveaux produits"
    },
    { 
      permission: STORE_PERMISSIONS.PRODUCTS_EDIT, 
      label: "Modifier les produits",
      description: "Permission pour modifier les produits existants"
    },
    { 
      permission: STORE_PERMISSIONS.PRODUCTS_DELETE, 
      label: "Supprimer les produits",
      description: "Permission pour supprimer des produits"
    },
    { 
      permission: STORE_PERMISSIONS.POS_ACCESS, 
      label: "Accès caisse",
      description: "Permission pour accéder au point de vente"
    },
    { 
      permission: STORE_PERMISSIONS.USERS_VIEW, 
      label: "Voir les utilisateurs",
      description: "Permission pour voir les utilisateurs du magasin"
    },
    { 
      permission: STORE_PERMISSIONS.USERS_ROLES, 
      label: "Gérer les rôles",
      description: "Permission pour gérer les rôles des utilisateurs"
    }
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Test des Permissions Magasin</h1>
          <p className="text-muted-foreground">
            Testez et initialisez le système de permissions pour ce magasin
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            onClick={refreshPermissions}
            disabled={permissionsLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${permissionsLoading ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>
          
          <Button 
            onClick={handleInitializePermissions}
            disabled={initializing}
          >
            {initializing ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Play className="h-4 w-4 mr-2" />
            )}
            Initialiser les permissions
          </Button>
        </div>
      </div>

      {/* Résultat de l'initialisation */}
      {initResult && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>{initResult.message}</strong>
            <br />
            Permissions créées: {initResult.stats.permissionsCreated}/{initResult.stats.totalPermissions}
            <br />
            Rôles créés: {initResult.stats.rolesCreated}/{initResult.stats.totalRoles}
          </AlertDescription>
        </Alert>
      )}

      {/* Statut d'accès */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Statut d'accès au magasin
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            {hasStoreAccess ? (
              <>
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="text-green-600 font-medium">Accès autorisé</span>
              </>
            ) : (
              <>
                <XCircle className="h-5 w-5 text-red-600" />
                <span className="text-red-600 font-medium">Accès refusé</span>
              </>
            )}
          </div>
          
          {roles.length > 0 && (
            <div className="mt-4">
              <p className="text-sm font-medium mb-2">Vos rôles dans ce magasin :</p>
              <div className="flex flex-wrap gap-2">
                {roles.map((role) => (
                  <Badge key={role.id} variant="secondary">
                    {role.name}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Test des permissions spécifiques */}
      <Card>
        <CardHeader>
          <CardTitle>Test des permissions</CardTitle>
          <CardDescription>
            Vérifiez quelles permissions vous avez dans ce magasin
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {testPermissions.map((test) => (
              <div key={test.permission} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <div className="font-medium">{test.label}</div>
                  <div className="text-sm text-gray-500">{test.description}</div>
                  <div className="text-xs text-gray-400 mt-1">
                    Permission: <code>{test.permission}</code>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  {permissions.includes(test.permission) ? (
                    <>
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <Badge className="bg-green-100 text-green-800">Autorisé</Badge>
                    </>
                  ) : (
                    <>
                      <XCircle className="h-5 w-5 text-red-600" />
                      <Badge className="bg-red-100 text-red-800">Refusé</Badge>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Démonstration des guards */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Section visible seulement avec permission produits */}
        <StorePermissionGuard 
          storeId={storeId} 
          permission={STORE_PERMISSIONS.PRODUCTS_VIEW}
          fallback={
            <Card>
              <CardContent className="p-6">
                <div className="text-center text-gray-500">
                  <Package className="h-8 w-8 mx-auto mb-2" />
                  <p className="font-medium">Section Produits</p>
                  <p className="text-sm">Permission requise: store.products.view</p>
                </div>
              </CardContent>
            </Card>
          }
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5 text-green-600" />
                Section Produits
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">
                Cette section est visible car vous avez la permission "store.products.view"
              </p>
              
              <div className="space-y-2">
                <StorePermissionGuard 
                  storeId={storeId} 
                  permission={STORE_PERMISSIONS.PRODUCTS_CREATE}
                  fallback={
                    <Button variant="outline" disabled>
                      <Package className="h-4 w-4 mr-2" />
                      Créer produit (non autorisé)
                    </Button>
                  }
                >
                  <Button>
                    <Package className="h-4 w-4 mr-2" />
                    Créer produit
                  </Button>
                </StorePermissionGuard>
              </div>
            </CardContent>
          </Card>
        </StorePermissionGuard>

        {/* Section visible seulement avec permission utilisateurs */}
        <StorePermissionGuard 
          storeId={storeId} 
          permission={STORE_PERMISSIONS.USERS_VIEW}
          fallback={
            <Card>
              <CardContent className="p-6">
                <div className="text-center text-gray-500">
                  <Users className="h-8 w-8 mx-auto mb-2" />
                  <p className="font-medium">Section Utilisateurs</p>
                  <p className="text-sm">Permission requise: store.users.view</p>
                </div>
              </CardContent>
            </Card>
          }
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-600" />
                Section Utilisateurs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">
                Cette section est visible car vous avez la permission "store.users.view"
              </p>
              
              <div className="space-y-2">
                <StorePermissionGuard 
                  storeId={storeId} 
                  permission={STORE_PERMISSIONS.USERS_ROLES}
                  fallback={
                    <Button variant="outline" disabled>
                      <Settings className="h-4 w-4 mr-2" />
                      Gérer rôles (non autorisé)
                    </Button>
                  }
                >
                  <Button>
                    <Settings className="h-4 w-4 mr-2" />
                    Gérer rôles
                  </Button>
                </StorePermissionGuard>
              </div>
            </CardContent>
          </Card>
        </StorePermissionGuard>
      </div>

      {/* Informations de debug */}
      <Card>
        <CardHeader>
          <CardTitle>Informations de debug</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium mb-2">Permissions actuelles ({permissions.length}) :</p>
              <div className="flex flex-wrap gap-1">
                {permissions.map((permission) => (
                  <Badge key={permission} variant="outline" className="text-xs">
                    {permission}
                  </Badge>
                ))}
              </div>
            </div>
            
            <Separator />
            
            <div>
              <p className="text-sm font-medium mb-2">Rôles actuels ({roles.length}) :</p>
              <div className="space-y-2">
                {roles.map((role) => (
                  <div key={role.id} className="flex items-center justify-between p-2 border rounded">
                    <div>
                      <span className="font-medium">{role.name}</span>
                      {role.description && (
                        <span className="text-sm text-gray-500 ml-2">- {role.description}</span>
                      )}
                    </div>
                    {role.isSystem && (
                      <Badge variant="secondary" className="text-xs">Système</Badge>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
