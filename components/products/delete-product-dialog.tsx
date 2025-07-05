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
import { useToast } from "@/hooks/use-toast"
import type { Product } from "@/types/products"

interface DeleteProductDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  product: Product
  onProductDeleted: () => void
}

export function DeleteProductDialog({ open, onOpenChange, product, onProductDeleted }: DeleteProductDialogProps) {
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const handleDelete = async () => {
    setLoading(true)

    try {
      const response = await fetch(`/api/products/${product.id}`, {
        method: "DELETE",
      })

      if (response.ok) {
        toast({
          title: "Produit supprimé",
          description: "Le produit a été supprimé avec succès.",
        })
        onProductDeleted()
      } else {
        const error = await response.json()
        toast({
          title: "Erreur",
          description: error.error || "Une erreur est survenue lors de la suppression.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error deleting product:", error)
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de la suppression.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Supprimer le produit</DialogTitle>
          <DialogDescription>Êtes-vous sûr de vouloir supprimer le produit "{product.name}" ?</DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <p className="text-gray-600">
            Cette action est irréversible. Le produit sera définitivement supprimé de votre catalogue.
          </p>
          {product.stock > 0 && (
            <div className="mt-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
              <p className="text-orange-800 text-sm">⚠️ Ce produit a encore {product.stock} unités en stock.</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={loading}>
            {loading ? "Suppression..." : "Supprimer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
