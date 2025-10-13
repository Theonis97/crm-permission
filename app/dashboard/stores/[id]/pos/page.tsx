"use client"

import { useState, useEffect, useMemo } from "react"
import { useParams } from "next/navigation"
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
  User,
  Package,
  Loader2,
  Truck,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

interface Product {
  id: string
  storeProductId: string
  name: string
  sku: string | null
  description: string | null
  photos: string[]
  prixVente: number
  prixAchat: number
  tva: number
  stock: number
  minStock: number
  maxStock: number
  categoryId: string
  brandId: string | null
  category: {
    id: string
    name: string
  }
  brand: {
    id: string
    name: string
  } | null
}

interface Category {
  id: string
  name: string
  description: string | null
  _count: {
    products: number
  }
}

interface Brand {
  id: string
  name: string
  description: string | null
  logo: string | null
  _count: {
    products: number
  }
}

interface DeliveryPerson {
  id: string
  name: string
  phone: string
  status: "AVAILABLE" | "BUSY" | "OFFLINE"
}

const paymentMethods = [
  { id: "cash", label: "Espèces", icon: Banknote },
  { id: "card", label: "Carte", icon: CreditCard },
  { id: "mobile", label: "Mobile Money", icon: Smartphone },
]

interface CartItem {
  product: Product
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

export default function PosPage() {
  const params = useParams()
  const storeId = params.id as string
  // États
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [selectedBrand, setSelectedBrand] = useState("all")
  const [cart, setCart] = useState<CartItem[]>([])
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false)
  
  // Données
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [brands, setBrands] = useState<Brand[]>([])
  const [deliveryPersons, setDeliveryPersons] = useState<DeliveryPerson[]>([])
  
  // Loading states
  const [isLoadingProducts, setIsLoadingProducts] = useState(true)
  const [isLoadingCategories, setIsLoadingCategories] = useState(true)
  const [isLoadingBrands, setIsLoadingBrands] = useState(true)
  const [isLoadingDrivers, setIsLoadingDrivers] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Formulaire checkout
  const [customerName, setCustomerName] = useState("")
  const [customerPhone, setCustomerPhone] = useState("")
  const [customerEmail, setCustomerEmail] = useState("")
  const [deliveryAddress, setDeliveryAddress] = useState("")
  const [selectedDeliveryPerson, setSelectedDeliveryPerson] = useState("")
  const [deliveryFee, setDeliveryFee] = useState(500)
  const [paymentMethod, setPaymentMethod] = useState("cash")
  const [notes, setNotes] = useState("")

  // Charger les données au montage
  useEffect(() => {
    loadProducts()
    loadCategories()
    loadBrands()
    loadDeliveryPersons()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeId])

  const loadProducts = async () => {
    try {
      setIsLoadingProducts(true)
      const response = await fetch(`/api/stores/${storeId}/products`)
      if (!response.ok) throw new Error("Erreur chargement produits")
      const data = await response.json()
      setProducts(data)
    } catch (error) {
      console.error("Error loading products:", error)
      toast.error("Erreur lors du chargement des produits")
    } finally {
      setIsLoadingProducts(false)
    }
  }

  const loadCategories = async () => {
    try {
      setIsLoadingCategories(true)
      const response = await fetch("/api/categories")
      if (!response.ok) throw new Error("Erreur chargement catégories")
      const data = await response.json()
      setCategories(data.filter((c: Category) => !c.description?.includes("parent"))) // Filtrer les catégories principales
    } catch (error) {
      console.error("Error loading categories:", error)
      toast.error("Erreur lors du chargement des catégories")
    } finally {
      setIsLoadingCategories(false)
    }
  }

  const loadBrands = async () => {
    try {
      setIsLoadingBrands(true)
      const response = await fetch("/api/brands")
      if (!response.ok) throw new Error("Erreur chargement marques")
      const data = await response.json()
      setBrands(data)
    } catch (error) {
      console.error("Error loading brands:", error)
      toast.error("Erreur lors du chargement des marques")
    } finally {
      setIsLoadingBrands(false)
    }
  }

  const loadDeliveryPersons = async () => {
    try {
      setIsLoadingDrivers(true)
      const response = await fetch(`/api/delivery-persons?storeId=${storeId}`)
      if (!response.ok) throw new Error("Erreur chargement livreurs")
      const data = await response.json()
      setDeliveryPersons(data.filter((d: any) => d.isActive))
    } catch (error) {
      console.error("Error loading delivery persons:", error)
    } finally {
      setIsLoadingDrivers(false)
    }
  }

  // Filtrage des produits
  const filteredProducts = useMemo(() => {
    return products.filter(product => {
      const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          product.sku?.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesCategory = selectedCategories.length === 0 || 
                            selectedCategories.includes(product.categoryId)
      const matchesBrand = selectedBrand === "all" || product.brandId === selectedBrand
      
      return matchesSearch && matchesCategory && matchesBrand && product.stock > 0
    })
  }, [searchTerm, selectedCategories, selectedBrand, products])

