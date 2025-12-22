import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { myPvitService } from "@/lib/mypvit-service"

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
    }

    const body = await request.json()
    const { phone, amount, operator, reference, payerName } = body

    if (!phone || !amount || !operator || !reference) {
      return NextResponse.json(
        { error: "Champs requis manquants (téléphone, montant, opérateur, référence)" },
        { status: 400 }
      )
    }

    if (!['AIRTEL_MONEY', 'MOOV_MONEY'].includes(operator)) {
       return NextResponse.json(
        { error: "Opérateur invalide. Utilisez AIRTEL_MONEY ou MOOV_MONEY" },
        { status: 400 }
      )
    }

    // Call MyPVit Service
    const result = await myPvitService.initiatePayment({
      amount: Number(amount),
      reference: reference,
      customer_account_number: phone,
      operator_code: operator as 'AIRTEL_MONEY' | 'MOOV_MONEY',
      free_info: payerName ? payerName.substring(0, 15) : undefined, // Max 15 chars
    })

    // Check response
    // MyPVit returns { status: 'PENDING' | 'FAILED' | 'SUCCESS', ... }
    if (result.status === 'SUCCESS' || result.status === 'PENDING') {
       return NextResponse.json({
        success: true,
        data: result
      })
    } else {
       return NextResponse.json({
        success: false,
        error: result.message || "Erreur lors de l'initiation du paiement"
      }, { status: 400 })
    }

  } catch (error: any) {
    console.error("[MyPVit Initiate]", error)
    return NextResponse.json(
      { error: error.message || "Erreur serveur lors de l'initiation MyPVit" },
      { status: 500 }
    )
  }
}
