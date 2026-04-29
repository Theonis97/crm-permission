import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Separator } from "@/components/ui/separator"
import { CheckCircle2, AlertTriangle, Printer } from "lucide-react"
import { Button } from "@/components/ui/button"

interface DayCloseSummary {
  closeDate?: string | Date
  date?: string
  closedBy?: string | null
  totalSales?: number
  totalItems?: number
  subtotal?: number
  totalTax?: number
  totalDiscounts?: number
  totalRevenue?: number
  discrepancies?: string
}

interface DayCloseSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  summary: DayCloseSummary | null
}

export function DayCloseSheet({ open, onOpenChange, summary }: DayCloseSheetProps) {
  if (!summary) return null

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md overflow-y-auto">
        <SheetHeader className="mb-6">
          <SheetTitle className="flex items-center gap-2 text-xl text-green-700">
            <CheckCircle2 className="h-6 w-6" />
            Clôture de journée effectuée
          </SheetTitle>
          <SheetDescription>
            Récapitulatif de la journée du{" "}
            {new Date(summary.closeDate || summary.date).toLocaleDateString("fr-FR")}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6">
          {/* Informations générales */}
          <div className="bg-gray-50 p-4 rounded-lg space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Clôturé par</span>
              <span className="font-medium">{summary.closedBy}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Heure de clôture</span>
              <span className="font-medium">
                {new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
          </div>

          <Separator />

          {/* Totaux */}
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900">Totaux des ventes</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-blue-50 p-3 rounded-lg">
                <div className="text-xs text-blue-600 mb-1">Nombre de ventes</div>
                <div className="text-xl font-bold text-blue-900">{summary.totalSales}</div>
              </div>
              <div className="bg-purple-50 p-3 rounded-lg">
                <div className="text-xs text-purple-600 mb-1">Articles vendus</div>
                <div className="text-xl font-bold text-purple-900">{summary.totalItems}</div>
              </div>
            </div>

            <div className="space-y-2 text-sm mt-4">
              <div className="flex justify-between">
                <span className="text-gray-600">Sous-total</span>
                <span>{summary.subtotal?.toLocaleString()} FCFA</span>
              </div>
              {(summary.totalTax ?? 0) > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-600">TVA</span>
                  <span>{summary.totalTax?.toLocaleString()} FCFA</span>
                </div>
              )}
              <div className="flex justify-between text-red-600">
                <span>Remises totales</span>
                <span>-{summary.totalDiscounts?.toLocaleString()} FCFA</span>
              </div>
              <Separator className="my-2" />
              <div className="flex justify-between text-lg font-bold">
                <span>{"Chiffre d'affaires"}</span>
                <span className="text-green-600">{summary.totalRevenue?.toLocaleString()} FCFA</span>
              </div>
            </div>
          </div>

          {/* Alertes / Notes */}
          {summary.discrepancies && (
            <div className="bg-amber-50 p-4 rounded-lg border border-amber-200 flex gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
              <div className="text-sm text-amber-800">
                <p className="font-medium mb-1">Écarts détectés</p>
                <p>{summary.discrepancies}</p>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="pt-6 space-y-3">
            <Button className="w-full gap-2" variant="outline" onClick={() => window.print()}>
              <Printer className="h-4 w-4" />
              Imprimer le rapport Z
            </Button>
            <Button className="w-full" onClick={() => onOpenChange(false)}>
              Fermer
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
