# Exemples d'Intégration du Système de Stock des Livreurs

Ce document fournit des exemples concrets d'intégration du système de stock des livreurs dans votre code existant.

## 1. Création d'une Commande avec Validation du Stock

### Dans votre API de création de commande (`/api/stores/[id]/orders` ou similaire)

```typescript
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { 
  validateDeliveryPersonStock, 
  reserveDeliveryPersonStock 
} from "@/lib/delivery-stock-validator"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      storeId, 
      deliveryPersonId, 
      customerName, 
      items, // [{ productId, variantId?, quantity }]
      // ... autres champs
    } = body

    // 1. Valider le stock du livreur
    if (deliveryPersonId) {
      const stockValidation = await validateDeliveryPersonStock(
        deliveryPersonId,
        items
      )

      if (!stockValidation.valid) {
        return NextResponse.json({
          error: stockValidation.message,
          insufficientItems: stockValidation.insufficientItems,
        }, { status: 400 })
      }
    }

    // 2. Créer la commande dans une transaction
    const order = await prisma.$transaction(async (tx) => {
      // Créer la commande
      const newOrder = await tx.storeOrder.create({
        data: {
          storeId,
          deliveryPersonId,
          customerName,
          status: "PENDING",
          // ... autres champs
        },
      })

      // Créer les items de la commande
      for (const item of items) {
        await tx.storeOrderItem.create({
          data: {
            storeOrderId: newOrder.id,
            productId: item.productId,
            variantId: item.variantId,
            quantity: item.quantity,
            // ... autres champs
          },
        })
      }

      // 3. Réserver le stock du livreur
      if (deliveryPersonId) {
        await reserveDeliveryPersonStock(deliveryPersonId, items)
      }

      return newOrder
    })

    return NextResponse.json(order)
  } catch (error) {
    console.error("[CREATE_ORDER]", error)
    return NextResponse.json(
      { error: "Erreur lors de la création de la commande" },
      { status: 500 }
    )
  }
}
```

## 2. Annulation d'une Commande

### Libérer le stock réservé

```typescript
import { releaseDeliveryPersonStock } from "@/lib/delivery-stock-validator"

export async function cancelOrder(orderId: string, userId: string) {
  try {
    const order = await prisma.storeOrder.findUnique({
      where: { id: orderId },
      include: {
        items: {
          select: {
            productId: true,
            variantId: true,
            quantity: true,
          },
        },
      },
    })

    if (!order) {
      throw new Error("Commande non trouvée")
    }

    await prisma.$transaction(async (tx) => {
      // 1. Mettre à jour le statut de la commande
      await tx.storeOrder.update({
        where: { id: orderId },
        data: {
          status: "CANCELLED",
          cancelReason: "Annulée par l'utilisateur",
        },
      })

      // 2. Libérer le stock réservé du livreur
      if (order.deliveryPersonId) {
        await releaseDeliveryPersonStock(order.deliveryPersonId, order.items)
      }
    })

    return { success: true, message: "Commande annulée avec succès" }
  } catch (error) {
    console.error("[CANCEL_ORDER]", error)
    throw error
  }
}
```

## 3. Confirmation de Livraison

### Consommer le stock du livreur

```typescript
import { consumeDeliveryPersonStock } from "@/lib/delivery-stock-validator"

export async function completeDelivery(
  orderId: string,
  deliveryPersonId: string,
  userId: string
) {
  try {
    const order = await prisma.storeOrder.findUnique({
      where: { id: orderId },
      include: {
        items: {
          select: {
            productId: true,
            variantId: true,
            quantity: true,
          },
        },
      },
    })

    if (!order) {
      throw new Error("Commande non trouvée")
    }

    await prisma.$transaction(async (tx) => {
      // 1. Mettre à jour le statut de la commande
      await tx.storeOrder.update({
        where: { id: orderId },
        data: {
          status: "DELIVERED",
          deliveredAt: new Date(),
        },
      })

      // 2. Consommer le stock du livreur
      // Cela va :
      // - Réduire la quantité totale
      // - Réduire la quantité réservée
      // - Créer un mouvement de type SALE
      await consumeDeliveryPersonStock(
        deliveryPersonId,
        orderId,
        order.items,
        userId
      )
    })

    return { success: true, message: "Livraison confirmée" }
  } catch (error) {
    console.error("[COMPLETE_DELIVERY]", error)
    throw error
  }
}
```

