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
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Printer,
  Eye,
  CheckCircle,
  Loader2,
  Receipt,
} from "lucide-react"
import { toast } from "@/lib/app-toast"
import { thermalPrinter, type TicketData } from "@/lib/thermal-printer"

interface ThermalPrinterDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  ticketData: TicketData
  onPrintSuccess?: () => void
}

export function ThermalPrinterDialog({
  open,
  onOpenChange,
  ticketData,
  onPrintSuccess
}: ThermalPrinterDialogProps) {
  const [isPrinting, setIsPrinting] = useState(false)
  const [isPreviewing, setIsPreviewing] = useState(false)

  const handlePrint = async () => {
    try {
      setIsPrinting(true)
      
      if (!thermalPrinter.isPrintSupported()) {
        toast.error("L'impression n'est pas supportée sur ce navigateur")
        return
      }

      await thermalPrinter.printTicket(ticketData)
      toast.success("Ticket envoyé à l'imprimante !")
      
      onPrintSuccess?.()
      onOpenChange(false)
    } catch (error: unknown) {
      console.error("Erreur impression:", error)
      toast.error(
        error instanceof Error ? error.message : "Erreur lors de l'impression"
      )
    } finally {
      setIsPrinting(false)
    }
  }

  const handlePreview = async () => {
    try {
      setIsPreviewing(true)
      await thermalPrinter.previewTicket(ticketData)
    } catch (error: unknown) {
      console.error("Erreur prévisualisation:", error)
      toast.error(
        error instanceof Error
          ? error.message
          : "Erreur lors de la prévisualisation"
      )
    } finally {
      setIsPreviewing(false)
    }
  }

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount) + ' FCFA'
  }

  const getPaymentMethodName = (method: string) => {
    const methods: Record<string, string> = {
      'CASH': 'Espèces',
      'CARD': 'Carte bancaire',
      'MOBILE': 'Mobile Money',
      'CHECK': 'Chèque',
      'cash': 'Espèces',
      'card': 'Carte bancaire',
      'mobile': 'Mobile Money',
      'check': 'Chèque'
    }
    return methods[method] || method
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-blue-600" />
            Impression du ticket
          </DialogTitle>
          <DialogDescription>
            Vérifiez les informations du ticket avant impression
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Informations du ticket */}
          <div className="bg-gray-50 p-4 rounded-lg space-y-3">
            <div className="flex justify-between items-center">
              <span className="font-medium">Ticket:</span>
              <Badge variant="outline">{ticketData.ticketNumber}</Badge>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="font-medium">Date:</span>
              <span className="text-sm text-gray-600">
                {ticketData.date.toLocaleDateString('fr-FR', {
                  year: 'numeric',
                  month: '2-digit',
                  day: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="font-medium">Caissier:</span>
              <span className="text-sm text-gray-600">{ticketData.cashier}</span>
            </div>

            {ticketData.customerName && (
              <div className="flex justify-between items-center">
                <span className="font-medium">Client:</span>
                <span className="text-sm text-gray-600">{ticketData.customerName}</span>
              </div>
            )}

            {ticketData.customerPhone && (
              <div className="flex justify-between items-center">
                <span className="font-medium">Téléphone:</span>
                <span className="text-sm text-gray-600">{ticketData.customerPhone}</span>
              </div>
            )}
          </div>

          <Separator />

          {/* Résumé des articles */}
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Articles ({ticketData.items.length})</h4>
            <div className="max-h-32 overflow-y-auto space-y-1">
              {ticketData.items.map((item, index) => (
                <div key={index} className="flex justify-between text-sm">
                  <span className="flex-1 truncate">
                    {item.quantity}x {item.name}
                  </span>
                  <span className="font-medium">{formatPrice(item.total)}</span>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Totaux */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Sous-total:</span>
              <span>{formatPrice(ticketData.subtotal)}</span>
            </div>

            {ticketData.tax > 0 && (
              <div className="flex justify-between text-sm">
                <span>TVA:</span>
                <span>{formatPrice(ticketData.tax)}</span>
              </div>
            )}
            
            {ticketData.discount > 0 && (
              <div className="flex justify-between text-sm text-green-600">
                <span>Remise:</span>
                <span>-{formatPrice(ticketData.discount)}</span>
              </div>
            )}
            
            {ticketData.deliveryFee && ticketData.deliveryFee > 0 && (
              <div className="flex justify-between text-sm">
                <span>Frais de livraison:</span>
                <span>{formatPrice(ticketData.deliveryFee)}</span>
              </div>
            )}

            <Separator />
            
            <div className="flex justify-between font-bold">
              <span>TOTAL:</span>
              <span className="text-lg">{formatPrice(ticketData.total)}</span>
            </div>
          </div>

          <Separator />

          {/* Paiement */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Mode de paiement:</span>
              <Badge variant="secondary">
                {getPaymentMethodName(ticketData.paymentMethod)}
              </Badge>
            </div>
            
            {ticketData.amountPaid && ticketData.amountPaid !== ticketData.total && (
              <>
                <div className="flex justify-between text-sm">
                  <span>Montant reçu:</span>
                  <span>{formatPrice(ticketData.amountPaid)}</span>
                </div>
                {ticketData.change && ticketData.change > 0 && (
                  <div className="flex justify-between text-sm text-blue-600">
                    <span>Monnaie rendue:</span>
                    <span>{formatPrice(ticketData.change)}</span>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Notes */}
          {ticketData.notes && (
            <>
              <Separator />
              <div className="space-y-1">
                <span className="font-medium text-sm">Notes:</span>
                <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                  {ticketData.notes}
                </p>
              </div>
            </>
          )}

          {/* État de l'imprimante */}
          <div className="bg-blue-50 p-3 rounded-lg">
            <div className="flex items-center gap-2 text-blue-700">
              <CheckCircle className="h-4 w-4" />
              <span className="text-sm font-medium">
                Imprimante prête
              </span>
            </div>
            <p className="text-xs text-blue-600 mt-1">
              {
                "Assurez-vous que l'imprimante thermique est allumée et connectée"
              }
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={handlePreview}
            disabled={isPreviewing || isPrinting}
          >
            {isPreviewing ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Eye className="h-4 w-4 mr-2" />
            )}
            Prévisualiser
          </Button>
          
          <Button
            onClick={handlePrint}
            disabled={isPrinting || isPreviewing}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isPrinting ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Printer className="h-4 w-4 mr-2" />
            )}
            Imprimer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
