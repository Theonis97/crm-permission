"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { useToast } from "@/hooks/use-toast"
import type { ProductCategory, CreateProductData } from "@/types/products"

interface CreateProductSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onProductCreated: () => void
  categories: ProductCategory[]
}

export function CreateProductSheet({ open, onOpenChange, onProductCreated, categories }: CreateProductSheetProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState<CreateProductData>({
    name: "",
    description: "",
    photos: [],
    prixVente: 0,
    prixAchat: 0,
    tva: 20,
    stock: 0,
    categoryId: "none", // Updated default value to be a non-empty string
  })
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch("/api/products", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          categoryId: formData.categoryId === "none" ? null : formData.categoryId, // Updated condition to handle "none" value
        }),
      })

      if (response.ok) {
        toast({
          title: "Produit créé",
          description: "Le produit a été créé avec succès.",
        })
        onProductCreated()
        setFormData({
          name: "",
          description: "",
          photos: [],
          prixVente: 0,
          prixAchat: 0,
          tva: 20,
          stock: 0,
          categoryId: "none", // Reset default value to be a non-empty string
        })
      } else {
        const error = await response.json()
        toast({
          title: "Erreur",
          description: error.error || "Une erreur est survenue lors de la création du produit.",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de la création du produit.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Créer un produit</SheetTitle>
          <SheetDescription>Ajoutez un nouveau produit à votre catalogue.</SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nom du produit *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Nom du produit"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Description du produit"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Catégorie</Label>
            <Select
              value={formData.categoryId}
              onValueChange={(value) => setFormData({ ...formData, categoryId: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner une catégorie" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Aucune catégorie</SelectItem>{" "}
                {/* Updated value prop to be a non-empty string */}
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="prixVente">Prix de vente (XAF ) *</Label>
              <Input
                id="prixVente"
                type="number"
                step="0.01"
                min="0"
                value={formData.prixVente}
                onChange={(e) => setFormData({ ...formData, prixVente: Number.parseFloat(e.target.value) || 0 })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="prixAchat">Prix d'achat (XAF ) *</Label>
              <Input
                id="prixAchat"
                type="number"
                step="0.01"
                min="0"
                value={formData.prixAchat}
                onChange={(e) => setFormData({ ...formData, prixAchat: Number.parseFloat(e.target.value) || 0 })}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="tva">TVA (%)</Label>
              <Input
                id="tva"
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={formData.tva}
                onChange={(e) => setFormData({ ...formData, tva: Number.parseFloat(e.target.value) || 0 })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="stock">Stock initial</Label>
              <Input
                id="stock"
                type="number"
                min="0"
                value={formData.stock}
                onChange={(e) => setFormData({ ...formData, stock: Number.parseInt(e.target.value) || 0 })}
              />
            </div>
          </div>

          <SheetFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Création..." : "Créer le produit"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}
