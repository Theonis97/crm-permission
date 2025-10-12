"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Search,
  Plus,
  Minus,
  Trash2,
  ShoppingCart,
  CreditCard,
  Smartphone,
  Banknote,
  Receipt,
  Calculator,
  Scan,
  User,
  Phone,
  MapPin,
  Package,
  X,
  Coffee,
  Cake,
  Pizza,
  Sandwich,
  IceCream,
  Cookie,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface PosPageProps {
  params: Promise<{
    id: string
  }>
}

// Données mockées pour les produits (style restaurant/café)
const mockProducts = [
  // Glaces
  { id: 1, name: "Caramel Croquant", price: 200, category: "Glaces", stock: 12, image: "🍦", popular: true },
  { id: 2, name: "Vanille Classique", price: 160, category: "Glaces", stock: 15, image: "🍦" },
  { id: 3, name: "Cassis Twist", price: 160, category: "Glaces", stock: 10, image: "🍦" },
  { id: 4, name: "Caramel Swirl", price: 180, category: "Glaces", stock: 8, image: "🍦" },
  { id: 5, name: "Noix de Coco", price: 140, category: "Glaces", stock: 20, image: "🍦" },
  { id: 6, name: "Cookies & Cream", price: 180, category: "Glaces", stock: 14, image: "🍦" },
  { id: 7, name: "Pistache Royale", price: 200, category: "Glaces", stock: 12, image: "🍦" },
  { id: 8, name: "Délice Chocolat", price: 160, category: "Glaces", stock: 18, image: "🍦" },
  { id: 9, name: "Mangue Magique", price: 140, category: "Glaces", stock: 16, image: "🍦" },
  { id: 10, name: "Menthe Choco Chip", price: 180, category: "Glaces", stock: 11, image: "🍦" },
  
  // Boissons
  { id: 11, name: "Coca Cola Glacé", price: 60, category: "Boissons", stock: 25, image: "🥤" },
  { id: 12, name: "Limonade Fraîche", price: 80, category: "Boissons", stock: 20, image: "🍋" },
  { id: 13, name: "Café Glacé", price: 120, category: "Boissons", stock: 15, image: "☕" },
  
  // Snacks
  { id: 14, name: "Popcorn Extra Large", price: 120, category: "Snacks", stock: 30, image: "🍿" },
  { id: 15, name: "Burger Végétarien", price: 140, category: "Snacks", stock: 12, image: "🍔" },
  { id: 16, name: "Délice Chocolat", price: 140, category: "Snacks", stock: 18, image: "🍫" },
]

// Marques pour la sidebar
const brands = [
  { id: "all", name: "Toutes", image: "🏪" },
  { id: "nestle", name: "Nestlé", image: "🍫" },
  { id: "coca-cola", name: "Coca-Cola", image: "🥤" },
  { id: "unilever", name: "Unilever", image: "🧴" },
  { id: "pepsi", name: "PepsiCo", image: "🥤" },
  { id: "danone", name: "Danone", image: "🥛" },
]

// Catégories pour le multi-select
const categories = [
  { id: "glaces", name: "Glaces" },
  { id: "boissons", name: "Boissons" },
  { id: "snacks", name: "Snacks" },
  { id: "gateaux", name: "Gâteaux & Gaufres" },
]

const paymentMethods = [
  { id: "cash", label: "Espèces", icon: Banknote },
  { id: "card", label: "Carte", icon: CreditCard },
  { id: "mobile", label: "Mobile Money", icon: Smartphone },
]

interface CartItem {
  product: typeof mockProducts[0]
  quantity: number
}

const formatFCFA = (amount: number) => {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'XAF',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount).replace('XAF', 'FCFA')
}

