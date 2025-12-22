import { Loader2, Package, Plus } from "lucide-react"
import { Product, Category } from "../types"

interface PosProductGridProps {
  isLoadingProducts: boolean
  filteredProducts: Product[]
  addToCart: (product: Product) => void
  selectedCategories: string[]
  categories: Category[]
}

export function PosProductGrid({
  isLoadingProducts,
  filteredProducts,
  addToCart,
  selectedCategories,
  categories
}: PosProductGridProps) {
  return (
    <div className="flex-1 p-4 overflow-y-auto">
      <div className="mb-3">
        <h2 className="text-base font-semibold text-gray-900">
          {selectedCategories.length === 0 ? "Tous les articles" :
            selectedCategories.length === 1 ? categories.find(c => c.id === selectedCategories[0])?.name :
              `${selectedCategories.length} catégories sélectionnées`}
        </h2>
        <p className="text-xs text-gray-500">
          {filteredProducts.length} produit{filteredProducts.length > 1 ? 's' : ''} disponible{filteredProducts.length > 1 ? 's' : ''}
        </p>
      </div>

      {isLoadingProducts ? (
        <div className="flex items-center justify-center py-16">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-3" />
            <p className="text-gray-600">Chargement des produits...</p>
          </div>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400">
          <Package className="h-16 w-16 mb-4 opacity-20" />
          <p className="text-sm">Aucun produit disponible</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {filteredProducts.map((product) => (
            <div
              key={product.id}
              className="relative bg-white rounded-lg border border-gray-200 p-3 hover:shadow-md transition-all cursor-pointer group"
              onClick={() => addToCart(product)}
            >
              {product.stock <= product.minStock && (
                <div className="absolute -top-1 -left-1 bg-orange-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                  Bas
                </div>
              )}

              <div className="text-center">
                {product.photos && product.photos.length > 0 ? (
                  <img
                    src={product.photos[0]}
                    alt={product.name}
                    className="w-full h-16 object-contain mb-2"
                  />
                ) : (
                  <div className="w-full h-16 bg-gray-100 rounded-lg flex items-center justify-center mb-2">
                    <Package className="h-8 w-8 text-gray-300" />
                  </div>
                )}
                <h3 className="font-medium text-xs text-gray-900 mb-1 line-clamp-2 leading-tight">
                  {product.name}
                </h3>
                {product.brand && (
                  <p className="text-[10px] text-gray-500 mb-1">{product.brand.name}</p>
                )}
                <div className="flex items-center justify-between">
                  <div className="text-blue-600 font-bold text-sm">
                    {product.prixVente} F
                  </div>
                  <div className="text-[10px] text-gray-500">
                    Stock: {product.stock}
                  </div>
                </div>
              </div>

              <button className="absolute top-1 right-1 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Plus className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
