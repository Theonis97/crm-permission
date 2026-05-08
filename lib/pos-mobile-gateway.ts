import { isEbillingConfigured, isEbillingMockPayinEnabled } from "@/lib/ebilling-payin"
import { myPvitService } from "@/lib/mypvit-service"

export type PosMobileGatewayId = "ebilling" | "mypvit"

export type PosMobilePreference = "auto" | PosMobileGatewayId

/**
 * Préférence côté serveur uniquement (pas besoin de NEXT_PUBLIC).
 * Valeurs : ebilling (défaut) | mypvit | auto
 * Défaut = E-Billing uniquement ; MyPVit seulement si POS_MOBILE_GATEWAY=mypvit (ou auto pour les deux).
 * `NEXT_PUBLIC_POS_MOBILE_GATEWAY` est encore lue pour compatibilité avec les anciens .env.
 */
export function getPosMobilePreference(): PosMobilePreference {
  const raw =
    (process.env.POS_MOBILE_GATEWAY || process.env.NEXT_PUBLIC_POS_MOBILE_GATEWAY || "ebilling")
      .toLowerCase()
      .trim()
  if (raw === "ebilling" || raw === "mypvit") return raw
  return "auto"
}

/**
 * Quelle passerelle sera utilisée pour le POS.
 * - ebilling (défaut) : E-Billing si credentials, ou mock dev si EBILLING_MOCK_PAYIN=true.
 * - mypvit : MyPVit seulement si configuré.
 * - auto : E-Billing si configuré, sinon MyPVit si configuré.
 */
export function resolveActivePosMobileGateway(): PosMobileGatewayId | null {
  const pref = getPosMobilePreference()
  const eb = isEbillingConfigured() || isEbillingMockPayinEnabled()
  const mp = myPvitService.isConfigured()

  if (pref === "ebilling") return eb ? "ebilling" : null
  if (pref === "mypvit") return mp ? "mypvit" : null

  if (eb) return "ebilling"
  if (mp) return "mypvit"
  return null
}
