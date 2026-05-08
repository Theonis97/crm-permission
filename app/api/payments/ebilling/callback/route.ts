import { NextRequest, NextResponse } from "next/server"
import { completeStoreOrderFromEbillingNotification } from "@/lib/ebilling-complete-pos-order"

/**
 * Webhook E-Billing (notification de paiement PAYIN).
 * À déclarer dans le profil marchand → Notification URL.
 * Champs typiques : reference, transactionid, paymentsystem, amount, billingid
 */
export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get("content-type") || ""

    let raw: Record<string, string> = {}

    if (contentType.includes("application/json")) {
      const j = await request.json()
      if (j && typeof j === "object") {
        for (const [k, v] of Object.entries(j as Record<string, unknown>)) {
          raw[k] = v != null ? String(v) : ""
        }
      }
    } else {
      const fd = await request.formData()
      fd.forEach((value, key) => {
        raw[key] = typeof value === "string" ? value : String(value)
      })
    }

    const lower: Record<string, string> = {}
    for (const [k, v] of Object.entries(raw)) {
      lower[k.toLowerCase()] = v
    }

    console.log("[E-Billing Callback]", JSON.stringify(raw, null, 2))

    const reference =
      lower.reference ??
      lower.external_reference ??
      ""
    const transactionId = lower.transactionid ?? lower.transaction_id ?? ""
    const operator = lower.paymentsystem ?? lower.payment_system ?? ""
    const amountStr = lower.amount ?? ""
    const billingId = lower.billingid ?? lower.bill_id ?? ""

    if (!reference) {
      return NextResponse.json({ error: "missing reference" }, { status: 400 })
    }

    const result = await completeStoreOrderFromEbillingNotification({
      reference,
      billingId,
      transactionId,
      operator,
      incomingAmountStr: amountStr,
    })

    if (!result.ok) {
      if (result.error === "transaction not found") {
        console.warn(`[E-Billing Callback] Commande introuvable: ${reference}`)
      } else if (result.error === "amount mismatch") {
        console.warn(`[E-Billing Callback] Montant incohérent pour ${reference}`)
      }
      return NextResponse.json({ error: result.error }, { status: result.status })
    }

    console.log(`[E-Billing Callback] StoreOrder ${reference} → PAID`)

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    console.error("[E-Billing Callback Error]", error)
    return NextResponse.json({ error: "Internal Error" }, { status: 500 })
  }
}
