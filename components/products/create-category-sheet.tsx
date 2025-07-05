"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus } from "lucide-react"
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

interface CreateCategorySheetProps {
  categories: Category[]
  onCategoryCreated: () => void
}

export function CreateCategorySheet({ categories, onCategoryCreated }: CreateCategorySheetProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    parentId: "",
  })
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const payload = {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        parentId: formData.parentId || null,
      }

      console.log("Sending payload:", payload)

      const response = await fetch("/api/categories", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to create category")
      }

      toast({
        title: "Success",
        description: "Category created successfully",
      })

      setFormData({ name: "", description: "", parentId: "" })
      setOpen(false)
      onCategoryCreated()
    } catch (error) {
      console.error("Error creating category:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create category",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // Fonction récursive pour afficher les catégories avec indentation
  const renderCategoryOptions = (categories: Category[], level = 0): React.ReactNode[] => {
    return categories.map((category) => (
      <div key={category.id}>
        <SelectItem value={category.id}>
          {"  ".repeat(level)}
          {category.name}
        </SelectItem>
        {category.subcategories &&
          category.subcategories.length > 0 &&
          renderCategoryOptions(category.subcategories, level + 1)}
      </div>
    ))
  }

  // Filtrer les catégories racines (sans parent)
  const rootCategories = categories.filter((cat) => !cat.parentId)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          New Category
        </Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Create Category</SheetTitle>
          <SheetDescription>Add a new product category to organize your products.</SheetDescription>
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
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create Category"}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}
