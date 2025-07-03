"use client"

import { useState } from "react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Loader2, Trash2 } from "lucide-react"
import type { RoleWithPermissions } from "@/types/auth"

interface DeleteRoleDialogProps {
  role: RoleWithPermissions & { _count: { userRoles: number } }
  open: boolean
  onOpenChange: (open: boolean) => void
  onRoleDeleted: () => void
}

export function DeleteRoleDialog({ role, open, onOpenChange, onRoleDeleted }: DeleteRoleDialogProps) {
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async () => {
    setDeleting(true)
    try {
      const response = await fetch(`/api/roles/${role.id}`, {
        method: "DELETE",
      })

      if (response.ok) {
        onRoleDeleted()
      }
    } catch (error) {
      console.error("Error deleting role:", error)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center space-x-2">
            <Trash2 className="w-5 h-5 text-red-600" />
            <span>Supprimer le rôle</span>
          </AlertDialogTitle>
          <AlertDialogDescription>
            Êtes-vous sûr de vouloir supprimer le rôle "{role.name}" ?
            {role._count.userRoles > 0 && (
              <div className="mt-2 p-3 bg-orange-50 border border-orange-200 rounded-md">
                <p className="text-orange-800 text-sm">
                  ⚠️ Attention : Ce rôle est assigné à {role._count.userRoles} utilisateur
                  {role._count.userRoles !== 1 ? "s" : ""}. La suppression retirera ce rôle de tous les utilisateurs.
                </p>
              </div>
            )}
            <p className="mt-2 text-sm text-gray-600">Cette action est irréversible.</p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Annuler</AlertDialogCancel>
          <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-red-600 hover:bg-red-700">
            {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Supprimer
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
