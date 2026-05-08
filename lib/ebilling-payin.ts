/**
 * Client minimal E-Billing (Digitech Africa) — PAYIN : création de facture + USSD Push.
 * @see Guide d'intégration E-Billing (Basic Auth sur l'API marchand).
 */

const EBILLING_API_BASE =
  process.env.EBILLING_API_BASE_URL?.replace(/\/$/, "") ||
  "https://lab.billing-easy.net/api/v1/merchant"

export function trimEnv(value: string | undefined): string {
  if (value == null) return ""
  let s = value.replace(/^\uFEFF/, "").trim()
  if (
    (s.startsWith('"') && s.endsWith('"') && s.length >= 2) ||
    (s.startsWith("'") && s.endsWith("'") && s.length >= 2)
  ) {
    s = s.slice(1, -1).trim()
  }
  return s
}

/**
 * Portail web de paiement E-Billing (guide §4.4.1) — utile si l’USSD renvoie 406 (souvent en LAB).
 * LAB par défaut : https://test.billing-easy.net?invoice=…&redirect_url=…
 */
export function buildEbillingPortalPaymentUrl(billId: string, redirectAfterPayUrl: string): string {
  const raw = trimEnv(process.env.EBILLING_PORTAL_BASE_URL) || "https://test.billing-easy.net"
  let origin: string
  try {
    const u = new URL(raw.includes("://") ? raw : `https://${raw}`)
    origin = `${u.protocol}//${u.host}`
  } catch {
    origin = "https://test.billing-easy.net"
  }
  const q = new URLSearchParams({
    invoice: billId,
    redirect_url: redirectAfterPayUrl,
  })
  return `${origin}?${q.toString()}`
}

/** Détecte l’échec USSD 406 après lecture du message d’erreur. */
export function isEbillingUssd406Error(error: unknown): boolean {
  return error instanceof Error && /\bUSSD \(406\)/.test(error.message)
}

/** Normalise les caractères pour Basic Auth (ex. é précomposé vs décomposé). */
function normalizeBasicAuthSegment(value: string): string {
  return value.normalize("NFC")
}

/** Lecture runtime (clé dynamique) — évite qu’un bundler ne fige des `process.env.NOM` à vide. */
function envLookup(name: string): string {
  const v = process.env[name]
  return trimEnv(v)
}

function getEbillingUsername(): string {
  const u =
    envLookup("EBILLING_USERNAME") ||
    envLookup("EBILLING_MERCHANT_USERNAME") ||
    envLookup("EBILLING_USER") ||
    ""
  return u
}

/** Identifiant Basic Auth : emails en minuscules (souvent requis côté API). */
function getEbillingUsernameForBasicAuth(): string {
  const u = getEbillingUsername()
  if (!u) return u
  if (u.includes("@")) return u.toLowerCase()
  if (envLookup("EBILLING_USERNAME_FORCE_LOWERCASE") === "true") return u.toLowerCase()
  return u
}

function getEbillingSharedKey(): string {
  const k =
    envLookup("EBILLING_SHARED_KEY") ||
    envLookup("EBILLING_SECRET") ||
    envLookup("EBILLING_SHARED_SECRET") ||
    ""
  return k
}

function basicAuthHeader(): string {
  let u = normalizeBasicAuthSegment(getEbillingUsernameForBasicAuth())
  let k = normalizeBasicAuthSegment(getEbillingSharedKey())
  if (envLookup("EBILLING_BASIC_AUTH_SWAP") === "true") {
    ;[u, k] = [k, u]
  }
  const token = Buffer.from(`${u}:${k}`, "utf8").toString("base64")
  return `Basic ${token}`
}

/**
 * En-tête Authorization : soit EBILLING_AUTHORIZATION (Basic complet ou seulement le base64),
 * soit construction à partir de EBILLING_USERNAME + EBILLING_SHARED_KEY.
 */
