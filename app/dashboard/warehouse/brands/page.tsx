"use client"

import { useState, useEffect } from "react"
import { ModuleNavbar } from "@/components/navigation/module-navbar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Bookmark,
  Search,
  Plus,
  Edit,
  Trash2,
  Package,
  TrendingUp,
  Upload,
  ExternalLink,
} from "lucide-react"
import { toast } from "sonner"

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

export default function BrandsPage() {
  const [brands, setBrands] = useState<Brand[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
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
      const url = editingBrand ? `/api/brands/${editingBrand.id}` : "/api/brands"
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
    const productCount = brand._count?.products || 0
    
    if (productCount > 0) {
      toast.error(
        `Impossible de supprimer "${brand.name}". Cette marque contient ${productCount} produit(s).`
      )
      return
    }

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

  const filteredBrands = brands.filter(
    (brand) =>
      brand.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (brand.description && brand.description.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  const totalProducts = brands.reduce(
    (sum, brand) => sum + (brand._count?.products || 0),
    0
  )

  return (
    <>
      <ModuleNavbar
        title="Marques"
        description="Gestion des marques de produits"
        icon={Bookmark}
        primaryAction={{
          label: "Nouvelle marque",
          onClick: () => handleOpenDialog(),
          icon: Plus,
        }}
      />

      <div className="py-8">
        <div className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8 space-y-6">
          {/* Stats */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Total marques
                </CardTitle>
                <Bookmark className="h-4 w-4 text-gray-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">
                  {brands.length}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Total produits
                </CardTitle>
                <Package className="h-4 w-4 text-gray-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">
                  {totalProducts.toLocaleString()}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Moyenne par marque
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-gray-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">
                  {brands.length > 0 ? Math.round(totalProducts / brands.length) : 0}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recherche */}
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Rechercher une marque..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 rounded-full"
            />
          </div>

          {/* Liste des marques */}
          {loading ? (
            <Card>
              <CardContent className="p-8 text-center text-gray-500">
                Chargement...
              </CardContent>
            </Card>
          ) : filteredBrands.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-gray-500">
                <Bookmark className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p>Aucune marque trouvée</p>
                <Button
                  onClick={() => handleOpenDialog()}
                  className="mt-4 rounded-full bg-black hover:bg-gray-800"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Créer une marque
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredBrands.map((brand) => (
                <Card
                  key={brand.id}
                  className="hover:shadow-lg transition-all border-gray-200"
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3 flex-1">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl flex items-center justify-center border border-gray-200">
                          {brand.logo ? (
                            <img
                              src={brand.logo}
                              alt={brand.name}
                              className="w-10 h-10 object-contain rounded"
                            />
                          ) : (
                            <Bookmark className="h-6 w-6 text-blue-600" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-base font-semibold text-gray-900 truncate">
                            {brand.name}
                          </CardTitle>
                          <p className="text-xs text-gray-500 mt-1">
                            {brand._count?.products || 0} produit(s)
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenDialog(brand)}
                          className="h-8 w-8 p-0 rounded-full"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(brand)}
                          className="h-8 w-8 p-0 rounded-full text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-600 line-clamp-2">
                      {brand.description || "Aucune description"}
                    </p>
                    {brand.website && (
                      <a
                        href={brand.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 mt-2"
                      >
                        <ExternalLink className="h-3 w-3" />
                        Site web
                      </a>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
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
                placeholder="Ex: Dell, HP, Samsung..."
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
                value={formData.logo}
                onChange={(e) =>
                  setFormData({ ...formData, logo: e.target.value })
                }
                placeholder="https://example.com/logo.png"
                className="rounded-full"
              />
              <p className="text-xs text-gray-500">
                URL de l'image du logo de la marque
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="website">Site web</Label>
              <Input
                id="website"
                value={formData.website}
                onChange={(e) =>
                  setFormData({ ...formData, website: e.target.value })
                }
                placeholder="https://example.com"
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
