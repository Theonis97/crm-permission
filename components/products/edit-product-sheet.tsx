"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { useToast } from "@/hooks/use-toast"
import type { Product, ProductCategory, UpdateProductData } from "@/types/products"

interface EditProductSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  product: Product
  onProductUpdated: () => void
  categories: ProductCategory[]
}

export function EditProductSheet({ open, onOpenChange, product, onProductUpdated, categories }: EditProductSheetProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState<UpdateProductData>({
    id: product.id,
    name: product.name,
    description: product.description || "",
    photos: product.photos,
    prixVente: product.prixVente,
    prixAchat: product.prixAchat,
    tva: product.tva,
    stock: product.stock,
    categoryId: product.categoryId || "none",
  })
  const { toast } = useToast()

  useEffect(() => {
    setFormData({
      id: product.id,
      name: product.name,
      description: product.description || "",
      photos: product.photos,
      prixVente: product.prixVente,
      prixAchat: product.prixAchat,
      tva: product.tva,
      stock: product.stock,
      categoryId: product.categoryId || "none",
    })
  }, [product])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch(`/api/products/${product.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          categoryId: formData.categoryId === "none" ? null : formData.categoryId,
        }),
      })

      if (response.ok) {
        toast({
          title: "Produit modifié",
          description: "Le produit a été modifié avec succès.",
        })
        onProductUpdated()
      } else {
        const error = await response.json()
        toast({
          title: "Erreur",
          description: error.error || "Une erreur est survenue lors de la modification du produit.",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de la modification du produit.",
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
          <SheetTitle>Modifier le produit</SheetTitle>
          <SheetDescription>Modifiez les informations du produit.</SheetDescription>
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
                <SelectItem value="none">Aucune catégorie</SelectItem>
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
              <Label htmlFor="prixVente">Prix de vente (€) *</Label>
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
              <Label htmlFor="prixAchat">Prix d'achat (€) *</Label>
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
              <Label htmlFor="stock">Stock</Label>
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
              {loading ? "Modification..." : "Modifier le produit"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}
