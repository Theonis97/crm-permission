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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Package,
  TrendingUp,
  TrendingDown,
  Edit,
  Plus,
  Loader2,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  Box,
  DollarSign,
  BarChart3,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "@/lib/app-toast"
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"
import { ProductFormDialog } from "@/components/products/product-form-dialog"

interface ProductDetailsSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  productId: string | null
  onUpdated?: () => void
}

export function ProductDetailsSheet({
  open,
  onOpenChange,
  productId,
  onUpdated,
}: ProductDetailsSheetProps) {
  const [product, setProduct] = useState<any>(null)
  const [movements, setMovements] = useState<any[]>([])
  const [salesData, setSalesData] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingMovements, setLoadingMovements] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [supplyDialogOpen, setSupplyDialogOpen] = useState(false)
  const [supplyQuantity, setSupplyQuantity] = useState("")
  const [supplyNote, setSupplyNote] = useState("")
  const [supplying, setSupplying] = useState(false)

  useEffect(() => {
    if (open && productId) {
      loadProduct()
      loadMovements()
      loadSalesData()
    } else {
      setProduct(null)
      setMovements([])
      setSalesData([])
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
      setProduct(data)
    } catch (error) {
      console.error("Error loading product:", error)
      toast.error("Erreur lors du chargement du produit")
    } finally {
      setLoading(false)
    }
  }

  const loadMovements = async () => {
    if (!productId) return

    try {
      setLoadingMovements(true)
      const response = await fetch(`/api/stock-movements?productId=${productId}&limit=20`)
      
      if (!response.ok) {
        throw new Error("Erreur lors du chargement")
      }

      const data = await response.json()
      setMovements(data.movements || [])
    } catch (error) {
      console.error("Error loading movements:", error)
    } finally {
      setLoadingMovements(false)
    }
  }

  const loadSalesData = async () => {
    if (!productId) return

    try {
      // Récupérer les mouvements de type SALE/EXIT pour générer les statistiques de vente
      const response = await fetch(`/api/stock-movements?productId=${productId}&type=EXIT&limit=1000`)
      
      if (!response.ok) return

      const data = await response.json()
      const salesMovements = data.movements || []

      // Grouper par mois
      const monthlyData: { [key: string]: number } = {}
      
      salesMovements.forEach((movement: any) => {
        const date = new Date(movement.createdAt)
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
        const monthLabel = date.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })
        
        if (!monthlyData[monthKey]) {
          monthlyData[monthKey] = 0
        }
        // Les sorties sont négatives, on prend la valeur absolue
        monthlyData[monthKey] += Math.abs(movement.quantity)
      })

      // Convertir en tableau et trier par date
      const chartData = Object.entries(monthlyData)
        .map(([key, value]) => {
          const [year, month] = key.split('-')
          const date = new Date(parseInt(year), parseInt(month) - 1)
          return {
            month: date.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' }),
            ventes: value,
            sortKey: key,
          }
        })
        .sort((a, b) => a.sortKey.localeCompare(b.sortKey))
        .slice(-6) // Les 6 derniers mois

      setSalesData(chartData)
    } catch (error) {
      console.error("Error loading sales data:", error)
    }
  }

  const handleSupply = async () => {
    if (!productId || !supplyQuantity) {
      toast.error("Veuillez saisir une quantité")
      return
    }

    const quantity = parseInt(supplyQuantity)
    if (isNaN(quantity) || quantity <= 0) {
      toast.error("Quantité invalide")
      return
    }

    try {
      setSupplying(true)
      const response = await fetch("/api/stock-movements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId,
          quantity,
          type: "ENTRY",
          note: supplyNote || "Approvisionnement manuel",
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Erreur lors de l'approvisionnement")
      }

      toast.success(`Stock approvisionné de ${quantity} unité(s)`)
      setSupplyDialogOpen(false)
      setSupplyQuantity("")
      setSupplyNote("")
      await loadProduct()
      await loadMovements()
      await loadSalesData()
      onUpdated?.()
    } catch (error: any) {
      console.error("Error supplying stock:", error)
      toast.error(error.message || "Erreur lors de l'approvisionnement")
    } finally {
      setSupplying(false)
    }
  }

  const getMovementIcon = (type: string) => {
    switch (type) {
      case "ENTRY":
      case "RETURN":
        return ArrowDownRight
      case "SALE":
      case "EXIT":
        return ArrowUpRight
      default:
        return Package
    }
  }

  const getMovementColor = (type: string) => {
    switch (type) {
      case "ENTRY":
      case "RETURN":
        return "text-green-600 bg-green-50 border-green-200"
      case "SALE":
      case "EXIT":
        return "text-red-600 bg-red-50 border-red-200"
      default:
        return "text-amber-600 bg-amber-50 border-amber-200"
    }
  }

  const getMovementLabel = (type: string) => {
    const labels: { [key: string]: string } = {
      ENTRY: "Entrée",
      EXIT: "Sortie",
      SALE: "Vente",
      RETURN: "Retour",
      ADJUSTMENT: "Ajustement",
    }
    return labels[type] || type
  }

  const formatDateTime = (date: string) => {
    return new Date(date).toLocaleString("fr-FR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const getStockStatus = () => {
    if (!product) return null
    if (product.stock === 0) return { label: "Rupture", color: "bg-red-50 text-red-700 border-red-200" }
    if (product.stock <= product.minStock) return { label: "Stock faible", color: "bg-amber-50 text-amber-700 border-amber-200" }
    if (product.maxStock && product.stock >= product.maxStock) return { label: "Surstock", color: "bg-blue-50 text-blue-700 border-blue-200" }
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
                      <span>Stock actuel</span>
                    </div>
                    <div className="text-xl font-bold text-gray-900">{product.stock}</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-gray-600 text-xs mb-1">
                      <DollarSign className="h-3.5 w-3.5" />
                      <span>Prix vente</span>
                    </div>
                    <div className="text-xl font-bold text-gray-900">
                      {product.prixVente.toLocaleString("fr-FR")} XAF
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-gray-600 text-xs mb-1">
                      <TrendingDown className="h-3.5 w-3.5" />
                      <span>Stock min</span>
                    </div>
                    <div className="text-xl font-bold text-gray-900">{product.minStock}</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-gray-600 text-xs mb-1">
                      <TrendingUp className="h-3.5 w-3.5" />
                      <span>Stock max</span>
                    </div>
                    <div className="text-xl font-bold text-gray-900">
                      {product.maxStock || "—"}
                    </div>
                  </div>
                </div>
              </div>

              {/* Contenu scrollable */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Graphique des ventes */}
                <div className="bg-white border rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-4">
                    <BarChart3 className="h-5 w-5 text-blue-600" />
                    <h3 className="font-semibold text-gray-900">Ventes des 6 derniers mois</h3>
                  </div>
                  {salesData.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 text-sm">
                      Aucune donnée de vente disponible
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={salesData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" fontSize={12} />
                        <YAxis fontSize={12} />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="ventes" fill="#1e3a8a" name="Quantité vendue" />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>

                {/* Historique des mouvements */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-blue-600" />
                    Historique des mouvements (20 derniers)
                  </h3>
                  {loadingMovements ? (
                    <div className="text-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-blue-600 mx-auto" />
                    </div>
                  ) : movements.length === 0 ? (
                    <div className="text-center py-8 border rounded-lg bg-gray-50">
                      <p className="text-sm text-gray-500">Aucun mouvement enregistré</p>
                    </div>
                  ) : (
                    <div className="border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-gray-50">
                            <TableHead className="font-semibold">Type</TableHead>
                            <TableHead className="text-center font-semibold">Quantité</TableHead>
                            <TableHead className="font-semibold">Utilisateur</TableHead>
                            <TableHead className="font-semibold">Date</TableHead>
                            <TableHead className="font-semibold">Note</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {movements.map((movement) => {
                            const Icon = getMovementIcon(movement.type)
                            return (
                              <TableRow key={movement.id}>
                                <TableCell>
                                  <div className={cn("inline-flex items-center gap-2 px-2.5 py-1 rounded-md border text-xs font-medium", getMovementColor(movement.type))}>
                                    <Icon className="h-3.5 w-3.5" />
                                    {getMovementLabel(movement.type)}
                                  </div>
                                </TableCell>
                                <TableCell className="text-center">
                                  <span
                                    className={cn(
                                      "font-bold text-sm",
                                      movement.quantity > 0 ? "text-green-600" : "text-red-600"
                                    )}
                                  >
                                    {movement.quantity > 0 ? "+" : ""}
                                    {movement.quantity}
                                  </span>
                                </TableCell>
                                <TableCell className="text-sm">
                                  {movement.user?.firstName && movement.user?.lastName
                                    ? `${movement.user.firstName} ${movement.user.lastName}`
                                    : movement.user?.email}
                                </TableCell>
                                <TableCell className="text-sm text-gray-600">
                                  {formatDateTime(movement.createdAt)}
                                </TableCell>
                                <TableCell className="text-sm text-gray-600">
                                  {movement.note || "—"}
                                </TableCell>
                              </TableRow>
                            )
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>
              </div>

              {/* Footer fixe avec boutons d'action */}
              <div className="shrink-0 border-t bg-white p-6">
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setSupplyDialogOpen(true)}
                    className="flex-1"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Approvisionner
                  </Button>
                  <Button
                    onClick={() => setEditDialogOpen(true)}
                    className="flex-1"
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Modifier le produit
                  </Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Dialog d'approvisionnement */}
      <Sheet open={supplyDialogOpen} onOpenChange={setSupplyDialogOpen}>
        <SheetContent className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Approvisionner le stock</SheetTitle>
            <SheetDescription>
              Ajouter des unités au stock de {product?.name}
            </SheetDescription>
          </SheetHeader>

          <div className="py-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantité à ajouter <span className="text-red-500">*</span></Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                value={supplyQuantity}
                onChange={(e) => setSupplyQuantity(e.target.value)}
                placeholder="Ex: 50"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="note">Note (optionnel)</Label>
              <Input
                id="note"
                value={supplyNote}
                onChange={(e) => setSupplyNote(e.target.value)}
                placeholder="Ex: Réception fournisseur..."
              />
            </div>

            {product && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="text-sm text-blue-900">
                  <div className="flex justify-between mb-1">
                    <span>Stock actuel :</span>
                    <span className="font-semibold">{product.stock}</span>
                  </div>
                  {supplyQuantity && !isNaN(parseInt(supplyQuantity)) && (
                    <div className="flex justify-between border-t border-blue-200 pt-1 mt-1">
                      <span>Nouveau stock :</span>
                      <span className="font-semibold text-green-700">
                        {product.stock + parseInt(supplyQuantity)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setSupplyDialogOpen(false)}
              className="flex-1"
              disabled={supplying}
            >
              Annuler
            </Button>
            <Button
              onClick={handleSupply}
              className="flex-1"
              disabled={supplying || !supplyQuantity}
            >
              {supplying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirmer
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
