"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"

export interface StorePermissions {
  user: any | null
  permissions: string[]
  roles: any[]
  loading: boolean
  hasStoreAccess: boolean
}

export interface StorePermissionsHook extends StorePermissions {
  hasStorePermission: (permission: string) => boolean
  hasAnyStorePermission: (permissions: string[]) => boolean
  hasAllStorePermissions: (permissions: string[]) => boolean
  refreshPermissions: () => Promise<void>
}

export function useStorePermissions(storeId: string): StorePermissionsHook {
  const { data: session, status } = useSession()
  const [permissions, setPermissions] = useState<string[]>([])
  const [roles, setRoles] = useState<any[]>([])
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [hasStoreAccess, setHasStoreAccess] = useState(false)

  const fetchUserStorePermissions = async () => {
    if (status === "loading") return

    if (!session?.user?.id || !storeId) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const response = await fetch(`/api/stores/${storeId}/users/${session.user.id}/permissions`)
      
      if (response.ok) {
        const data = await response.json()
        setUser(data.user)
        setPermissions(data.permissions || [])
        setRoles(data.roles || [])
        setHasStoreAccess(data.hasStoreAccess || false)
      } else if (response.status === 404) {
        // L'utilisateur n'a pas d'accès à ce magasin
        setUser(null)
        setPermissions([])
        setRoles([])
        setHasStoreAccess(false)
      } else {
        console.error("Error fetching store permissions:", response.statusText)
        setPermissions([])
        setRoles([])
        setHasStoreAccess(false)
      }
    } catch (error) {
      console.error("Error fetching store permissions:", error)
      setPermissions([])
      setRoles([])
      setHasStoreAccess(false)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUserStorePermissions()
  }, [session, status, storeId])

  const hasStorePermission = (permission: string): boolean => {
    return permissions.includes(permission)
  }

  const hasAnyStorePermission = (permissionList: string[]): boolean => {
    return permissionList.some((permission) => permissions.includes(permission))
  }

  const hasAllStorePermissions = (permissionList: string[]): boolean => {
    return permissionList.every((permission) => permissions.includes(permission))
  }

  const refreshPermissions = async (): Promise<void> => {
    await fetchUserStorePermissions()
  }

  return {
    user,
    permissions,
    roles,
    loading: loading || status === "loading",
    hasStoreAccess,
    hasStorePermission,
    hasAnyStorePermission,
    hasAllStorePermissions,
    refreshPermissions
  }
}
