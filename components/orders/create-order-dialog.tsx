"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { ShoppingCart, Plus, Trash2, Loader2, Package } from "lucide-react"
import { toast } from "sonner"

interface CreateOrderDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

interface OrderItem {
  productId: string
  productName: string
  sku?: string
  quantity: number
  unitPrice: number
  stock: number
}

export function CreateOrderDialog({
  open,
  onOpenChange,
  onSuccess,
}: CreateOrderDialogProps) {
  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(false)
  const [stores, setStores] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [items, setItems] = useState<OrderItem[]>([])
  const [selectedProduct, setSelectedProduct] = useState("")
  const [quantity, setQuantity] = useState("1")
  
  const [formData, setFormData] = useState({
    storeId: "",
    customerName: "",
    customerPhone: "",
    customerEmail: "",
    deliveryAddress: "",
    priority: "NORMAL",
    notes: "",
  })

  useEffect(() => {
    if (open) {
      loadData()
    } else {
      resetForm()
    }
  }, [open])

  const loadData = async () => {
    try {
      setLoadingData(true)
      
      const [storesRes, productsRes] = await Promise.all([
        fetch("/api/stores"),
        fetch("/api/products"),
      ])

      if (storesRes.ok) {
        const storesData = await storesRes.json()
        setStores(storesData)
      }

      if (productsRes.ok) {
        const productsData = await productsRes.json()
        setProducts(productsData)
      }
    } catch (error) {
      console.error("Error loading data:", error)
      toast.error("Erreur lors du chargement des données")
    } finally {
      setLoadingData(false)
    }
  }

  const resetForm = () => {
    setFormData({
      storeId: "",
      customerName: "",
      customerPhone: "",
      customerEmail: "",
      deliveryAddress: "",
      priority: "NORMAL",
      notes: "",
    })
    setItems([])
    setSelectedProduct("")
    setQuantity("1")
  }

  const handleAddItem = () => {
    if (!selectedProduct) {
      toast.error("Veuillez sélectionner un produit")
      return
    }

    const product = products.find((p) => p.id === selectedProduct)
    if (!product) return

    const qty = parseInt(quantity)
    if (qty <= 0) {
      toast.error("La quantité doit être supérieure à 0")
      return
    }

    // Vérifier si le produit est déjà dans la liste
    const existingItem = items.find((item) => item.productId === selectedProduct)
    if (existingItem) {
      setItems(
        items.map((item) =>
          item.productId === selectedProduct
            ? { ...item, quantity: item.quantity + qty }
            : item
        )
      )
    } else {
      setItems([
        ...items,
        {
          productId: product.id,
          productName: product.name,
          sku: product.sku,
          quantity: qty,
          unitPrice: product.prixVente,
          stock: product.stock,
        },
      ])
    }

    setSelectedProduct("")
    setQuantity("1")
  }

  const handleRemoveItem = (productId: string) => {
    setItems(items.filter((item) => item.productId !== productId))
  }

  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.storeId) {
      toast.error("Veuillez sélectionner un magasin")
      return
    }

    if (!formData.customerName) {
      toast.error("Le nom du client est requis")
      return
    }

    if (!formData.customerPhone) {
      toast.error("Le téléphone du client est requis")
      return
    }

    if (items.length === 0) {
      toast.error("Veuillez ajouter au moins un produit")
      return
    }

    setLoading(true)

    try {
      const orderItems = items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      }))

      const response = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          items: orderItems,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Erreur lors de la création")
      }

      const order = await response.json()
      toast.success(`Commande ${order.number} créée avec succès`)
      onSuccess?.()
      onOpenChange(false)
    } catch (error: any) {
      console.error("Error creating order:", error)
      toast.error(error.message || "Erreur lors de la création de la commande")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-950 rounded-lg flex items-center justify-center">
              <ShoppingCart className="h-5 w-5 text-white" />
            </div>
            <div>
              <DialogTitle>Nouvelle commande d'approvisionnement</DialogTitle>
              <DialogDescription>
                Créer une commande pour approvisionner un magasin
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Informations du magasin */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900">Informations du magasin</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="storeId">
                  Magasin <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.storeId}
                  onValueChange={(value) => setFormData({ ...formData, storeId: value })}
                  disabled={loadingData}
                >
                  <SelectTrigger id="storeId">
                    <SelectValue placeholder="Sélectionner un magasin" />
                  </SelectTrigger>
                  <SelectContent>
                    {stores.map((store) => (
                      <SelectItem key={store.id} value={store.id}>
                        {store.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="priority">Priorité</Label>
                <Select
                  value={formData.priority}
                  onValueChange={(value) => setFormData({ ...formData, priority: value })}
                >
                  <SelectTrigger id="priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NORMAL">Normale</SelectItem>
                    <SelectItem value="HIGH">Haute</SelectItem>
                    <SelectItem value="URGENT">Urgente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Informations client */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900">Informations client (référence)</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="customerName">
                  Nom du client <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="customerName"
                  value={formData.customerName}
                  onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                  placeholder="Magasin Centre-Ville"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="customerPhone">
                  Téléphone <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="customerPhone"
                  value={formData.customerPhone}
                  onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
                  placeholder="+237 6XX XXX XXX"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="customerEmail">Email</Label>
                <Input
                  id="customerEmail"
                  type="email"
                  value={formData.customerEmail}
                  onChange={(e) => setFormData({ ...formData, customerEmail: e.target.value })}
                  placeholder="contact@magasin.cm"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="deliveryAddress">Adresse de livraison</Label>
                <Input
                  id="deliveryAddress"
                  value={formData.deliveryAddress}
                  onChange={(e) => setFormData({ ...formData, deliveryAddress: e.target.value })}
                  placeholder="123 Rue Principale"
                />
              </div>
            </div>
          </div>

          {/* Produits */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900">Produits</h3>
            
            <div className="flex gap-2">
              <div className="flex-1">
                <Select
                  value={selectedProduct}
                  onValueChange={setSelectedProduct}
                  disabled={loadingData}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un produit" />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((product) => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.sku ? `${product.sku} - ` : ""}{product.name} (Stock: {product.stock})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <Input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="Qté"
                className="w-24"
              />
              
              <Button
                type="button"
                onClick={handleAddItem}
                disabled={!selectedProduct || loadingData}
              >
                <Plus className="h-4 w-4 mr-2" />
                Ajouter
              </Button>
            </div>

            {/* Liste des produits ajoutés */}
            {items.length > 0 && (
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Produit</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead className="text-center">Quantité</TableHead>
                      <TableHead className="text-right">Prix unitaire</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item) => (
                      <TableRow key={item.productId}>
                        <TableCell className="font-medium">{item.productName}</TableCell>
                        <TableCell>
                          {item.sku && <Badge variant="outline">{item.sku}</Badge>}
                        </TableCell>
                        <TableCell className="text-center font-semibold">{item.quantity}</TableCell>
                        <TableCell className="text-right">
                          {item.unitPrice.toLocaleString("fr-FR")} XAF
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {(item.quantity * item.unitPrice).toLocaleString("fr-FR")} XAF
                        </TableCell>
                        <TableCell>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveItem(item.productId)}
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow>
                      <TableCell colSpan={4} className="text-right font-semibold">
                        Total:
                      </TableCell>
                      <TableCell className="text-right font-bold text-lg">
                        {calculateTotal().toLocaleString("fr-FR")} XAF
                      </TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            )}

            {items.length === 0 && (
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <Package className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <p className="text-sm text-gray-600">Aucun produit ajouté</p>
                <p className="text-xs text-gray-500 mt-1">
                  Sélectionnez des produits ci-dessus
                </p>
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Notes additionnelles..."
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={loading || loadingData || items.length === 0}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Créer la commande
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
