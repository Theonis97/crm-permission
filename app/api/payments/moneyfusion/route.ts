import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { initiatePayment, calculateAmountToSend, checkPaymentStatus } from "@/lib/moneyfusion";

/**
 * POST /api/payments/moneyfusion
 * Initie un paiement MoneyFusion (Mobile Money)
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const body = await req.json();
    const { amount, phone, customerName, items, metadata } = body;

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: "Montant invalide" },
        { status: 400 }
      );
    }

    // Calculate amount to send (compensate for fee)
    const amountToSend = calculateAmountToSend(amount);

    const storeId = metadata?.storeId;
    const returnPath = storeId ? `/dashboard/stores/${storeId}/pos` : "/dashboard/sales";

    // Prepare payment data
    const paymentData = {
      totalPrice: amountToSend,
      article: items || [
        {
          [`Paiement ERP`]: amountToSend,
        },
      ],
      personal_Info: [
        {
          userId: session.user.id,
          ...metadata
        },
      ],
      numeroSend: phone || "+221 00 00 00 00",
      nomclient: customerName || session.user.name || "Client",
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}${returnPath}`,
      webhook_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/moneyfusion`,
    };

    // Initiate payment
    const paymentResponse = await initiatePayment(paymentData);

    if (!paymentResponse.statut) {
      return NextResponse.json(
        { error: paymentResponse.message || "Échec de l'initiation du paiement" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      url: paymentResponse.url,
      token: paymentResponse.token,
    });
  } catch (error: any) {
    console.error("MoneyFusion payment initiation error:", error);
    return NextResponse.json(
      { error: error.message || "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/payments/moneyfusion?token=xxx
 * Vérifie le statut d'un paiement MoneyFusion
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json(
        { error: "Token de transaction requis" },
        { status: 400 }
      );
    }

    const statusResponse = await checkPaymentStatus(token);

    return NextResponse.json({
      success: statusResponse.statut,
      data: statusResponse.data,
      message: statusResponse.message
    });
  } catch (error: any) {
    console.error("MoneyFusion status check error:", error);
    return NextResponse.json(
      { error: error.message || "Erreur lors de la vérification du statut" },
      { status: 500 }
    );
  }
}
