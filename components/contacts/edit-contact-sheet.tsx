"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"
import { X } from "lucide-react"
import type { Contact, ContactType, ContactStatus, UpdateContactData } from "@/types/contacts"
import { toast } from "@/lib/app-toast"

interface EditContactSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  contact: Contact
  onContactUpdated: () => void
}

export function EditContactSheet({ open, onOpenChange, contact, onContactUpdated }: EditContactSheetProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState<Partial<UpdateContactData>>({})
  const [newTag, setNewTag] = useState("")

  useEffect(() => {
    if (contact) {
      setFormData({
        id: contact.id,
        firstName: contact.firstName || "",
        lastName: contact.lastName || "",
        email: contact.email || "",
        phone: contact.phone || "",
        job: contact.job || "",
        description: contact.description || "",
        type: contact.type,
        status: contact.status,
        tags: [...contact.tags],
        assignedUserId: contact.assignedUserId,
      })
    }
  }, [contact])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.firstName && !formData.lastName) {
      toast.error("Veuillez saisir au moins un nom")
      return
    }

    try {
      setLoading(true)
      const response = await fetch(`/api/contacts/${contact.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      if (!response.ok) throw new Error("Erreur lors de la mise à jour")

      onContactUpdated()
    } catch (error) {
      console.error("Erreur:", error)
      toast.error("Erreur lors de la mise à jour du contact")
    } finally {
      setLoading(false)
    }
  }

  const addTag = () => {
    if (newTag.trim() && !formData.tags?.includes(newTag.trim())) {
      setFormData((prev) => ({
        ...prev,
        tags: [...(prev.tags || []), newTag.trim()],
      }))
      setNewTag("")
    }
  }

  const removeTag = (tagToRemove: string) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags?.filter((tag) => tag !== tagToRemove) || [],
    }))
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[600px] sm:max-w-[600px] overflow-y-auto">
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

          {/* Nom et prénom */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">{formData.type === "ENTREPRISE" ? "Nom de l'entreprise" : "Prénom"}</Label>
              <Input
                id="firstName"
                value={formData.firstName || ""}
                onChange={(e) => setFormData((prev) => ({ ...prev, firstName: e.target.value }))}
                placeholder={formData.type === "ENTREPRISE" ? "Nom de l'entreprise" : "Prénom"}
              />
            </div>
            {formData.type === "PERSONNE" && (
              <div className="space-y-2">
                <Label htmlFor="lastName">Nom</Label>
                <Input
                  id="lastName"
                  value={formData.lastName || ""}
                  onChange={(e) => setFormData((prev) => ({ ...prev, lastName: e.target.value }))}
                  placeholder="Nom"
                />
              </div>
            )}
          </div>

          {/* Email et téléphone */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email || ""}
                onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                placeholder="email@exemple.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Téléphone</Label>
              <Input
                id="phone"
                value={formData.phone || ""}
                onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
                placeholder="+33 1 23 45 67 89"
              />
            </div>
          </div>

          {/* Fonction */}
          <div className="space-y-2">
            <Label htmlFor="job">{formData.type === "ENTREPRISE" ? "Secteur d'activité" : "Fonction"}</Label>
            <Input
              id="job"
              value={formData.job || ""}
              onChange={(e) => setFormData((prev) => ({ ...prev, job: e.target.value }))}
              placeholder={formData.type === "ENTREPRISE" ? "Secteur d'activité" : "Fonction"}
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

          {/* Tags */}
          <div className="space-y-2">
            <Label>Tags</Label>
            <div className="flex gap-2">
              <Input
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                placeholder="Ajouter un tag"
                onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
              />
              <Button type="button" variant="outline" onClick={addTag}>
                Ajouter
              </Button>
            </div>
            {formData.tags && formData.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {formData.tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                    {tag}
                    <X className="h-3 w-3 cursor-pointer" onClick={() => removeTag(tag)} />
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
              value={formData.description || ""}
              onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="Description du contact..."
              rows={3}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Mise à jour..." : "Mettre à jour"}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}