## 4. Affichage du Stock Disponible lors de l'Attribution

### Dans votre composant React

```typescript
"use client"

import { useState, useEffect } from "react"
import { getDeliveryPersonAvailableStock } from "@/lib/delivery-stock-validator"

export function OrderAssignmentDialog({ orderId, orderItems }) {
  const [deliveryPersons, setDeliveryPersons] = useState([])
  const [selectedDelivery, setSelectedDelivery] = useState(null)
  const [stockCheck, setStockCheck] = useState(null)

  // Vérifier le stock quand un livreur est sélectionné
  const handleDeliverySelection = async (deliveryPersonId: string) => {
    setSelectedDelivery(deliveryPersonId)
    
    try {
      const response = await fetch(`/api/delivery-persons/${deliveryPersonId}/stock/check`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: orderItems }),
      })
      
      const data = await response.json()
      setStockCheck(data)
      
      if (!data.valid) {
        toast.warning("Stock insuffisant pour certains produits")
      }
    } catch (error) {
      console.error(error)
      toast.error("Erreur lors de la vérification du stock")
    }
  }

  return (
    <Dialog>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Attribuer la commande à un livreur</DialogTitle>
        </DialogHeader>

        <Select onValueChange={handleDeliverySelection}>
          <SelectTrigger>
            <SelectValue placeholder="Sélectionner un livreur" />
          </SelectTrigger>
          <SelectContent>
            {deliveryPersons.map((dp) => (
              <SelectItem key={dp.id} value={dp.id}>
                {dp.name} - {dp.zone}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Affichage du résultat de validation */}
        {stockCheck && !stockCheck.valid && (
          <Alert variant="destructive">
            <AlertTitle>Stock insuffisant</AlertTitle>
            <AlertDescription>
              <ul>
                {stockCheck.insufficientItems?.map((item) => (
                  <li key={item.productId}>
                    {item.productName}: 
                    Requis: {item.required}, 
                    Disponible: {item.available}, 
                    Manque: {item.missing}
                  </li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        <DialogFooter>
          <Button 
            onClick={handleAssignOrder}
            disabled={!selectedDelivery || (stockCheck && !stockCheck.valid)}
          >
            Attribuer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

## 5. Endpoint de Vérification du Stock (API)

### `/api/delivery-persons/[id]/stock/check`

```typescript
import { NextRequest, NextResponse } from "next/server"
import { validateDeliveryPersonStock } from "@/lib/delivery-stock-validator"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { items } = body

    const validation = await validateDeliveryPersonStock(id, items)

    return NextResponse.json(validation)
  } catch (error) {
    console.error("[CHECK_DELIVERY_STOCK]", error)
    return NextResponse.json(
      { error: "Erreur lors de la vérification du stock" },
      { status: 500 }
    )
  }
}
```

## 6. Widget de Stock du Livreur

### Composant réutilisable pour afficher le stock

```typescript
"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Package, TrendingUp } from "lucide-react"

interface DeliveryStockWidgetProps {
  deliveryPersonId: string
}

