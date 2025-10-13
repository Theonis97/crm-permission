"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Package, Loader2 } from "lucide-react"
import { toast } from "sonner"

interface Category {
  id: string
  name: string
}

interface Brand {
  id: string
  name: string
}

interface CreateProductDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onProductCreated?: () => void
}

export function CreateProductDialog({
  open,
  onOpenChange,
  onProductCreated,
}: CreateProductDialogProps) {
  const [loading, setLoading] = useState(false)
  const [categories, setCategories] = useState<Category[]>([])
  const [brands, setBrands] = useState<Brand[]>([])
  const [loadingData, setLoadingData] = useState(true)
  
  const [formData, setFormData] = useState({
    name: "",
    sku: "",
    description: "",
    prixVente: "",
    prixAchat: "",
    tva: "20",
    stock: "0",
    minStock: "10",
    maxStock: "",
    categoryId: "",
    brandId: "",
  })

  useEffect(() => {
    if (open) {
      loadData()
    }
  }, [open])

  const loadData = async () => {
    try {
      setLoadingData(true)
      const [categoriesRes, brandsRes] = await Promise.all([
        fetch("/api/categories"),
        fetch("/api/brands"),
      ])
      
      if (categoriesRes.ok) {
        const categoriesData = await categoriesRes.json()
        setCategories(categoriesData)
      }
      
      if (brandsRes.ok) {
        const brandsData = await brandsRes.json()
        setBrands(brandsData)
      }
    } catch (error) {
      console.error("Error loading data:", error)
      toast.error("Erreur lors du chargement des données")
    } finally {
      setLoadingData(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name.trim()) {
      toast.error("Le nom est requis")
      return
    }
    
    if (!formData.prixVente || !formData.prixAchat) {
      toast.error("Les prix sont requis")
      return
    }
    
    if (!formData.categoryId) {
      toast.error("La catégorie est requise")
      return
    }

    setLoading(true)

    try {
      const response = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name.trim(),
          sku: formData.sku.trim() || null,
          description: formData.description.trim() || null,
          prixVente: Number(formData.prixVente),
          prixAchat: Number(formData.prixAchat),
          tva: Number(formData.tva),
          stock: Number(formData.stock),
          minStock: Number(formData.minStock) || 0,
          maxStock: formData.maxStock ? Number(formData.maxStock) : null,
          categoryId: formData.categoryId,
          brandId: formData.brandId || null,
          photos: [],
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Erreur lors de la création")
      }

      toast.success("Produit créé avec succès")
      onProductCreated?.()
      onOpenChange(false)
      
      // Reset form
      setFormData({
        name: "",
        sku: "",
        description: "",
        prixVente: "",
        prixAchat: "",
        tva: "20",
        stock: "0",
        minStock: "10",
        maxStock: "",
        categoryId: "",
        brandId: "",
      })
    } catch (error: any) {
      console.error("Error creating product:", error)
      toast.error(error.message || "Erreur lors de la création")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-950 rounded-lg flex items-center justify-center">
              <Package className="h-5 w-5 text-white" />
            </div>
            <div>
              <DialogTitle>Nouveau produit</DialogTitle>
              <DialogDescription>
                Ajouter un nouveau produit à votre catalogue
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          {/* Informations de base */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900">
              Informations de base
            </h3>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">
                  Nom du produit <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="iPhone 14 Pro"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="sku">SKU / Référence</Label>
                <Input
                  id="sku"
                  value={formData.sku}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      sku: e.target.value.toUpperCase(),
                    })
                  }
                  placeholder="PROD-001"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Description détaillée du produit..."
                rows={3}
              />
            </div>
          </div>

          {/* Catégorie et Marque */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900">
              Classification
            </h3>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="categoryId">
                  Catégorie <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.categoryId}
                  onValueChange={(value) =>
                    setFormData({ ...formData, categoryId: value })
                  }
                  disabled={loadingData}
                >
                  <SelectTrigger id="categoryId">
                    <SelectValue placeholder="Sélectionner une catégorie" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="brandId">Marque (optionnel)</Label>
                <Select
                  value={formData.brandId || "none"}
                  onValueChange={(value) =>
                    setFormData({
                      ...formData,
                      brandId: value === "none" ? "" : value,
                    })
                  }
                  disabled={loadingData}
                >
                  <SelectTrigger id="brandId">
                    <SelectValue placeholder="Sélectionner une marque" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Aucune marque</SelectItem>
                    {brands.map((brand) => (
                      <SelectItem key={brand.id} value={brand.id}>
                        {brand.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Prix */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900">Tarification</h3>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="prixAchat">
                  Prix d'achat <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="prixAchat"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.prixAchat}
                  onChange={(e) =>
                    setFormData({ ...formData, prixAchat: e.target.value })
                  }
                  placeholder="0.00"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="prixVente">
                  Prix de vente <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="prixVente"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.prixVente}
                  onChange={(e) =>
                    setFormData({ ...formData, prixVente: e.target.value })
                  }
                  placeholder="0.00"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tva">TVA (%)</Label>
                <Input
                  id="tva"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={formData.tva}
                  onChange={(e) =>
                    setFormData({ ...formData, tva: e.target.value })
                  }
                  placeholder="20"
                />
              </div>
            </div>
          </div>

          {/* Stock */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900">Stock</h3>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="stock">Stock initial</Label>
                <Input
                  id="stock"
                  type="number"
                  min="0"
                  value={formData.stock}
                  onChange={(e) =>
                    setFormData({ ...formData, stock: e.target.value })
                  }
                  placeholder="0"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="minStock">Stock minimum</Label>
                <Input
                  id="minStock"
                  type="number"
                  min="0"
                  value={formData.minStock}
                  onChange={(e) =>
                    setFormData({ ...formData, minStock: e.target.value })
                  }
                  placeholder="10"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="maxStock">Stock maximum</Label>
                <Input
                  id="maxStock"
                  type="number"
                  min="0"
                  value={formData.maxStock}
                  onChange={(e) =>
                    setFormData({ ...formData, maxStock: e.target.value })
                  }
                  placeholder="1000"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={loading || loadingData}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Créer le produit
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
