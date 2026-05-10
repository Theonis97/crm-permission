import { NextRequest, NextResponse } from "next/server";
import { prisma as db } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log("[MoneyFusion Webhook]", body);

    const { tokenPay, statut, numeroTransaction, Montant } = body;

    if (!tokenPay) {
      return NextResponse.json({ error: "Missing tokenPay" }, { status: 400 });
    }

    // Logic to update order status based on 'statut'
    // statut can be 'paid', 'pending', 'failure'
    
    if (statut === 'paid') {
      // Find the order/sale associated with this token and mark as PAID
      // This part depends on how you store the token in your database
      /*
      await db.storeOrder.updateMany({
        where: { someFieldStoredToken: tokenPay },
        data: { 
          paymentStatus: 'PAID',
          paidAt: new Date(),
          notes: `Paid via MoneyFusion. TransID: ${numeroTransaction}`
        }
      });
      */
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error("MoneyFusion webhook error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
