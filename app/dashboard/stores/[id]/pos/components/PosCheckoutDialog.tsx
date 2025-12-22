import { 
  User, 
  Banknote, 
  Smartphone, 
  Phone, 
  Loader2, 
  Clock, 
  XCircle, 
  CheckCircle2, 
  ShoppingCart,
  MapPin,
  Truck,
  Calendar
} from "lucide-react"
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import { useState, useRef, useEffect } from "react"
import { toast } from "sonner"
import { CartItem, DeliveryPerson } from "../types"

interface PosCheckoutDialogProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  step: number
  setStep: (step: number) => void
  orderType: "CLIENT_DELIVERY" | "CLIENT_STORE" | "DRIVER"
  setOrderType: (type: "CLIENT_DELIVERY" | "CLIENT_STORE" | "DRIVER") => void
  
  // Client Data
  contacts: any[]
  contactSearch: string
  setContactSearch: (value: string) => void
  handleSelectContact: (contact: any) => void
  customerFirstName: string
  setCustomerFirstName: (value: string) => void
  customerLastName: string
  setCustomerLastName: (value: string) => void
  customerPhone: string
  setCustomerPhone: (value: string) => void
  customerEmail: string
  setCustomerEmail: (value: string) => void
  
  // Delivery Data
  deliveryAddress: string
  setDeliveryAddress: (value: string) => void
  addressSuggestions: any[]
  showAddressSuggestions: boolean
  handleAddressSearch: (query: string) => void
  handleSelectAddress: (suggestion: any) => void
  loadingAddresses: boolean
  deliveryFee: number
  selectedDeliveryPerson: string
  setSelectedDeliveryPerson: (value: string) => void
  deliveryPersons: DeliveryPerson[]
  requestedDeliveryDate: string
  setRequestedDeliveryDate: (value: string) => void
  
  // Cart Data
  cart: CartItem[]
  cartTotal: number
  cartSubtotal: number
  cartTax: number
  globalDiscountApplied: number
  cartItemsCount: number
  
  // Payment Data
  posPaymentMethod: "ESPECE" | "MOBILE"
  setPosPaymentMethod: (method: "ESPECE" | "MOBILE") => void
  
  // Actions
  handleCreateOrder: () => void
  onMobilePaymentSuccess: (reference: string, phone: string) => void
  isSubmitting: boolean
  storeId: string
  resetForm: () => void
}

