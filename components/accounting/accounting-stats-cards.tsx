"use client"

import { Card, CardContent } from "@/components/ui/card"
import { TrendingUp, TrendingDown, Wallet, Receipt, PiggyBank, Clock } from "lucide-react"

interface AccountingStatsCardsProps {
  totalSales: number
  totalExpenses: number
  result: number
  isProfitable: boolean
  pendingExpensesAmount: number
  pendingExpensesCount: number
  isLoading?: boolean
}

function formatCurrency(amount: number): string {
  if (amount >= 1000000) {
    return `${(amount / 1000000).toFixed(1)}M FCFA`
  }
  if (amount >= 1000) {
    return `${(amount / 1000).toFixed(0)}K FCFA`
  }
  return `${amount.toLocaleString("fr-FR")} FCFA`
}

export function AccountingStatsCards({
  totalSales,
  totalExpenses,
  result,
  isProfitable,
  pendingExpensesAmount,
  pendingExpensesCount,
  isLoading = false,
}: AccountingStatsCardsProps) {
  const cards = [
    {
      title: "Ventes",
      value: totalSales,
      icon: TrendingUp,
      gradient: "from-green-500 to-emerald-600",
      bgLight: "bg-green-50",
      textColor: "text-green-700",
    },
    {
      title: "Dépenses payées",
      value: totalExpenses,
      icon: Receipt,
      gradient: "from-red-500 to-rose-600",
      bgLight: "bg-red-50",
      textColor: "text-red-700",
    },
    {
      title: "Résultat",
      value: result,
      icon: isProfitable ? PiggyBank : Wallet,
      gradient: isProfitable ? "from-blue-500 to-indigo-600" : "from-orange-500 to-red-600",
      bgLight: isProfitable ? "bg-blue-50" : "bg-orange-50",
      textColor: isProfitable ? "text-blue-700" : "text-orange-700",
      showSign: true,
    },
    {
      title: "En attente",
      value: pendingExpensesAmount,
      icon: Clock,
      gradient: "from-amber-500 to-orange-600",
      bgLight: "bg-amber-50",
      textColor: "text-amber-700",
      subtitle: `${pendingExpensesCount} dépense(s)`,
    },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => {
        const Icon = card.icon
        return (
          <Card key={card.title} className="overflow-hidden py-0 hover:shadow-lg transition-shadow">
            <div className={`h-2 bg-gradient-to-r ${card.gradient}`} />
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">{card.title}</p>
                  <p className={`text-2xl font-bold ${card.textColor}`}>
                    {isLoading ? "..." : (
                      <>
                        {card.showSign && card.value > 0 && "+"}
                        {card.showSign && card.value < 0 && "-"}
                        {formatCurrency(Math.abs(card.value))}
                      </>
                    )}
                  </p>
                  {card.subtitle && (
                    <p className="text-xs text-gray-400 mt-1">{card.subtitle}</p>
                  )}
                </div>
                <div className={`p-3 rounded-full ${card.bgLight}`}>
                  <Icon className={`h-6 w-6 ${card.textColor}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
