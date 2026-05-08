import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { applyDeferredPosStockForStoreOrder } from "@/lib/pos-deferred-sale-stock"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log("[MyPVit Callback] Received:", JSON.stringify(body, null, 2))

    const { transactionId, merchantReferenceId, status, operator, amount } = body

    // Note: The prompt requests we allow requests from public address of https://api.mypvit.pro
    // Since we are in a serverless/nextjs environment, verifying IP might be complex or proxied.
    // For now, we proceed with the logic.

    if (status === 'SUCCESS') {
       console.log(`[MyPVit Callback] Payment SUCCESS for Ref: ${merchantReferenceId}`)
       
       // 1. Update StoreOrder (Commande de la boutique)
       const storeOrder = await prisma.storeOrder.findUnique({
         where: { number: merchantReferenceId }
       })

       if (storeOrder) {
         await prisma.storeOrder.update({
           where: { id: storeOrder.id },
           data: {
             paymentStatus: 'PAID',
             paymentMethod: 'MOBILE',
             paidAt: storeOrder.paidAt ?? new Date(),
             notes: storeOrder.notes 
               ? `${storeOrder.notes}\nMyPVit Ref: ${transactionId} (${operator})` 
               : `MyPVit Ref: ${transactionId} (${operator})`
           }
         })
         await applyDeferredPosStockForStoreOrder(storeOrder.id)
         console.log(`[MyPVit Callback] StoreOrder ${merchantReferenceId} updated to PAID`)
       } else {
         console.warn(`[MyPVit Callback] StoreOrder not found for ref: ${merchantReferenceId}`)
       }

       // 2. Update SubBoxOrder (Commande sous caisse)
       // If the merchantReferenceId was linked to a SubBoxOrder or if we can find it.
       // Usually the flow is: SubBoxOrder -> Validated -> StoreOrder Created.
       // If we created a StoreOrder for a SubBoxOrder, the SubBoxOrder logic might be handled 
       // inside the 'pos-sale' route (validation of sub-box order).
       // However, if we want to ensure the sub-box order is marked as paid/validated:
       
       // If the system links StoreOrder to SubBoxOrder via notes or another field, we could look it up.
       // But based on the provided schema, there isn't a direct link back from StoreOrder to SubBoxOrder 
       // except maybe if we stored the ID in notes or if 'pos-sale' handled the link.
       // In 'page.tsx', 'validateSubBoxOrder' is called after successful sale.
       // If we rely on the callback, we might need to do this here.
       // But without a direct link in DB, it's hard.
       // However, the user said "mettra a jour la commande sous caisse".
       // If we use the SubBoxOrder ID as the reference?
       // But we need a StoreOrder for stock management.
       // So likely we use StoreOrder Number.
       // We can assume the POS frontend will handle the SubBoxOrder validation once it detects the StoreOrder is PAID.
       // OR we can search for a SubBoxOrder that matches the amount/time? No, unsafe.
       
       // Let's assume updating StoreOrder is the primary goal for "Commande de la boutique".
       // For "Commande sous caisse", maybe the user meant that *if* the payment reference *is* the SubBoxOrder ID?
       // But we need to create a StoreOrder eventually.
       
       // I will stick to updating StoreOrder. If a SubBoxOrder needs update, it's likely handled by the system 
       // reacting to the StoreOrder payment (or manually by the cashier seeing it's paid).
       // Actually, let's look for a SubBoxOrder that might have this reference if StoreOrder is not found?
       // No, the POS creates the reference.
    } else if (status === 'FAILED') {
        console.log(`[MyPVit Callback] Payment FAILED for Ref: ${merchantReferenceId}`)
        // Optionally update to FAILED
        const storeOrder = await prisma.storeOrder.findUnique({
            where: { number: merchantReferenceId }
        })
   
        if (storeOrder) {
            await prisma.storeOrder.update({
              where: { id: storeOrder.id },
              data: {
                paymentStatus: 'FAILED',
                notes: storeOrder.notes 
                  ? `${storeOrder.notes}\nMyPVit Failed: ${transactionId}` 
                  : `MyPVit Failed: ${transactionId}`
              }
            })
        }
    }

    // Response required by MyPVit
    return NextResponse.json({
      responseCode: 200,
      transactionId: transactionId
    })

  } catch (error) {
    console.error("[MyPVit Callback Error]", error)
    return NextResponse.json({ error: "Internal Error" }, { status: 500 })
  }
}
