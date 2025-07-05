"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Loader2 } from "lucide-react"
import { useSession } from "next-auth/react"
import { useToast } from "@/hooks/use-toast"

interface CreateTaskSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onTaskCreated: () => void
  users: Array<{ id: string; name: string }>
  opportunities: Array<{ id: string; title: string }>
}

export function CreateTaskSheet({ open, onOpenChange, onTaskCreated, users, opportunities }: CreateTaskSheetProps) {
  const { data: session } = useSession()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    title: "",
    userId: "defaultUserId", // Valeur par défaut
    opportunityId: "noOpportunity",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.title.trim()) {
      toast({
        title: "Erreur",
        description: "Le titre de la tâche est requis",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formData.title.trim(),
          userId: formData.userId === "defaultUserId" ? session?.user?.id : formData.userId,
          opportunityId: formData.opportunityId === "noOpportunity" ? null : formData.opportunityId,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        toast({
          title: "Succès",
          description: "La tâche a été créée avec succès",
        })
        onTaskCreated()
        onOpenChange(false)
        setFormData({
          title: "",
          userId: "defaultUserId",
          opportunityId: "noOpportunity",
        })
      } else {
        toast({
          title: "Erreur",
          description: data.error || "Erreur lors de la création de la tâche",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Erreur lors de la création de la tâche:", error)
      toast({
        title: "Erreur",
        description: "Une erreur inattendue s'est produite",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      title: "",
      userId: "defaultUserId",
      opportunityId: "noOpportunity",
    })
  }

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      resetForm()
    }
    onOpenChange(open)
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <SheetHeader>
            <SheetTitle>Nouvelle tâche</SheetTitle>
            <SheetDescription>Créez une nouvelle tâche rapidement.</SheetDescription>
          </SheetHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Titre de la tâche *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Entrez le titre de la tâche"
                required
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label>Assigner à</Label>
              <Select value={formData.userId} onValueChange={(value) => setFormData({ ...formData, userId: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="defaultUserId">
                    Moi-même ({session?.user?.name || session?.user?.email || "Utilisateur actuel"})
                  </SelectItem>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Opportunité (optionnel)</Label>
              <Select
                value={formData.opportunityId}
                onValueChange={(value) => setFormData({ ...formData, opportunityId: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="noOpportunity">Aucune opportunité</SelectItem>
                  {opportunities.map((opportunity) => (
                    <SelectItem key={opportunity.id} value={opportunity.id}>
                      {opportunity.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <SheetFooter>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={isLoading}>
              Annuler
            </Button>
            <Button type="submit" disabled={isLoading || !formData.title.trim()}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Créer la tâche
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}
