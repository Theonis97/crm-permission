"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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

interface EditCategorySheetProps {
  category: Category | null
  categories: Category[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onCategoryUpdated: () => void
}

export function EditCategorySheet({
  category,
  categories,
  open,
  onOpenChange,
  onCategoryUpdated,
}: EditCategorySheetProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    parentId: "",
  })
  const { toast } = useToast()

  useEffect(() => {
    if (category) {
      setFormData({
        name: category.name || "",
        description: category.description || "",
        parentId: category.parentId || "",
      })
    }
  }, [category])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!category) return

    setLoading(true)

    try {
      const payload = {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        parentId: formData.parentId || null,
      }

      const response = await fetch(`/api/categories/${category.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to update category")
      }

      toast({
        title: "Success",
        description: "Category updated successfully",
      })

      onOpenChange(false)
      onCategoryUpdated()
    } catch (error) {
      console.error("Error updating category:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update category",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // Fonction récursive pour afficher les catégories avec indentation
  const renderCategoryOptions = (categories: Category[], level = 0): React.ReactNode[] => {
    return categories
      .filter((cat) => cat.id !== category?.id) // Exclure la catégorie actuelle
      .map((cat) => (
        <div key={cat.id}>
          <SelectItem value={cat.id}>
            {"  ".repeat(level)}
            {cat.name}
          </SelectItem>
          {cat.subcategories && cat.subcategories.length > 0 && renderCategoryOptions(cat.subcategories, level + 1)}
        </div>
      ))
  }

  // Filtrer les catégories racines (sans parent)
  const rootCategories = categories.filter((cat) => !cat.parentId)

  if (!category) return null

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Edit Category</SheetTitle>
          <SheetDescription>Update the category information.</SheetDescription>
        </SheetHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Category name"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Category description (optional)"
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="parentId">Parent Category</Label>
            <Select value={formData.parentId} onValueChange={(value) => setFormData({ ...formData, parentId: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Select parent category (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No parent (root category)</SelectItem>
                {renderCategoryOptions(rootCategories)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Updating..." : "Update Category"}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}
