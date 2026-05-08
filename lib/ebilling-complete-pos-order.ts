import { prisma } from "@/lib/prisma"
import { applyDeferredPosStockForStoreOrder } from "@/lib/pos-deferred-sale-stock"

export type CompletePosOrderFromEbillingOpts = {
  reference: string
  billingId?: string
  transactionId?: string
  operator?: string
  /** Si présent, vérifie le montant (même règle que le webhook). */
  incomingAmountStr?: string
}

/**
 * Passe une commande POS mobile de PENDING à PAID et applique le débit stock différé
 * (même effet que le webhook E-Billing PAYIN).
 */
export async function completeStoreOrderFromEbillingNotification(
  opts: CompletePosOrderFromEbillingOpts,
): Promise<{ ok: true } | { ok: false; error: string; status: number }> {
  const storeOrder = await prisma.storeOrder.findUnique({
    where: { number: opts.reference },
  })

  if (!storeOrder) {
    return { ok: false, error: "transaction not found", status: 404 }
  }

  if (opts.incomingAmountStr != null && opts.incomingAmountStr !== "") {
    const amount = parseFloat(opts.incomingAmountStr.replace(",", "."))
    if (!Number.isNaN(amount) && amount > 0) {
      const expected = Number(storeOrder.total)
      if (Math.abs(amount - expected) > 0.5) {
        return { ok: false, error: "amount mismatch", status: 400 }
      }
    }
  }

  const billingId = opts.billingId ?? ""
  const transactionId = opts.transactionId ?? ""
  const operator = opts.operator ?? ""
  const noteLine = `E-Billing: billingid=${billingId} tx=${transactionId} (${operator})`

  await prisma.storeOrder.update({
    where: { id: storeOrder.id },
    data: {
      paymentStatus: "PAID",
      paymentMethod: "MOBILE",
      paidAt: storeOrder.paidAt ?? new Date(),
      notes: storeOrder.notes ? `${storeOrder.notes}\n${noteLine}` : noteLine,
    },
  })

  await applyDeferredPosStockForStoreOrder(storeOrder.id)

  return { ok: true }
}
