"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Package,
  TrendingUp,
  TrendingDown,
  Edit,
  Plus,
  Loader2,
  Box,
  DollarSign,
  Store,
  Tag,
  BarChart3,
  ShoppingCart,
  Truck,
  AlertTriangle,
  Info,
  CheckCircle2,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { ProductFormDialog } from "@/components/products/product-form-dialog"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart } from "recharts"

interface StoreProductDetailsSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  productId: string | null
  storeId: string
  onUpdated?: () => void
}

export function StoreProductDetailsSheet({
  open,
  onOpenChange,
  productId,
  storeId,
  onUpdated,
}: StoreProductDetailsSheetProps) {
  const [product, setProduct] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [adjustDialogOpen, setAdjustDialogOpen] = useState(false)
  const [adjustQuantity, setAdjustQuantity] = useState("")
  const [adjustNote, setAdjustNote] = useState("")
  const [adjusting, setAdjusting] = useState(false)
  const [stats, setStats] = useState<any>(null)
  const [loadingStats, setLoadingStats] = useState(false)
  const [editPriceDialogOpen, setEditPriceDialogOpen] = useState(false)
  const [priceFormData, setPriceFormData] = useState({
    prixVente: "",
    prixAchat: "",
    minStock: "",
    maxStock: "",
  })
  const [savingPrice, setSavingPrice] = useState(false)

  useEffect(() => {
    if (open && productId) {
      loadProduct()
      loadStats()
    } else {
      setProduct(null)
      setStats(null)
    }
  }, [open, productId])

  const loadProduct = async () => {
    if (!productId) return

    try {
      setLoading(true)
      const response = await fetch(`/api/products/${productId}`)
      
      if (!response.ok) {
        throw new Error("Erreur lors du chargement")
      }

      const data = await response.json()
      
      // Récupérer les données spécifiques du magasin
      const storeProductResponse = await fetch(`/api/stores/${storeId}/products`)
      if (storeProductResponse.ok) {
        const storeProducts = await storeProductResponse.json()
        const storeProduct = storeProducts.find((sp: any) => sp.id === productId)
        if (storeProduct) {
          // Stock
          data.storeStock = storeProduct.stock
          data.storeMinStock = storeProduct.minStock
          data.storeMaxStock = storeProduct.maxStock
          data.storeProductId = storeProduct.storeProductId
          
          // Prix spécifiques du magasin
          data.storePrixVente = storeProduct.storePrixVente
          data.storePrixAchat = storeProduct.storePrixAchat
          
          // Prix effectifs (magasin ou entrepôt)
          data.prixVente = storeProduct.prixVente
          data.prixAchat = storeProduct.prixAchat
          
          // Prix entrepôt pour comparaison
          data.warehousePrixVente = storeProduct.warehousePrixVente
          data.warehousePrixAchat = storeProduct.warehousePrixAchat
        }
      }
      
      setProduct(data)
    } catch (error) {
      console.error("Error loading product:", error)
      toast.error("Erreur lors du chargement du produit")
    } finally {
      setLoading(false)
    }
  }

  const loadStats = async () => {
    if (!productId) return

    try {
      setLoadingStats(true)
      const response = await fetch(`/api/products/${productId}/stats?storeId=${storeId}`)
      
      if (!response.ok) {
        throw new Error("Erreur lors du chargement des statistiques")
      }

      const data = await response.json()
      setStats(data)
    } catch (error) {
      console.error("Error loading stats:", error)
      // Silencieux - pas besoin d'afficher une erreur
    } finally {
      setLoadingStats(false)
    }
  }

  const handleAdjustStock = async () => {
    if (!productId || !adjustQuantity) {
      toast.error("Veuillez saisir une quantité")
      return
    }

    const quantity = parseInt(adjustQuantity)
    if (isNaN(quantity) || quantity <= 0) {
      toast.error("Quantité invalide (doit être positive)")
      return
    }

    try {
      setAdjusting(true)
      
      // Créer une demande d'approvisionnement vers l'entrepôt
      const response = await fetch(`/api/restocking-orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeId,
          items: [
            {
              productId: product.id,
              name: product.name,
              sku: product.sku,
              requestedQuantity: quantity,
              unitCost: product.prixAchat || 0,
              total: (product.prixAchat || 0) * quantity,
            },
          ],
          notes: adjustNote || `Demande d'approvisionnement pour ${product.name}`,
          priority: "NORMAL",
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Erreur lors de la création")
      }

      toast.success(`Demande d'approvisionnement créée (${quantity} unité(s))`, {
        description: "En attente de validation par l'entrepôt"
      })
      setAdjustDialogOpen(false)
      setAdjustQuantity("")
      setAdjustNote("")
      await loadProduct()
      onUpdated?.()
    } catch (error: any) {
      console.error("Error creating restocking order:", error)
      toast.error(error.message || "Erreur lors de la création")
    } finally {
      setAdjusting(false)
    }
  }

  const handleOpenPriceDialog = () => {
    setPriceFormData({
      prixVente: product.storePrixVente?.toString() || product.prixVente?.toString() || "",
      prixAchat: product.storePrixAchat?.toString() || product.prixAchat?.toString() || "",
      minStock: product.storeMinStock?.toString() || product.minStock?.toString() || "",
      maxStock: product.storeMaxStock?.toString() || product.maxStock?.toString() || "",
    })
    setEditPriceDialogOpen(true)
  }

  const handleSavePrice = async () => {
    try {
      setSavingPrice(true)

      const dataToSave: any = {}
      
      if (priceFormData.prixVente) {
        const prixVente = parseFloat(priceFormData.prixVente)
        if (isNaN(prixVente) || prixVente < 0) {
          toast.error("Prix de vente invalide")
          return
        }
        dataToSave.prixVente = prixVente
      }

      if (priceFormData.prixAchat) {
        const prixAchat = parseFloat(priceFormData.prixAchat)
        if (isNaN(prixAchat) || prixAchat < 0) {
          toast.error("Prix d'achat invalide")
          return
        }
        dataToSave.prixAchat = prixAchat
      }

      if (priceFormData.minStock) {
        const minStock = parseInt(priceFormData.minStock)
        if (isNaN(minStock) || minStock < 0) {
          toast.error("Stock minimum invalide")
          return
        }
        dataToSave.minStock = minStock
      }

      if (priceFormData.maxStock) {
        const maxStock = parseInt(priceFormData.maxStock)
        if (isNaN(maxStock) || maxStock < 0) {
          toast.error("Stock maximum invalide")
          return
        }
        dataToSave.maxStock = maxStock
      }

      const response = await fetch(`/api/stores/${storeId}/products/${product.storeProductId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dataToSave),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Erreur lors de la mise à jour")
      }

      toast.success("Paramètres mis à jour avec succès")
      setEditPriceDialogOpen(false)
      await loadProduct()
      onUpdated?.()
    } catch (error: any) {
      console.error("Error updating price:", error)
      toast.error(error.message || "Erreur lors de la mise à jour")
    } finally {
      setSavingPrice(false)
    }
  }

  const getStockStatus = () => {
    if (!product) return null
    const stock = product.storeStock ?? product.stock
    const minStock = product.storeMinStock ?? product.minStock
    
    if (stock === 0) return { label: "Rupture", color: "bg-red-50 text-red-700 border-red-200" }
    if (stock <= minStock) return { label: "Stock faible", color: "bg-amber-50 text-amber-700 border-amber-200" }
    return { label: "Stock OK", color: "bg-green-50 text-green-700 border-green-200" }
  }

  const stockStatus = getStockStatus()

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-4xl p-0 flex flex-col gap-0 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
          ) : !product ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Package className="h-12 w-12 text-gray-400 mb-4" />
              <p className="text-gray-500">Produit introuvable</p>
            </div>
          ) : (
            <>
              {/* Header fixe */}
              <div className="shrink-0 border-b bg-white">
                <SheetHeader className="p-6 pb-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="w-12 h-12 bg-blue-950 rounded-lg flex items-center justify-center shrink-0">
                        <Package className="h-6 w-6 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <SheetTitle className="text-xl font-bold">
                          {product.name}
                        </SheetTitle>
                        <SheetDescription className="flex items-center gap-2 mt-1">
                          {product.sku && (
                            <Badge variant="outline" className="text-xs">
                              {product.sku}
                            </Badge>
                          )}
                          {stockStatus && (
                            <Badge variant="outline" className={cn("text-xs", stockStatus.color)}>
                              {stockStatus.label}
                            </Badge>
                          )}
                        </SheetDescription>
                      </div>
                    </div>
                  </div>
                </SheetHeader>

                {/* Infos rapides */}
                <div className="px-6 pb-4 grid grid-cols-4 gap-4">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-gray-600 text-xs mb-1">
                      <Box className="h-3.5 w-3.5" />
                      <span>Stock magasin</span>
                    </div>
                    <div className="text-xl font-bold text-gray-900">
                      {product.storeStock ?? product.stock}
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-gray-600 text-xs mb-1">
                      <DollarSign className="h-3.5 w-3.5" />
                      <span>Prix vente</span>
                    </div>
                    <div className="text-xl font-bold text-gray-900">
                      {(product.prixVente / 1000).toFixed(0)}k XAF
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-gray-600 text-xs mb-1">
                      <TrendingDown className="h-3.5 w-3.5" />
                      <span>Stock min</span>
                    </div>
                    <div className="text-xl font-bold text-gray-900">
                      {product.storeMinStock ?? product.minStock}
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-gray-600 text-xs mb-1">
                      <Store className="h-3.5 w-3.5" />
                      <span>Stock entrepôt</span>
                    </div>
                    <div className="text-xl font-bold text-gray-900">
                      {product.stock}
                    </div>
                  </div>
                </div>
              </div>

              {/* Contenu scrollable */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Informations produit */}
                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  <h3 className="font-semibold text-gray-900">Informations</h3>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-xs text-gray-600 mb-1">Catégorie</div>
                      <Badge variant="secondary">{product.category?.name || "—"}</Badge>
                    </div>
                    <div>
                      <div className="text-xs text-gray-600 mb-1">Marque</div>
                      <Badge variant="secondary">{product.brand?.name || "—"}</Badge>
                    </div>
                  </div>

                  {product.description && (
                    <div>
                      <div className="text-xs text-gray-600 mb-1">Description</div>
                      <p className="text-sm text-gray-700">{product.description}</p>
                    </div>
                  )}
                </div>

                {/* Prix et marges */}
                <div className="bg-white border rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-3">Tarification</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Prix d'achat (HT):</span>
                      <span className="font-medium">{product.prixAchat.toLocaleString("fr-FR")} XAF</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Prix de vente (HT):</span>
                      <span className="font-medium">{product.prixVente.toLocaleString("fr-FR")} XAF</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">TVA:</span>
                      <span className="font-medium">{product.tva}%</span>
                    </div>
                    <div className="flex justify-between text-sm border-t pt-3">
                      <span className="text-gray-600">Marge brute:</span>
                      <span className="font-semibold text-green-600">
                        {(product.prixVente - product.prixAchat).toLocaleString("fr-FR")} XAF
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Marge (%):</span>
                      <span className="font-semibold text-green-600">
                        {((product.prixVente - product.prixAchat) / product.prixAchat * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* Statistiques sur 12 mois */}
                <div className="bg-white border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                      <BarChart3 className="h-5 w-5 text-blue-600" />
                      Performance sur 12 mois
                    </h3>
                  </div>

                  {loadingStats ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                    </div>
                  ) : stats ? (
                    <>
                      {/* Résumé */}
                      <div className="grid grid-cols-4 gap-3 mb-6">
                        <div className="bg-blue-50 rounded-lg p-3">
                          <div className="flex items-center gap-2 text-blue-600 text-xs mb-1">
                            <ShoppingCart className="h-3.5 w-3.5" />
                            <span>Commandes</span>
                          </div>
                          <div className="text-2xl font-bold text-blue-900">
                            {stats.summary.totalOrders}
                          </div>
                        </div>
                        <div className="bg-green-50 rounded-lg p-3">
                          <div className="flex items-center gap-2 text-green-600 text-xs mb-1">
                            <DollarSign className="h-3.5 w-3.5" />
                            <span>CA Total</span>
                          </div>
                          <div className="text-2xl font-bold text-green-900">
                            {(stats.summary.totalRevenue / 1000).toFixed(0)}k
                          </div>
                        </div>
                        <div className="bg-purple-50 rounded-lg p-3">
                          <div className="flex items-center gap-2 text-purple-600 text-xs mb-1">
                            <Package className="h-3.5 w-3.5" />
                            <span>Quantité</span>
                          </div>
                          <div className="text-2xl font-bold text-purple-900">
                            {stats.summary.totalQuantity}
                          </div>
                        </div>
                        <div className="bg-orange-50 rounded-lg p-3">
                          <div className="flex items-center gap-2 text-orange-600 text-xs mb-1">
                            <TrendingUp className="h-3.5 w-3.5" />
                            <span>Panier moy.</span>
                          </div>
                          <div className="text-2xl font-bold text-orange-900">
                            {(stats.summary.avgOrderValue / 1000).toFixed(1)}k
                          </div>
                        </div>
                      </div>

                      {/* Graphique */}
                      <div className="bg-gray-50 rounded-lg p-4">
                        <ResponsiveContainer width="100%" height={300}>
                          <AreaChart data={stats.chartData}>
                            <defs>
                              <linearGradient id="colorOrders" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                              </linearGradient>
                              <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                                <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                            <XAxis 
                              dataKey="month" 
                              tick={{ fontSize: 12 }}
                              stroke="#6b7280"
                            />
                            <YAxis 
                              yAxisId="left"
                              tick={{ fontSize: 12 }}
                              stroke="#6b7280"
                            />
                            <YAxis 
                              yAxisId="right"
                              orientation="right"
                              tick={{ fontSize: 12 }}
                              stroke="#6b7280"
                            />
                            <Tooltip 
                              contentStyle={{ 
                                backgroundColor: 'white',
                                border: '1px solid #e5e7eb',
                                borderRadius: '8px',
                                fontSize: '12px'
                              }}
                              formatter={(value: any, name: string | undefined) => {
                                if (name === 'revenue') {
                                  return [`${Number(value).toLocaleString()} FCFA`, 'CA']
                                }
                                return [value, 'Commandes']
                              }}
                            />
                            <Legend 
                              wrapperStyle={{ fontSize: '12px' }}
                              formatter={(value) => value === 'orders' ? 'Commandes' : 'Chiffre d\'affaires'}
                            />
                            <Area 
                              yAxisId="left"
                              type="monotone" 
                              dataKey="orders" 
                              stroke="#3b82f6" 
                              fillOpacity={1}
                              fill="url(#colorOrders)"
                              strokeWidth={2}
                            />
                            <Area 
                              yAxisId="right"
                              type="monotone" 
                              dataKey="revenue" 
                              stroke="#10b981" 
                              fillOpacity={1}
                              fill="url(#colorRevenue)"
                              strokeWidth={2}
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-8 text-gray-500 text-sm">
                      Aucune donnée disponible
                    </div>
                  )}
                </div>

                {/* Photos */}
                {product.photos && product.photos.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-3">Photos</h3>
                    <div className="grid grid-cols-3 gap-3">
                      {product.photos.map((photo: string, index: number) => (
                        <div key={index} className="aspect-square rounded-lg border overflow-hidden bg-gray-50">
                          <img src={photo} alt={`Photo ${index + 1}`} className="w-full h-full object-cover" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Footer fixe avec boutons d'action */}
              <div className="shrink-0 border-t bg-white p-6">
                <div className="grid grid-cols-3 gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setAdjustDialogOpen(true)}
                  >
                    <Truck className="h-4 w-4 mr-2" />
                    Commander
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleOpenPriceDialog}
                  >
                    <Tag className="h-4 w-4 mr-2" />
                    Paramètres magasin
                  </Button>
                  <Button
                    onClick={() => setEditDialogOpen(true)}
                    className="bg-blue-900 hover:bg-blue-800"
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Modifier produit
                  </Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Dialog de demande d'approvisionnement */}
      <Sheet open={adjustDialogOpen} onOpenChange={setAdjustDialogOpen}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto px-6">
          <SheetHeader>
            <SheetTitle>Demande d'approvisionnement</SheetTitle>
            <SheetDescription>
              {product?.name}
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-6 py-6">
            {/* Section : Situation actuelle */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-900 pb-2 border-b">
                Situation actuelle
              </h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Stock actuel</p>
                  <p className="text-2xl font-bold text-gray-900">{product?.storeStock ?? product?.stock ?? 0}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Stock minimum</p>
                  <p className="text-2xl font-bold text-gray-900">{product?.storeMinStock ?? product?.minStock ?? 0}</p>
                </div>
              </div>
              {product && (product.storeStock ?? product.stock) < (product.storeMinStock ?? product.minStock) && (
                <p className="text-xs text-amber-600">
                  ⚠️ Stock en dessous du seuil minimum
                </p>
              )}
            </div>

            {/* Section : Formulaire de commande */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="quantity" className="text-sm font-semibold text-gray-900">
                  Quantité à commander <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="quantity"
                    type="number"
                    min="1"
                    value={adjustQuantity}
                    onChange={(e) => setAdjustQuantity(e.target.value)}
                    placeholder="Ex: 50"
                    className="text-lg h-12 pr-16"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">
                    unités
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="note" className="text-sm font-semibold text-gray-900">
                  Motif ou remarque
                </Label>
                <Input
                  id="note"
                  value={adjustNote}
                  onChange={(e) => setAdjustNote(e.target.value)}
                  placeholder="Ex: Stock faible, prévision forte demande..."
                  className="h-11"
                />
              </div>
            </div>

            {/* Section : Aperçu de la commande */}
            {product && adjustQuantity && !isNaN(parseInt(adjustQuantity)) && parseInt(adjustQuantity) > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-gray-900 pb-2 border-b">
                  Aperçu de la commande
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Quantité demandée</span>
                    <span className="font-semibold">+{parseInt(adjustQuantity)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Prix unitaire</span>
                    <span className="font-semibold">
                      {(product.prixAchat || 0).toLocaleString()} FCFA
                    </span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t">
                    <span className="font-semibold">Coût total estimé</span>
                    <span className="text-lg font-bold">
                      {((product.prixAchat || 0) * parseInt(adjustQuantity)).toLocaleString()} FCFA
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Stock après réception</span>
                    <span className="font-semibold">
                      {(product.storeStock ?? product.stock) + parseInt(adjustQuantity)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            <p className="text-xs text-gray-500">
              Cette demande sera envoyée à l'entrepôt avec le statut <strong>« En attente »</strong> jusqu'à validation.
            </p>
          </div>

          {/* Footer avec boutons */}
          <div className="border-t pt-4 pb-2 flex gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setAdjustDialogOpen(false)
                setAdjustQuantity("")
                setAdjustNote("")
              }}
              className="flex-1"
              disabled={adjusting}
            >
              Annuler
            </Button>
            <Button
              onClick={handleAdjustStock}
              className="flex-1"
              disabled={adjusting || !adjustQuantity || parseInt(adjustQuantity) <= 0}
            >
              {adjusting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {adjusting ? "Création..." : "Créer la demande"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Dialog de modification des paramètres magasin */}
      <Sheet open={editPriceDialogOpen} onOpenChange={setEditPriceDialogOpen}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto px-6">
          <SheetHeader>
            <SheetTitle>Paramètres magasin</SheetTitle>
            <SheetDescription>
              Configuration spécifique pour {product?.name}
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-8 py-6">
            {/* Section : Tarification */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-900 pb-2 border-b">Tarification</h3>
              
              <div className="grid md:grid-cols-2 gap-4">
                {/* Prix de vente */}
                <div className="space-y-2">
                  <Label htmlFor="prixVente" className="text-sm font-medium">
                    Prix de vente (FCFA)
                  </Label>
                  <div className="relative">
                    <Input
                      id="prixVente"
                      type="number"
                      min="0"
                      step="100"
                      value={priceFormData.prixVente}
                      onChange={(e) => setPriceFormData({ ...priceFormData, prixVente: e.target.value })}
                      placeholder={product?.warehousePrixVente?.toLocaleString() || "0"}
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                      FCFA
                    </div>
                  </div>
                  <p className="text-xs text-gray-500">
                    Entrepôt: {product?.warehousePrixVente?.toLocaleString() || 0} FCFA
                  </p>
                </div>

                {/* Prix d'achat */}
                <div className="space-y-2">
                  <Label htmlFor="prixAchat" className="text-sm font-medium">
                    Prix d'achat (FCFA)
                  </Label>
                  <div className="relative">
                    <Input
                      id="prixAchat"
                      type="number"
                      min="0"
                      step="100"
                      value={priceFormData.prixAchat}
                      onChange={(e) => setPriceFormData({ ...priceFormData, prixAchat: e.target.value })}
                      placeholder={product?.warehousePrixAchat?.toLocaleString() || "0"}
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                      FCFA
                    </div>
                  </div>
                  <p className="text-xs text-gray-500">
                    Entrepôt: {product?.warehousePrixAchat?.toLocaleString() || 0} FCFA
                  </p>
                </div>
              </div>

              <p className="text-xs text-gray-500 mt-2">
                Laissez vide pour utiliser les prix de l'entrepôt
              </p>
            </div>

            {/* Section : Seuils de stock */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-900 pb-2 border-b">Seuils de stock</h3>

              <div className="grid md:grid-cols-2 gap-4">
                {/* Stock minimum */}
                <div className="space-y-2">
                  <Label htmlFor="minStock" className="text-sm font-medium">
                    Stock minimum (alerte)
                  </Label>
                  <div className="relative">
                    <Input
                      id="minStock"
                      type="number"
                      min="0"
                      value={priceFormData.minStock}
                      onChange={(e) => setPriceFormData({ ...priceFormData, minStock: e.target.value })}
                      placeholder={product?.minStock?.toString() || "0"}
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                      unités
                    </div>
                  </div>
                  <p className="text-xs text-gray-500">
                    Entrepôt: {product?.minStock || 0}
                  </p>
                </div>

                {/* Stock maximum */}
                <div className="space-y-2">
                  <Label htmlFor="maxStock" className="text-sm font-medium">
                    Stock maximum
                  </Label>
                  <div className="relative">
                    <Input
                      id="maxStock"
                      type="number"
                      min="0"
                      value={priceFormData.maxStock}
                      onChange={(e) => setPriceFormData({ ...priceFormData, maxStock: e.target.value })}
                      placeholder={product?.maxStock?.toString() || "Illimité"}
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                      unités
                    </div>
                  </div>
                  <p className="text-xs text-gray-500">
                    Entrepôt: {product?.maxStock || "Non défini"}
                  </p>
                </div>
              </div>
            </div>

            {/* Aperçu de la marge */}
            {(priceFormData.prixVente && priceFormData.prixAchat) && (
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-900 pb-2 border-b">Aperçu de rentabilité</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Marge brute unitaire</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {(parseFloat(priceFormData.prixVente) - parseFloat(priceFormData.prixAchat)).toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-500">FCFA</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Taux de marge</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {((parseFloat(priceFormData.prixVente) - parseFloat(priceFormData.prixAchat)) / parseFloat(priceFormData.prixAchat) * 100).toFixed(1)}%
                    </p>
                    <p className="text-xs text-gray-500">sur coût d'achat</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer avec boutons */}
          <div className="border-t pt-4 pb-2 flex gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setEditPriceDialogOpen(false)
                setPriceFormData({
                  prixVente: "",
                  prixAchat: "",
                  minStock: "",
                  maxStock: "",
                })
              }}
              className="flex-1"
              disabled={savingPrice}
            >
              Annuler
            </Button>
            <Button
              onClick={handleSavePrice}
              className="flex-1"
              disabled={savingPrice}
            >
              {savingPrice ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enregistrement...
                </>
              ) : (
                "Enregistrer"
              )}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Dialog de modification */}
      {product && (
        <ProductFormDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          product={product}
          onSuccess={() => {
            loadProduct()
            onUpdated?.()
          }}
        />
      )}
    </>
  )
}