function authorizationHeader(): string {
  const raw = envLookup("EBILLING_AUTHORIZATION")
  if (raw) {
    if (/^basic\s+/i.test(raw)) {
      return raw.replace(/\s+/g, " ").trim()
    }
    return `Basic ${raw}`
  }
  return basicAuthHeader()
}

export function isEbillingConfigured(): boolean {
  if (envLookup("EBILLING_AUTHORIZATION")) return true
  return !!(getEbillingUsername() && getEbillingSharedKey())
}

/**
 * Dev uniquement : simule le PAYIN sans appeler l’API Digitech (voir EBILLING_MOCK_PAYIN).
 * Inactif en production.
 */
export function isEbillingMockPayinEnabled(): boolean {
  if (process.env.NODE_ENV === "production") return false
  return envLookup("EBILLING_MOCK_PAYIN").toLowerCase() === "true"
}

function ebillingBaseAuthHint(): string {
  if (envLookup("EBILLING_AUTHORIZATION")) {
    return "Vous utilisez EBILLING_AUTHORIZATION : une valeur de .env.example laissée telle quelle casse l’auth — supprimez-la ou collez l’en-tête Postman exact."
  }
  return "Renseignez EBILLING_USERNAME + EBILLING_SHARED_KEY (fichier .env à la racine, lignes non commentées, puis redémarrage du serveur). Option : EBILLING_AUTHORIZATION=Basic …"
}

/** Texte court pour fichier actif .env vs .env.example (les variables d’exemple sont commentées volontairement). */
function ebilling401ActionHint(): string {
  return "Guide Digitech §3.1 : Basic = Username du profil LAB + SharedKey (pas le mot de passe du site). Si 401 : essayez comme EBILLING_USERNAME l’e-mail de connexion LAB, ou le « Nom d’utilisateur » exact (accents) ; régénérez la clé dans le profil et mettez à jour EBILLING_SHARED_KEY ; vérifiez qu’aucune EBILLING_AUTHORIZATION invalide n’est définie."
}

export function getEbillingAuthDebugMeta(): {
  source: "authorization" | "username_key"
  usernameLen: number
  keyLen: number
  usernameHasAt: boolean
} {
  const rawAuth = envLookup("EBILLING_AUTHORIZATION")
  const u = getEbillingUsername()
  const k = getEbillingSharedKey()
  return {
    source: rawAuth ? "authorization" : "username_key",
    usernameLen: u.length,
    keyLen: k.length,
    usernameHasAt: u.includes("@"),
  }
}

export type EbillingOperator = "AIRTEL_MONEY" | "MOOV_MONEY"

const OPERATOR_TO_EBILLING: Record<EbillingOperator, string> = {
  AIRTEL_MONEY: "airtelmoney",
  MOOV_MONEY: "moovmoney4",
}

export function mapPosOperatorToEbilling(operator: string): string | null {
  if (operator === "AIRTEL_MONEY") return OPERATOR_TO_EBILLING.AIRTEL_MONEY
  if (operator === "MOOV_MONEY") return OPERATOR_TO_EBILLING.MOOV_MONEY
  return null
}

/** Normalise le MSISDN Gabon (espaces, +241 → 0…) */
export function normalizePayerMsisdn(phone: string): string {
  let s = phone.trim().replace(/\s/g, "")
  if (s.startsWith("+241")) s = `0${s.slice(4)}`
  return s
}

/**
 * Gabon (guide E-Billing) : Airtel Money 07…, Moov Money 06… — MSISDN national 9 chiffres.
 * Retourne null si le format ne permet pas d’inférer l’opérateur.
 */
export function inferGabonMobileOperatorFromMsisdn(msisdn: string): EbillingOperator | null {
  const s = normalizePayerMsisdn(msisdn)
  if (!/^0[67]\d{7}$/.test(s)) return null
  if (s.startsWith("07")) return "AIRTEL_MONEY"
  if (s.startsWith("06")) return "MOOV_MONEY"
  return null
}

