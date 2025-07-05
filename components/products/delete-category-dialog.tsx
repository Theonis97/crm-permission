"use client"

import { useState } from "react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useToast } from "@/hooks/use-toast"

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

interface DeleteCategoryDialogProps {
  category: Category | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onCategoryDeleted: () => void
}

export function DeleteCategoryDialog({ category, open, onOpenChange, onCategoryDeleted }: DeleteCategoryDialogProps) {
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const handleDelete = async () => {
    if (!category) return

    setLoading(true)

    try {
      const response = await fetch(`/api/categories/${category.id}`, {
        method: "DELETE",
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to delete category")
      }

      toast({
        title: "Success",
        description: "Category deleted successfully",
      })

      onOpenChange(false)
      onCategoryDeleted()
    } catch (error) {
      console.error("Error deleting category:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete category",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  if (!category) return null

  const hasProducts = category._count?.products && category._count.products > 0
  const hasSubcategories = category.subcategories && category.subcategories.length > 0

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Category</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete the category "{category.name}"?
            {hasProducts && (
              <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded">
                <strong>Warning:</strong> This category contains {category._count?.products} products. You need to move
                or delete these products first.
              </div>
            )}
            {hasSubcategories && (
              <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded">
                <strong>Warning:</strong> This category contains {category.subcategories?.length} subcategories. You
                need to delete these subcategories first.
              </div>
            )}
            {!hasProducts && !hasSubcategories && (
              <div className="mt-2 text-red-600">This action cannot be undone.</div>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={loading || hasProducts || hasSubcategories}
            className="bg-red-600 hover:bg-red-700"
          >
            {loading ? "Deleting..." : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
