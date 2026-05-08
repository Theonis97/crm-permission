import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import {
  getPosMobilePreference,
  resolveActivePosMobileGateway,
} from "@/lib/pos-mobile-gateway"
import {
  getEbillingAuthDebugMeta,
  isEbillingConfigured,
  isEbillingMockPayinEnabled,
  trimEnv,
} from "@/lib/ebilling-payin"
import { myPvitService } from "@/lib/mypvit-service"

/** Indique quelle passerelle le POS utilisera (libellé UI). */
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
    }

    const preference = getPosMobilePreference()
    const active = resolveActivePosMobileGateway()
    const base = {
      preference,
      active,
      ebillingMockPayin: isEbillingMockPayinEnabled(),
      configured: {
        ebilling: isEbillingConfigured(),
        mypvit: myPvitService.isConfigured(),
      },
    }
    if (process.env.NODE_ENV === "development") {
      return NextResponse.json({
        ...base,
        _debug: {
          cwd: process.cwd(),
          ebillingAuth: getEbillingAuthDebugMeta(),
          ebillingUsernameLen: trimEnv(process.env.EBILLING_USERNAME).length,
          ebillingKeyLen: trimEnv(process.env.EBILLING_SHARED_KEY).length,
        },
      })
    }
    return NextResponse.json(base)
  } catch (e) {
    console.error("[pos-mobile/config]", e)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
