"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
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
import { Card, CardContent } from "@/components/ui/card"
import { PackageX, Loader2, CheckCircle2, AlertCircle, Search, X } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

interface Order {
  id: string
  number: string
  customerName: string
  status: string
  items: OrderItem[]
  createdAt: string
}

interface OrderItem {
  id: string
  productId: string
  name: string
  quantity: number
  unitPrice: number
  total: number
  product: {
    id: string
    name: string
    sku: string | null
    photos: string[]
  }
}

interface ReturnItem {
  productId: string
  productName: string
  sku: string | null
  orderedQuantity: number
  returnQuantity: number
  returnNote: string
}

interface ReturnMovementDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  storeId: string
  onSuccess?: () => void
}

export function ReturnMovementDialog({
  open,
  onOpenChange,
  storeId,
  onSuccess,
}: ReturnMovementDialogProps) {
  const [loading, setLoading] = useState(false)
  const [loadingOrders, setLoadingOrders] = useState(true)
  const [orders, setOrders] = useState<Order[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedOrderId, setSelectedOrderId] = useState<string>("")
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [returnItems, setReturnItems] = useState<ReturnItem[]>([])
  const [generalNote, setGeneralNote] = useState("")
  const [currentStep, setCurrentStep] = useState(1)

  useEffect(() => {
    if (open) {
      loadOrders()
      resetForm()
    }
  }, [open, storeId])

  useEffect(() => {
    if (selectedOrderId) {
      const order = orders.find(o => o.id === selectedOrderId)
      if (order) {
        setSelectedOrder(order)
        // Initialiser les items de retour
        setReturnItems(order.items.map(item => ({
          productId: item.productId,
          productName: item.product.name,
          sku: item.product.sku,
          orderedQuantity: item.quantity,
          returnQuantity: 0,
          returnNote: "",
        })))
        setCurrentStep(2)
      }
    }
  }, [selectedOrderId, orders])

  const resetForm = () => {
    setSelectedOrderId("")
    setSelectedOrder(null)
    setReturnItems([])
    setGeneralNote("")
    setSearchQuery("")
    setCurrentStep(1)
  }

  // Filtrer les commandes selon la recherche
  const filteredOrders = orders.filter(order => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      order.customerName.toLowerCase().includes(query) ||
      order.number.toLowerCase().includes(query)
    )
  })

  // Grouper les commandes par client
  const groupedOrders = filteredOrders.reduce((acc, order) => {
    const client = order.customerName
    if (!acc[client]) {
      acc[client] = []
    }
    acc[client].push(order)
    return acc
  }, {} as Record<string, Order[]>)

  const loadOrders = async () => {
    try {
      setLoadingOrders(true)
      const response = await fetch(`/api/store-orders?storeId=${storeId}&status=DELIVERED`)
      if (!response.ok) throw new Error("Erreur lors du chargement")
      const data = await response.json()
      setOrders(data)
    } catch (error) {
      console.error("Error loading orders:", error)
      toast.error("Erreur lors du chargement des commandes")
    } finally {
      setLoadingOrders(false)
    }
  }

  const handleUpdateReturnQuantity = (productId: string, quantity: number) => {
    setReturnItems(items =>
      items.map(item =>
        item.productId === productId
          ? { ...item, returnQuantity: Math.max(0, Math.min(quantity, item.orderedQuantity)) }
          : item
      )
    )
  }

  const handleUpdateReturnNote = (productId: string, note: string) => {
    setReturnItems(items =>
      items.map(item =>
        item.productId === productId
          ? { ...item, returnNote: note }
          : item
      )
    )
  }

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        if (!selectedOrderId) {
          toast.error("Veuillez sélectionner une commande")
          return false
        }
        return true
      case 2:
        const hasReturns = returnItems.some(item => item.returnQuantity > 0)
        if (!hasReturns) {
          toast.error("Veuillez indiquer au moins une quantité à retourner")
          return false
        }
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
    if (currentStep === 2) {
      setSelectedOrderId("")
      setSelectedOrder(null)
    }
    setCurrentStep(currentStep - 1)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (currentStep < 3) {
      handleNextStep()
      return
    }

    if (!validateStep(2)) {
      return
    }

    setLoading(true)

    try {
      // Filtrer uniquement les produits avec une quantité de retour > 0
      const itemsToReturn = returnItems.filter(item => item.returnQuantity > 0)

      const response = await fetch(`/api/stores/${storeId}/returns`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: selectedOrderId,
          generalNote,
          items: itemsToReturn.map(item => ({
            productId: item.productId,
            quantity: item.returnQuantity,
            note: item.returnNote || generalNote || `Retour commande ${selectedOrder?.number}`,
          })),
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Erreur lors de l'enregistrement")
      }

      toast.success("Retour enregistré avec succès")
      onSuccess?.()
      onOpenChange(false)
      resetForm()
    } catch (error: any) {
      console.error("Error creating return:", error)
      toast.error(error.message || "Erreur lors de l'enregistrement du retour")
    } finally {
      setLoading(false)
    }
  }

  const itemsWithReturns = returnItems.filter(item => item.returnQuantity > 0)
  const totalReturnItems = itemsWithReturns.length
  const totalReturnQuantity = itemsWithReturns.reduce((sum, item) => sum + item.returnQuantity, 0)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="min-w-[900px] h-[95vh] p-0 flex flex-col gap-0">
        {/* Header fixe */}
        <DialogHeader className="px-6 py-4 border-b shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-600 rounded-lg flex items-center justify-center">
                <PackageX className="h-5 w-5 text-white" />
              </div>
              <div>
                <DialogTitle>Enregistrer un retour</DialogTitle>
                <DialogDescription>
                  Étape {currentStep}/3 : {
                    currentStep === 1 ? "Sélection de la commande" :
                    currentStep === 2 ? "Produits à retourner" : 
                    "Confirmation"
                  }
                </DialogDescription>
              </div>
            </div>
            {/* Indicateur d'étapes */}
            <div className="flex items-center gap-2">
              {[1, 2, 3].map((step, index) => (
                <div key={step} className="flex items-center gap-2">
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors",
                    step < currentStep ? "bg-green-500 text-white" :
                    step === currentStep ? "bg-amber-600 text-white" :
                    "bg-gray-300 text-gray-600"
                  )}>
                    {step < currentStep ? <CheckCircle2 className="h-5 w-5" /> : step}
                  </div>
                  {index < 2 && (
                    <div className={cn(
                      "w-8 h-0.5 transition-colors",
                      step < currentStep ? "bg-green-500" : "bg-gray-300"
                    )} />
                  )}
                </div>
              ))}
            </div>
          </div>
        </DialogHeader>

        {/* Contenu scrollable */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto px-6 py-6">
          
          {/* Étape 1 : Sélection de la commande */}
          {currentStep === 1 && (
            <div className="max-w-4xl mx-auto space-y-6">
              <div className="text-center mb-8">
                <h3 className="text-lg font-semibold text-gray-900">Sélectionner une commande</h3>
                <p className="text-sm text-gray-500 mt-1">Choisissez la commande concernée par le retour</p>
              </div>

              {/* Barre de recherche */}
              <div className="mb-6">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="Rechercher par nom de client ou numéro de commande..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 pr-10"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
                {searchQuery && (
                  <p className="text-xs text-gray-500 mt-2">
                    {filteredOrders.length} résultat{filteredOrders.length > 1 ? "s" : ""} trouvé{filteredOrders.length > 1 ? "s" : ""}
                  </p>
                )}
              </div>

              {loadingOrders ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                </div>
              ) : orders.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
                  <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-sm text-gray-600">Aucune commande disponible</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Les retours ne peuvent être effectués que sur des commandes livrées
                  </p>
                </div>
              ) : filteredOrders.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
                  <Search className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-sm text-gray-600">Aucune commande trouvée</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Essayez avec un autre terme de recherche
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {Object.entries(groupedOrders).map(([clientName, clientOrders]) => (
                    <div key={clientName} className="space-y-3">
                      {/* En-tête du client */}
                      <div className="flex items-center gap-2 px-2">
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                          <span className="text-sm font-semibold text-blue-700">
                            {clientName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                          </span>
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">{clientName}</p>
                          <p className="text-xs text-gray-500">
                            {clientOrders.length} commande{clientOrders.length > 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>

                      {/* Commandes du client */}
                      <div className="space-y-2 ml-6">
                        {clientOrders.map((order) => {
                          const statusColors = {
                            DELIVERED: "bg-green-100 text-green-700",
                            CANCELLED: "bg-red-100 text-red-700",
                          }
                          return (
                            <Card 
                              key={order.id}
                              className={cn(
                                "cursor-pointer transition-all hover:shadow-md hover:border-amber-300",
                                selectedOrderId === order.id && "ring-2 ring-amber-600 border-amber-600"
                              )}
                              onClick={() => setSelectedOrderId(order.id)}
                            >
                              <CardContent className="p-4">
                                <div className="flex items-center justify-between">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-3">
                                      <div className="font-semibold text-base">{order.number}</div>
                                      <Badge className={statusColors[order.status as keyof typeof statusColors] || "bg-gray-100 text-gray-700"}>
                                        {order.status === "DELIVERED" ? "Livrée" : 
                                         order.status === "CANCELLED" ? "Annulée" : order.status}
                                      </Badge>
                                    </div>
                                    <div className="text-sm text-gray-500 mt-2 flex items-center gap-3">
                                      <span>
                                        {order.items.length} produit{order.items.length > 1 ? "s" : ""}
                                      </span>
                                      <span>•</span>
                                      <span>
                                        {new Date(order.createdAt).toLocaleDateString("fr-FR", {
                                          day: "numeric",
                                          month: "short",
                                          year: "numeric"
                                        })}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {selectedOrderId === order.id && (
                                      <CheckCircle2 className="h-6 w-6 text-amber-600" />
                                    )}
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Étape 2 : Produits à retourner */}
          {currentStep === 2 && selectedOrder && (
            <div className="max-w-4xl mx-auto space-y-6">
              <div className="text-center mb-8">
                <h3 className="text-lg font-semibold text-gray-900">Produits à retourner</h3>
                <p className="text-sm text-gray-500 mt-1">
                  Commande <span className="font-semibold">{selectedOrder.number}</span> • {selectedOrder.customerName}
                </p>
              </div>

              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead>Produit</TableHead>
                      <TableHead className="text-center">Qté commandée</TableHead>
                      <TableHead className="text-center">Qté à retourner</TableHead>
                      <TableHead>Note de retour</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {returnItems.map((item) => (
                      <TableRow key={item.productId}>
                        <TableCell>
                          <div className="font-medium">{item.productName}</div>
                          {item.sku && (
                            <Badge variant="outline" className="text-xs mt-1">
                              {item.sku}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="font-semibold text-gray-700">
                            {item.orderedQuantity}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-center gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => handleUpdateReturnQuantity(item.productId, item.returnQuantity - 1)}
                              disabled={item.returnQuantity <= 0}
                            >
                              -
                            </Button>
                            <span className="w-12 text-center font-semibold">
                              {item.returnQuantity}
                            </span>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => handleUpdateReturnQuantity(item.productId, item.returnQuantity + 1)}
                              disabled={item.returnQuantity >= item.orderedQuantity}
                            >
                              +
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Textarea
                            placeholder="Note optionnelle pour ce produit..."
                            value={item.returnNote}
                            onChange={(e) => handleUpdateReturnNote(item.productId, e.target.value)}
                            rows={2}
                            className="min-w-[250px]"
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Note générale */}
              <div className="space-y-2">
                <Label htmlFor="generalNote">Note générale sur la commande (optionnel)</Label>
                <Textarea
                  id="generalNote"
                  value={generalNote}
                  onChange={(e) => setGeneralNote(e.target.value)}
                  placeholder="Ajoutez une note générale sur ce retour..."
                  rows={3}
                />
              </div>
            </div>
          )}

          {/* Étape 3 : Confirmation */}
          {currentStep === 3 && selectedOrder && (
            <div className="max-w-2xl mx-auto space-y-6">
              <div className="text-center mb-8">
                <h3 className="text-lg font-semibold text-gray-900">Confirmation du retour</h3>
                <p className="text-sm text-gray-500 mt-1">Vérifiez les informations avant de valider</p>
              </div>

              <div className="space-y-6">
                {/* Résumé commande */}
                <Card>
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Commande:</span>
                        <span className="font-medium">{selectedOrder.number}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Client:</span>
                        <span className="font-medium">{selectedOrder.customerName}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Produits à retourner:</span>
                        <span className="font-medium">{totalReturnItems}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Quantité totale:</span>
                        <span className="font-medium">{totalReturnQuantity}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Détail des retours */}
                <div>
                  <Label className="mb-3 block">Détail des retours</Label>
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gray-50">
                          <TableHead>Produit</TableHead>
                          <TableHead className="text-center">Quantité</TableHead>
                          <TableHead>Note</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {itemsWithReturns.map((item) => (
                          <TableRow key={item.productId}>
                            <TableCell>
                              <div className="font-medium">{item.productName}</div>
                              {item.sku && (
                                <Badge variant="outline" className="text-xs mt-1">
                                  {item.sku}
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge className="bg-amber-100 text-amber-700">
                                {item.returnQuantity}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm text-gray-600">
                              {item.returnNote || generalNote || "-"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                {generalNote && (
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <Label className="text-sm font-medium text-blue-900 mb-2 block">Note générale</Label>
                    <p className="text-sm text-blue-800">{generalNote}</p>
                  </div>
                )}
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
                  <Button 
                    type="button" 
                    onClick={handleNextStep}
                    disabled={loading || loadingOrders || !selectedOrderId} 
                    className="w-full bg-amber-600 hover:bg-amber-700"
                  >
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
                  <Button 
                    type="submit" 
                    disabled={loading || loadingOrders} 
                    className="w-full bg-amber-600 hover:bg-amber-700"
                  >
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {currentStep === 3 ? "Enregistrer le retour" : "Suivant"}
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
