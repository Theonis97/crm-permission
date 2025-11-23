"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import {
  Package,
  Plus,
  ShoppingCart,
  Search,
  Loader2,
  ArrowLeft,
  CheckCircle,
} from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

interface StoreProductDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  storeId: string
  onSuccess?: () => void
}

type Mode = "choice" | "create" | "restock"

interface Category {
  id: string
  name: string
}

interface Brand {
  id: string
  name: string
}

interface WarehouseProduct {
  id: string
  name: string
  sku: string | null
  prixVente: number
  prixAchat: number
  stock: number
  category: {
    id: string
    name: string
  }
  brand: {
    id: string
    name: string
  } | null
}

export function StoreProductDialog({
  open,
  onOpenChange,
  storeId,
  onSuccess,
}: StoreProductDialogProps) {
  const [mode, setMode] = useState<Mode>("choice")
  const [categories, setCategories] = useState<Category[]>([])
  const [brands, setBrands] = useState<Brand[]>([])
  const [warehouseProducts, setWarehouseProducts] = useState<WarehouseProduct[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Formulaire création produit
  const [productForm, setProductForm] = useState({
    name: "",
    sku: "",
    description: "",
    categoryId: "",
    brandId: "",
    prixVente: "",
    prixAchat: "",
    tva: "0",
    stock: "",
    minStock: "",
    maxStock: "",
  })

  // Produits sélectionnés pour approvisionnement
  const [selectedProducts, setSelectedProducts] = useState<Map<string, number>>(new Map())

  useEffect(() => {
    if (open) {
      loadCategories()
      loadBrands()
    } else {
      // Reset au changement d'état
      setMode("choice")
      setProductForm({
        name: "",
        sku: "",
        description: "",
        categoryId: "",
        brandId: "",
        prixVente: "",
        prixAchat: "",
        tva: "0",
        stock: "",
        minStock: "",
        maxStock: "",
      })
      setSelectedProducts(new Map())
      setSearchTerm("")
    }
  }, [open])

  useEffect(() => {
    if (mode === "restock") {
      loadWarehouseProducts()
    }
  }, [mode])

  const loadCategories = async () => {
    try {
      const response = await fetch("/api/categories")
      if (response.ok) {
        const data = await response.json()
        setCategories(data)
      }
    } catch (error) {
      console.error("Error loading categories:", error)
    }
  }

  const loadBrands = async () => {
    try {
      const response = await fetch("/api/brands")
      if (response.ok) {
        const data = await response.json()
        setBrands(data)
      }
    } catch (error) {
      console.error("Error loading brands:", error)
    }
  }

  const loadWarehouseProducts = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/products")
      if (response.ok) {
        const data = await response.json()
        setWarehouseProducts(data)
      }
    } catch (error) {
      console.error("Error loading warehouse products:", error)
      toast.error("Erreur lors du chargement des produits")
    } finally {
      setLoading(false)
    }
  }

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!productForm.name || !productForm.categoryId || !productForm.prixVente) {
      toast.error("Veuillez remplir tous les champs obligatoires")
      return
    }

    setSubmitting(true)
    try {
      // 1. Créer le produit global
      const productResponse = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: productForm.name,
          sku: productForm.sku || null,
          description: productForm.description || null,
          categoryId: productForm.categoryId,
          brandId: productForm.brandId || null,
          prixVente: parseFloat(productForm.prixVente),
          prixAchat: parseFloat(productForm.prixAchat) || 0,
          tva: parseFloat(productForm.tva) || 0,
          stock: 0, // Le stock global reste à 0
          minStock: 0,
          maxStock: parseInt(productForm.maxStock) || null,
          photos: [],
        }),
      })

      if (!productResponse.ok) {
        const error = await productResponse.json()
        throw new Error(error.error || "Erreur lors de la création du produit")
      }

      const newProduct = await productResponse.json()

      // 2. Créer le StoreProduct (lien produit-magasin)
      const storeProductResponse = await fetch(`/api/stores/${storeId}/products`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: newProduct.id,
          stock: parseInt(productForm.stock) || 0,
          minStock: parseInt(productForm.minStock) || 0,
        }),
      })

      if (!storeProductResponse.ok) {
        throw new Error("Erreur lors de l'ajout au magasin")
      }

      toast.success("Produit créé avec succès")
      onOpenChange(false)
      onSuccess?.()
    } catch (error: any) {
      console.error("Error creating product:", error)
      toast.error(error.message || "Erreur lors de la création")
    } finally {
      setSubmitting(false)
    }
  }

  const handleRestockingOrder = async () => {
    if (selectedProducts.size === 0) {
      toast.error("Veuillez sélectionner au moins un produit")
      return
    }

    setSubmitting(true)
    try {
      const items = Array.from(selectedProducts.entries()).map(([productId, quantity]) => {
        const product = warehouseProducts.find((p) => p.id === productId)!
        return {
          productId,
          name: product.name,
          sku: product.sku,
          requestedQuantity: quantity,
          unitCost: product.prixAchat,
          total: product.prixAchat * quantity,
        }
      })

      // Calculer les totaux
      const totalQuantity = items.reduce((sum, item) => sum + item.requestedQuantity, 0)
      const totalCost = items.reduce((sum, item) => sum + item.total, 0)

      const response = await fetch("/api/restocking-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeId,
          priority: "NORMAL", // Valeur par défaut
          notes: "Demande d'approvisionnement depuis la page produits du magasin",
          totalQuantity,
          totalCost,
          items,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Erreur lors de la création de la commande")
      }

      toast.success("Demande d'approvisionnement créée avec succès")
      onOpenChange(false)
      // Note: Les produits n'apparaîtront qu'après validation de la commande
      toast.info("Les produits apparaîtront après validation de l'entrepôt")
    } catch (error: any) {
      console.error("Error creating restocking order:", error)
      toast.error(error.message || "Erreur lors de la création de la commande")
    } finally {
      setSubmitting(false)
    }
  }

  const toggleProductSelection = (productId: string) => {
    const newSelected = new Map(selectedProducts)
    if (newSelected.has(productId)) {
      newSelected.delete(productId)
    } else {
      newSelected.set(productId, 1) // Quantité par défaut
    }
    setSelectedProducts(newSelected)
  }

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      const newSelected = new Map(selectedProducts)
      newSelected.delete(productId)
      setSelectedProducts(newSelected)
    } else {
      setSelectedProducts(new Map(selectedProducts.set(productId, quantity)))
    }
  }

  const filteredWarehouseProducts = warehouseProducts.filter(
    (p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.sku?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        {mode === "choice" && (
          <>
            <DialogHeader>
              <DialogTitle>Ajouter des produits</DialogTitle>
              <DialogDescription>
                Choisissez comment vous souhaitez ajouter des produits à votre magasin
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 md:grid-cols-2 py-4">
              <Card
                className="cursor-pointer hover:shadow-lg transition-shadow border-2 hover:border-blue-500"
                onClick={() => setMode("create")}
              >
                <CardHeader>
                  <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mb-2">
                    <Plus className="h-6 w-6 text-blue-600" />
                  </div>
                  <CardTitle className="text-lg">Créer un nouveau produit</CardTitle>
                  <CardDescription>
                    Ajoutez un produit unique à votre magasin
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Créez votre propre produit</li>
                    <li>• Définissez vos prix et stock</li>
                    <li>• Disponible immédiatement</li>
                  </ul>
                </CardContent>
              </Card>

              <Card
                className="cursor-pointer hover:shadow-lg transition-shadow border-2 hover:border-green-500"
                onClick={() => setMode("restock")}
              >
                <CardHeader>
                  <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mb-2">
                    <ShoppingCart className="h-6 w-6 text-green-600" />
                  </div>
                  <CardTitle className="text-lg">Demande d'approvisionnement</CardTitle>
                  <CardDescription>
                    Commandez des produits depuis l'entrepôt
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Sélectionnez des produits existants</li>
                    <li>• Demande envoyée à l'entrepôt</li>
                    <li>• Validation requise</li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </>
        )}

        {mode === "create" && (
          <>
            <DialogHeader>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setMode("choice")}
                  className="rounded-full"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                  <DialogTitle>Créer un nouveau produit</DialogTitle>
                  <DialogDescription>
                    Ajoutez un produit unique à votre magasin
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <form onSubmit={handleCreateProduct} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">
                    Nom du produit <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="name"
                    value={productForm.name}
                    onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                    placeholder="Ex: iPhone 14 Pro"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sku">SKU / Référence</Label>
                  <Input
                    id="sku"
                    value={productForm.sku}
                    onChange={(e) => setProductForm({ ...productForm, sku: e.target.value })}
                    placeholder="Ex: IPH-14-PRO"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={productForm.description}
                  onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                  placeholder="Description du produit..."
                  rows={3}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="categoryId">
                    Catégorie <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={productForm.categoryId}
                    onValueChange={(value) => setProductForm({ ...productForm, categoryId: value })}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionnez une catégorie" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="brandId">Marque (optionnelle)</Label>
                  <Select
                    value={productForm.brandId || undefined}
                    onValueChange={(value) => setProductForm({ ...productForm, brandId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionnez une marque" />
                    </SelectTrigger>
                    <SelectContent>
                      {brands.map((brand) => (
                        <SelectItem key={brand.id} value={brand.id}>
                          {brand.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="prixVente">
                    Prix de vente <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="prixVente"
                    type="number"
                    step="0.01"
                    value={productForm.prixVente}
                    onChange={(e) => setProductForm({ ...productForm, prixVente: e.target.value })}
                    placeholder="0"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="prixAchat">Prix d'achat</Label>
                  <Input
                    id="prixAchat"
                    type="number"
                    step="0.01"
                    value={productForm.prixAchat}
                    onChange={(e) => setProductForm({ ...productForm, prixAchat: e.target.value })}
                    placeholder="0"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tva">TVA (%)</Label>
                  <Input
                    id="tva"
                    type="number"
                    step="0.01"
                    value={productForm.tva}
                    onChange={(e) => setProductForm({ ...productForm, tva: e.target.value })}
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="stock">Stock initial</Label>
                  <Input
                    id="stock"
                    type="number"
                    value={productForm.stock}
                    onChange={(e) => setProductForm({ ...productForm, stock: e.target.value })}
                    placeholder="0"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="minStock">Stock minimum</Label>
                  <Input
                    id="minStock"
                    type="number"
                    value={productForm.minStock}
                    onChange={(e) => setProductForm({ ...productForm, minStock: e.target.value })}
                    placeholder="0"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="maxStock">Stock maximum</Label>
                  <Input
                    id="maxStock"
                    type="number"
                    value={productForm.maxStock}
                    onChange={(e) => setProductForm({ ...productForm, maxStock: e.target.value })}
                    placeholder="Optionnel"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setMode("choice")}
                  disabled={submitting}
                >
                  Retour
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Création...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      Créer le produit
                    </>
                  )}
                </Button>
              </div>
            </form>
          </>
        )}

        {mode === "restock" && (
          <>
            <DialogHeader>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setMode("choice")}
                  className="rounded-full"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                  <DialogTitle>Demande d'approvisionnement</DialogTitle>
                  <DialogDescription>
                    Sélectionnez les produits à commander depuis l'entrepôt
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-4">
              {/* Barre de recherche */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Rechercher un produit..."
                  className="pl-9"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              {/* Produits sélectionnés */}
              {selectedProducts.size > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-sm">
                      {selectedProducts.size} produit(s) sélectionné(s)
                    </span>
                  </div>
                </div>
              )}

              {/* Liste des produits */}
              {loading ? (
                <div className="text-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
                  <p className="text-gray-500">Chargement des produits...</p>
                </div>
              ) : (
                <div className="max-h-96 overflow-y-auto space-y-2">
                  {filteredWarehouseProducts.map((product) => {
                    const isSelected = selectedProducts.has(product.id)
                    const quantity = selectedProducts.get(product.id) || 1

                    return (
                      <div
                        key={product.id}
                        className={cn(
                          "border rounded-lg p-3 cursor-pointer transition-all",
                          isSelected
                            ? "border-blue-500 bg-blue-50"
                            : "border-gray-200 hover:border-gray-300"
                        )}
                        onClick={() => !isSelected && toggleProductSelection(product.id)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-semibold text-sm">{product.name}</h4>
                              {product.sku && (
                                <Badge variant="outline" className="text-xs">
                                  {product.sku}
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-3 mt-1 text-xs text-gray-600">
                              <span>{product.category.name}</span>
                              {product.brand && <span>• {product.brand.name}</span>}
                              <span>• Stock: {product.stock}</span>
                              <span>• {(product.prixVente / 1000).toFixed(0)}k XAF</span>
                            </div>
                          </div>

                          {isSelected ? (
                            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => updateQuantity(product.id, quantity - 1)}
                              >
                                -
                              </Button>
                              <Input
                                type="number"
                                min="1"
                                value={quantity}
                                onChange={(e) =>
                                  updateQuantity(product.id, parseInt(e.target.value) || 1)
                                }
                                className="w-16 text-center"
                              />
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => updateQuantity(product.id, quantity + 1)}
                              >
                                +
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={() => toggleProductSelection(product.id)}
                              >
                                ×
                              </Button>
                            </div>
                          ) : (
                            <CheckCircle className="h-5 w-5 text-gray-300" />
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setMode("choice")}
                  disabled={submitting}
                >
                  Retour
                </Button>
                <Button
                  onClick={handleRestockingOrder}
                  disabled={submitting || selectedProducts.size === 0}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Envoi...
                    </>
                  ) : (
                    <>
                      <ShoppingCart className="h-4 w-4 mr-2" />
                      Envoyer la demande ({selectedProducts.size})
                    </>
                  )}
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
