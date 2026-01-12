"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Store, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { ManagerSelector } from "@/components/stores/manager-selector"

interface CreateStoreSheetProps {
  open: boolean
  onClose: () => void
  onSuccess: (storeId?: string) => void
}

export function CreateStoreSheet({ open, onClose, onSuccess }: CreateStoreSheetProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    logo: "",
    coverImage: "",
    address: "",
    phone: "",
    email: "",
    whatsapp: "",
    managerId: null as string | null,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch("/api/stores", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || "Erreur lors de la création")
      }

      const newStore = await response.json()

      toast({
        title: "Magasin créé",
        description: `${newStore.name} a été créé avec succès`,
      })
      
      setFormData({
        name: "",
        logo: "",
        coverImage: "",
        address: "",
        phone: "",
        email: "",
        whatsapp: "",
        managerId: null,
      })
      
      // Rediriger vers la page du magasin avec l'ID
      onSuccess(newStore.id)
    } catch (error) {
      console.error("Error creating store:", error)
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Une erreur est survenue lors de la création",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-blue-950 rounded-lg flex items-center justify-center">
              <Store className="h-5 w-5 text-white" />
            </div>
            <div>
              <SheetTitle>Nouveau magasin</SheetTitle>
              <SheetDescription>Créer un nouveau point de vente</SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="mt-6 space-y-6">
          {/* Nom */}
          <div className="space-y-2">
            <Label htmlFor="name">
              Nom du magasin <span className="text-red-500">*</span>
            </Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleChange("name", e.target.value)}
              placeholder="Ex: Magasin Centre-Ville"
              required
            />
          </div>

          {/* Logo */}
          <div className="space-y-2">
            <Label htmlFor="logo">URL du logo</Label>
            <Input
              id="logo"
              type="url"
              value={formData.logo}
              onChange={(e) => handleChange("logo", e.target.value)}
              placeholder="https://exemple.com/logo.png"
            />
            <p className="text-xs text-gray-500">URL de l'image du logo du magasin</p>
          </div>

          {/* Cover Image */}
          <div className="space-y-2">
            <Label htmlFor="coverImage">URL de l'image de couverture</Label>
            <Input
              id="coverImage"
              type="url"
              value={formData.coverImage}
              onChange={(e) => handleChange("coverImage", e.target.value)}
              placeholder="https://exemple.com/cover.jpg"
            />
            <p className="text-xs text-gray-500">Image de couverture du magasin</p>
          </div>

          {/* Adresse */}
          <div className="space-y-2">
            <Label htmlFor="address">Adresse</Label>
            <Textarea
              id="address"
              value={formData.address}
              onChange={(e) => handleChange("address", e.target.value)}
              placeholder="123 Rue Exemple, Ville, Code Postal"
              rows={3}
            />
          </div>

          {/* Téléphone */}
          <div className="space-y-2">
            <Label htmlFor="phone">Numéro de téléphone</Label>
            <Input
              id="phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => handleChange("phone", e.target.value)}
              placeholder="+241 6XX XXX XXX"
            />
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => handleChange("email", e.target.value)}
              placeholder="magasin@exemple.com"
            />
          </div>

          {/* WhatsApp */}
          <div className="space-y-2">
            <Label htmlFor="whatsapp">WhatsApp</Label>
            <Input
              id="whatsapp"
              type="tel"
              value={formData.whatsapp}
              onChange={(e) => handleChange("whatsapp", e.target.value)}
              placeholder="+241 6XX XXX XXX"
            />
            <p className="text-xs text-gray-500">Numéro WhatsApp pour le contact client</p>
          </div>

          {/* Manager */}
          <ManagerSelector
            value={formData.managerId}
            onChange={(managerId) => setFormData((prev) => ({ ...prev, managerId }))}
            disabled={loading}
          />

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1" disabled={loading}>
              Annuler
            </Button>
            <Button type="submit" className="flex-1" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Création...
                </>
              ) : (
                "Créer le magasin"
              )}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}
