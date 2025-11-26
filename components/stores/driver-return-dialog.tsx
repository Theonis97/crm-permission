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
import { Card, CardContent } from "@/components/ui/card"
import { Truck, Loader2, CheckCircle2, AlertCircle, Search, X, Package } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

interface DeliveryPerson {
  id: string
  name: string
  phone: string
  email: string
  status: string
  stockSummary: {
    totalItems: number
    totalValue: number
    totalProducts: number
  }
}

interface DriverStock {
  id: string
  productId: string
  variantId: string | null
  quantity: number
  reserved: number
  product: {
    id: string
    name: string
    sku: string | null
    prixVente: number
    photos: string[]
  }
  variant?: {
    id: string
    name: string
    sku: string | null
    prixVente: number
    attributes: any
    images: string[]
  }
}

interface ReturnItem {
  productId: string
  variantId: string | null
  productName: string
  sku: string | null
  availableQuantity: number
  returnQuantity: number
  returnNote: string
}

interface DriverReturnDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  storeId: string
  onSuccess?: () => void
}

export function DriverReturnDialog({
  open,
  onOpenChange,
  storeId,
  onSuccess,
}: DriverReturnDialogProps) {
  const [loading, setLoading] = useState(false)
  const [loadingDrivers, setLoadingDrivers] = useState(true)
  const [loadingStock, setLoadingStock] = useState(false)
  const [drivers, setDrivers] = useState<DeliveryPerson[]>([])
  const [driverStock, setDriverStock] = useState<DriverStock[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedDriverId, setSelectedDriverId] = useState<string>("")
  const [selectedDriver, setSelectedDriver] = useState<DeliveryPerson | null>(null)
  const [returnItems, setReturnItems] = useState<ReturnItem[]>([])
  const [generalNote, setGeneralNote] = useState("")
  const [currentStep, setCurrentStep] = useState(1)

  useEffect(() => {
    if (open) {
      loadDrivers()
      resetForm()
    }
  }, [open, storeId])

  useEffect(() => {
    if (selectedDriverId) {
      const driver = drivers.find(d => d.id === selectedDriverId)
      if (driver) {
        setSelectedDriver(driver)
        loadDriverStock(selectedDriverId)
        setCurrentStep(2)
      }
    }
  }, [selectedDriverId, drivers])

  const resetForm = () => {
    setSelectedDriverId("")
    setSelectedDriver(null)
    setDriverStock([])
    setReturnItems([])
    setGeneralNote("")
    setSearchQuery("")
    setCurrentStep(1)
  }

  const loadDrivers = async () => {
    try {
      setLoadingDrivers(true)
      const response = await fetch(`/api/delivery-persons?storeId=${storeId}`)
      if (!response.ok) throw new Error("Erreur lors du chargement")
      const data = await response.json()
      // Filtrer seulement les livreurs qui ont du stock
      const driversWithStock = data.filter((d: DeliveryPerson) => d.stockSummary.totalItems > 0)
      setDrivers(driversWithStock)
    } catch (error) {
      console.error("Error loading drivers:", error)
      toast.error("Erreur lors du chargement des livreurs")
    } finally {
      setLoadingDrivers(false)
    }
  }

  const loadDriverStock = async (driverId: string) => {
    try {
      setLoadingStock(true)
      const response = await fetch(`/api/delivery-persons/${driverId}/stock`)
      if (!response.ok) throw new Error("Erreur lors du chargement")
      const data = await response.json()
      // Filtrer seulement les produits avec stock > 0
      const stockWithQuantity = data.stock.filter((item: DriverStock) => item.quantity > 0)
      setDriverStock(stockWithQuantity)
      
      // Initialiser les items de retour
      setReturnItems(stockWithQuantity.map((item: DriverStock) => ({
        productId: item.productId,
        variantId: item.variantId,
        productName: item.product.name,
        sku: item.product.sku || item.variant?.sku,
        availableQuantity: item.quantity,
        returnQuantity: 0,
        returnNote: "",
      })))
    } catch (error) {
      console.error("Error loading driver stock:", error)
      toast.error("Erreur lors du chargement du stock du livreur")
    } finally {
      setLoadingStock(false)
    }
  }

  // Filtrer les livreurs selon la recherche
  const filteredDrivers = drivers.filter(driver => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      driver.name.toLowerCase().includes(query) ||
      driver.phone.toLowerCase().includes(query) ||
      driver.email.toLowerCase().includes(query)
    )
  })

  const handleUpdateReturnQuantity = (productId: string, variantId: string | null, quantity: number) => {
    setReturnItems(items =>
      items.map(item =>
        item.productId === productId && item.variantId === variantId
          ? { ...item, returnQuantity: Math.max(0, Math.min(quantity, item.availableQuantity)) }
          : item
      )
    )
  }

  const handleUpdateReturnNote = (productId: string, variantId: string | null, note: string) => {
    setReturnItems(items =>
      items.map(item =>
        item.productId === productId && item.variantId === variantId
          ? { ...item, returnNote: note }
          : item
      )
    )
  }

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        if (!selectedDriverId) {
          toast.error("Veuillez sélectionner un livreur")
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
      setSelectedDriverId("")
      setSelectedDriver(null)
      setDriverStock([])
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

      const response = await fetch(`/api/stores/${storeId}/driver-returns`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          driverId: selectedDriverId,
          generalNote,
          items: itemsToReturn.map(item => ({
            productId: item.productId,
            variantId: item.variantId,
            quantity: item.returnQuantity,
            note: item.returnNote || generalNote || `Retour du livreur ${selectedDriver?.name}`,
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
      console.error("Error creating driver return:", error)
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
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <Truck className="h-5 w-5 text-white" />
              </div>
              <div>
                <DialogTitle>Retour de produits - Livreur</DialogTitle>
                <DialogDescription>
                  Étape {currentStep}/3 : {
                    currentStep === 1 ? "Sélection du livreur" :
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
                    step === currentStep ? "bg-blue-600 text-white" :
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
          
          {/* Étape 1 : Sélection du livreur */}
          {currentStep === 1 && (
            <div className="max-w-4xl mx-auto space-y-6">
              <div className="text-center mb-8">
                <h3 className="text-lg font-semibold text-gray-900">Sélectionner un livreur</h3>
                <p className="text-sm text-gray-500 mt-1">Choisissez le livreur qui retourne des produits</p>
              </div>

              {/* Barre de recherche */}
              <div className="mb-6">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="Rechercher par nom, téléphone ou email..."
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
                    {filteredDrivers.length} résultat{filteredDrivers.length > 1 ? "s" : ""} trouvé{filteredDrivers.length > 1 ? "s" : ""}
                  </p>
                )}
              </div>

              {loadingDrivers ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                </div>
              ) : drivers.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
                  <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-sm text-gray-600">Aucun livreur avec du stock disponible</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Les retours ne peuvent être effectués que depuis des livreurs ayant du stock
                  </p>
                </div>
              ) : filteredDrivers.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
                  <Search className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-sm text-gray-600">Aucun livreur trouvé</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Essayez avec un autre terme de recherche
                  </p>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {filteredDrivers.map((driver) => (
                    <Card 
                      key={driver.id}
                      className={cn(
                        "cursor-pointer transition-all hover:shadow-md hover:border-blue-300",
                        selectedDriverId === driver.id && "ring-2 ring-blue-600 border-blue-600"
                      )}
                      onClick={() => setSelectedDriverId(driver.id)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                            <Truck className="h-5 w-5 text-blue-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-gray-900 truncate">{driver.name}</p>
                            <p className="text-xs text-gray-500 truncate">{driver.phone}</p>
                          </div>
                          {selectedDriverId === driver.id && (
                            <CheckCircle2 className="h-5 w-5 text-blue-600 flex-shrink-0" />
                          )}
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Produits:</span>
                            <span className="font-medium">{driver.stockSummary.totalProducts}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Articles:</span>
                            <span className="font-medium">{driver.stockSummary.totalItems}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Valeur:</span>
                            <span className="font-medium">{driver.stockSummary.totalValue.toLocaleString()} FCFA</span>
                          </div>
                        </div>
                        
                        <Badge 
                          className={cn(
                            "mt-3 w-full justify-center",
                            driver.status === "AVAILABLE" ? "bg-green-100 text-green-700" :
                            driver.status === "BUSY" ? "bg-orange-100 text-orange-700" :
                            "bg-gray-100 text-gray-700"
                          )}
                        >
                          {driver.status === "AVAILABLE" ? "Disponible" :
                           driver.status === "BUSY" ? "Occupé" : driver.status}
                        </Badge>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Étape 2 : Produits à retourner */}
          {currentStep === 2 && selectedDriver && (
            <div className="max-w-6xl mx-auto space-y-6">
              <div className="text-center mb-8">
                <h3 className="text-lg font-semibold text-gray-900">Produits à retourner</h3>
                <p className="text-sm text-gray-500 mt-1">
                  Livreur <span className="font-semibold">{selectedDriver.name}</span> • {driverStock.length} produit{driverStock.length > 1 ? "s" : ""} en stock
                </p>
              </div>

              {loadingStock ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                </div>
              ) : driverStock.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
                  <Package className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-sm text-gray-600">Aucun produit en stock</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Ce livreur n'a aucun produit à retourner
                  </p>
                </div>
              ) : (
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50">
                        <TableHead>Produit</TableHead>
                        <TableHead className="text-center">Stock disponible</TableHead>
                        <TableHead className="text-center">Qté à retourner</TableHead>
                        <TableHead>Note de retour</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {returnItems.map((item) => (
                        <TableRow key={`${item.productId}-${item.variantId}`}>
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
                              {item.availableQuantity}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center justify-center gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => handleUpdateReturnQuantity(item.productId, item.variantId, item.returnQuantity - 1)}
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
                                onClick={() => handleUpdateReturnQuantity(item.productId, item.variantId, item.returnQuantity + 1)}
                                disabled={item.returnQuantity >= item.availableQuantity}
                              >
                                +
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Textarea
                              placeholder="Note optionnelle pour ce produit..."
                              value={item.returnNote}
                              onChange={(e) => handleUpdateReturnNote(item.productId, item.variantId, e.target.value)}
                              rows={2}
                              className="min-w-[250px]"
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {/* Note générale */}
              <div className="space-y-2">
                <Label htmlFor="generalNote">Note générale sur le retour (optionnel)</Label>
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
          {currentStep === 3 && selectedDriver && (
            <div className="max-w-2xl mx-auto space-y-6">
              <div className="text-center mb-8">
                <h3 className="text-lg font-semibold text-gray-900">Confirmation du retour</h3>
                <p className="text-sm text-gray-500 mt-1">Vérifiez les informations avant de valider</p>
              </div>

              <div className="space-y-6">
                {/* Résumé livreur */}
                <Card>
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Livreur:</span>
                        <span className="font-medium">{selectedDriver.name}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Téléphone:</span>
                        <span className="font-medium">{selectedDriver.phone}</span>
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
                          <TableRow key={`${item.productId}-${item.variantId}`}>
                            <TableCell>
                              <div className="font-medium">{item.productName}</div>
                              {item.sku && (
                                <Badge variant="outline" className="text-xs mt-1">
                                  {item.sku}
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge className="bg-blue-100 text-blue-700">
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
                    disabled={loading || loadingDrivers || !selectedDriverId} 
                    className="w-full bg-blue-600 hover:bg-blue-700"
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
                    disabled={loading || loadingStock} 
                    className="w-full bg-blue-600 hover:bg-blue-700"
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
