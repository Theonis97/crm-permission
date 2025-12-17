"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useRouter } from "next/navigation"

export function BarcodePrintDialog({
  open,
  onOpenChange,
  product,
  storeId,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  product: {
    id: string
    name: string
    sku: string | null
  }
  storeId: string
}) {
  const [quantity, setQuantity] = useState<number>(1)
  const router = useRouter()

  const handlePrint = () => {
    if (quantity < 1) {
      return
    }
    
    // Rediriger vers la page d'impression avec les paramètres nécessaires
    router.push(`/dashboard/stores/${storeId}/products/${product.id}/barcode?quantity=${quantity}`)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Imprimer des codes-barres</DialogTitle>
          <DialogDescription>
            Spécifiez le nombre de codes-barres à imprimer pour {product.name}
            {product.sku ? ` (${product.sku})` : ''}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="quantity" className="text-right">
              Quantité
            </Label>
            <Input
              id="quantity"
              type="number"
              min="1"
              max="100"
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
              className="col-span-3"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={handlePrint}>
            Imprimer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