  const toggleCategory = (categoryId: string) => {
    setSelectedCategories(prev => 
      prev.includes(categoryId) 
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    )
  }

  const handleCreateOrder = async () => {
    if (!customerName || !customerPhone) {
      toast.error("Nom et téléphone du client requis")
      return
    }

    if (cart.length === 0) {
      toast.error("Le panier est vide")
      return
    }

    try {
      setIsSubmitting(true)

      const orderData = {
        storeId,
        customerName,
        customerPhone,
        customerEmail: customerEmail || null,
        deliveryAddress: deliveryAddress || null,
        priority: "NORMAL",
        deliveryPersonId: selectedDeliveryPerson || null,
        deliveryFee,
        paymentMethod,
        notes,
        items: cart.map(item => ({
          productId: item.product.id,
          quantity: item.quantity,
          unitPrice: item.product.prixVente,
        })),
      }

      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderData),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Erreur création commande")
      }

      const order = await response.json()
      toast.success(`Commande ${order.number} créée avec succès !`)
      
      // Réinitialiser
      clearCart()
      setIsCheckoutOpen(false)
      setCustomerName("")
      setCustomerPhone("")
      setCustomerEmail("")
      setDeliveryAddress("")
      setSelectedDeliveryPerson("")
      setNotes("")
      
