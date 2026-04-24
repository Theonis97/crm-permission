"use client"

import { useState, useEffect, useMemo } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Loader2, Share2, UserPlus, User, Check, ChevronsUpDown } from "lucide-react"
import { toast } from "@/lib/app-toast"
import { cn } from "@/lib/utils"

interface GedFile {
  id: string
  name: string
}

interface GedFolder {
  id: string
  name: string
}

interface UserOption {
  id: string
  name: string | null
  firstName: string | null
  lastName: string | null
  email: string
}

interface GedShareModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  file?: GedFile | null
  folder?: GedFolder | null
}

export function GedShareModal({
  open,
  onOpenChange,
  file,
  folder,
}: GedShareModalProps) {
  const [users, setUsers] = useState<UserOption[]>([])
  const [selectedUserId, setSelectedUserId] = useState<string>("")
  const [canEdit, setCanEdit] = useState(false)
  const [canDelete, setCanDelete] = useState(false)
  const [canShare, setCanShare] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingUsers, setIsLoadingUsers] = useState(true)
  const [comboboxOpen, setComboboxOpen] = useState(false)

  const item = file || folder
  const isFolder = !!folder

  const selectedUser = useMemo(() => {
    return users.find((u) => u.id === selectedUserId)
  }, [users, selectedUserId])

  useEffect(() => {
    if (open) {
      fetchUsers()
    }
  }, [open])

  const fetchUsers = async () => {
    setIsLoadingUsers(true)
    try {
      const response = await fetch("/api/users")
      if (response.ok) {
        const data = await response.json()
        setUsers(data.users || data || [])
      }
    } catch (error) {
      console.error("Error fetching users:", error)
    } finally {
      setIsLoadingUsers(false)
    }
  }

  const getUserDisplayName = (user: UserOption) => {
    if (user.firstName && user.lastName) {
      return `${user.firstName} ${user.lastName}`
    }
    return user.name || user.email
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedUserId || !item) {
      toast.error("Veuillez sélectionner un utilisateur")
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch("/api/ged/shares", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileId: file?.id || null,
          folderId: folder?.id || null,
          sharedWithId: selectedUserId,
          canEdit,
          canDelete,
          canShare,
        }),
      })

      if (response.ok) {
        toast.success("Partage créé avec succès")
        handleClose()
      } else {
        const error = await response.json()
        toast.error(error.error || "Erreur lors du partage")
      }
    } catch (error) {
      toast.error("Erreur lors du partage")
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    if (!isLoading) {
      setSelectedUserId("")
      setCanEdit(false)
      setCanDelete(false)
      setCanShare(false)
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5 text-teal-600" />
            Partager {isFolder ? "le dossier" : "le fichier"}
          </DialogTitle>
        </DialogHeader>

        {item && (
          <div className="bg-gray-50 rounded-lg p-3 mb-4">
            <p className="text-sm font-medium text-gray-900 truncate">{item.name}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Partager avec</Label>
            {isLoadingUsers ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
              </div>
            ) : (
              <Popover open={comboboxOpen} onOpenChange={setComboboxOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={comboboxOpen}
                    className="w-full justify-between font-normal"
                  >
                    {selectedUser ? (
                      <div className="flex items-center gap-2 truncate">
                        <User className="h-4 w-4 text-gray-400 flex-shrink-0" />
                        <span className="truncate">{getUserDisplayName(selectedUser)}</span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">Rechercher un utilisateur...</span>
                    )}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[400px] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Rechercher par nom ou email..." />
                    <CommandList>
                      <CommandEmpty>Aucun utilisateur trouvé.</CommandEmpty>
                      <CommandGroup>
                        {users.map((user) => (
                          <CommandItem
                            key={user.id}
                            value={`${getUserDisplayName(user)} ${user.email}`}
                            onSelect={() => {
                              setSelectedUserId(user.id)
                              setComboboxOpen(false)
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                selectedUserId === user.id ? "opacity-100" : "opacity-0"
                              )}
                            />
                            <User className="mr-2 h-4 w-4 text-gray-400" />
                            <div className="flex flex-col">
                              <span>{getUserDisplayName(user)}</span>
                              <span className="text-xs text-gray-500">{user.email}</span>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            )}
          </div>

          <div className="space-y-3">
            <Label>Permissions</Label>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="can-edit"
                  checked={canEdit}
                  onCheckedChange={(checked) => setCanEdit(checked as boolean)}
                />
                <label
                  htmlFor="can-edit"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Peut modifier
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="can-delete"
                  checked={canDelete}
                  onCheckedChange={(checked) => setCanDelete(checked as boolean)}
                />
                <label
                  htmlFor="can-delete"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Peut supprimer
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="can-share"
                  checked={canShare}
                  onCheckedChange={(checked) => setCanShare(checked as boolean)}
                />
                <label
                  htmlFor="can-share"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Peut re-partager
                </label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
            >
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={isLoading || !selectedUserId}
              className="bg-teal-600 hover:bg-teal-700"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Partage...
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Partager
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
