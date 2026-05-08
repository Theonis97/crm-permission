/**
 * Test USSD réel (même enchaînement que la caisse : création facture → ussd_push).
 *
 * Prérequis côté Digitech / opérateur (sinon 406 ou rien sur le téléphone) :
 * - Compte marchand avec USSD activé (LAB ou PROD selon EBILLING_API_BASE_URL).
 * - Numéro payeur réel Gabon : 07… Airtel, 06… Moov, avec Mobile Money actif.
 * - EBILLING_MOCK_PAYIN=false dans .env (le mock n’existe que dans les routes Next ; ce script appelle toujours l’API).
 *
 * Usage (depuis la racine du projet) :
 *   npx tsx scripts/ebilling-ussd-probe.ts <téléphone> <AIRTEL_MONEY|MOOV_MONEY> [montant_XAF]
 *
 * Exemple :
 *   npx tsx scripts/ebilling-ussd-probe.ts 077123456 AIRTEL_MONEY 500
 */
import { loadEnvConfig } from "@next/env"
import { resolve } from "path"

async function main() {
  loadEnvConfig(resolve(process.cwd()))

  const {
    createEbBill,
    ebillingOperatorMatchesGabonMsisdn,
    ebillingUssdPush,
    isEbillingConfigured,
    mapPosOperatorToEbilling,
    normalizePayerMsisdn,
  } = await import("../lib/ebilling-payin")

  const phone = process.argv[2]?.trim()
  const operator = process.argv[3]?.trim().toUpperCase()
  const amountArg = process.argv[4]
  const amount = amountArg != null && amountArg !== "" ? Number(amountArg) : 100

  if (!phone || !operator) {
    console.error(
      "Usage: npx tsx scripts/ebilling-ussd-probe.ts <téléphone> <AIRTEL_MONEY|MOOV_MONEY> [montant_XAF]",
    )
    process.exit(1)
  }
  if (!["AIRTEL_MONEY", "MOOV_MONEY"].includes(operator)) {
    console.error("Opérateur : AIRTEL_MONEY ou MOOV_MONEY")
    process.exit(1)
  }
  if (Number.isNaN(amount) || amount < 1) {
    console.error("Montant invalide")
    process.exit(1)
  }

  if (!isEbillingConfigured()) {
    console.error("E-Billing non configuré : EBILLING_USERNAME + EBILLING_SHARED_KEY dans .env")
    process.exit(1)
  }

  const mock = process.env.EBILLING_MOCK_PAYIN?.toLowerCase() === "true"
  if (mock) {
    console.warn(
      "⚠ EBILLING_MOCK_PAYIN=true dans .env : les routes POS simulent le paiement ; ce script appelle quand même l’API.",
    )
  }

  const paymentSystem = mapPosOperatorToEbilling(operator)
  if (!paymentSystem) {
    process.exit(1)
  }

  const msisdn = normalizePayerMsisdn(phone)
  if (!ebillingOperatorMatchesGabonMsisdn(operator, msisdn)) {
    console.error(
      "Opérateur incohérent avec le numéro (Gabon : 07… Airtel, 06… Moov).",
    )
    process.exit(1)
  }

  const email =
    process.env.EBILLING_DEFAULT_PAYER_EMAIL?.trim() || "ussd-probe@ebilling.local"
  const ref = `ussd-probe-${Date.now()}`

  console.log(
    `API: ${process.env.EBILLING_API_BASE_URL || "default lab"} | MSISDN: ${msisdn} | opérateur: ${operator} (${paymentSystem}) | ${amount} XAF`,
  )

  console.log("1) Création facture…")
  const bill = await createEbBill({
    amount,
    externalReference: ref,
    shortDescription: `USSD probe ${ref}`,
    payerEmail: email,
    payerMsisdn: msisdn,
    payerName: "USSD Probe",
    expiryPeriodMinutes: Number(process.env.EBILLING_BILL_EXPIRY_MINUTES) || 60,
  })
  console.log("   bill_id:", bill.billId)

  console.log("2) USSD push… (regardez le téléphone)")
  try {
    const out = await ebillingUssdPush(bill.billId, msisdn, paymentSystem)
    console.log("   OK:", out.message ?? "OK")
    console.log("\n→ Si l’API répond OK mais rien n’apparaît sur le portable : LAB sans USSD réel ou ligne non éligible — contacter Digitech.")
  } catch (e) {
    console.error("   Échec:", e instanceof Error ? e.message : e)
    console.error(
      "\nSi 406 ou pas d’invite sur le téléphone : demandez à Digitech l’activation USSD pour ce compte et cet environnement (LAB/PROD).",
    )
    process.exit(1)
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
