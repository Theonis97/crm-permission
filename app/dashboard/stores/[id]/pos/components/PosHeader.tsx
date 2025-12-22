import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { Category } from "../types"

interface PosHeaderProps {
  searchTerm: string
  setSearchTerm: (value: string) => void
  categories: Category[]
  selectedCategories: string[]
  toggleCategory: (categoryId: string) => void
}

export function PosHeader({
  searchTerm,
  setSearchTerm,
  categories,
  selectedCategories,
  toggleCategory
}: PosHeaderProps) {
  return (
    <div className="bg-white border-b p-4">
      <div className="grid grid-cols-12 gap-3 items-center">
        {/* Barre de recherche - 4 colonnes */}
        <div className="col-span-4 relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Rechercher un produit..."
            className="pl-10 border-gray-200 h-9 w-full"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Catégories - 8 colonnes avec scroll strict */}
        <div className="col-span-8 flex items-center gap-2">
          <span className="text-sm text-gray-600 whitespace-nowrap flex-shrink-0">Catégories:</span>
          <div className="flex-1 overflow-hidden">
            <div
              className="flex gap-2 overflow-x-auto scrollbar-hide py-1"
              style={{
                scrollbarWidth: 'none',
                msOverflowStyle: 'none'
              } as React.CSSProperties}
            >
              {categories.map(category => (
                <button
                  key={category.id}
                  onClick={() => toggleCategory(category.id)}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap flex-shrink-0",
                    selectedCategories.includes(category.id)
                      ? "bg-blue-500 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  )}
                >
                  {category.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
