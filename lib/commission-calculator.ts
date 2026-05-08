/**
 * Calcule la commission du livreur selon les règles métier.
 *
 * Déclarations livreur (ventes terrain) : **une commission par ligne produit**,
 * appliquée sur le **total encaissé client de la ligne** (quantité × prix unitaire),
 * pas « une commission par unité ». Ex. 2 casques = 10 000 FCFA sur la ligne → un seul palier sur 10 000.
 *
 * Règles de montant (FCFA, total ligne = qté × prix) :
 * - Entre 1 000 et 3 000 (≥ 1 000 et < 3 000) : 500
 * - Entre 3 000 et 7 000 (≥ 3 000 et < 7 000) : 1 000
 * - Entre 7 000 et 8 000 (≥ 7 000 et < 8 000) : 1 500
 * - ≥ 8 500 : 2 000
 */

export interface CommissionRule {
  minAmount: number
  maxAmount: number | null
  commission: number
}

export const COMMISSION_RULES: CommissionRule[] = [
  {
    minAmount: 1000,
    maxAmount: 3000,
    commission: 500,
  },
  {
    minAmount: 3000,
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
 * Calcule la commission pour un montant (commande livrée ou **total ligne** déclaration livreur).
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
 * Commission totale d'une déclaration livreur : somme des `calculateCommission(totalPrice)`
 * pour chaque ligne (totalPrice = qté × PU encaissé).
 */
export function totalCommissionForDriverDeclarationItems(
  items: Array<{ totalPrice: number }>,
): number {
  return items.reduce((sum, it) => sum + calculateCommission(it.totalPrice), 0)
}

/**
 * Ce que le livreur doit **déposer au magasin** : net déjà calculé par ligne
 * (somme encaissée produit : qté × prix de vente client ; les frais livraison ne réduisent pas ce montant),
 * moins la commission livreur (paliers sur chaque total de ligne).
 */
export function driverDepositAmountAfterCommission(
  netTotalAmount: number,
  items: Array<{ totalPrice: number }>,
): number {
  const commission = totalCommissionForDriverDeclarationItems(items)
  return Math.max(0, netTotalAmount - commission)
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
