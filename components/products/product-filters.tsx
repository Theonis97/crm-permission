"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Filter, X } from "lucide-react"
import type { ProductFilters as ProductFiltersType, ProductCategory } from "@/types/products"

interface ProductFiltersProps {
  filters: ProductFiltersType
  onFiltersChange: (filters: ProductFiltersType) => void
  categories: ProductCategory[]
}

export function ProductFilters({ filters, onFiltersChange, categories }: ProductFiltersProps) {
  const [open, setOpen] = useState(false)
  const [localFilters, setLocalFilters] = useState<ProductFiltersType>(filters)

  const handleApplyFilters = () => {
    onFiltersChange(localFilters)
    setOpen(false)
  }

  const handleResetFilters = () => {
    const resetFilters = {}
    setLocalFilters(resetFilters)
    onFiltersChange(resetFilters)
    setOpen(false)
  }

  const hasActiveFilters = Object.keys(filters).some(
    (key) => filters[key as keyof ProductFiltersType] !== undefined && filters[key as keyof ProductFiltersType] !== "",
  )

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="relative bg-transparent">
          <Filter className="mr-2 h-4 w-4" />
          Filtres
          {hasActiveFilters && <div className="absolute -top-1 -right-1 h-3 w-3 bg-blue-600 rounded-full" />}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">Filtres</h4>
            <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="space-y-4">
            {/* Catégorie */}
            <div className="space-y-2">
              <Label>Catégorie</Label>
              <Select
                value={localFilters.categoryId || "all"}
                onValueChange={(value) =>
                  setLocalFilters({ ...localFilters, categoryId: value === "all" ? undefined : value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Toutes les catégories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes les catégories</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Prix minimum */}
            <div className="space-y-2">
              <Label>Prix minimum (XAF )</Label>
              <Input
                type="number"
                placeholder="0"
                value={localFilters.minPrice || ""}
                onChange={(e) =>
                  setLocalFilters({
                    ...localFilters,
                    minPrice: e.target.value ? Number.parseFloat(e.target.value) : undefined,
                  })
                }
              />
            </div>

            {/* Prix maximum */}
            <div className="space-y-2">
              <Label>Prix maximum (XAF )</Label>
              <Input
                type="number"
                placeholder="1000"
                value={localFilters.maxPrice || ""}
                onChange={(e) =>
                  setLocalFilters({
                    ...localFilters,
                    maxPrice: e.target.value ? Number.parseFloat(e.target.value) : undefined,
                  })
                }
              />
            </div>

            {/* En stock uniquement */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="inStock"
                checked={localFilters.inStock || false}
                onCheckedChange={(checked) => setLocalFilters({ ...localFilters, inStock: checked as boolean })}
              />
              <Label htmlFor="inStock">Produits en stock uniquement</Label>
            </div>
          </div>

          <div className="flex space-x-2 pt-4 border-t">
            <Button variant="outline" size="sm" onClick={handleResetFilters} className="flex-1 bg-transparent">
              Réinitialiser
            </Button>
            <Button size="sm" onClick={handleApplyFilters} className="flex-1">
              Appliquer
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
