"use client"

import { useState, useEffect } from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { XIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Clock, LogIn, LogOut, Loader2, Calendar, Check, ChevronsUpDown, Search } from "lucide-react"
import { toast } from "@/lib/app-toast"

interface ManualEntryDialogProps {
  isOpen: boolean
  onClose: () => void
  userId?: string | null
  userName?: string
  date?: string | null
  initialCheckIn?: string | null
  initialCheckOut?: string | null
  users?: Array<{
    id: string
    firstName: string | null
    lastName: string | null
    name: string | null
    email: string
  }>
  onSuccess?: () => void
}

export function ManualEntryDialog({
  isOpen,
  onClose,
  userId: propUserId,
  userName,
  date: propDate,
  initialCheckIn,
  initialCheckOut,
  users = [],
  onSuccess,
}: ManualEntryDialogProps) {
  const [loading, setLoading] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState<string>(propUserId || "")
  const [selectedDate, setSelectedDate] = useState<string>(
    propDate || new Date().toISOString().split("T")[0]
  )
  const [checkInTime, setCheckInTime] = useState<string>(initialCheckIn || "")
  const [checkOutTime, setCheckOutTime] = useState<string>(initialCheckOut || "")
  const [notes, setNotes] = useState<string>("")
  const [userSearchOpen, setUserSearchOpen] = useState(false)
  const [userSearchQuery, setUserSearchQuery] = useState("")

  useEffect(() => {
    if (isOpen) {
      setSelectedUserId(propUserId || "")
      setSelectedDate(propDate || new Date().toISOString().split("T")[0])
      setCheckInTime(initialCheckIn || "")
      setCheckOutTime(initialCheckOut || "")
      setNotes("")
    }
  }, [isOpen, propUserId, propDate, initialCheckIn, initialCheckOut])

  const handleSubmit = async () => {
    const targetUserId = selectedUserId || propUserId

    if (!targetUserId) {
      toast.error("Veuillez sélectionner un employé")
      return
    }

    if (!selectedDate) {
      toast.error("Veuillez sélectionner une date")
      return
    }

    if (!checkInTime && !checkOutTime) {
      toast.error("Veuillez saisir au moins une heure (arrivée ou départ)")
      return
    }

    // Validation: checkOut doit être après checkIn
    if (checkInTime && checkOutTime) {
      const [inH, inM] = checkInTime.split(":").map(Number)
      const [outH, outM] = checkOutTime.split(":").map(Number)
      const inMinutes = inH * 60 + inM
      const outMinutes = outH * 60 + outM

      if (outMinutes <= inMinutes) {
        toast.error("L'heure de départ doit être après l'heure d'arrivée")
        return
      }
    }

    setLoading(true)
    try {
      const response = await fetch("/api/attendance/manual-entry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: targetUserId,
          date: selectedDate,
          checkInTime: checkInTime || null,
          checkOutTime: checkOutTime || null,
          notes: notes || null,
        }),
      })

      if (response.ok) {
        toast.success("Pointage enregistré avec succès")
        onSuccess?.()
        onClose()
      } else {
        const error = await response.json()
        toast.error(error.error || "Erreur lors de l'enregistrement")
      }
    } catch (error) {
      toast.error("Erreur lors de l'enregistrement")
    } finally {
      setLoading(false)
    }
  }

  const getUserDisplayName = (user: typeof users[0]) => {
    if (user.firstName && user.lastName) {
      return `${user.firstName} ${user.lastName}`
    }
    return user.name || user.email
  }

  const formatDateDisplay = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("fr-FR", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    })
  }

  // Calcul des heures travaillées en temps réel
  const calculateHours = () => {
    if (!checkInTime || !checkOutTime) return null
    const [inH, inM] = checkInTime.split(":").map(Number)
    const [outH, outM] = checkOutTime.split(":").map(Number)
    const inMinutes = inH * 60 + inM
    const outMinutes = outH * 60 + outM
    if (outMinutes <= inMinutes) return null
    const diff = outMinutes - inMinutes
    const hours = Math.floor(diff / 60)
    const minutes = diff % 60
    return `${hours}h${minutes > 0 ? ` ${minutes}min` : ""}`
  }

  const hoursWorked = calculateHours()

  return (
    <DialogPrimitive.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[2100] bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content className="fixed left-[50%] top-[50%] z-[2100] grid w-full max-w-md translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 sm:rounded-lg">
          <div className="flex flex-col space-y-1.5 text-center sm:text-left">
            <DialogPrimitive.Title className="text-lg font-semibold leading-none tracking-tight flex items-center gap-2">
            <Clock className="h-5 w-5 text-cyan-600" />
            Saisie manuelle de pointage
          </DialogPrimitive.Title>
            <DialogPrimitive.Description className="text-sm text-muted-foreground">
            {userName
              ? `Saisir les heures pour ${userName}`
              : "Saisir manuellement les heures d'arrivée et de départ"}
          </DialogPrimitive.Description>
          </div>

        <div className="space-y-4 py-4">
          {/* Sélection de l'employé avec recherche */}
          {!propUserId && users.length > 0 && (
            <div className="space-y-2">
              <Label>Employé</Label>
              <Popover open={userSearchOpen} onOpenChange={setUserSearchOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={userSearchOpen}
                    className="w-full justify-between font-normal"
                  >
                    {selectedUserId
                      ? getUserDisplayName(users.find((u) => u.id === selectedUserId)!)
                      : "Rechercher un employé..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0 z-[2200]" align="start">
                  <Command>
                    <CommandInput 
                      placeholder="Rechercher par nom..." 
                      value={userSearchQuery}
                      onValueChange={setUserSearchQuery}
                    />
                    <CommandList>
                      <CommandEmpty>Aucun employé trouvé.</CommandEmpty>
                      <CommandGroup>
                        {users
                          .filter((user) => {
                            const displayName = getUserDisplayName(user).toLowerCase()
                            return displayName.includes(userSearchQuery.toLowerCase())
                          })
                          .map((user) => (
                            <CommandItem
                              key={user.id}
                              value={getUserDisplayName(user)}
                              onSelect={() => {
                                setSelectedUserId(user.id)
                                setUserSearchOpen(false)
                                setUserSearchQuery("")
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  selectedUserId === user.id ? "opacity-100" : "opacity-0"
                                )}
                              />
                              {getUserDisplayName(user)}
                            </CommandItem>
                          ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          )}

          {/* Date */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-gray-500" />
              Date
            </Label>
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              max={new Date().toISOString().split("T")[0]}
            />
            {selectedDate && (
              <p className="text-xs text-gray-500 capitalize">
                {formatDateDisplay(selectedDate)}
              </p>
            )}
          </div>

          {/* Heures */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <LogIn className="h-4 w-4 text-emerald-600" />
                Heure d'arrivée
              </Label>
              <Input
                type="time"
                value={checkInTime}
                onChange={(e) => setCheckInTime(e.target.value)}
                className="font-mono"
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <LogOut className="h-4 w-4 text-red-600" />
                Heure de départ
              </Label>
              <Input
                type="time"
                value={checkOutTime}
                onChange={(e) => setCheckOutTime(e.target.value)}
                className="font-mono"
              />
            </div>
          </div>

          {/* Affichage des heures calculées */}
          {hoursWorked && (
            <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-3 text-center">
              <p className="text-sm text-gray-600">Temps de travail</p>
              <p className="text-xl font-bold text-cyan-700">{hoursWorked}</p>
            </div>
          )}

          {/* Notes */}
          <div className="space-y-2">
            <Label>Notes (optionnel)</Label>
            <Textarea
              placeholder="Raison de la saisie manuelle..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>
        </div>

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2">
            <Button variant="outline" onClick={onClose} disabled={loading}>
              Annuler
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={loading}
              className="bg-cyan-600 hover:bg-cyan-700"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Enregistrement...
                </>
              ) : (
                "Enregistrer"
              )}
            </Button>
          </div>
          <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
            <XIcon className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