/** True si on ne peut pas inférer, ou si l’opérateur choisi correspond au préfixe. */
export function ebillingOperatorMatchesGabonMsisdn(operator: string, msisdn: string): boolean {
  const inferred = inferGabonMobileOperatorFromMsisdn(msisdn)
  if (!inferred) return true
  return operator === inferred
}

export interface CreateEbBillParams {
  amount: number
  externalReference: string
  shortDescription: string
  payerEmail: string
  payerMsisdn: string
  payerName: string
  expiryPeriodMinutes?: number
}

export interface EbBillCreated {
  billId: string
  amount: number
  currency: string
  state: string
  externalReference: string
  raw: unknown
}

export async function createEbBill(params: CreateEbBillParams): Promise<EbBillCreated> {
  if (!isEbillingConfigured()) {
    throw new Error(
      "E-Billing non configuré : EBILLING_USERNAME + EBILLING_SHARED_KEY, ou EBILLING_AUTHORIZATION (voir .env.example).",
    )
  }

  const url = `${EBILLING_API_BASE}/e_bills`
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: authorizationHeader(),
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      amount: params.amount,
      short_description: params.shortDescription,
      payer_email: params.payerEmail,
      payer_msisdn: params.payerMsisdn,
      payer_name: params.payerName,
      external_reference: params.externalReference,
      expiry_period: params.expiryPeriodMinutes ?? 60,
    }),
  })

  const text = await res.text()
  let json: any
  try {
    json = text ? JSON.parse(text) : {}
  } catch {
    throw new Error(`E-Billing: réponse non JSON (${res.status}) — ${text.slice(0, 200)}`)
  }

  if (!res.ok) {
    const msg = json?.message || json?.error || text || res.statusText
    if (res.status === 401) {
      throw new Error(
        `E-Billing création facture (401): ${msg} — ${ebilling401ActionHint()} ${ebillingBaseAuthHint()} Digitech : contact@digitech-africa.com`,
      )
    }
    throw new Error(`E-Billing création facture (${res.status}): ${msg}`)
  }

  const bill = json?.e_bill
  if (!bill?.bill_id) {
    throw new Error("E-Billing: bill_id manquant dans la réponse")
  }

  return {
    billId: String(bill.bill_id),
    amount: Number(bill.amount),
    currency: String(bill.currency || "XAF"),
    state: String(bill.state || ""),
    externalReference: String(bill.external_reference || params.externalReference),
    raw: json,
  }
}

export async function ebillingUssdPush(
  billId: string,
  payerMsisdn: string,
  paymentSystemName: string,
): Promise<{ message?: string }> {
  if (!isEbillingConfigured()) {
    throw new Error(
      "E-Billing non configuré : EBILLING_USERNAME + EBILLING_SHARED_KEY, ou EBILLING_AUTHORIZATION.",
    )
  }

  const url = `${EBILLING_API_BASE}/e_bills/${encodeURIComponent(billId)}/ussd_push`
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: authorizationHeader(),
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      payer_msisdn: payerMsisdn,
      payment_system_name: paymentSystemName,
    }),
  })

  const text = await res.text()
  let json: any
  try {
    json = text ? JSON.parse(text) : {}
  } catch {
    throw new Error(`E-Billing USSD: réponse non JSON (${res.status}) — ${text.slice(0, 200)}`)
  }

  if (!res.ok) {
    const msg = json?.message || json?.error || text || res.statusText
    if (res.status === 401) {
      throw new Error(
        `E-Billing USSD (401): ${msg} — ${ebillingBaseAuthHint()}`,
      )
    }
    if (res.status === 406) {
      throw new Error(
        `E-Billing USSD (406): ${msg} — Souvent : opérateur incompatible avec le numéro (Gabon : 07… = Airtel Money, 06… = Moov Money), ligne sans Mobile Money ou compte non éligible. En LAB, confirmer avec Digitech que l’USSD Push est activé pour votre compte (contact@digitech-africa.com).`,
      )
    }
    throw new Error(`E-Billing USSD (${res.status}): ${msg}`)
  }

  return { message: json?.message }
}
