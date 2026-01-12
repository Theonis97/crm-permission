"use client"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { X } from "lucide-react"

interface ExpenseFiltersProps {
  stores: Array<{ id: string; name: string }>
  categories: Array<{ id: string; name: string }>
  selectedStoreId: string
  selectedCategoryId: string
  selectedStatus: string
  onStoreChange: (storeId: string) => void
  onCategoryChange: (categoryId: string) => void
  onStatusChange: (status: string) => void
  onClearFilters: () => void
}

export function ExpenseFilters({
  stores,
  categories,
  selectedStoreId,
  selectedCategoryId,
  selectedStatus,
  onStoreChange,
  onCategoryChange,
  onStatusChange,
  onClearFilters,
}: ExpenseFiltersProps) {
  const hasFilters = selectedStoreId !== "all" || selectedCategoryId !== "all" || selectedStatus !== "all"

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Select value={selectedStoreId} onValueChange={onStoreChange}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Magasin" />
        </SelectTrigger>
        <SelectContent className="z-[60]">
          <SelectItem value="all">Tous les magasins</SelectItem>
          <SelectItem value="null">Dépenses générales</SelectItem>
          {stores.map((store) => (
            <SelectItem key={store.id} value={store.id}>
              {store.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={selectedCategoryId} onValueChange={onCategoryChange}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Catégorie" />
        </SelectTrigger>
        <SelectContent className="z-[60]">
          <SelectItem value="all">Toutes les catégories</SelectItem>
          {categories.map((category) => (
            <SelectItem key={category.id} value={category.id}>
              {category.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={selectedStatus} onValueChange={onStatusChange}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Statut" />
        </SelectTrigger>
        <SelectContent className="z-[60]">
          <SelectItem value="all">Tous les statuts</SelectItem>
          <SelectItem value="PENDING">En attente</SelectItem>
          <SelectItem value="PARTIALLY_PAID">Partiellement payée</SelectItem>
          <SelectItem value="PAID">Payée</SelectItem>
        </SelectContent>
      </Select>

      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={onClearFilters}>
          <X className="h-4 w-4 mr-1" />
          Effacer
        </Button>
      )}
    </div>
  )
}
