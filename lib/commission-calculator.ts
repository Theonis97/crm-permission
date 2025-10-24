/**
 * Calcule la commission du livreur selon les règles métier
 * 
 * Règles de commission :
 * - Entre 6 500 et 7 000 FCFA : 1 000 FCFA
 * - Entre 7 000 et 8 000 FCFA : 1 500 FCFA
 * - >= 8 500 FCFA : 2 000 FCFA
 */

export interface CommissionRule {
  minAmount: number
  maxAmount: number | null
  commission: number
}

export const COMMISSION_RULES: CommissionRule[] = [
  {
    minAmount: 6500,
    maxAmount: 7000,
    commission: 1000,
  },
  {
    minAmount: 7000,
    maxAmount: 8000,
    commission: 1500,
  },
  {
    minAmount: 8500,
    maxAmount: null, // >= 8500
    commission: 2000,
  },
]

/**
 * Calcule la commission pour un montant de commande donné
 */
export function calculateCommission(orderAmount: number): number {
  for (const rule of COMMISSION_RULES) {
    if (rule.maxAmount === null) {
      // Règle >= minAmount
      if (orderAmount >= rule.minAmount) {
        return rule.commission
      }
    } else {
      // Règle entre minAmount et maxAmount
      if (orderAmount >= rule.minAmount && orderAmount < rule.maxAmount) {
        return rule.commission
      }
    }
  }
  
  // Aucune commission si en dehors des règles
  return 0
}

/**
 * Calcule les commissions totales pour une liste de commandes
 */
export function calculateTotalCommissions(orders: Array<{ total: number }>): {
  totalCommission: number
  deliveriesCount: number
  averageOrderAmount: number
  commissionDetails: Array<{
    orderAmount: number
    commission: number
  }>
} {
  let totalCommission = 0
  const commissionDetails: Array<{ orderAmount: number; commission: number }> = []

  for (const order of orders) {
    const commission = calculateCommission(order.total)
    totalCommission += commission
    commissionDetails.push({
      orderAmount: order.total,
      commission,
    })
  }

  const averageOrderAmount = orders.length > 0
    ? orders.reduce((sum, order) => sum + order.total, 0) / orders.length
    : 0

  return {
    totalCommission,
    deliveriesCount: orders.length,
    averageOrderAmount: Math.round(averageOrderAmount),
    commissionDetails,
  }
}
