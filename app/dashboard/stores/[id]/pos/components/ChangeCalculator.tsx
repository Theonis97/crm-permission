"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Calculator } from "lucide-react"

// Fonction pour formater en FCFA (reprise du POS)
const formatFCFA = (amount: number) => {
    return new Intl.NumberFormat("fr-FR", {
        style: "currency",
        currency: "XAF",
        maximumFractionDigits: 0,
    }).format(amount)
}

interface ChangeCalculatorProps {
    totalToPay: number
}

export function ChangeCalculator({ totalToPay }: ChangeCalculatorProps) {
    const [amountReceived, setAmountReceived] = useState<string>("")

    const refundDue = totalToPay < 0 ? Math.abs(totalToPay) : 0
    const collectDue = totalToPay > 0 ? totalToPay : 0

    const parsedAmount = parseInt(amountReceived || "0", 10)
    const changeDue =
        collectDue > 0 ? Math.max(0, parsedAmount - collectDue) : 0
    const isSufficient = collectDue === 0 || parsedAmount >= collectDue

    if (refundDue > 0) {
        return (
            <div className="space-y-2 bg-gray-50 p-3 rounded-lg border border-gray-200">
                <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                    <Calculator className="h-4 w-4" />
                    Remboursement
                </div>
                <div className="rounded-md border bg-white px-3 py-2 text-right">
                    <div className="text-[10px] font-medium uppercase tracking-wide text-gray-500">
                        À rendre
                    </div>
                    <div className="text-lg font-bold tabular-nums text-gray-900">
                        {formatFCFA(refundDue)}
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-3 bg-gray-50 p-3 rounded-lg border border-gray-200">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <Calculator className="h-4 w-4" />
                Calcul de monnaie
            </div>

            <div className="flex gap-3 items-end">
                <div className="flex-1">
                    <Label htmlFor="calculator-received" className="text-xs text-gray-500 mb-1 block">
                        Reçu
                    </Label>
                    <Input
                        id="calculator-received"
                        type="number"
                        placeholder="0"
                        value={amountReceived}
                        onChange={(e) => setAmountReceived(e.target.value)}
                        className="h-9 bg-white font-bold"
                    />
                </div>

                <div className="flex-1">
                    <Label className="text-xs text-gray-500 mb-1 block">
                        À rendre
                    </Label>
                    <div className={`h-9 px-3 rounded-md border flex items-center justify-end font-bold text-sm ${isSufficient
                        ? "bg-green-50 text-green-700 border-green-200"
                        : "bg-red-50 text-red-700 border-red-200"
                        }`}>
                        {amountReceived ? formatFCFA(changeDue) : "-"}
                    </div>
                </div>
            </div>


        </div>
    )
}