      // Recharger les produits pour mettre à jour les stocks
      loadProducts()
    } catch (error: any) {
      console.error("Error creating order:", error)
      toast.error(error.message || "Erreur lors de la création de la commande")
    } finally {
      setIsSubmitting(false)
    }
  }

  // Calculs du panier
  const cartSubtotal = cart.reduce((sum, item) => sum + (item.product.prixVente * item.quantity), 0)
  const cartItemsCount = cart.reduce((sum, item) => sum + item.quantity, 0)
  const cartTax = cart.reduce((sum, item) => {
    const itemTotal = item.product.prixVente * item.quantity
    return sum + (itemTotal * item.product.tva / 100)
  }, 0)
  const cartTotal = cartSubtotal + cartTax + deliveryFee

  const addToCart = (product: Product) => {
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
    toast.success(`${product.name} ajouté au panier`)
  }

  const updateQuantity = (productId: string, newQuantity: number) => {
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

  const removeFromCart = (productId: string) => {
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

        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar Marques */}
          <div className="w-40 bg-white border-r p-3 overflow-y-auto">
            {isLoadingBrands ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
              </div>
            ) : (
              <div className="space-y-2">
                {/* Bouton Toutes */}
                <button
                  onClick={() => setSelectedBrand("all")}
                  className={cn(
                    "w-full flex flex-col items-center gap-1 p-3 rounded-lg transition-colors",
                    selectedBrand === "all"
                      ? "bg-blue-100 text-blue-700 border border-blue-200"
                      : "hover:bg-gray-50 text-gray-600"
                  )}
                >
                  <Package className="h-6 w-6" />
                  <span className="font-medium text-xs text-center">Toutes</span>
                </button>
                
                {/* Liste des marques */}
                {brands.map((brand) => (
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
                    {brand.logo ? (
                      <img src={brand.logo} alt={brand.name} className="h-8 w-8 object-contain" />
                    ) : (
                      <div className="h-8 w-8 bg-gray-100 rounded-lg flex items-center justify-center text-xs font-bold">
                        {brand.name.substring(0, 2).toUpperCase()}
                      </div>
                    )}
                    <span className="font-medium text-xs text-center line-clamp-2">{brand.name}</span>
                    <span className="text-[10px] text-gray-400">{brand._count.products}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Grille des Produits */}
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
              <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
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
          {/* Section Droite - Panier */}
          <div className="w-80 bg-white border-l flex flex-col">
            {/* Header Panier */}
            <div className="p-3 border-b">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">Panier</h3>
                <Badge variant="outline">{cartItemsCount} article{cartItemsCount > 1 ? 's' : ''}</Badge>
              </div>
            </div>

            {/* Items du Panier */}
            <div className="flex-1 overflow-y-auto">
              {cart.length === 0 ? (
                <div className="flex items-center justify-center h-full text-gray-500">
                  <div className="text-center">
                    <ShoppingCart className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                    <p className="text-sm">Panier vide</p>
                    <p className="text-xs mt-1">Ajoutez des produits</p>
                  </div>
                </div>
              ) : (
                <div className="p-3 space-y-2">
                  {cart.map((item) => (
                    <div key={item.product.id} className="flex items-start gap-2 p-2 bg-gray-50 rounded-lg">
                      {item.product.photos && item.product.photos.length > 0 ? (
                        <img 
                          src={item.product.photos[0]} 
                          alt={item.product.name}
                          className="w-10 h-10 object-contain bg-white rounded"
                        />
                      ) : (
                        <div className="w-10 h-10 bg-white rounded flex items-center justify-center">
                          <Package className="h-5 w-5 text-gray-300" />
                        </div>
                      )}
                      
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-xs text-gray-900 truncate">
                          {item.product.name}
                        </h4>
                        <div className="text-xs text-gray-500">
                          {item.product.prixVente} F x {item.quantity}
                        </div>
                        <div className="flex items-center gap-1 mt-1">
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
                            disabled={item.quantity >= item.product.stock}
                            className="w-5 h-5 bg-blue-500 text-white rounded flex items-center justify-center hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <Plus className="h-2 w-2" />
                          </button>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="font-bold text-sm text-gray-900">
                          {(item.product.prixVente * item.quantity).toLocaleString()} F
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            removeFromCart(item.product.id)
                          }}
                          className="text-red-500 hover:text-red-600 mt-1"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer Panier - Total */}
            {cart.length > 0 && (
              <div className="border-t p-3 space-y-3">
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Sous-total</span>
                    <span className="font-medium">{cartSubtotal.toLocaleString()} F</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">TVA</span>
                    <span className="font-medium">{cartTax.toLocaleString()} F</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Frais livraison</span>
                    <span className="font-medium">{deliveryFee.toLocaleString()} F</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-lg font-bold pt-1">
                    <span>Total</span>
                    <span className="text-blue-600">{cartTotal.toLocaleString()} F</span>
                  </div>
                </div>

                <Button 
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                  size="lg"
                  onClick={() => setIsCheckoutOpen(true)}
                >
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  Valider la commande
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Dialog Checkout */}
      <Dialog open={isCheckoutOpen} onOpenChange={setIsCheckoutOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Finaliser la commande</DialogTitle>
            <DialogDescription>
              Remplissez les informations du client et confirmez la commande
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Informations client */}
            <div className="space-y-3">
              <h3 className="font-semibold flex items-center gap-2">
                <User className="h-4 w-4" />
                Informations client
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="customerName">Nom complet *</Label>
                  <Input
                    id="customerName"
                    placeholder="Ex: Jean Dupont"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="customerPhone">Téléphone *</Label>
                  <Input
                    id="customerPhone"
                    placeholder="Ex: +237 690000000"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="customerEmail">Email (optionnel)</Label>
                <Input
                  id="customerEmail"
                  type="email"
                  placeholder="Ex: client@email.com"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                />
              </div>
            </div>

            <Separator />

            {/* Livraison */}
            <div className="space-y-3">
              <h3 className="font-semibold flex items-center gap-2">
                <Truck className="h-4 w-4" />
                Livraison
              </h3>
              <div>
                <Label htmlFor="deliveryAddress">Adresse de livraison</Label>
                <Textarea
                  id="deliveryAddress"
                  placeholder="Entrez l'adresse complète..."
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="deliveryPerson">Livreur</Label>
                  <Select value={selectedDeliveryPerson} onValueChange={setSelectedDeliveryPerson}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un livreur" />
                    </SelectTrigger>
                    <SelectContent>
                      {deliveryPersons
                        .filter(d => d.status === "AVAILABLE")
                        .map((person) => (
                          <SelectItem key={person.id} value={person.id}>
                            {person.name} - {person.phone}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="deliveryFee">Frais de livraison (F)</Label>
                  <Input
                    id="deliveryFee"
                    type="number"
                    value={deliveryFee}
                    onChange={(e) => setDeliveryFee(Number(e.target.value))}
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Paiement */}
            <div className="space-y-3">
              <h3 className="font-semibold flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Mode de paiement
              </h3>
              <div className="grid grid-cols-3 gap-2">
                {paymentMethods.map((method) => (
                  <button
                    key={method.id}
                    onClick={() => setPaymentMethod(method.id)}
                    className={cn(
                      "p-3 rounded-lg border-2 transition-all flex flex-col items-center gap-2",
                      paymentMethod === method.id
                        ? "border-blue-500 bg-blue-50 text-blue-700"
                        : "border-gray-200 hover:border-gray-300"
                    )}
                  >
                    <method.icon className="h-5 w-5" />
                    <span className="text-xs font-medium">{method.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <Separator />

            {/* Notes */}
            <div>
              <Label htmlFor="notes">Notes (optionnel)</Label>
              <Textarea
                id="notes"
                placeholder="Ajoutez des instructions spéciales..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
              />
            </div>

            <Separator />

            {/* Récapitulatif */}
            <div className="bg-gray-50 p-4 rounded-lg space-y-2">
              <h3 className="font-semibold mb-3">Récapitulatif de la commande</h3>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Articles ({cartItemsCount})</span>
                  <span>{cartSubtotal.toLocaleString()} F</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>TVA</span>
                  <span>{cartTax.toLocaleString()} F</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Livraison</span>
                  <span>{deliveryFee.toLocaleString()} F</span>
                </div>
                <Separator />
                <div className="flex justify-between text-lg font-bold pt-2">
                  <span>Total à payer</span>
                  <span className="text-blue-600">{cartTotal.toLocaleString()} FCFA</span>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsCheckoutOpen(false)}
              disabled={isSubmitting}
            >
              Annuler
            </Button>
            <Button
              onClick={handleCreateOrder}
              disabled={isSubmitting || !customerName || !customerPhone}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Création...
                </>
              ) : (
                <>
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  Créer la commande
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
