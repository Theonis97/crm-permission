"use client"

import { useState, useEffect, useCallback } from "react"
import { usePermissions } from "@/hooks/use-permissions"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { 
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { 
  FolderTree, 
  Plus, 
  Loader2,
  AlertCircle,
  MoreHorizontal,
  Pencil,
  Trash2,
  Package,
  Users,
  Truck,
  Wifi,
  Home,
  Zap,
  Droplet,
  Briefcase,
  FileText,
  Shield,
  ExternalLink,
} from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"

interface Category {
  id: string
  name: string
  description: string | null
  icon: string | null
  color: string | null
  isSystem: boolean
  isActive: boolean
  _count?: { expenses: number }
  _sum?: { amount: number | null }
}

const iconOptions = [
  { value: "Package", label: "Package", icon: Package },
  { value: "Users", label: "Utilisateurs", icon: Users },
  { value: "Truck", label: "Transport", icon: Truck },
  { value: "Wifi", label: "Internet", icon: Wifi },
  { value: "Home", label: "Maison", icon: Home },
  { value: "Zap", label: "Électricité", icon: Zap },
  { value: "Droplet", label: "Eau", icon: Droplet },
  { value: "Briefcase", label: "Travail", icon: Briefcase },
  { value: "FileText", label: "Document", icon: FileText },
  { value: "Shield", label: "Assurance", icon: Shield },
]

const colorOptions = [
  { value: "#3B82F6", label: "Bleu" },
  { value: "#10B981", label: "Vert" },
  { value: "#F59E0B", label: "Orange" },
  { value: "#8B5CF6", label: "Violet" },
  { value: "#EF4444", label: "Rouge" },
  { value: "#06B6D4", label: "Cyan" },
  { value: "#EC4899", label: "Rose" },
  { value: "#6B7280", label: "Gris" },
]

const getIconComponent = (iconName: string | null) => {
  const found = iconOptions.find(opt => opt.value === iconName)
  return found ? found.icon : Package
}

export default function CategoriesPage() {
  const { hasPermission, loading: permissionsLoading } = usePermissions()
  
  const [categories, setCategories] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const [showSheet, setShowSheet] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    icon: "Package",
    color: "#3B82F6",
  })

  const fetchCategories = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch("/api/accounting/categories")
      if (!response.ok) {
        throw new Error("Erreur lors du chargement des catégories")
      }
      const data = await response.json()
      setCategories(data.categories || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue")
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!permissionsLoading) {
      fetchCategories()
    }
  }, [fetchCategories, permissionsLoading])

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      icon: "Package",
      color: "#3B82F6",
    })
    setEditingCategory(null)
  }

  const openCreateSheet = () => {
    resetForm()
    setShowSheet(true)
  }

  const openEditSheet = (category: Category) => {
    setEditingCategory(category)
    setFormData({
      name: category.name,
      description: category.description || "",
      icon: category.icon || "Package",
      color: category.color || "#3B82F6",
    })
    setShowSheet(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim()) {
      toast.error("Le nom est requis")
      return
    }

    setIsSubmitting(true)
    try {
      const url = editingCategory 
        ? `/api/accounting/categories/${editingCategory.id}`
        : "/api/accounting/categories"
      
      const response = await fetch(url, {
        method: editingCategory ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Erreur lors de l'enregistrement")
      }

      toast.success(editingCategory ? "Catégorie modifiée" : "Catégorie créée")
      setShowSheet(false)
      resetForm()
      fetchCategories()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur inconnue")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (category: Category) => {
    if (category.isSystem) {
      toast.error("Impossible de supprimer une catégorie système")
      return
    }
    
    if (!confirm(`Supprimer la catégorie "${category.name}" ?`)) return

    try {
      const response = await fetch(`/api/accounting/categories/${category.id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Erreur lors de la suppression")
      }

      toast.success("Catégorie supprimée")
      fetchCategories()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur inconnue")
    }
  }

  if (permissionsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-gray-600" />
      </div>
    )
  }

  if (!hasPermission("accounting.categories.view")) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Accès refusé</h2>
        <p className="text-gray-500">Vous n'avez pas la permission d'accéder aux catégories.</p>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Catégories de dépenses</h1>
          <p className="text-gray-500">{categories.length} catégorie(s)</p>
        </div>

        {hasPermission("accounting.categories.manage") && (
          <Button onClick={openCreateSheet}>
            <Plus className="h-4 w-4 mr-2" />
            Nouvelle catégorie
          </Button>
        )}
      </div>

      {/* Error State */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-red-500" />
          <p className="text-red-700">{error}</p>
          <Button variant="outline" size="sm" onClick={fetchCategories}>
            Réessayer
          </Button>
        </div>
      )}

      {/* Categories List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : categories.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FolderTree className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Aucune catégorie</h3>
            <p className="text-gray-500 mb-4">Commencez par créer votre première catégorie.</p>
            {hasPermission("accounting.categories.manage") && (
              <Button onClick={openCreateSheet}>
                <Plus className="h-4 w-4 mr-2" />
                Créer une catégorie
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {categories.map((category) => {
            const IconComponent = getIconComponent(category.icon)
            return (
              <Card key={category.id} className="hover:shadow-sm transition-shadow py-0">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div 
                      className="p-2 rounded-lg"
                      style={{ backgroundColor: `${category.color}20` }}
                    >
                      <IconComponent 
                        className="h-5 w-5" 
                        style={{ color: category.color || "#6B7280" }}
                      />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-gray-900">{category.name}</p>
                        {category.isSystem && (
                          <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-500 rounded">
                            Système
                          </span>
                        )}
                      </div>
                      {category.description && (
                        <p className="text-sm text-gray-500">{category.description}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-500">
                      {category._count?.expenses || 0} dépense(s)
                    </span>
                    
                    <Link href={`/dashboard/accounting/expenses?categoryId=${category.id}`}>
                      <Button variant="outline" size="sm" className="gap-1">
                        <ExternalLink className="h-3 w-3" />
                        Voir
                      </Button>
                    </Link>
                    
                    {hasPermission("accounting.categories.manage") && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEditSheet(category)}>
                            <Pencil className="h-4 w-4 mr-2" />
                            Modifier
                          </DropdownMenuItem>
                          {!category.isSystem && (
                            <DropdownMenuItem 
                              className="text-red-600"
                              onClick={() => handleDelete(category)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Supprimer
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Create/Edit Sheet */}
      <Sheet open={showSheet} onOpenChange={(open) => {
        setShowSheet(open)
        if (!open) resetForm()
      }}>
        <SheetContent className="sm:max-w-md">
          <SheetHeader>
            <SheetTitle>
              {editingCategory ? "Modifier la catégorie" : "Nouvelle catégorie"}
            </SheetTitle>
          </SheetHeader>
          
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nom *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Fournitures bureau"
                disabled={editingCategory?.isSystem}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Description optionnelle"
              />
            </div>

            <div className="space-y-2">
              <Label>Icône</Label>
              <div className="grid grid-cols-5 gap-2">
                {iconOptions.map((option) => {
                  const Icon = option.icon
                  return (
                    <button
                      key={option.value}
                      type="button"
                      className={`p-3 rounded-lg border-2 transition-colors ${
                        formData.icon === option.value
                          ? "border-gray-900 bg-gray-50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                      onClick={() => setFormData({ ...formData, icon: option.value })}
                    >
                      <Icon className="h-5 w-5 mx-auto text-gray-600" />
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Couleur</Label>
              <div className="grid grid-cols-4 gap-2">
                {colorOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={`h-10 rounded-lg border-2 transition-all ${
                      formData.color === option.value
                        ? "border-gray-900 scale-105"
                        : "border-transparent hover:scale-105"
                    }`}
                    style={{ backgroundColor: option.value }}
                    onClick={() => setFormData({ ...formData, color: option.value })}
                    title={option.label}
                  />
                ))}
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setShowSheet(false)
                  resetForm()
                }}
              >
                Annuler
              </Button>
              <Button type="submit" className="flex-1" disabled={isSubmitting}>
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : editingCategory ? (
                  "Modifier"
                ) : (
                  "Créer"
                )}
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>

      {/* Footer fixe avec total */}
      {!isLoading && categories.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-40">
          <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FolderTree className="h-5 w-5 text-gray-500" />
              <span className="font-medium text-gray-700">
                {categories.length} catégorie(s) • {categories.reduce((sum, c) => sum + (c._count?.expenses || 0), 0)} dépense(s)
              </span>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">Total des dépenses</p>
              <p className="text-xl font-bold text-red-600">
                {categories.reduce((sum, c) => sum + (c._sum?.amount || 0), 0).toLocaleString("fr-FR")} FCFA
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
