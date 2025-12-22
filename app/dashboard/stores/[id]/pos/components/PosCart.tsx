import { 
  Settings, 
  ShoppingCart, 
  Package, 
  Minus, 
  Plus, 
  Trash2 
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import { CartItem } from "../types"
import { ChangeCalculator } from "./ChangeCalculator"

interface PosCartProps {
  cart: CartItem[]
  storeId: string
  setShowPrinterSettings: (show: boolean) => void
  cartItemsCount: number
  updateItemDiscountAmount: (productId: string, discount: number) => void
  updateQuantity: (productId: string, quantity: number) => void
  removeFromCart: (productId: string) => void
  cartTotal: number
  cartSubtotal: number
  globalDiscountApplied: number
  setIsCheckoutOpen: (open: boolean) => void
}

export function PosCart({
  cart,
  storeId,
  setShowPrinterSettings,
  cartItemsCount,
  updateItemDiscountAmount,
  updateQuantity,
  removeFromCart,
  cartTotal,
  cartSubtotal,
  globalDiscountApplied,
  setIsCheckoutOpen
}: PosCartProps) {
  return (
    <div className="w-92 bg-white border-l flex flex-col h-full">
      {/* Header Panier */}
      <div className="p-3 border-b">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-gray-900">Panier</h3>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowPrinterSettings(true)}
              className="h-7 w-7 p-0"
              title="Configuration d'imprimante"
            >
              <Settings className="h-3 w-3" />
            </Button>
            <Badge variant="outline">{cartItemsCount} article{cartItemsCount > 1 ? 's' : ''}</Badge>
          </div>
        </div>
      </div>

      {/* Items du Panier */}
      <div className="flex-1 overflow-y-auto">
        {cart.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500">
            <div className="text-center">
              <ShoppingCart className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p className="text-sm">Panier vide</p>
              <p className="text-xs mt-1">Ajoutez des produits</p>
            </div>
          </div>
        ) : (
          <div className="p-3 space-y-2">
            {cart.map((item) => (
              <div key={item.product.id} className="flex items-start gap-2 p-2 bg-gray-50 rounded-lg">
                {item.product.photos && item.product.photos.length > 0 ? (
                  <img
                    src={item.product.photos[0]}
                    alt={item.product.name}
                    className="w-10 h-10 object-contain bg-white rounded"
                  />
                ) : (
                  <div className="w-10 h-10 bg-white rounded flex items-center justify-center">
                    <Package className="h-5 w-5 text-gray-300" />
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-xs text-gray-900 truncate">
                    {item.product.name}
                  </h4>
                  <div className="text-xs text-gray-500">
                    {item.product.prixVente} F x {item.quantity}
                  </div>

                  {/* Réduction par article - uniquement montant fixe */}
                  <div className="flex gap-1 mt-1">
                    <Input
                      type="number"
                      placeholder="Remise FCFA"
                      value={item.discountAmount || ''}
                      onChange={(e) => updateItemDiscountAmount(item.product.id, Number(e.target.value))}
                      className="h-7 text-xs w-24"
                      min="0"
                    />
                  </div>

                  <div className="flex items-center gap-1 mt-4">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        updateQuantity(item.product.id, item.quantity - 1)
                      }}
                      className="w-5 h-5 bg-white border rounded flex items-center justify-center hover:bg-gray-50"
                    >
                      <Minus className="h-2 w-2" />
                    </button>

                    <span className="w-6 text-center text-xs font-medium">
                      {item.quantity}
                    </span>

                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        updateQuantity(item.product.id, item.quantity + 1)
                      }}
                      disabled={item.quantity >= item.product.stock}
                      className="w-5 h-5 bg-blue-500 text-white rounded flex items-center justify-center hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Plus className="h-2 w-2" />
                    </button>
                  </div>
                </div>

                <div className="text-right">
                  <div className="space-y-1">
                    {/* Prix original */}
                    <div className={cn(
                      "text-xs",
                      (item.discount || item.discountAmount) ? "line-through text-gray-400" : "font-bold text-gray-900"
                    )}>
                      {(item.product.prixVente * item.quantity).toLocaleString()} F
                    </div>

                    {/* Prix avec réduction */}
                    {(item.discount || item.discountAmount) && (
                      <div className="font-bold text-sm text-green-600">
                        {(() => {
                          const originalTotal = item.product.prixVente * item.quantity
                          let discountedTotal = originalTotal
                          if (item.discount && item.discount > 0) {
                            discountedTotal = originalTotal * (1 - item.discount / 100)
                          } else if (item.discountAmount && item.discountAmount > 0) {
                            discountedTotal = Math.max(0, originalTotal - item.discountAmount)
                          }
                          return discountedTotal.toLocaleString()
                        })()} F
                      </div>
                    )}
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      removeFromCart(item.product.id)
                    }}
                    className="text-red-500 hover:text-red-600 mt-1"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer Panier - Total */}
      {cart.length > 0 && (
        <div className="border-t p-3 space-y-3">
          {/* Calculateur de monnaie (Remplace la remise globale) */}
          <ChangeCalculator totalToPay={cartTotal} />

          <Separator />

          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Sous-total</span>
              <span className="font-medium">{cartSubtotal.toLocaleString()} F</span>
            </div>

            {/* Afficher la remise globale si applicable */}
            {globalDiscountApplied > 0 && (
              <div className="flex justify-between text-red-600">
                <span>Remise globale</span>
                <span>-{globalDiscountApplied.toLocaleString()} F</span>
              </div>
            )}

            <Separator />
            <div className="flex justify-between text-lg font-bold pt-1">
              <span>Total</span>
              <span className="text-blue-600">{cartTotal.toLocaleString()} F</span>
            </div>
          </div>

          {/* Boutons d'action */}
          <div className="space-y-2">
            {/* Bouton de validation */}
            <Button
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              size="lg"
              onClick={() => setIsCheckoutOpen(true)}
            >
              <ShoppingCart className="h-4 w-4 mr-2" />
              Valider la commande
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
