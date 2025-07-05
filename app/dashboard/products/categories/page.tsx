"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { CreateCategorySheet } from "@/components/products/create-category-sheet"
import { EditCategorySheet } from "@/components/products/edit-category-sheet"
import { DeleteCategoryDialog } from "@/components/products/delete-category-dialog"
import { MoreHorizontal, Edit, Trash2, FolderOpen, Package } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import type { JSX } from "react"

interface Category {
  id: string
  name: string
  description?: string
  parentId?: string
  parent?: Category
  subcategories?: Category[]
  _count?: {
    products: number
  }
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null)
  const [editSheetOpen, setEditSheetOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const { toast } = useToast()

  const fetchCategories = async () => {
    try {
      const response = await fetch("/api/categories")
      if (!response.ok) {
        throw new Error("Failed to fetch categories")
      }
      const data = await response.json()
      setCategories(data)
    } catch (error) {
      console.error("Error fetching categories:", error)
      toast({
        title: "Error",
        description: "Failed to load categories",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCategories()
  }, [])

  const handleEdit = (category: Category) => {
    setEditingCategory(category)
    setEditSheetOpen(true)
  }

  const handleDelete = (category: Category) => {
    setDeletingCategory(category)
    setDeleteDialogOpen(true)
  }

  // Fonction récursive pour afficher les catégories avec hiérarchie
  const renderCategories = (categories: Category[], level = 0): JSX.Element[] => {
    return categories.map((category) => (
      <div key={category.id} className={`${level > 0 ? "ml-6 border-l-2 border-gray-200 pl-4" : ""}`}>
        <Card className="mb-2 py-0">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2">
                  <FolderOpen className="h-5 w-5 text-blue-600" />
                  <div>
                    <h3 className="font-semibold">{category.name}</h3>
                    {category.description && <p className="text-sm text-gray-600 mt-1">{category.description}</p>}
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <div className="flex items-center space-x-1">
                  <Package className="h-4 w-4 text-gray-500" />
                  <Badge variant="secondary">{category._count?.products || 0} products</Badge>
                </div>
                {category.subcategories && category.subcategories.length > 0 && (
                  <Badge variant="outline">{category.subcategories.length} subcategories</Badge>
                )}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleEdit(category)}>
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleDelete(category)} className="text-red-600">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </CardContent>
        </Card>
        {category.subcategories &&
          category.subcategories.length > 0 &&
          renderCategories(category.subcategories, level + 1)}
      </div>
    ))
  }

  // Filtrer les catégories racines (sans parent)
  const rootCategories = categories.filter((cat) => !cat.parentId)

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Categories</h1>
        </div>
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Categories</h1>
          <p className="text-gray-600">Manage your product categories and hierarchy</p>
        </div>
        <CreateCategorySheet categories={categories} onCategoryCreated={fetchCategories} />
      </div>

      {rootCategories.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <FolderOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No categories yet</h3>
            <p className="text-gray-600 mb-4">Create your first category to organize your products</p>
            <CreateCategorySheet categories={categories} onCategoryCreated={fetchCategories} />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">{renderCategories(rootCategories)}</div>
      )}

      <EditCategorySheet
        category={editingCategory}
        categories={categories}
        open={editSheetOpen}
        onOpenChange={setEditSheetOpen}
        onCategoryUpdated={fetchCategories}
      />

      <DeleteCategoryDialog
        category={deletingCategory}
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onCategoryDeleted={fetchCategories}
      />
    </div>
  )
}
