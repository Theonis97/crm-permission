import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { myPvitService } from "@/lib/mypvit-service"
import {
  buildEbillingPortalPaymentUrl,
  createEbBill,
  ebillingOperatorMatchesGabonMsisdn,
  ebillingUssdPush,
  isEbillingMockPayinEnabled,
  isEbillingUssd406Error,
  mapPosOperatorToEbilling,
  normalizePayerMsisdn,
  trimEnv,
} from "@/lib/ebilling-payin"
import { completeStoreOrderFromEbillingNotification } from "@/lib/ebilling-complete-pos-order"

import { getPosMobilePreference, resolveActivePosMobileGateway } from "@/lib/pos-mobile-gateway"

/**
 * Point d’entrée unique pour le Mobile Money depuis la caisse.
 * Par défaut : E-Billing uniquement. MyPVit si POS_MOBILE_GATEWAY=mypvit ; les deux si auto.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
    }

    const body = await request.json()
    const { phone, amount, operator, reference, payerName, payerEmail } = body

    if (!phone || amount == null || !operator || !reference) {
      return NextResponse.json(
        { error: "Champs requis manquants (téléphone, montant, opérateur, référence)" },
        { status: 400 },
      )
    }

    if (!["AIRTEL_MONEY", "MOOV_MONEY"].includes(operator)) {
      return NextResponse.json(
        { error: "Opérateur invalide. Utilisez AIRTEL_MONEY ou MOOV_MONEY" },
        { status: 400 },
      )
    }

    const amountNum = Number(amount)
    if (Number.isNaN(amountNum) || amountNum <= 0) {
      return NextResponse.json({ error: "Montant invalide" }, { status: 400 })
    }

    const gateway = resolveActivePosMobileGateway()
    if (!gateway) {
      const pref = getPosMobilePreference()
      const body: Record<string, unknown> = {
        error: "Aucune passerelle Mobile Money configurée",
        details:
          pref === "mypvit"
            ? "MyPVit : renseignez MYPVIT_ACCOUNT_CODE, MYPVIT_PASSWORD, etc."
            : pref === "ebilling"
              ? "E-Billing : renseignez EBILLING_USERNAME et EBILLING_SHARED_KEY (non commentés dans .env), puis redémarrez le serveur."
              : "Mode auto : configurez E-Billing (prioritaire) ou MyPVit, puis redémarrez le serveur.",
      }
      if (process.env.NODE_ENV === "development") {
        body._debug = {
          preference: pref,
          cwd: process.cwd(),
          ebillingUsernameLen: trimEnv(process.env["EBILLING_USERNAME"]).length,
          ebillingKeyLen: trimEnv(process.env["EBILLING_SHARED_KEY"]).length,
        }
      }
      return NextResponse.json(body, { status: 503 })
    }
    if (gateway === "ebilling") {
      const paymentSystem = mapPosOperatorToEbilling(operator)
      if (!paymentSystem) {
        return NextResponse.json(
          { error: "Opérateur invalide pour E-Billing" },
          { status: 400 },
        )
      }

      const msisdn = normalizePayerMsisdn(phone)
      if (!ebillingOperatorMatchesGabonMsisdn(operator, msisdn)) {
        return NextResponse.json(
          {
            error:
              "Opérateur incompatible avec le numéro : en Gabon, les numéros 07… sont généralement Airtel Money et 06… Moov Money. Choisissez le bon opérateur ou vérifiez le numéro (9 chiffres, ex. 077123456).",
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
        console.warn(
          "[pos-mobile/initiate] EBILLING_MOCK_PAYIN : pas d’appel API Digitech — commande finalisée comme après webhook",
        )
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
          const appBase =
            trimEnv(process.env.NEXT_PUBLIC_APP_URL) || "http://localhost:3000"
          portalUrl = buildEbillingPortalPaymentUrl(
            bill.billId,
            `${appBase.replace(/\/$/, "")}/dashboard`,
          )
          console.warn(
            "[pos-mobile/initiate] E-Billing USSD 406 — repli portail :",
            portalUrl.slice(0, 80) + "…",
          )
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
          ...(portalUrl
            ? { ussd_not_accepted: true as const, portal_url: portalUrl }
            : {}),
        },
      })
    }

    const result = await myPvitService.initiatePayment({
      amount: amountNum,
      reference: reference,
      customer_account_number: phone,
      operator_code: operator as "AIRTEL_MONEY" | "MOOV_MONEY",
      free_info: payerName ? payerName.substring(0, 15) : undefined,
    })

    if (result.status === "SUCCESS" || result.status === "PENDING") {
      return NextResponse.json({
        success: true,
        data: { ...result, gateway: "mypvit" },
      })
    }

    return NextResponse.json(
      {
        success: false,
        error: result.message || "Erreur lors de l'initiation du paiement",
      },
      { status: 400 },
    )
  } catch (error: unknown) {
    console.error("[pos-mobile/initiate]", error)
    const message =
      error instanceof Error ? error.message : "Erreur serveur lors de l'initiation"
    /** 401 renvoyé par l’API E-Billing = identifiants / LAB, pas un bug serveur applicatif */
    const ebillingUpstreamAuth =
      message.includes("E-Billing") && (message.includes("(401)") || /auth invalid/i.test(message))
    return NextResponse.json(
      { error: message, details: ebillingUpstreamAuth ? "Vérifiez EBILLING_* dans .env ou EBILLING_AUTHORIZATION (cf. .env.example)." : undefined },
      { status: ebillingUpstreamAuth ? 502 : 500 },
    )
  }
}