export function PosCheckoutDialog({
  isOpen,
  onOpenChange,
  step,
  setStep,
  orderType,
  setOrderType,
  contacts,
  contactSearch,
  setContactSearch,
  handleSelectContact,
  customerFirstName,
  setCustomerFirstName,
  customerLastName,
  setCustomerLastName,
  customerPhone,
  setCustomerPhone,
  customerEmail,
  setCustomerEmail,
  deliveryAddress,
  setDeliveryAddress,
  addressSuggestions,
  showAddressSuggestions,
  handleAddressSearch,
  handleSelectAddress,
  loadingAddresses,
  deliveryFee,
  selectedDeliveryPerson,
  setSelectedDeliveryPerson,
  deliveryPersons,
  requestedDeliveryDate,
  setRequestedDeliveryDate,
  cart,
  cartTotal,
  cartSubtotal,
  cartTax,
  globalDiscountApplied,
  cartItemsCount,
  posPaymentMethod,
  setPosPaymentMethod,
  handleCreateOrder,
  onMobilePaymentSuccess,
  isSubmitting,
  storeId,
  resetForm
}: PosCheckoutDialogProps) {
  
  // MyPVit State
  const [mobileOperator, setMobileOperator] = useState<"AIRTEL_MONEY" | "MOOV_MONEY">("AIRTEL_MONEY")
  const [mobilePhone, setMobilePhone] = useState("")
  const [paymentStatus, setPaymentStatus] = useState<"idle" | "initiating" | "waiting" | "success" | "failed" | "timeout">("idle")
  const [paymentMessage, setPaymentMessage] = useState("")
  const [paymentReference, setPaymentReference] = useState<string | null>(null)
  const [transactionId, setTransactionId] = useState<string | null>(null)
  
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Reset local state when dialog closes
  useEffect(() => {
    if (!isOpen) {
      resetPaymentState()
      resetForm()
    } else {
      // Si on ouvre le modal, on force l'étape de paiement direct
      setStep(2)
      setPosPaymentMethod("ESPECE") // Par défaut espèce
    }
  }, [isOpen])

  const resetPaymentState = () => {
    setPaymentStatus("idle")
    setPaymentMessage("")
    setPaymentReference(null)
    setTransactionId(null)
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current)
      pollingIntervalRef.current = null
    }
  }

  const initiatePayment = async () => {
    if (!mobilePhone.trim()) {
      toast.error("Veuillez saisir le numéro de téléphone")
      return
    }

    try {
      setPaymentStatus("initiating")
      setPaymentMessage("Envoi de la demande USSD...")

      // Generate a reference for the transaction
      const reference = `PAY-${Date.now()}-${Math.floor(Math.random() * 1000)}`

      const response = await fetch("/api/payments/mypvit/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: mobilePhone,
          amount: cartTotal,
          operator: mobileOperator,
          reference: reference,
          payerName: customerFirstName || customerLastName ? `${customerFirstName} ${customerLastName}` : "Client POS"
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Erreur initiation")
      }

      setPaymentReference(reference)
      setTransactionId(data.data.reference_id || reference) // MyPVit returns reference_id
      setPaymentStatus("waiting")
      setPaymentMessage("Veuillez valider le paiement sur votre téléphone...")
      toast.info("Veuillez valider le paiement sur votre mobile")

      // Start polling
      startPolling(reference) 
      
    } catch (error: any) {
      console.error("Payment error:", error)
      setPaymentStatus("failed")
      setPaymentMessage(error.message || "Erreur de paiement")
      toast.error(error.message || "Erreur de paiement")
    }
  }

  const startPolling = (ref: string) => {
    const MAX_ATTEMPTS = 60 // 3 minutes approx
    let attempts = 0
    
    pollingIntervalRef.current = setInterval(async () => {
      attempts++
      if (attempts > MAX_ATTEMPTS) {
        if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current)
        setPaymentStatus("timeout")
        setPaymentMessage("Délai d'attente dépassé")
        return
      }

      try {
        const response = await fetch(`/api/payments/mypvit/status?transactionId=${ref}`)
        const data = await response.json()

        if (data.success && data.data) {
          const status = data.data.status
          if (status === 'SUCCESS') {
             if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current)
             setPaymentStatus("success")
             setPaymentMessage("Paiement confirmé !")
             toast.success("Paiement confirmé !")
             
             // Trigger success action
             onMobilePaymentSuccess(ref, mobilePhone)
          } else if (status === 'FAILED') {
             if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current)
             setPaymentStatus("failed")
             setPaymentMessage("Paiement échoué ou annulé")
             toast.error("Paiement échoué")
          }
        }
      } catch (e) {
        console.error("Polling error", e)
      }
    }, 3000)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="text-xl">Vente au magasin</DialogTitle>
          <DialogDescription>
            Choisissez le mode de paiement
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="space-y-4">
              <div className="space-y-3">
                <h3 className="font-semibold text-gray-900">Mode de paiement</h3>
                <div className="grid grid-cols-2 gap-3">
                  {/* Option Espèces */}
                  <button
                    type="button"
                    onClick={() => {
                      setPosPaymentMethod("ESPECE")
                      resetPaymentState()
                    }}
                    disabled={paymentStatus === "waiting" || paymentStatus === "initiating"}
                    className={cn(
                      "flex items-center gap-3 p-4 rounded-lg border-2 transition-all",
                      posPaymentMethod === "ESPECE"
                        ? "border-green-500 bg-green-50"
                        : "border-gray-200 hover:border-gray-300",
                      (paymentStatus === "waiting" || paymentStatus === "initiating") && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    <div className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center",
                      posPaymentMethod === "ESPECE" ? "bg-green-100" : "bg-gray-100"
                    )}>
                      <Banknote className={cn(
                        "h-5 w-5",
                        posPaymentMethod === "ESPECE" ? "text-green-600" : "text-gray-500"
                      )} />
                    </div>
                    <div className="text-left">
                      <div className={cn(
                        "font-medium",
                        posPaymentMethod === "ESPECE" ? "text-green-900" : "text-gray-700"
                      )}>
                        Espèces
                      </div>
                      <div className="text-xs text-gray-500">Paiement en cash</div>
                    </div>
                  </button>

                  {/* Option Mobile Money */}
                  <button
                    type="button"
                    onClick={() => setPosPaymentMethod("MOBILE")}
                    disabled={paymentStatus === "waiting" || paymentStatus === "initiating"}
                    className={cn(
                      "flex items-center gap-3 p-4 rounded-lg border-2 transition-all",
                      posPaymentMethod === "MOBILE"
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:border-gray-300",
                      (paymentStatus === "waiting" || paymentStatus === "initiating") && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    <div className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center",
                      posPaymentMethod === "MOBILE" ? "bg-blue-100" : "bg-gray-100"
                    )}>
                      <Smartphone className={cn(
                        "h-5 w-5",
                        posPaymentMethod === "MOBILE" ? "text-blue-600" : "text-gray-500"
                      )} />
                    </div>
                    <div className="text-left">
                      <div className={cn(
                        "font-medium",
                        posPaymentMethod === "MOBILE" ? "text-blue-900" : "text-gray-700"
                      )}>
                        Mobile Money
                      </div>
                      <div className="text-xs text-gray-500">Airtel / Moov</div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Section Mobile Money */}
              {posPaymentMethod === "MOBILE" && paymentStatus === "idle" && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-4">
                  <div>
                    <Label className="mb-2 block text-blue-900">Opérateur</Label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => setMobileOperator("AIRTEL_MONEY")}
                        className={cn(
                          "px-4 py-2 rounded border text-sm font-medium transition-colors",
                          mobileOperator === "AIRTEL_MONEY" 
                            ? "bg-red-600 text-white border-red-600" 
                            : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                        )}
                      >
                        Airtel Money
                      </button>
                      <button
                        onClick={() => setMobileOperator("MOOV_MONEY")}
                        className={cn(
                          "px-4 py-2 rounded border text-sm font-medium transition-colors",
                          mobileOperator === "MOOV_MONEY" 
                            ? "bg-blue-600 text-white border-blue-600" 
                            : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                        )}
                      >
                        Moov Money
                      </button>
                    </div>
                  </div>

                  <div>
                    <Label className="mb-2 block text-blue-900">Numéro de téléphone</Label>
                    <div className="flex items-center gap-2">
                      <Phone className="h-5 w-5 text-blue-600" />
                      <Input
                        type="tel"
                        placeholder="Ex: 077 00 00 00"
                        value={mobilePhone}
                        onChange={(e) => setMobilePhone(e.target.value)}
                        className="bg-white"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Status Display for Mobile Money */}
              {posPaymentMethod === "MOBILE" && paymentStatus !== "idle" && (
                <div className={cn(
                  "border rounded-lg p-4",
                  paymentStatus === "initiating" && "bg-blue-50 border-blue-200",
                  paymentStatus === "waiting" && "bg-yellow-50 border-yellow-200",
                  paymentStatus === "success" && "bg-green-50 border-green-200",
                  (paymentStatus === "failed" || paymentStatus === "timeout") && "bg-red-50 border-red-200"
                )}>
                  <div className="flex items-center gap-3">
                    {paymentStatus === "initiating" && <Loader2 className="h-6 w-6 text-blue-600 animate-spin" />}
                    {paymentStatus === "waiting" && (
                      <div className="relative">
                        <Clock className="h-6 w-6 text-yellow-600" />
                        <span className="absolute -top-1 -right-1 flex h-3 w-3">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-yellow-500"></span>
                        </span>
                      </div>
                    )}
                    {paymentStatus === "success" && <CheckCircle2 className="h-6 w-6 text-green-600" />}
                    {(paymentStatus === "failed" || paymentStatus === "timeout") && <XCircle className="h-6 w-6 text-red-600" />}
                    
                    <div>
                      <h4 className={cn(
                        "font-medium",
                        paymentStatus === "initiating" && "text-blue-900",
                        paymentStatus === "waiting" && "text-yellow-900",
                        paymentStatus === "success" && "text-green-900",
                        (paymentStatus === "failed" || paymentStatus === "timeout") && "text-red-900"
                      )}>
                        {paymentStatus === "initiating" && "Envoi de la demande..."}
                        {paymentStatus === "waiting" && "En attente de validation..."}
                        {paymentStatus === "success" && "Paiement réussi !"}
                        {paymentStatus === "failed" && "Paiement échoué"}
                        {paymentStatus === "timeout" && "Délai dépassé"}
                      </h4>
                      <p className="text-sm opacity-90">{paymentMessage}</p>
                    </div>
                  </div>

                  {paymentStatus === "waiting" && (
                     <div className="mt-3">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={resetPaymentState}
                          className="w-full border-yellow-300 text-yellow-700 hover:bg-yellow-100"
                        >
                          Annuler
                        </Button>
                     </div>
                  )}

                  {(paymentStatus === "failed" || paymentStatus === "timeout") && (
                     <div className="mt-3">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={resetPaymentState}
                          className="w-full border-red-300 text-red-700 hover:bg-red-100"
                        >
                          Réessayer
                        </Button>
                     </div>
                  )}
                </div>
              )}

              <Separator />

              {/* Récapitulatif vente */}
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <h3 className="font-semibold text-gray-900">Récapitulatif</h3>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Articles ({cartItemsCount})</span>
                    <span>{cartSubtotal.toLocaleString()} FCFA</span>
                  </div>
                  {globalDiscountApplied > 0 && (
                    <div className="flex justify-between text-red-600">
                      <span>Remise</span>
                      <span>-{globalDiscountApplied.toLocaleString()} FCFA</span>
                    </div>
                  )}
                  <div className="flex justify-between text-gray-600">
                    <span>TVA</span>
                    <span>{cartTax.toLocaleString()} FCFA</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-lg font-bold pt-2">
                    <span>Total à encaisser</span>
                    <span className="text-blue-600">{cartTotal.toLocaleString()} FCFA</span>
                  </div>
                </div>
              </div>
          </div>
        </div>

        {/* Footer fixe */}
        <div className="shrink-0 border-t bg-white p-6">
          <div className="flex items-center justify-between gap-3">
            <Button
              variant="outline"
              onClick={() => {
                if (paymentStatus === "waiting") {
                  resetPaymentState()
                }
                onOpenChange(false)
                resetForm()
              }}
              disabled={isSubmitting}
            >
              Annuler
            </Button>

            {posPaymentMethod === "ESPECE" ? (
              <Button
                onClick={handleCreateOrder}
                disabled={isSubmitting}
                className="w-[300px] bg-purple-600 hover:bg-purple-700 h-10"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Encaissement...
                  </>
                ) : (
                  <>
                    <Banknote className="h-4 w-4 mr-2" />
                    Encaisser
                  </>
                )}
              </Button>
            ) : (
              <>
                {paymentStatus === "idle" && (
                  <Button
                    onClick={initiatePayment}
                    disabled={!mobilePhone.trim() || isSubmitting}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Smartphone className="h-4 w-4 mr-2" />
                    Envoyer la demande
                  </Button>
                )}
                {(paymentStatus === "initiating" || paymentStatus === "waiting") && (
                  <Button disabled className="bg-yellow-600">
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    En attente...
                  </Button>
                )}
                {paymentStatus === "success" && (
                   <Button disabled className="bg-green-600">
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Succès
                   </Button>
                )}
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
