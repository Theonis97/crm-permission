"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import type { UserPermissions } from "@/types/auth"

export function usePermissions(): UserPermissions & {
  hasPermission: (permission: string) => boolean
  hasAnyPermission: (permissions: string[]) => boolean
  hasAllPermissions: (permissions: string[]) => boolean
} {
  const { data: session, status } = useSession()
  const [permissions, setPermissions] = useState<string[]>([])
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchUserPermissions = async () => {
      if (status === "loading") return

      if (!session?.user?.id) {
        setLoading(false)
        return
      }

      try {
        const response = await fetch(`/api/users/${session.user.id}/permissions`)
        if (response.ok) {
          const data = await response.json()
          setUser(data.user)
          setPermissions(data.permissions)
        }
      } catch (error) {
        console.error("Error fetching permissions:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchUserPermissions()
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
    loading: loading || status === "loading",
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
  }
}
