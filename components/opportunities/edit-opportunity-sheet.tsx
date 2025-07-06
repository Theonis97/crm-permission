"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import type { Contact, Opportunity, OpportunityStatus } from "@/types/opportunities"
import { AlertCircle, CheckCircle2, Users, UserIcon, Loader2 } from "lucide-react"

interface EditOpportunitySheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  opportunity: Opportunity
  onSuccess: () => void
}

interface OpportunityUser {
  id: string
  firstName: string
  lastName: string
  email: string
}

const statusOptions = [
  { value: "NEW", label: "Nouvelle" },
  { value: "IN_PROGRESS", label: "En cours" },
  { value: "WON", label: "Gagnée" },
  { value: "LOST", label: "Perdue" },
]

export function EditOpportunitySheet({ open, onOpenChange, opportunity, onSuccess }: EditOpportunitySheetProps) {
  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(false)
  const [contacts, setContacts] = useState<Contact[]>([])
  const [users, setUsers] = useState<OpportunityUser[]>([])
  const [formData, setFormData] = useState({
    title: opportunity.title,
    description: opportunity.description || "",
    status: opportunity.status,
    contactId: opportunity.contactId,
    participantIds: opportunity.participants.map((p) => p.userId),
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Réinitialiser le formulaire quand l'opportunité change
  useEffect(() => {
    if (opportunity) {
      setFormData({
        title: opportunity.title,
        description: opportunity.description || "",
        status: opportunity.status,
        contactId: opportunity.contactId,
        participantIds: opportunity.participants.map((p) => p.userId),
      })
    }
  }, [opportunity])

  // Charger les contacts et utilisateurs
  useEffect(() => {
    if (open) {
      setLoadingData(true)
      Promise.all([
        fetch("/api/contacts").then((res) => {
          if (res.ok) {
            return res.json()
          }
          throw new Error("Erreur lors du chargement des contacts")
        }),
        fetch("/api/users").then((res) => {
          if (res.ok) {
            return res.json()
          }
          throw new Error("Erreur lors du chargement des utilisateurs")
        }),
      ])
        .then(([contactsData, usersData]) => {
          setContacts(contactsData || [])
          setUsers(usersData.users || [])
        })
        .catch((error) => {
          console.error("Erreur lors du chargement des données:", error)
          setErrors({ data: "Erreur lors du chargement des données" })
        })
        .finally(() => {
          setLoadingData(false)
        })
    }
  }, [open])

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.title.trim()) {
      newErrors.title = "Le titre est obligatoire"
    }

    if (!formData.contactId) {
      newErrors.contactId = "Le contact est obligatoire"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setLoading(true)

    try {
      const response = await fetch(`/api/opportunities/${opportunity.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        onSuccess()
        onOpenChange(false)
        setErrors({})
      } else {
        const data = await response.json()
        setErrors({ submit: data.error || "Erreur lors de la modification" })
      }
    } catch (error) {
      setErrors({ submit: "Erreur lors de la modification de l'opportunité" })
    } finally {
      setLoading(false)
    }
  }

  const handleParticipantToggle = (userId: string) => {
    setFormData((prev) => ({
      ...prev,
      participantIds: prev.participantIds.includes(userId)
        ? prev.participantIds.filter((id) => id !== userId)
        : [...prev.participantIds, userId],
    }))
  }

  // Validation des sections pour les badges
  const isBasicInfoValid = formData.title.trim() && formData.contactId
  const hasParticipants = formData.participantIds.length > 0

  if (loadingData) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-2xl">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
              <p className="text-gray-600">Chargement des données...</p>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Modifier l'opportunité</SheetTitle>
          <SheetDescription>Modifiez les informations de l'opportunité</SheetDescription>
        </SheetHeader>

        {errors.data && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3 mt-4">
            <p className="text-sm text-red-600">{errors.data}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6 mt-6">
          <Accordion type="multiple" defaultValue={["basic-info"]} className="w-full">
            {/* Informations de base */}
            <AccordionItem value="basic-info">
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-2">
                  <UserIcon className="h-4 w-4" />
                  <span>Informations de base</span>
                  {isBasicInfoValid ? (
                    <Badge variant="secondary" className="bg-green-100 text-green-800">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Complété
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="bg-red-100 text-red-800">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      Requis
                    </Badge>
                  )}
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Titre *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                    placeholder="Ex: Projet de refonte du site web"
                    className={errors.title ? "border-red-500" : ""}
                  />
                  {errors.title && <p className="text-sm text-red-600">{errors.title}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                    placeholder="Décrivez l'opportunité..."
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">Statut</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value: OpportunityStatus) => setFormData((prev) => ({ ...prev, status: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {statusOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contactId">Contact *</Label>
                  <Select
                    value={formData.contactId}
                    onValueChange={(value) => setFormData((prev) => ({ ...prev, contactId: value }))}
                  >
                    <SelectTrigger className={errors.contactId ? "border-red-500" : ""}>
                      <SelectValue placeholder="Sélectionner un contact" />
                    </SelectTrigger>
                    <SelectContent>
                      {contacts.length === 0 ? (
                        <div className="p-2 text-sm text-gray-500">Aucun contact disponible</div>
                      ) : (
                        contacts.map((contact) => (
                          <SelectItem key={contact.id} value={contact.id}>
                            <div className="flex flex-col">
                              <span>
                                {contact.firstName} {contact.lastName}
                              </span>
                              {contact.email && <span className="text-xs text-gray-500">{contact.email}</span>}
                            </div>
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  {errors.contactId && <p className="text-sm text-red-600">{errors.contactId}</p>}
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Participants */}
            <AccordionItem value="participants">
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  <span>Participants</span>
                  {hasParticipants && (
                    <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                      {formData.participantIds.length} sélectionné{formData.participantIds.length > 1 ? "s" : ""}
                    </Badge>
                  )}
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-4 pt-4">
                <p className="text-sm text-gray-600">
                  Sélectionnez les utilisateurs qui participeront à cette opportunité
                </p>

                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {users.length === 0 ? (
                    <p className="text-sm text-gray-500">Aucun utilisateur disponible</p>
                  ) : (
                    users.map((user) => (
                      <div key={user.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`participant-${user.id}`}
                          checked={formData.participantIds.includes(user.id)}
                          onCheckedChange={() => handleParticipantToggle(user.id)}
                        />
                        <Label htmlFor={`participant-${user.id}`} className="flex-1 cursor-pointer">
                          <div>
                            <p className="font-medium">
                              {user.firstName} {user.lastName}
                            </p>
                            <p className="text-sm text-gray-500">{user.email}</p>
                          </div>
                        </Label>
                      </div>
                    ))
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          {errors.submit && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <p className="text-sm text-red-600">{errors.submit}</p>
            </div>
          )}

          {/* Boutons de soumission fixes */}
          <div className="sticky bottom-0 bg-white border-t pt-4 mt-6">
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
                Annuler
              </Button>
              <Button type="submit" disabled={loading || !isBasicInfoValid}>
                {loading ? "Modification..." : "Modifier l'opportunité"}
              </Button>
            </div>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}
