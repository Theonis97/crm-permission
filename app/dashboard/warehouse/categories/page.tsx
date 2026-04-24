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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Tags,
  Search,
  Plus,
  Edit,
  Trash2,
  Package,
  FolderTree,
  ChevronRight,
  ChevronDown,
} from "lucide-react"
import { toast } from "@/lib/app-toast"
import { cn } from "@/lib/utils"

interface Category {
  id: string
  name: string
  description: string | null
  parentId: string | null
  parent?: Category | null
  subcategories?: Category[]
  _count?: {
    products: number
  }
}

interface CategoryFormData {
  name: string
  description: string
  parentId: string
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())
  const [searchTerm, setSearchTerm] = useState("")
  const [formData, setFormData] = useState<CategoryFormData>({
    name: "",
    description: "",
    parentId: "",
  })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetchCategories()
  }, [])

  const fetchCategories = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/categories")
      if (!response.ok) throw new Error("Erreur lors du chargement")
      const data = await response.json()
      setCategories(data)
    } catch (error) {
      console.error("Error fetching categories:", error)
      toast.error("Erreur lors du chargement des catégories")
    } finally {
      setLoading(false)
    }
  }

  const handleOpenDialog = (category?: Category) => {
    if (category) {
      setEditingCategory(category)
      setFormData({
        name: category.name,
        description: category.description || "",
        parentId: category.parentId || "",
      })
    } else {
      setEditingCategory(null)
      setFormData({ name: "", description: "", parentId: "" })
    }
    setDialogOpen(true)
  }

  const handleCloseDialog = () => {
    setDialogOpen(false)
    setEditingCategory(null)
    setFormData({ name: "", description: "", parentId: "" })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim()) {
      toast.error("Le nom est requis")
      return
    }

    setSubmitting(true)
    try {
      const url = editingCategory
        ? `/api/categories/${editingCategory.id}`
        : "/api/categories"
      const method = editingCategory ? "PUT" : "POST"

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name.trim(),
          description: formData.description.trim() || null,
          parentId: formData.parentId || null,
        }),
      })

      if (!response.ok) throw new Error("Erreur lors de l'enregistrement")

      toast.success(
        editingCategory
          ? "Catégorie modifiée avec succès"
          : "Catégorie créée avec succès"
      )
      handleCloseDialog()
      fetchCategories()
    } catch (error) {
      console.error("Error saving category:", error)
      toast.error("Erreur lors de l'enregistrement")
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (category: Category) => {
    if (!confirm(`Voulez-vous vraiment supprimer "${category.name}" ?`)) return

    try {
      const response = await fetch(`/api/categories/${category.id}`, {
        method: "DELETE",
      })

      if (!response.ok) throw new Error("Erreur lors de la suppression")

      toast.success("Catégorie supprimée avec succès")
      fetchCategories()
    } catch (error) {
      console.error("Error deleting category:", error)
      toast.error("Erreur lors de la suppression")
    }
  }

  const toggleExpand = (categoryId: string) => {
    const newExpanded = new Set(expandedCategories)
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId)
    } else {
      newExpanded.add(categoryId)
    }
    setExpandedCategories(newExpanded)
  }

  const mainCategories = categories.filter((cat) => !cat.parentId)
  const totalProducts = categories.reduce(
    (sum, cat) => sum + (cat._count?.products || 0),
    0
  )

  const filteredCategories = mainCategories.filter(
    (category) =>
      category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (category.description && category.description.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  const renderCategory = (category: Category, level = 0) => {
    const hasSubcategories = category.subcategories && category.subcategories.length > 0
    const isExpanded = expandedCategories.has(category.id)

    return (
      <div key={category.id}>
        <Card
          className={cn(
            "hover:shadow-md transition-shadow py-0",
            level > 0 && "ml-8 mt-2"
          )}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 flex-1">
                {hasSubcategories && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={() => toggleExpand(category.id)}
                  >
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </Button>
                )}
                <div className="p-2 rounded-lg bg-blue-100 text-blue-700">
                  <FolderTree className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">{category.name}</h3>
                  {category.description && (
                    <p className="text-sm text-gray-600 mt-0.5">
                      {category.description}
                    </p>
                  )}
                  <div className="flex items-center gap-4 mt-2">
                    <div className="flex items-center gap-1">
                      <Package className="h-3.5 w-3.5 text-gray-400" />
                      <span className="text-xs text-gray-600">
                        {category._count?.products || 0} produit(s)
                      </span>
                    </div>
                    {hasSubcategories && (
                      <div className="flex items-center gap-1">
                        <FolderTree className="h-3.5 w-3.5 text-gray-400" />
                        <span className="text-xs text-gray-600">
                          {category.subcategories?.length} sous-catégorie(s)
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleOpenDialog(category)}
                  className="rounded-full"
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(category)}
                  className="rounded-full text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {isExpanded &&
          hasSubcategories &&
          category.subcategories?.map((sub) => renderCategory(sub, level + 1))}
      </div>
    )
  }

  return (
    <>
      <ModuleNavbar
        title="Catégories de produits"
        description="Organisez vos produits par catégorie"
        icon={Tags}
        primaryAction={{
          label: "Nouvelle catégorie",
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
                  Total Catégories
                </CardTitle>
                <Tags className="h-4 w-4 text-gray-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">
                  {categories.length}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Total Produits
                </CardTitle>
                <Package className="h-4 w-4 text-gray-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">
                  {totalProducts}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Catégories principales
                </CardTitle>
                <FolderTree className="h-4 w-4 text-gray-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">
                  {mainCategories.length}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recherche */}
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Rechercher une catégorie..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 rounded-full"
            />
          </div>

          {/* Liste des catégories hiérarchique */}
          <div className="space-y-3">
            {loading ? (
              <Card>
                <CardContent className="p-8 text-center text-gray-500">
                  Chargement...
                </CardContent>
              </Card>
            ) : filteredCategories.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center text-gray-500">
                  <FolderTree className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p>Aucune catégorie trouvée</p>
                  <Button
                    onClick={() => handleOpenDialog()}
                    className="mt-4 rounded-full bg-black hover:bg-gray-800"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Créer une catégorie
                  </Button>
                </CardContent>
              </Card>
            ) : (
              filteredCategories.map((category) => renderCategory(category))
            )}
          </div>
        </div>
      </div>

      {/* Dialog de création/édition */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? "Éditer" : "Créer"} une catégorie
            </DialogTitle>
            <DialogDescription>
              {editingCategory
                ? "Modifiez les informations de la catégorie"
                : "Ajoutez une nouvelle catégorie de produits"}
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
                placeholder="Ex: Électronique"
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
                placeholder="Description de la catégorie..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="parentId">Catégorie parente (optionnel)</Label>
              <Select
                value={formData.parentId || "none"}
                onValueChange={(value) =>
                  setFormData({ ...formData, parentId: value === "none" ? "" : value })
                }
              >
                <SelectTrigger className="rounded-full">
                  <SelectValue placeholder="Aucune (catégorie principale)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Aucune (catégorie principale)</SelectItem>
                  {categories
                    .filter(
                      (cat) =>
                        !cat.parentId &&
                        cat.id !== editingCategory?.id &&
                        cat.id !== editingCategory?.parentId
                    )
                    .map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500">
                Sélectionnez une catégorie parente pour créer une sous-catégorie
              </p>
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
                  : editingCategory
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
