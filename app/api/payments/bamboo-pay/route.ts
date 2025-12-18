import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { bambooPayService } from "@/lib/bamboo-pay"

/**
 * POST /api/payments/bamboo-pay
 * Initie un paiement BambooPay (Mobile Money)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
    }

    const body = await request.json()
    const { phone, amount, payerName, reference } = body

    // Validation des champs requis
    if (!phone || !amount) {
      return NextResponse.json(
        { error: "Numéro de téléphone et montant requis" },
        { status: 400 }
      )
    }

    // Vérifier que le montant est valide
    const amountNumber = Number(amount)
    if (isNaN(amountNumber) || amountNumber <= 0) {
      return NextResponse.json(
        { error: "Montant invalide" },
        { status: 400 }
      )
    }

    // Vérifier que le service est configuré
    if (!bambooPayService.isConfigured()) {
      return NextResponse.json(
        { 
          error: "Service BambooPay non configuré",
          details: "Veuillez configurer les variables d'environnement BAMBOO_USERNAME, BAMBOO_PASSWORD et BAMBOO_MERCHANT_ID"
        },
        { status: 503 }
      )
    }

    // Initier le paiement
    const result = await bambooPayService.initiateInstantPayment(
      phone,
      amountNumber,
      payerName || "Client POS",
      reference
    )

    if (result.success) {
      return NextResponse.json({
        success: true,
        status: result.status,
        reference: result.reference,
        referenceBp: result.referenceBp,
        message: result.message,
      })
    } else {
      return NextResponse.json(
        {
          success: false,
          status: result.status,
          reference: result.reference,
          error: result.error,
        },
        { status: 400 }
      )
    }
  } catch (error: any) {
    console.error("[BAMBOO_PAY_INIT]", error)
    return NextResponse.json(
      { error: error.message || "Erreur lors de l'initiation du paiement" },
      { status: 500 }
    )
  }
}

/**
 * GET /api/payments/bamboo-pay?transactionId=xxx
 * Vérifie le statut d'un paiement BambooPay
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const transactionId = searchParams.get("transactionId")

    if (!transactionId) {
      return NextResponse.json(
        { error: "ID de transaction requis" },
        { status: 400 }
      )
    }

    // Vérifier que le service est configuré
    if (!bambooPayService.isConfigured()) {
      return NextResponse.json(
        { error: "Service BambooPay non configuré" },
        { status: 503 }
      )
    }

    // Vérifier le statut
    const result = await bambooPayService.checkPaymentStatus(transactionId)

    return NextResponse.json({
      success: result.success,
      status: result.status,
      reference: result.reference,
      message: result.message,
      error: result.error,
    })
  } catch (error: any) {
    console.error("[BAMBOO_PAY_STATUS]", error)
    return NextResponse.json(
      { error: error.message || "Erreur lors de la vérification du statut" },
      { status: 500 }
    )
  }
}
