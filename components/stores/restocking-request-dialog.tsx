"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { ShoppingCart, Loader2, X, Plus, Search, AlertTriangle, Package, TruckIcon } from "lucide-react"
import { toast } from "@/lib/app-toast"
import { cn } from "@/lib/utils"

interface Product {
  id: string
  name: string
  sku: string | null
  stock: number
  prixAchat: number
}

interface OrderItem {
  productId: string
  productName: string
  sku: string | null
  requestedQuantity: number
  unitCost: number
  stock: number
}

interface RestockingRequestDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  storeId: string
  storeName: string
  onSuccess?: () => void
}

export function RestockingRequestDialog({
  open,
  onOpenChange,
  storeId,
  storeName,
  onSuccess,
}: RestockingRequestDialogProps) {
  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(true)
  const [products, setProducts] = useState<Product[]>([])
  const [currentStep, setCurrentStep] = useState(1)
  const [searchTerm, setSearchTerm] = useState("")
  
  const [formData, setFormData] = useState({
    priority: "NORMAL",
    notes: "",
  })

  const [orderItems, setOrderItems] = useState<OrderItem[]>([])

  useEffect(() => {
    if (open) {
      loadData()
      setCurrentStep(1)
      resetForm()
    }
  }, [open])

  const resetForm = () => {
    setFormData({
      priority: "NORMAL",
      notes: "",
    })
    setOrderItems([])
    setSearchTerm("")
  }

  const loadData = async () => {
    try {
      setLoadingData(true)
      const productsRes = await fetch("/api/products")
      
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

  const handleAddProduct = (product: Product) => {
    // Vérifier si le produit n'est pas déjà dans la liste
    if (orderItems.some(item => item.productId === product.id)) {
      toast.error("Ce produit est déjà dans la demande")
      return
    }

    setOrderItems([...orderItems, {
      productId: product.id,
      productName: product.name,
      sku: product.sku,
      requestedQuantity: 1,
      unitCost: product.prixAchat,
      stock: product.stock,
    }])
    setSearchTerm("")
  }

  const handleUpdateQuantity = (productId: string, quantity: number) => {
    setOrderItems(orderItems.map(item =>
      item.productId === productId
        ? { ...item, requestedQuantity: Math.max(1, quantity) }
        : item
    ))
  }

  const handleRemoveProduct = (productId: string) => {
    setOrderItems(orderItems.filter(item => item.productId !== productId))
  }

  const calculateTotals = () => {
    const totalQuantity = orderItems.reduce((sum, item) => sum + item.requestedQuantity, 0)
    const totalCost = orderItems.reduce((sum, item) => sum + (item.requestedQuantity * item.unitCost), 0)
    
    return { totalQuantity, totalCost }
  }

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        if (orderItems.length === 0) {
          toast.error("Veuillez ajouter au moins un produit")
          return false
        }
        // Vérifier le stock disponible
        const insufficientStock = orderItems.some(item => item.requestedQuantity > item.stock)
        if (insufficientStock) {
          toast.error("Stock insuffisant dans l'entrepôt pour certains produits")
          return false
        }
        return true
      case 2:
        return true
      default:
        return true
    }
  }

  const handleNextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handlePreviousStep = () => {
    setCurrentStep(currentStep - 1)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (currentStep < 2) {
      handleNextStep()
      return
    }

    if (!validateStep(1)) {
      return
    }

    setLoading(true)

    try {
      const { totalQuantity, totalCost } = calculateTotals()

      const response = await fetch("/api/restocking-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeId,
          priority: formData.priority,
          notes: formData.notes,
          totalQuantity,
          totalCost,
          items: orderItems.map(item => ({
            productId: item.productId,
            name: item.productName,
            sku: item.sku,
            requestedQuantity: item.requestedQuantity,
            unitCost: item.unitCost,
            total: item.requestedQuantity * item.unitCost,
          })),
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Erreur lors de la création")
      }

      toast.success("Demande d'approvisionnement créée avec succès")
      onSuccess?.()
      onOpenChange(false)
      resetForm()
    } catch (error: any) {
      console.error("Error creating restocking order:", error)
      toast.error(error.message || "Erreur lors de la création")
    } finally {
      setLoading(false)
    }
  }

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.sku?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const { totalQuantity, totalCost } = calculateTotals()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="min-w-[900px] h-[95vh] p-0 flex flex-col gap-0">
        {/* Header fixe */}
        <DialogHeader className="px-6 py-4 border-b shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-950 rounded-lg flex items-center justify-center">
                <TruckIcon className="h-5 w-5 text-white" />
              </div>
              <div>
                <DialogTitle>Demande d'approvisionnement</DialogTitle>
                <DialogDescription>
                  {storeName} • Étape {currentStep}/2 : {
                    currentStep === 1 ? "Produits à commander" : "Confirmation"
                  }
                </DialogDescription>
              </div>
            </div>
            {/* Indicateur d'étapes */}
            <div className="flex items-center gap-2">
              {[1, 2].map((step, index) => (
                <div key={step} className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                    step < currentStep ? "bg-green-500 text-white" :
                    step === currentStep ? "bg-blue-950 text-white" :
                    "bg-gray-300 text-gray-600"
                  }`}>
                    {step}
                  </div>
                  {index < 1 && (
                    <div className={`w-8 h-0.5 transition-colors ${
                      step < currentStep ? "bg-green-500" : "bg-gray-300"
                    }`} />
                  )}
                </div>
              ))}
            </div>
          </div>
        </DialogHeader>

        {/* Contenu scrollable */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto px-6 py-6">
          
          {/* Étape 1 : Sélection des produits */}
          {currentStep === 1 && (
            <div className="max-w-4xl mx-auto space-y-6">
              <div className="text-center mb-8">
                <h3 className="text-lg font-semibold text-gray-900">Produits à commander</h3>
                <p className="text-sm text-gray-500 mt-1">Recherchez et ajoutez les produits depuis l'entrepôt</p>
              </div>

              <div className="space-y-4">
                {/* Recherche de produits */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Rechercher un produit par nom ou SKU..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>

                {/* Liste de recherche */}
                {searchTerm && (
                  <div className="border rounded-lg max-h-48 overflow-y-auto">
                    {filteredProducts.length === 0 ? (
                      <div className="p-4 text-center text-gray-500">
                        Aucun produit trouvé
                      </div>
                    ) : (
                      <div className="divide-y">
                        {filteredProducts.slice(0, 10).map((product) => (
                          <div
                            key={product.id}
                            className="p-3 hover:bg-gray-50 cursor-pointer flex items-center justify-between"
                            onClick={() => handleAddProduct(product)}
                          >
                            <div className="flex-1">
                              <div className="font-medium">{product.name}</div>
                              <div className="text-sm text-gray-500 flex items-center gap-2">
                                {product.sku && <Badge variant="outline" className="text-xs">{product.sku}</Badge>}
                                <span>Stock entrepôt: {product.stock}</span>
                              </div>
                            </div>
                            <Button type="button" size="sm" variant="ghost">
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Produits sélectionnés */}
                {orderItems.length > 0 && (
                  <div className="border rounded-lg">
                    <div className="p-4 border-b bg-gray-50">
                      <h4 className="font-semibold">Produits sélectionnés ({orderItems.length})</h4>
                    </div>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Produit</TableHead>
                          <TableHead className="text-center">Stock entrepôt</TableHead>
                          <TableHead className="text-center">Quantité demandée</TableHead>
                          <TableHead className="text-right">Coût unitaire</TableHead>
                          <TableHead className="text-right">Total</TableHead>
                          <TableHead></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {orderItems.map((item) => {
                          const insufficientStock = item.requestedQuantity > item.stock
                          return (
                            <TableRow key={item.productId} className={insufficientStock ? "bg-red-50" : ""}>
                              <TableCell>
                                <div className="font-medium">{item.productName}</div>
                                {item.sku && (
                                  <Badge variant="outline" className="text-xs mt-1">
                                    {item.sku}
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell className="text-center">
                                <span
                                  className={cn(
                                    "font-medium",
                                    insufficientStock ? "text-red-600" : "text-green-600"
                                  )}
                                >
                                  {item.stock}
                                </span>
                                {insufficientStock && (
                                  <AlertTriangle className="inline-block h-4 w-4 ml-1 text-red-600" />
                                )}
                              </TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  min="1"
                                  max={item.stock}
                                  value={item.requestedQuantity}
                                  onChange={(e) => handleUpdateQuantity(item.productId, parseInt(e.target.value) || 1)}
                                  className="w-24 text-center"
                                />
                              </TableCell>
                              <TableCell className="text-right">
                                {item.unitCost.toLocaleString("fr-FR")} XAF
                              </TableCell>
                              <TableCell className="text-right font-semibold">
                                {(item.requestedQuantity * item.unitCost).toLocaleString("fr-FR")} XAF
                              </TableCell>
                              <TableCell>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleRemoveProduct(item.productId)}
                                >
                                  <X className="h-4 w-4 text-red-500" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}

                {orderItems.length === 0 && !searchTerm && (
                  <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
                    <Package className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-sm text-gray-600">Aucun produit ajouté</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Utilisez la barre de recherche ci-dessus pour ajouter des produits
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Étape 2 : Confirmation */}
          {currentStep === 2 && (
            <div className="max-w-2xl mx-auto space-y-6">
              <div className="text-center mb-8">
                <h3 className="text-lg font-semibold text-gray-900">Confirmation de la demande</h3>
                <p className="text-sm text-gray-500 mt-1">Vérifiez les informations avant de valider</p>
              </div>

              <div className="space-y-6">
                {/* Résumé */}
                <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Magasin:</span>
                    <span className="font-medium">{storeName}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Nombre de produits:</span>
                    <span className="font-medium">{orderItems.length}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Quantité totale:</span>
                    <span className="font-medium">{totalQuantity}</span>
                  </div>
                </div>

                {/* Priorité */}
                <div className="space-y-2">
                  <Label htmlFor="priority">Priorité</Label>
                  <Select
                    value={formData.priority}
                    onValueChange={(value) => setFormData({ ...formData, priority: value })}
                  >
                    <SelectTrigger id="priority" className="h-12">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NORMAL">Normale</SelectItem>
                      <SelectItem value="HIGH">Haute</SelectItem>
                      <SelectItem value="URGENT">Urgente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Notes */}
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes (optionnel)</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Ajoutez des notes ou instructions particulières..."
                    rows={4}
                  />
                </div>

                {/* Totaux */}
                <div className="border-t pt-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-base font-semibold">
                      <span>Coût total estimé:</span>
                      <span className="text-blue-950">{totalCost.toLocaleString("fr-FR")} XAF</span>
                    </div>
                    <p className="text-xs text-gray-500">
                      Ce montant est indicatif et basé sur le coût d'achat des produits
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          </div>

          {/* Footer fixe */}
          <div className="shrink-0 border-t bg-white px-6 py-4">
            <div className="grid grid-cols-2 gap-4">
              {currentStep === 1 ? (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => onOpenChange(false)}
                    disabled={loading}
                    className="w-full"
                  >
                    Annuler
                  </Button>
                  <Button type="submit" disabled={loading || loadingData} className="w-full">
                    Suivant
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handlePreviousStep}
                    disabled={loading}
                    className="w-full"
                  >
                    Précédent
                  </Button>
                  <Button type="submit" disabled={loading || loadingData} className="w-full">
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Envoyer la demande
                  </Button>
                </>
              )}
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
