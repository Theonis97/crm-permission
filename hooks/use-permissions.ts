"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import type { UserPermissions } from "@/types/auth"

export function usePermissions(): UserPermissions & {
  hasPermission: (permission: string) => boolean
  hasAnyPermission: (permissions: string[]) => boolean
  hasAllPermissions: (permissions: string[]) => boolean
  stores: Array<{ id: string; name: string; roles: string[] }>
  deliveryProfile: {
    id: string
    name: string
    phone: string
    defaultStoreId: string
  } | null
  permissionsError: string | null
} {
  const { data: session, status } = useSession()
  const [permissions, setPermissions] = useState<string[]>([])
  const [user, setUser] = useState(null)
  const [stores, setStores] = useState<Array<{ id: string; name: string; roles: string[] }>>([])
  const [deliveryProfile, setDeliveryProfile] = useState<{
    id: string
    name: string
    phone: string
    defaultStoreId: string
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [permissionsError, setPermissionsError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const controller = new AbortController()

    const fetchUserPermissions = async () => {
      if (status === "loading") return

      if (!session?.user?.id) {
        setPermissionsError(null)
        setDeliveryProfile(null)
        setLoading(false)
        return
      }

      try {
        setPermissionsError(null)
        const response = await fetch(`/api/users/${session.user.id}/permissions`, {
          credentials: "include",
          cache: "no-store",
          signal: controller.signal,
        })
        if (cancelled) return
        if (response.ok) {
          const data = await response.json()
          setUser(data.user)
          setPermissions(data.permissions ?? [])
          setStores(data.stores ?? [])
          setDeliveryProfile(data.deliveryProfile ?? null)
        } else {
          setDeliveryProfile(null)
          const data = await response.json().catch(() => ({} as { code?: string }))
          if (response.status === 503 && data.code === "DATABASE_UNAVAILABLE") {
            setPermissionsError(
              "La base de données est inaccessible (PostgreSQL : vérifiez DATABASE_URL et le mot de passe). Les modules peuvent apparaître restreints tant que la connexion échoue.",
            )
          } else {
            setPermissionsError("Impossible de charger vos permissions (erreur serveur).")
          }
        }
      } catch (error) {
        if (cancelled || (error instanceof Error && error.name === "AbortError")) return
        console.error("Error fetching permissions:", error)
        setPermissionsError("Impossible de charger vos permissions (réseau ou serveur).")
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void fetchUserPermissions()

    return () => {
      cancelled = true
      controller.abort()
    }
  }, [session, status])

  const hasPermission = (permission: string): boolean => {
    return permissions.includes(permission)
  }

  const hasAnyPermission = (permissionList: string[]): boolean => {
    return permissionList.some((permission) => permissions.includes(permission))
  }

  const hasAllPermissions = (permissionList: string[]): boolean => {
    return permissionList.every((permission) => permissions.includes(permission))
  }

  return {
    user,
    permissions,
    stores,
    deliveryProfile,
    loading: loading || status === "loading",
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    permissionsError,
  }
}
