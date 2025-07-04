"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { X, Plus } from "lucide-react"
import type { Contact, ContactType, ContactStatus } from "@/types/contacts"
import { toast } from "sonner"

interface User {
  id: string
  firstName: string | null
  lastName: string | null
  email: string
}

interface EditContactSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  contact: Contact
  onContactUpdated: () => void
}

export function EditContactSheet({ open, onOpenChange, contact, onContactUpdated }: EditContactSheetProps) {
  const [loading, setLoading] = useState(false)
  const [users, setUsers] = useState<User[]>([])
  const [newTag, setNewTag] = useState("")

  const [formData, setFormData] = useState({
    firstName: contact.firstName || "",
    lastName: contact.lastName || "",
    email: contact.email || "",
    phone: contact.phone || "",
    photo: contact.photo || "",
    job: contact.job || "",
    description: contact.description || "",
    tags: contact.tags || [],
    assignedUserId: contact.assignedUserId,
    type: contact.type,
    status: contact.status,
  })

  // Réinitialiser le formulaire quand le contact change
  useEffect(() => {
    setFormData({
      firstName: contact.firstName || "",
      lastName: contact.lastName || "",
      email: contact.email || "",
      phone: contact.phone || "",
      photo: contact.photo || "",
      job: contact.job || "",
      description: contact.description || "",
      tags: contact.tags || [],
      assignedUserId: contact.assignedUserId,
      type: contact.type,
      status: contact.status,
    })
  }, [contact])

  // Charger les utilisateurs
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await fetch("/api/users")
        if (response.ok) {
          const data = await response.json()
          setUsers(data)
        }
      } catch (error) {
        console.error("Erreur lors du chargement des utilisateurs:", error)
      }
    }

    if (open) {
      fetchUsers()
    }
  }, [open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch(`/api/contacts/${contact.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        throw new Error("Erreur lors de la mise à jour")
      }

      onContactUpdated()
      onOpenChange(false)
    } catch (error) {
      console.error("Erreur:", error)
      toast.error("Erreur lors de la mise à jour du contact")
    } finally {
      setLoading(false)
    }
  }

  const addTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData((prev) => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()],
      }))
      setNewTag("")
    }
  }

  const removeTag = (tagToRemove: string) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags.filter((tag) => tag !== tagToRemove),
    }))
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault()
      addTag()
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Modifier le contact</SheetTitle>
          <SheetDescription>Modifiez les informations de ce contact.</SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-6">
          {/* Type de contact */}
          <div className="space-y-2">
            <Label htmlFor="type">Type de contact</Label>
            <Select
              value={formData.type}
              onValueChange={(value: ContactType) => setFormData((prev) => ({ ...prev, type: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PERSONNE">Personne</SelectItem>
                <SelectItem value="ENTREPRISE">Entreprise</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Nom/Raison sociale */}
          {formData.type === "PERSONNE" ? (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">Prénom</Label>
                <Input
                  id="firstName"
                  value={formData.firstName}
                  onChange={(e) => setFormData((prev) => ({ ...prev, firstName: e.target.value }))}
                  placeholder="Prénom"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Nom</Label>
                <Input
                  id="lastName"
                  value={formData.lastName}
                  onChange={(e) => setFormData((prev) => ({ ...prev, lastName: e.target.value }))}
                  placeholder="Nom"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="firstName">Raison sociale</Label>
              <Input
                id="firstName"
                value={formData.firstName}
                onChange={(e) => setFormData((prev) => ({ ...prev, firstName: e.target.value }))}
                placeholder="Nom de l'entreprise"
              />
            </div>
          )}

          {/* Contact */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                placeholder="email@exemple.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Téléphone</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
                placeholder="+33 1 23 45 67 89"
              />
            </div>
          </div>

          {/* Fonction */}
          <div className="space-y-2">
            <Label htmlFor="job">{formData.type === "PERSONNE" ? "Fonction" : "Secteur d'activité"}</Label>
            <Input
              id="job"
              value={formData.job}
              onChange={(e) => setFormData((prev) => ({ ...prev, job: e.target.value }))}
              placeholder={formData.type === "PERSONNE" ? "Directeur Marketing" : "Services numériques"}
            />
          </div>

          {/* Statut */}
          <div className="space-y-2">
            <Label htmlFor="status">Statut</Label>
            <Select
              value={formData.status}
              onValueChange={(value: ContactStatus) => setFormData((prev) => ({ ...prev, status: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PROSPECT">Prospect</SelectItem>
                <SelectItem value="CLIENT">Client</SelectItem>
                <SelectItem value="LEAD">Lead</SelectItem>
                <SelectItem value="ARCHIVE">Archivé</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Utilisateur assigné */}
          <div className="space-y-2">
            <Label htmlFor="assignedUserId">Assigné à</Label>
            <Select
              value={formData.assignedUserId}
              onValueChange={(value) => setFormData((prev) => ({ ...prev, assignedUserId: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un utilisateur" />
              </SelectTrigger>
              <SelectContent>
                {users.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.firstName} {user.lastName} ({user.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label>Tags</Label>
            <div className="flex gap-2">
              <Input
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ajouter un tag"
                className="flex-1"
              />
              <Button type="button" onClick={addTag} size="sm">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {formData.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="ml-1 hover:bg-destructive/20 rounded-full p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="Notes et informations complémentaires..."
              rows={3}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Annuler
            </Button>
            <Button type="submit" disabled={loading || !formData.assignedUserId}>
              {loading ? "Mise à jour..." : "Mettre à jour"}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}
