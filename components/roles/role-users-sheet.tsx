"use client"

import { useState, useEffect } from "react"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Users, Mail, Calendar, Loader2, ShieldCheck } from "lucide-react"
import { Separator } from "@/components/ui/separator"
import type { RoleWithPermissions } from "@/types/auth"

interface User {
  id: string
  email: string
  firstName: string | null
  lastName: string | null
  name: string | null
  status: string
  createdAt: string
}

interface RoleUsersSheetProps {
  role: RoleWithPermissions & { _count: { userRoles: number } }
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function RoleUsersSheet({ role, open, onOpenChange }: RoleUsersSheetProps) {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open && role) {
      loadRoleUsers()
    }
  }, [open, role])

  const loadRoleUsers = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/roles/${role.id}/users`)
      if (response.ok) {
        const data = await response.json()
        setUsers(data)
      }
    } catch (error) {
      console.error("Error loading role users:", error)
    } finally {
      setLoading(false)
    }
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

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-[700px] p-0 flex flex-col h-full">
        {/* Header */}
        <div className="px-6 py-4 border-b bg-gradient-to-r from-primary/5 to-primary/10 shrink-0">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2 text-xl">
              <div className="p-2 rounded-lg bg-primary/10">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <span>Utilisateurs du rôle "{role.name}"</span>
            </SheetTitle>
            <SheetDescription className="text-sm mt-1">
              Liste des utilisateurs ayant ce rôle
            </SheetDescription>
          </SheetHeader>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto px-6">
          <div className="py-6 space-y-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center space-y-3">
                  <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
                  <p className="text-sm text-muted-foreground">Chargement des utilisateurs...</p>
                </div>
              </div>
            ) : (
              <>
                {/* Stats */}
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border">
                  <ShieldCheck className="w-4 h-4 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Total utilisateurs</p>
                    <p className="text-xs text-muted-foreground">
                      {role._count.userRoles} utilisateur{role._count.userRoles !== 1 ? "s" : ""} possède{role._count.userRoles !== 1 ? "nt" : ""} ce rôle
                    </p>
                  </div>
                  <Badge variant="secondary" className="text-base px-3">
                    {role._count.userRoles}
                  </Badge>
                </div>

                <Separator />

                {/* Liste des utilisateurs */}
                {users.length > 0 ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="h-px flex-1 bg-border" />
                      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                        Utilisateurs
                      </h3>
                      <div className="h-px flex-1 bg-border" />
                    </div>

                    <div className="space-y-2">
                      {users.map((user) => (
                        <div
                          key={user.id}
                          className="flex items-center gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                        >
                          <Avatar className="h-12 w-12 shrink-0">
                            <AvatarImage src="/placeholder.svg" />
                            <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                              {getUserInitials(user)}
                            </AvatarFallback>
                          </Avatar>

                          <div className="flex-1 min-w-0 space-y-2">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-semibold truncate">
                                {user.firstName && user.lastName
                                  ? `${user.firstName} ${user.lastName}`
                                  : user.name || "Utilisateur"}
                              </p>
                              <Badge
                                variant={user.status === "ACTIVE" ? "default" : "secondary"}
                                className="text-xs shrink-0"
                              >
                                {user.status === "ACTIVE" ? "Actif" : user.status}
                              </Badge>
                            </div>

                            <div className="space-y-1">
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Mail className="w-3 h-3 shrink-0" />
                                <span className="truncate">{user.email}</span>
                              </div>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Calendar className="w-3 h-3 shrink-0" />
                                <span>Créé le {formatDate(user.createdAt)}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="p-4 rounded-full bg-muted/50 mb-4">
                      <Users className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-sm font-semibold mb-1">Aucun utilisateur</h3>
                    <p className="text-sm text-muted-foreground">
                      Aucun utilisateur n'a encore ce rôle
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