export function DeliveryStockWidget({ deliveryPersonId }: DeliveryStockWidgetProps) {
  const [summary, setSummary] = useState({
    totalItems: 0,
    totalValue: 0,
    totalProducts: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStockSummary()
  }, [deliveryPersonId])

  const fetchStockSummary = async () => {
    try {
      const response = await fetch(`/api/delivery-persons/${deliveryPersonId}/stock`)
      if (response.ok) {
        const data = await response.json()
        setSummary(data.summary)
      }
    } catch (error) {
      console.error("Error fetching stock:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div>Chargement...</div>
  }

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Articles</CardTitle>
          <Package className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{summary.totalItems}</div>
          <p className="text-xs text-muted-foreground">
            {summary.totalProducts} produits
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Valeur</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {(summary.totalValue / 1000).toFixed(0)}k FCFA
          </div>
          <p className="text-xs text-muted-foreground">Stock total</p>
        </CardContent>
      </Card>
    </div>
  )
}
```

## 7. Hook Personnalisé pour la Gestion du Stock

```typescript
import { useState, useCallback } from "react"
import { toast } from "sonner"

export function useDeliveryStock(deliveryPersonId: string) {
  const [stock, setStock] = useState([])
  const [loading, setLoading] = useState(false)

  const fetchStock = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/delivery-persons/${deliveryPersonId}/stock`)
      if (response.ok) {
        const data = await response.json()
        setStock(data.stock)
      }
    } catch (error) {
      console.error("Error fetching stock:", error)
      toast.error("Erreur lors du chargement du stock")
    } finally {
      setLoading(false)
    }
  }, [deliveryPersonId])

  const addStock = useCallback(async (productId: string, quantity: number, notes?: string) => {
    try {
      const response = await fetch(`/api/delivery-persons/${deliveryPersonId}/stock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, quantity, notes }),
      })

      if (response.ok) {
        toast.success("Stock ajouté avec succès")
        await fetchStock() // Rafraîchir
        return true
      } else {
        const error = await response.json()
        toast.error(error.error || "Erreur")
        return false
      }
    } catch (error) {
      console.error("Error adding stock:", error)
      toast.error("Erreur lors de l'ajout du stock")
      return false
    }
  }, [deliveryPersonId, fetchStock])

  const returnStock = useCallback(async (
    productId: string, 
    quantity: number, 
    notes?: string
  ) => {
    try {
      const response = await fetch(`/api/delivery-persons/${deliveryPersonId}/stock/movements`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          productId, 
          type: "RETURN", 
          quantity, 
          notes 
        }),
      })

      if (response.ok) {
        toast.success("Retour enregistré avec succès")
        await fetchStock()
        return true
      } else {
        const error = await response.json()
        toast.error(error.error || "Erreur")
        return false
      }
    } catch (error) {
      console.error("Error returning stock:", error)
      toast.error("Erreur lors du retour")
      return false
    }
  }, [deliveryPersonId, fetchStock])

  return {
    stock,
    loading,
    fetchStock,
    addStock,
    returnStock,
  }
}

// Utilisation dans un composant
function DeliveryStockManager({ deliveryPersonId }) {
  const { stock, loading, fetchStock, addStock, returnStock } = useDeliveryStock(deliveryPersonId)

  useEffect(() => {
    fetchStock()
  }, [fetchStock])

  // ... reste du composant
}
```

## 8. Middleware de Validation (Optionnel)

### Pour automatiser la validation sur toutes les commandes

```typescript
// lib/middleware/validate-delivery-stock.ts
import { NextRequest, NextResponse } from "next/server"
import { validateDeliveryPersonStock } from "@/lib/delivery-stock-validator"

export async function validateDeliveryStockMiddleware(
  request: NextRequest,
  context: any
) {
  const body = await request.json()
  
  if (body.deliveryPersonId && body.items) {
    const validation = await validateDeliveryPersonStock(
      body.deliveryPersonId,
      body.items
    )
    
    if (!validation.valid) {
      return NextResponse.json({
        error: validation.message,
        insufficientItems: validation.insufficientItems,
      }, { status: 400 })
    }
  }
  
  // Continuer vers le handler
  return null
}
```

## Résumé des Points Clés

1. **Toujours valider** le stock avant d'attribuer une commande
2. **Réserver** le stock dès l'attribution
3. **Libérer** le stock en cas d'annulation
4. **Consommer** le stock après livraison
5. **Tracer** tous les mouvements pour l'audit
6. **Afficher** le stock disponible de manière claire à l'utilisateur

Ces exemples couvrent les cas d'usage principaux et peuvent être adaptés selon vos besoins spécifiques.
