"use client"

import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Separator } from "@/components/ui/separator"
import { User, Mail, Calendar, Shield, CheckCircle, XCircle } from "lucide-react"

interface StoreUser {
  id: string
  firstName: string | null
  lastName: string | null
  name: string | null
  email: string
  image: string | null
  status: string
  createdAt: string
  storeRoles: Array<{
    id: string
    name: string
    description: string | null
    isSystem: boolean
    assignedAt: string
    assignedBy: {
      id: string
      name: string | null
      email: string
    }
    permissions: Array<{
      id: string
      name: string
      description: string | null
    }>
  }>
}

interface ViewStoreUserSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  user: StoreUser | null
}

export function ViewStoreUserSheet({ open, onOpenChange, user }: ViewStoreUserSheetProps) {
  if (!user) return null

  const getUserDisplayName = (user: StoreUser) => {
    if (user.firstName && user.lastName) {
      return `${user.firstName} ${user.lastName}`
    }
    return user.name || user.email
  }

  const getUserInitials = (user: StoreUser) => {
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return (
          <Badge className="bg-green-100 text-green-800 border-green-200">
            <CheckCircle className="w-3 h-3 mr-1" />
            Actif
          </Badge>
        )
      case "INACTIVE":
        return (
          <Badge variant="secondary">
            <XCircle className="w-3 h-3 mr-1" />
            Inactif
          </Badge>
        )
      case "SUSPENDED":
        return (
          <Badge className="bg-red-100 text-red-800 border-red-200">
            <XCircle className="w-3 h-3 mr-1" />
            Suspendu
          </Badge>
        )
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  // Grouper les permissions par module
  const groupedPermissions = user.storeRoles.reduce((acc, role) => {
    role.permissions.forEach(permission => {
      const module = permission.name.split('.')[1] || 'general'
      if (!acc[module]) {
        acc[module] = []
      }
      acc[module].push(permission)
    })
    return acc
  }, {} as Record<string, any[]>)

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[600px] sm:w-[700px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Détails de l'utilisateur
          </SheetTitle>
          <SheetDescription>
            Informations détaillées sur cet utilisateur du magasin
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 py-6">
          {/* Informations personnelles */}
          <div className="flex items-start space-x-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={user.image || undefined} />
              <AvatarFallback className="text-lg">{getUserInitials(user)}</AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-2">
              <h3 className="text-lg font-semibold">{getUserDisplayName(user)}</h3>
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <Mail className="h-4 w-4" />
                <span>{user.email}</span>
              </div>
              <div className="flex items-center space-x-2">
                {getStatusBadge(user.status)}
              </div>
            </div>
          </div>

          <Separator />

          {/* Informations générales */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-gray-900">Informations générales</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Prénom</span>
                <p className="font-medium">{user.firstName || "Non renseigné"}</p>
              </div>
              <div>
                <span className="text-gray-500">Nom</span>
                <p className="font-medium">{user.lastName || "Non renseigné"}</p>
              </div>
              <div>
                <span className="text-gray-500">Email</span>
                <p className="font-medium">{user.email}</p>
              </div>
              <div>
                <span className="text-gray-500">Statut</span>
                <div className="mt-1">{getStatusBadge(user.status)}</div>
              </div>
              <div>
                <span className="text-gray-500">Membre depuis</span>
                <p className="font-medium flex items-center">
                  <Calendar className="h-4 w-4 mr-1" />
                  {new Date(user.createdAt).toLocaleDateString('fr-FR', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Rôles dans le magasin */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-gray-900 flex items-center">
              <Shield className="h-4 w-4 mr-2" />
              Rôles dans ce magasin ({user.storeRoles.length})
            </h4>
            <div className="space-y-3">
              {user.storeRoles.map((role) => (
                <div key={role.id} className="border rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <Badge variant={role.isSystem ? "default" : "outline"}>
                        {role.name}
                      </Badge>
                      {role.isSystem && (
                        <Badge variant="secondary" className="text-xs">
                          Système
                        </Badge>
                      )}
                    </div>
                    <span className="text-xs text-gray-500">
                      {role.permissions.length} permission(s)
                    </span>
                  </div>
                  {role.description && (
                    <p className="text-sm text-gray-600 mb-2">{role.description}</p>
                  )}
                  <div className="text-xs text-gray-500">
                    Assigné le {new Date(role.assignedAt).toLocaleDateString('fr-FR')} 
                    par {role.assignedBy.name || role.assignedBy.email}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Permissions */}
          {Object.keys(groupedPermissions).length > 0 && (
            <>
              <Separator />
              <div className="space-y-4">
                <h4 className="text-sm font-medium text-gray-900">
                  Permissions effectives
                </h4>
                <div className="space-y-3">
                  {Object.entries(groupedPermissions).map(([module, permissions]) => (
                    <div key={module} className="space-y-2">
                      <h5 className="text-sm font-medium text-gray-700 capitalize">
                        {module.replace('_', ' ')}
                      </h5>
                      <div className="flex flex-wrap gap-2">
                        {permissions.map((permission) => (
                          <Badge key={permission.id} variant="outline" className="text-xs">
                            {permission.name.split('.').pop()}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
