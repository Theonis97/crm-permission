"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { StorePageHeader } from "@/components/stores/store-page-header"
import { Tag, Plus, Package, Edit, Trash2, Loader2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"

interface BrandsPageProps {
  params: Promise<{
    id: string
  }>
}

interface Brand {
  id: string
  name: string
  description: string | null
  logo: string | null
  website: string | null
  isActive: boolean
  _count?: {
    products: number
  }
}

interface BrandFormData {
  name: string
  description: string
  logo: string
  website: string
}

export default function BrandsPage({ params }: BrandsPageProps) {
  const [brands, setBrands] = useState<Brand[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null)
  const [formData, setFormData] = useState<BrandFormData>({
    name: "",
    description: "",
    logo: "",
    website: "",
  })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetchBrands()
  }, [])

  const fetchBrands = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/brands")
      if (!response.ok) throw new Error("Erreur lors du chargement")
      const data = await response.json()
      setBrands(data)
    } catch (error) {
      console.error("Error fetching brands:", error)
      toast.error("Erreur lors du chargement des marques")
    } finally {
      setLoading(false)
    }
  }

  const handleOpenDialog = (brand?: Brand) => {
    if (brand) {
      setEditingBrand(brand)
      setFormData({
        name: brand.name,
        description: brand.description || "",
        logo: brand.logo || "",
        website: brand.website || "",
      })
    } else {
      setEditingBrand(null)
      setFormData({ name: "", description: "", logo: "", website: "" })
    }
    setDialogOpen(true)
  }

  const handleCloseDialog = () => {
    setDialogOpen(false)
    setEditingBrand(null)
    setFormData({ name: "", description: "", logo: "", website: "" })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim()) {
      toast.error("Le nom est requis")
      return
    }

    setSubmitting(true)
    try {
      const url = editingBrand
        ? `/api/brands/${editingBrand.id}`
        : "/api/brands"
      const method = editingBrand ? "PUT" : "POST"

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name.trim(),
          description: formData.description.trim() || null,
          logo: formData.logo.trim() || null,
          website: formData.website.trim() || null,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Erreur lors de l'enregistrement")
      }

      toast.success(
        editingBrand
          ? "Marque modifiée avec succès"
          : "Marque créée avec succès"
      )
      handleCloseDialog()
      fetchBrands()
    } catch (error: any) {
      console.error("Error saving brand:", error)
      toast.error(error.message || "Erreur lors de l'enregistrement")
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (brand: Brand) => {
    if (!confirm(`Voulez-vous vraiment supprimer "${brand.name}" ?`)) return

    try {
      const response = await fetch(`/api/brands/${brand.id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Erreur lors de la suppression")
      }

      toast.success("Marque supprimée avec succès")
      fetchBrands()
    } catch (error: any) {
      console.error("Error deleting brand:", error)
      toast.error(error.message || "Erreur lors de la suppression")
    }
  }

  const totalProducts = brands.reduce((sum, b) => sum + (b._count?.products || 0), 0)

  return (
    <>
      <StorePageHeader
        title="Marques"
        description="Gérer les marques de produits (partagées avec tous les magasins)"
        action={{
          label: "Nouvelle marque",
          onClick: () => handleOpenDialog(),
          icon: Plus,
        }}
      />

      <div className="p-8 space-y-6">
        {/* Statistiques */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Marques</CardTitle>
              <Tag className="h-4 w-4 text-gray-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{brands.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Produits</CardTitle>
              <Package className="h-4 w-4 text-gray-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{totalProducts}</div>
            </CardContent>
          </Card>
        </div>

        {/* Liste des marques */}
        {loading ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
              <p className="text-gray-500">Chargement...</p>
            </CardContent>
          </Card>
        ) : brands.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-gray-500">
              <Tag className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p>Aucune marque</p>
              <Button
                onClick={() => handleOpenDialog()}
                className="mt-4 rounded-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Créer une marque
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {brands.map((brand) => (
              <Card key={brand.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <Avatar className="h-16 w-16 rounded-lg">
                      <AvatarImage src={brand.logo || undefined} alt={brand.name} />
                      <AvatarFallback className="rounded-lg text-lg font-semibold bg-blue-100 text-blue-700">
                        {brand.name.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-lg text-gray-900 truncate">{brand.name}</h3>
                      {brand.description && (
                        <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                          {brand.description}
                        </p>
                      )}
                      <div className="mt-3 flex items-center gap-1 text-sm">
                        <Package className="h-3.5 w-3.5 text-gray-400" />
                        <span className="text-gray-600">
                          {brand._count?.products || 0} produit(s)
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-4 pt-4 border-t">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenDialog(brand)}
                      className="flex-1 rounded-full"
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Éditer
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(brand)}
                      className="flex-1 rounded-full text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Supprimer
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Dialog de création/édition */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {editingBrand ? "Éditer" : "Créer"} une marque
            </DialogTitle>
            <DialogDescription>
              {editingBrand
                ? "Modifiez les informations de la marque"
                : "Ajoutez une nouvelle marque de produits"}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">
                Nom <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="Ex: Apple, Samsung..."
                className="rounded-full"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Description de la marque..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="logo">URL du logo</Label>
              <Input
                id="logo"
                type="url"
                value={formData.logo}
                onChange={(e) =>
                  setFormData({ ...formData, logo: e.target.value })
                }
                placeholder="https://example.com/logo.png"
                className="rounded-full"
              />
              <p className="text-xs text-gray-500">
                URL publique de l'image du logo
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="website">Site web</Label>
              <Input
                id="website"
                type="url"
                value={formData.website}
                onChange={(e) =>
                  setFormData({ ...formData, website: e.target.value })
                }
                placeholder="https://www.example.com"
                className="rounded-full"
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleCloseDialog}
                disabled={submitting}
                className="rounded-full"
              >
                Annuler
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="rounded-full bg-black hover:bg-gray-800"
              >
                {submitting
                  ? "Enregistrement..."
                  : editingBrand
                  ? "Enregistrer"
                  : "Créer"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
