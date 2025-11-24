"use client"

import React from "react"
import { Loader2, ShieldX, Store } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useStorePermissions } from "@/hooks/use-store-permissions"

interface StorePermissionGuardProps {
  storeId: string
  permission?: string
  permissions?: string[]
  requireAll?: boolean
  fallback?: React.ReactNode
  children: React.ReactNode
}

export function StorePermissionGuard({
  storeId,
  permission,
  permissions = [],
  requireAll = false,
  fallback,
  children,
}: StorePermissionGuardProps) {
  const { 
    hasStorePermission, 
    hasAnyStorePermission, 
    hasAllStorePermissions, 
    hasStoreAccess,
    loading 
  } = useStorePermissions(storeId)

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span className="ml-2">Vérification des permissions...</span>
      </div>
    )
  }

  // Vérifier d'abord si l'utilisateur a accès au magasin
  if (!hasStoreAccess) {
    if (fallback) {
      return <>{fallback}</>
    }

    return (
      <Alert variant="destructive" className="m-4">
        <Store className="h-4 w-4" />
        <AlertDescription>
          Vous n'avez pas accès à ce magasin. Contactez un administrateur pour obtenir les permissions nécessaires.
        </AlertDescription>
      </Alert>
    )
  }

  // Vérifier les permissions spécifiques
  let hasAccess = false

  if (permission) {
    hasAccess = hasStorePermission(permission)
  } else if (permissions.length > 0) {
    hasAccess = requireAll 
      ? hasAllStorePermissions(permissions) 
      : hasAnyStorePermission(permissions)
  } else {
    // Si aucune permission spécifique n'est demandée, 
    // l'accès au magasin suffit
    hasAccess = true
  }

  if (!hasAccess) {
    if (fallback) {
      return <>{fallback}</>
    }

    return (
      <>
        
      </>
    )
  }

  return <>{children}</>
}

// Composant d'ordre supérieur pour protéger des pages entières
export function withStorePermission<P extends object>(
  Component: React.ComponentType<P>,
  storeIdProp: keyof P,
  permission?: string,
  permissions?: string[],
  requireAll?: boolean
) {
  return function ProtectedComponent(props: P) {
    const storeId = props[storeIdProp] as string

    return (
      <StorePermissionGuard
        storeId={storeId}
        permission={permission}
        permissions={permissions}
        requireAll={requireAll}
      >
        <Component {...props} />
      </StorePermissionGuard>
    )
  }
}
