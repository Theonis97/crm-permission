import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import {
  buildEbillingPortalPaymentUrl,
  createEbBill,
  ebillingOperatorMatchesGabonMsisdn,
  ebillingUssdPush,
  isEbillingConfigured,
  isEbillingMockPayinEnabled,
  isEbillingUssd406Error,
  mapPosOperatorToEbilling,
  normalizePayerMsisdn,
  trimEnv,
} from "@/lib/ebilling-payin"
import { completeStoreOrderFromEbillingNotification } from "@/lib/ebilling-complete-pos-order"

/**
 * Initie un paiement Mobile Money via E-Billing (facture + USSD Push Airtel / Moov).
 * Contrat de réponse aligné sur /api/payments/mypvit/initiate pour le POS.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
    }

    if (!isEbillingConfigured() && !isEbillingMockPayinEnabled()) {
      return NextResponse.json(
        {
          error: "E-Billing non configuré",
          details:
            "Définissez EBILLING_USERNAME, EBILLING_SHARED_KEY — ou en dev uniquement EBILLING_MOCK_PAYIN=true (cf. .env.example).",
        },
        { status: 503 },
      )
    }

    const body = await request.json()
    const { phone, amount, operator, reference, payerName, payerEmail } = body

    if (!phone || amount == null || !operator || !reference) {
      return NextResponse.json(
        { error: "Champs requis manquants (téléphone, montant, opérateur, référence)" },
        { status: 400 },
      )
    }

    const paymentSystem = mapPosOperatorToEbilling(operator)
    if (!paymentSystem) {
      return NextResponse.json(
        { error: "Opérateur invalide. Utilisez AIRTEL_MONEY ou MOOV_MONEY" },
        { status: 400 },
      )
    }

    const amountNum = Number(amount)
    if (Number.isNaN(amountNum) || amountNum <= 0) {
      return NextResponse.json({ error: "Montant invalide" }, { status: 400 })
    }

    const msisdn = normalizePayerMsisdn(phone)
    if (!ebillingOperatorMatchesGabonMsisdn(operator, msisdn)) {
      return NextResponse.json(
        {
          error:
            "Opérateur incompatible avec le numéro : en Gabon, 07… ≈ Airtel Money, 06… ≈ Moov Money. Corrigez l’opérateur ou le numéro.",
        },
        { status: 400 },
      )
    }
    const emailFallback =
      (typeof payerEmail === "string" && payerEmail.includes("@")
        ? payerEmail.trim()
        : null) ||
      process.env.EBILLING_DEFAULT_PAYER_EMAIL ||
      "client.pos@ebilling.lab"
    const name =
      typeof payerName === "string" && payerName.trim()
        ? payerName.trim().slice(0, 120)
        : "Client POS"

    if (isEbillingMockPayinEnabled()) {
      console.warn("[EBilling Initiate] EBILLING_MOCK_PAYIN — finalisation locale sans API")
      const done = await completeStoreOrderFromEbillingNotification({
        reference: String(reference),
        billingId: "mock-lab",
        transactionId: "mock",
        operator: "MOCK",
      })
      if (!done.ok) {
        return NextResponse.json(
          { error: done.error === "transaction not found" ? "Commande introuvable" : done.error },
          { status: done.status },
        )
      }
      return NextResponse.json({
        success: true,
        data: {
          status: "PENDING",
          reference_id: reference,
          bill_id: `mock-${reference}`,
          gateway: "ebilling-mock",
        },
      })
    }

    const bill = await createEbBill({
      amount: amountNum,
      externalReference: String(reference),
      shortDescription: `Caisse POS ${reference}`.slice(0, 200),
      payerEmail: emailFallback,
      payerMsisdn: msisdn,
      payerName: name,
      expiryPeriodMinutes: Number(process.env.EBILLING_BILL_EXPIRY_MINUTES) || 60,
    })

    let portalUrl: string | undefined
    try {
      await ebillingUssdPush(bill.billId, msisdn, paymentSystem)
    } catch (e) {
      if (isEbillingUssd406Error(e)) {
        const appBase = trimEnv(process.env.NEXT_PUBLIC_APP_URL) || "http://localhost:3000"
        portalUrl = buildEbillingPortalPaymentUrl(
          bill.billId,
          `${appBase.replace(/\/$/, "")}/dashboard`,
        )
        console.warn("[EBilling Initiate] USSD 406 — repli portail")
      } else {
        throw e
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        status: "PENDING",
        reference_id: reference,
        bill_id: bill.billId,
        gateway: "ebilling",
        ...(portalUrl ? { ussd_not_accepted: true as const, portal_url: portalUrl } : {}),
      },
    })
  } catch (error: unknown) {
    console.error("[EBilling Initiate]", error)
    const message = error instanceof Error ? error.message : "Erreur serveur E-Billing"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