export default function PosPage({ params }: PosPageProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [selectedBrand, setSelectedBrand] = useState("all")
  const [cart, setCart] = useState<CartItem[]>([])
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false)

  // Filtrage des produits
  const filteredProducts = useMemo(() => {
    return mockProducts.filter(product => {
      const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesCategory = selectedCategories.length === 0 || 
        (selectedCategories.includes("glaces") && product.category === "Glaces") ||
        (selectedCategories.includes("boissons") && product.category === "Boissons") ||
        (selectedCategories.includes("snacks") && product.category === "Snacks") ||
        (selectedCategories.includes("gateaux") && product.category === "Gâteaux")
      
      return matchesSearch && matchesCategory
    })
  }, [searchTerm, selectedCategories])

  const toggleCategory = (categoryId: string) => {
    setSelectedCategories(prev => 
      prev.includes(categoryId) 
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    )
  }

  // Calculs du panier
  const cartTotal = cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0)
  const cartItemsCount = cart.reduce((sum, item) => sum + item.quantity, 0)
  const taxAmount = Math.round(cartTotal * 0.1) // 10% tax
  const finalTotal = cartTotal + taxAmount

  const addToCart = (product: typeof mockProducts[0]) => {
    setCart(prev => {
      const existingItem = prev.find(item => item.product.id === product.id)
      if (existingItem) {
        return prev.map(item =>
          item.product.id === product.id
            ? { ...item, quantity: Math.min(item.quantity + 1, product.stock) }
            : item
        )
      }
      return [...prev, { product, quantity: 1 }]
    })
  }

  const updateQuantity = (productId: number, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromCart(productId)
      return
    }
    
    setCart(prev =>
      prev.map(item =>
        item.product.id === productId
          ? { ...item, quantity: Math.min(newQuantity, item.product.stock) }
          : item
      )
    )
  }

  const removeFromCart = (productId: number) => {
    setCart(prev => prev.filter(item => item.product.id !== productId))
  }

  const clearCart = () => {
    setCart([])
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Section Gauche - Produits */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-white border-b p-4.5">
          <div className="flex items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Rechercher un produit..."
                className="pl-10 border-gray-200 h-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            {/* Multi-select Catégories */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600 whitespace-nowrap">Catégories:</span>
              <div className="flex gap-2">
                {categories.map(category => (
                  <button
                    key={category.id}
                    onClick={() => toggleCategory(category.id)}
                    className={cn(
                      "px-3 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap",
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

        <div className="flex flex-1">
          {/* Sidebar Marques */}
          <div className="w-40 bg-white border-r p-3">
            <div className="space-y-2">
              {brands.map((brand) => {
                return (
                  <button
                    key={brand.id}
                    onClick={() => setSelectedBrand(brand.id)}
                    className={cn(
                      "w-full flex flex-col items-center gap-1 p-3 rounded-lg transition-colors",
                      selectedBrand === brand.id
                        ? "bg-blue-100 text-blue-700 border border-blue-200"
                        : "hover:bg-gray-50 text-gray-600"
                    )}
                  >
                    <div className="text-2xl">{brand.image}</div>
                    <span className="font-medium text-xs text-center">{brand.name}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Grille des Produits */}
          <div className="flex-1 p-4">
            <div className="mb-3">
              <h2 className="text-base font-semibold text-gray-900">
                {selectedCategories.length === 0 ? "Tous les articles" : 
                 selectedCategories.length === 1 ? categories.find(c => c.id === selectedCategories[0])?.name :
                 `${selectedCategories.length} catégories sélectionnées`}
              </h2>
              <p className="text-xs text-gray-500">
                {filteredProducts.length} produit{filteredProducts.length > 1 ? 's' : ''}
              </p>
            </div>

            <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
              {filteredProducts.map((product) => (
                <div
                  key={product.id}
                  className="relative bg-white rounded-lg border border-gray-200 p-3 hover:shadow-md transition-all cursor-pointer group"
                  onClick={() => addToCart(product)}
                >
                  {product.popular && (
                    <div className="absolute -top-1 -left-1 bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                      5%
                    </div>
                  )}
                  
                  <div className="text-center">
                    <div className="text-2xl mb-1">{product.image}</div>
                    <h3 className="font-medium text-xs text-gray-900 mb-1 line-clamp-2 leading-tight">
                      {product.name}
                    </h3>
                    <div className="text-blue-600 font-bold text-sm">
                      {product.price} FCFA
                    </div>
                  </div>

                  <button className="absolute top-1 right-1 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Plus className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
             {/* Section Droite - Panier */}
      <div className="w-80 bg-white border-l flex flex-col">
        {/* Header Panier */}
        <div className="p-3 border-b">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900 text-sm">#INVOICE1002</h3>
            <div className="text-xs text-gray-500">
              Prochain facture : <span className="text-gray-900">Quantité</span>
            </div>
          </div>
        </div>

        {/* Items du Panier */}
        <div className="flex-1 overflow-y-auto">
          {cart.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-500">
              <div className="text-center">
                <ShoppingCart className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p>Aucun article sélectionné</p>
              </div>
            </div>
          ) : (
            <div className="p-3 space-y-2">
              <div className="text-blue-600 font-medium mb-3 text-sm">Articles sélectionnés</div>
              {cart.map((item) => (
                <div key={item.product.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                  <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-lg">
                    {item.product.image}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-xs text-gray-900 truncate">
                      {item.product.name}
                    </h4>
                    <div className="text-xs text-gray-500">
                      Prix: {item.product.price} FCFA | Qté: {item.quantity} | Rem: 10%
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        updateQuantity(item.product.id, item.quantity - 1)
                      }}
                      className="w-5 h-5 bg-white border rounded flex items-center justify-center hover:bg-gray-50"
                    >
                      <Minus className="h-2 w-2" />
                    </button>
                    
                    <span className="w-6 text-center text-xs font-medium">
                      {item.quantity}
                    </span>
                    
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        updateQuantity(item.product.id, item.quantity + 1)
                      }}
                      className="w-5 h-5 bg-blue-500 text-white rounded flex items-center justify-center hover:bg-blue-600"
                    >
                      <Plus className="h-2 w-2" />
                    </button>
                  </div>

                  <div className="text-right">
                    <div className="font-medium text-xs">{item.product.price * item.quantity} FCFA</div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        removeFromCart(item.product.id)
                      }}
                      className="text-red-500 hover:text-red-600"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer Panier - Total */}
        {cart.length > 0 && (
          <div className="border-t p-3 space-y-2">
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-600">Total brut</span>
                <span>{cartTotal} FCFA</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Autres frais</span>
                <span>60 FCFA</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Remise</span>
                <span>60 FCFA</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">TVA</span>
                <span>12%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Taxe service</span>
                <span>5 FCFA</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Frais divers</span>
                <span>8 FCFA</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Arrondi</span>
                <span>865 FCFA</span>
              </div>
              <Separator className="my-2" />
              <div className="flex justify-between text-base font-bold">
                <span>Total</span>
                <span className="text-blue-600">855 FCFA</span>
              </div>
            </div>

            <Button 
              className="w-full bg-blue-500 hover:bg-blue-600 text-white h-9"
              size="sm"
            >
              Passer commande
            </Button>
          </div>
        )}
      </div>
        </div>
      </div>

   
    </div>
  )
}
